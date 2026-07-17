"""
LexiFeed Voice Service

Handles:
  transcribe_audio()          → faster-whisper (local, free) → raw transcript text
  analyze_voice_answer()      → Gemini analysis of BOTH content AND delivery
                                 (filler words, pace, confidence, structure, clarity)
  generate_voice_followup()   → Voice-aware follow-up that references what
                                 was actually said (not just inferred)

─────────────────────────────────────────────────────────────────────────────
MIGRATION NOTES:

1) Transcription: OpenAI Whisper API → faster-whisper (local, free)
   - Runs entirely locally using the `faster-whisper` package (CTranslate2-based
     reimplementation of Whisper). No per-request API cost, no network call.
   - Model size is configurable via WHISPER_MODEL_SIZE (default "base"; can be
     set to "small" or "medium" for higher accuracy at the cost of more compute).
   - GPU is used automatically if CUDA is available (detected via
     ctranslate2.get_cuda_device_count()); otherwise falls back to CPU with
     int8 quantization for reasonable speed.
   - The model is loaded lazily (on first use) and cached as a module-level
     singleton, since loading it is the expensive part — repeated requests
     reuse the already-loaded model.
   - transcribe_audio()'s public signature and return shape are UNCHANGED:
     {"transcript": str, "duration_seconds": float, "word_count": int, "success": bool, "error"?: str}

2) Text generation/analysis: OpenAI (`gpt-4o-mini`) → Google Gemini (`gemini-2.5-flash`)
   - analyze_voice_answer() and generate_voice_followup() now call Gemini via
     the official `google-genai` SDK, reading GEMINI_API_KEY from the environment.
   - Public function names, parameters, and return shapes are UNCHANGED.

3) Removed dead code: this file previously defined `generate_voice_followup()`
   TWICE — a first version (raw prompt strings) and a second version later in
   the file (using the shared `build_followup_prompt()` helper from
   interview_agent.py) that silently overwrote the first at import time. Only
   the second (shared-prompt-builder) version is kept, since it was the one
   actually being used and is more consistent with the rest of the codebase.
─────────────────────────────────────────────────────────────────────────────
"""

import os
import re
import json
import logging
import threading
from pathlib import Path

from faster_whisper import WhisperModel
import ctranslate2

from google import genai
from google.genai import types
from dotenv import load_dotenv

from services.interview_agent import build_followup_prompt, fallback_followup, parse_json_object

load_dotenv()

logger = logging.getLogger("lexifeed.voice_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(name)s %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

# ─────────────────────────────────────────────────────────────────────────────
# Gemini client (for analysis / follow-up generation)
# ─────────────────────────────────────────────────────────────────────────────

GEMINI_MODEL = "gemini-2.5-flash"

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

if not client:
    logger.warning(
        "GEMINI_API_KEY is not set — voice analysis and follow-up generation will use local fallbacks."
    )


def _chat(system: str, user: str, temperature: float = 0.6, json_mode: bool = True) -> str:
    """Thin wrapper around Gemini's generate_content call (mirrors ai_service._chat)."""
    if not client:
        raise RuntimeError("GEMINI_API_KEY missing — Gemini client not initialised")

    config_kwargs = {
        "system_instruction": system,
        "temperature": temperature,
    }
    if json_mode:
        config_kwargs["response_mime_type"] = "application/json"

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=user,
        config=types.GenerateContentConfig(**config_kwargs),
    )

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")
    return text


def _clean_json_text(raw: str) -> str:
    return re.sub(r"```json|```", "", raw).strip()


# ─────────────────────────────────────────────────────────────────────────────
# faster-whisper model loading (local transcription)
# ─────────────────────────────────────────────────────────────────────────────

# faster-whisper / ffmpeg-backed decoding supports all of these container formats.
SUPPORTED_AUDIO_FORMATS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

# Configurable via .env — "base" is a good default (fast, decent accuracy).
# Set to "small" or "medium" for higher accuracy at the cost of more compute/RAM.
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")

_whisper_model = None
_whisper_model_lock = threading.Lock()


def _get_whisper_model() -> WhisperModel:
    """
    Lazily load (and cache) the faster-whisper model.

    Automatically uses GPU (CUDA) if available, otherwise falls back to CPU
    with int8 quantization, which keeps CPU-only transcription reasonably fast.
    """
    global _whisper_model

    if _whisper_model is not None:
        return _whisper_model

    with _whisper_model_lock:
        if _whisper_model is not None:
            return _whisper_model

        try:
            cuda_device_count = ctranslate2.get_cuda_device_count()
        except Exception:
            cuda_device_count = 0

        if cuda_device_count > 0:
            device, compute_type = "cuda", "float16"
        else:
            device, compute_type = "cpu", "int8"

        logger.info(
            f"Loading faster-whisper model '{WHISPER_MODEL_SIZE}' on device='{device}' "
            f"(compute_type='{compute_type}', cuda_devices={cuda_device_count})..."
        )

        _whisper_model = WhisperModel(
            WHISPER_MODEL_SIZE,
            device=device,
            compute_type=compute_type,
        )
        logger.info("faster-whisper model loaded successfully.")

    return _whisper_model


# ─────────────────────────────────────────────────────────────────────────────
# 1. Transcription via faster-whisper (local, free)
# ─────────────────────────────────────────────────────────────────────────────

def transcribe_audio(audio_path: str, language: str = "en") -> dict:
    """
    Transcribe a local audio file using faster-whisper and return:
      {
        "transcript": "Full transcribed text",
        "duration_seconds": 45.2,
        "word_count": 112,
        "success": True
      }

    Public signature and return shape are UNCHANGED from the OpenAI Whisper
    API version, so routes/voice.py needed no changes.

    `language` behaves the same as before: pass an ISO 639-1 code (default
    "en") to hint the language, or an empty string/None to let Whisper
    auto-detect it.
    """
    ext = Path(audio_path).suffix.lower()
    if ext not in SUPPORTED_AUDIO_FORMATS:
        return {
            "transcript": "",
            "duration_seconds": 0,
            "word_count": 0,
            "success": False,
            "error": f"Unsupported audio format: {ext}. Use webm, mp3, wav, or m4a.",
        }

    try:
        model = _get_whisper_model()

        segments, info = model.transcribe(
            audio_path,
            language=language or None,  # None → auto-detect, matching Whisper API's optional language param
            vad_filter=True,             # skip silence, improves accuracy on short recordings
            beam_size=5,
        )

        # segments is a generator — must be consumed to actually run inference
        segment_list = list(segments)
        transcript = " ".join(seg.text.strip() for seg in segment_list).strip()

        duration = getattr(info, "duration", None)
        word_count = len(transcript.split())

        if not duration:
            # Estimate: avg speaking pace ~130 wpm (same fallback estimate as before)
            duration = round(word_count / 130 * 60, 1)

        return {
            "transcript": transcript,
            "duration_seconds": round(float(duration), 1),
            "word_count": word_count,
            "success": True,
        }

    except Exception as e:
        logger.error(f"[transcribe_audio] faster-whisper error: {e}")
        return {
            "transcript": "",
            "duration_seconds": 0,
            "word_count": 0,
            "success": False,
            "error": str(e),
        }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Voice-aware answer analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_voice_answer(
    transcript:        str,
    question:          str,
    question_type:     str,
    company:           str,
    role:              str,
    duration_seconds:  float = 0,
    word_count:        int   = 0,
) -> dict:
    """
    Deep analysis of the transcribed answer, covering:
      - Content quality (relevance, STAR structure, specificity)
      - Delivery quality (pace, filler words, sentence flow)
      - Vocabulary (sophistication, action verbs, clichés)
      - Specific strengths to keep
      - Specific gaps to fix
      - Quick score breakdown (content / delivery / vocabulary) out of 10
      - One actionable tip for the next answer

    Returns JSON dict so the frontend can render a rich breakdown UI.
    """
    if not transcript.strip():
        logger.warning("[analyze_voice_answer] Empty transcript provided.")
        return _empty_analysis()

    # Compute delivery metrics locally (don't waste tokens on counting)
    filler_words  = _count_fillers(transcript)
    avg_wpm       = round(word_count / (duration_seconds / 60)) if duration_seconds > 0 else 0
    pace_verdict  = _pace_verdict(avg_wpm)
    sentence_count = len(re.findall(r"[.!?]+", transcript)) or 1
    avg_sentence_len = round(word_count / sentence_count)

    system = (
        "You are a senior interview coach and communication expert. "
        "Analyse interview answers and return structured JSON feedback. "
        "Be specific, direct, and actionable. No markdown fences in output."
    )

    user = f"""
Analyse this spoken interview answer and return a JSON object.

CONTEXT:
- Role: {role} at {company}
- Question type: {question_type}
- Question asked: "{question}"

DELIVERY METRICS (pre-computed):
- Word count: {word_count}
- Speaking duration: {duration_seconds}s
- Words per minute: {avg_wpm} ({pace_verdict})
- Filler words detected: {filler_words['count']} ({', '.join(filler_words['list'][:5]) if filler_words['list'] else 'none'})
- Average sentence length: {avg_sentence_len} words
- Sentence count: {sentence_count}

TRANSCRIPT:
\"\"\"{transcript}\"\"\"

Return ONLY this JSON (no markdown fences, no extra keys):
{{
  "scores": {{
    "content":   <1-10>,
    "delivery":  <1-10>,
    "vocabulary": <1-10>,
    "overall":   <1-10>
  }},
  "content_analysis": {{
    "star_used": <true/false>,
    "relevance": "one sentence — how well they answered THIS specific question",
    "specificity": "one sentence — were they concrete or vague?",
    "key_strengths": ["strength 1", "strength 2"],
    "key_gaps": ["gap 1", "gap 2"]
  }},
  "delivery_analysis": {{
    "pace_comment": "one sentence about their speaking pace",
    "filler_comment": "one sentence about filler word usage",
    "structure_comment": "one sentence about how well-organised their spoken answer was",
    "confidence_signals": ["positive signal found in text", ...]
  }},
  "vocabulary_analysis": {{
    "strong_phrases": ["phrase or word that stood out positively", ...],
    "weak_phrases": ["phrase or word to replace", ...],
    "suggestion": "one concrete vocabulary improvement suggestion"
  }},
  "top_tip": "The single most impactful thing they can do differently RIGHT NOW in their next answer (1-2 sentences, very specific)"
}}
"""

    try:
        raw = _chat(system, user, temperature=0.5, json_mode=True)
        raw = _clean_json_text(raw)
        data = json.loads(raw)

        logger.info(f"[analyze_voice_answer] transcript_preview={transcript[:100]!r}")

        # Attach pre-computed delivery metrics so frontend has them
        data["metrics"] = {
            "word_count":          word_count,
            "duration_seconds":    duration_seconds,
            "words_per_minute":    avg_wpm,
            "pace_verdict":        pace_verdict,
            "filler_count":        filler_words["count"],
            "filler_words_found":  filler_words["list"],
            "sentence_count":      sentence_count,
            "avg_sentence_length": avg_sentence_len,
        }
        return data

    except Exception as e:
        logger.error(f"[analyze_voice_answer] Gemini error: {e}. Using local fallback analysis.")
        return _fallback_analysis(transcript, question, filler_words, avg_wpm, pace_verdict, word_count)


# ─────────────────────────────────────────────────────────────────────────────
# 3. Voice-aware follow-up generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_voice_followup(
    transcript:    str,
    question:      str,
    analysis:      dict,
    company:       str,
    role:          str,
) -> dict:
    """
    Generate a follow-up question that specifically references what the
    candidate ACTUALLY said, using the shared `build_followup_prompt()`
    helper (same prompt builder used by the plain-text interview flow),
    enriched with the gaps/top-tip found during voice analysis.

    Returns:
    {
      "followup": "...",
      "probe_target": "what this follow-up is testing",
      "quote_used": "the exact phrase from the transcript that triggered this follow-up"
    }
    """
    if not transcript.strip():
        return {
            "followup": "Can you walk me through a specific example that illustrates your point?",
            "probe_target": "specificity",
            "quote_used": "",
        }

    gaps = analysis.get("content_analysis", {}).get("key_gaps", [])
    top_tip = analysis.get("top_tip", "")
    enriched_answer = transcript
    if gaps or top_tip:
        enriched_answer = (
            f"{transcript}\n\nCoach-observed gaps: {gaps}\n"
            f"Most useful next coaching note: {top_tip}"
        )

    system, user = build_followup_prompt(
        original_question=question,
        candidate_answer=enriched_answer,
        company=company,
        role=role,
    )

    try:
        raw = _chat(system, user, temperature=0.75, json_mode=True)
        data = parse_json_object(_clean_json_text(raw))

        if "followup" not in data:
            raise ValueError("Missing followup key")

        return {
            "followup": data["followup"],
            "probe_target": data.get("probe_target", data.get("reason", "")),
            "quote_used": data.get("quote_used", ""),
        }
    except Exception as e:
        logger.error(f"[generate_voice_followup] Gemini error: {e}. Using fallback follow-up.")
        result = fallback_followup(question, transcript, company, role)
        return {
            "followup": result["followup"],
            "probe_target": result.get("probe_target", "specificity"),
            "quote_used": result.get("quote_used", ""),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

FILLER_PATTERN = re.compile(
    r"\b(um+|uh+|like|you know|basically|actually|honestly|literally|"
    r"right\?|so+|well|kind of|sort of|i mean|you see|anyway)\b",
    re.IGNORECASE,
)

def _count_fillers(text: str) -> dict:
    found = FILLER_PATTERN.findall(text)
    found_lower = [f.lower() for f in found]
    return {"count": len(found_lower), "list": list(set(found_lower))}


def _pace_verdict(wpm: int) -> str:
    if wpm == 0:    return "unknown"
    if wpm < 100:   return "too slow — sounds hesitant"
    if wpm < 120:   return "slightly slow — good for clarity"
    if wpm <= 160:  return "ideal pace"
    if wpm <= 190:  return "slightly fast — slow down slightly"
    return "too fast — hard to follow"


def _empty_analysis() -> dict:
    return {
        "scores":             {"content": 0, "delivery": 0, "vocabulary": 0, "overall": 0},
        "content_analysis":   {"star_used": False, "relevance": "No answer provided.", "specificity": "", "key_strengths": [], "key_gaps": ["No answer was given"]},
        "delivery_analysis":  {"pace_comment": "", "filler_comment": "", "structure_comment": "", "confidence_signals": []},
        "vocabulary_analysis":{"strong_phrases": [], "weak_phrases": [], "suggestion": ""},
        "top_tip":            "Please provide a spoken or typed answer.",
        "metrics":            {"word_count": 0, "duration_seconds": 0, "words_per_minute": 0, "pace_verdict": "unknown", "filler_count": 0, "filler_words_found": [], "sentence_count": 0, "avg_sentence_length": 0},
    }


def _fallback_analysis(transcript, question, filler_words, avg_wpm, pace_verdict, word_count) -> dict:
    score = 6
    # Detect poor content / low-effort answers
    if word_count < 15:
        score = 2
    elif word_count < 40:
        score = 4

    if word_count > 80 and score >= 4:  score += 1
    if filler_words["count"] < 3: score += 1
    if avg_wpm in range(120, 161) and word_count >= 15: score += 1

    logger.info(f"[_fallback_analysis] content_score={score} delivery_score={10 - filler_words['count']}")

    return {
        "scores": {
            "content":    min(score, 10),
            "delivery":   max(10 - filler_words["count"], 2) if word_count < 15 else max(10 - filler_words["count"], 4),
            "vocabulary": 7,
            "overall":    min(score, 10),
        },
        "content_analysis": {
            "star_used":   False,
            "relevance":   "Answer appears relevant to the question.",
            "specificity": "Add concrete examples and numbers to strengthen your answer.",
            "key_strengths": ["Answered within the expected length.", "Stayed on topic."],
            "key_gaps":    ["Missing quantifiable outcomes.", "STAR structure not clearly applied."],
        },
        "delivery_analysis": {
            "pace_comment":        f"Speaking pace: {avg_wpm} wpm ({pace_verdict}).",
            "filler_comment":      f"{filler_words['count']} filler words detected." if filler_words["count"] else "No major filler words detected.",
            "structure_comment":   "Consider pausing briefly before each new point.",
            "confidence_signals":  [],
        },
        "vocabulary_analysis": {
            "strong_phrases": [],
            "weak_phrases":   [],
            "suggestion":     "Replace vague verbs like 'did' or 'helped' with specific action verbs.",
        },
        "top_tip": "Structure your next answer using STAR: state the Situation in one sentence, your Task in one sentence, your Actions in 2–3 sentences, and the Result with a number.",
        "metrics": {
            "word_count":          word_count,
            "duration_seconds":    0,
            "words_per_minute":    avg_wpm,
            "pace_verdict":        pace_verdict,
            "filler_count":        filler_words["count"],
            "filler_words_found":  filler_words["list"],
            "sentence_count":      0,
            "avg_sentence_length": 0,
        },
    }