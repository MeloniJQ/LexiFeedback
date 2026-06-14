"""
LexiFeed Voice Service — Step 2

Handles:
  transcribe_audio()          → Whisper API → raw transcript text
  analyze_voice_answer()      → Whisper transcript + GPT analysis of BOTH
                                 content AND delivery (filler words, pace,
                                 confidence, structure, clarity)
  generate_voice_followup()   → Voice-aware follow-up that references what
                                 was actually said (not just inferred)

Why Whisper over Web Speech API:
  - Works in ALL browsers + mobile (Web Speech = Chrome/Edge only)
  - Handles accents, non-native speakers, technical jargon far better
  - Gives us timestamps + word-level confidence we can analyze
  - Works in production (Web Speech requires page focus + Chrome)
  - No data sent to Google — stays within OpenAI/Anthropic ecosystem
"""

import os
import re
import json
import tempfile
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
from services.interview_agent import build_followup_prompt, fallback_followup, parse_json_object

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
client  = OpenAI(api_key=api_key) if api_key else None

# Whisper supports these formats
SUPPORTED_AUDIO_FORMATS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

# ─────────────────────────────────────────────────────────────────────────────
# 1. Transcription via Whisper
# ─────────────────────────────────────────────────────────────────────────────

def transcribe_audio(audio_path: str, language: str = "en") -> dict:
    """
    Send audio file to OpenAI Whisper and get back:
      {
        "transcript": "Full transcribed text",
        "duration_seconds": 45.2,     ← estimated from word count
        "word_count": 112,
        "success": True
      }

    Falls back gracefully if Whisper unavailable.
    """
    if not client:
        return {
            "transcript": "",
            "duration_seconds": 0,
            "word_count": 0,
            "success": False,
            "error": "OpenAI client not initialised.",
        }

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
        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model    = "whisper-1",
                file     = audio_file,
                language = language,
                # verbose_json gives us word timestamps (useful for pace analysis)
                response_format = "verbose_json",
            )

        transcript = response.text.strip()
        # Whisper verbose_json exposes duration
        duration   = getattr(response, "duration", None)
        if duration is None:
            # Estimate: avg speaking pace ~130 wpm
            word_count = len(transcript.split())
            duration   = round(word_count / 130 * 60, 1)
        else:
            word_count = len(transcript.split())

        return {
            "transcript":       transcript,
            "duration_seconds": round(float(duration), 1),
            "word_count":       word_count,
            "success":          True,
        }

    except Exception as e:
        print(f"[transcribe_audio] Whisper error: {e}")
        return {
            "transcript":       "",
            "duration_seconds": 0,
            "word_count":       0,
            "success":          False,
            "error":            str(e),
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
        print("[analyze_voice_answer] Empty transcript provided.")
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
        if not client:
            raise RuntimeError("No OpenAI client")
        response = client.chat.completions.create(
            model       = "gpt-4o-mini",
            messages    = [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature = 0.5,
        )
        raw  = response.choices[0].message.content.strip()
        raw  = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        
        print(f"TRANSCRIPT: {transcript[:100]}...")
        print(f"ANALYSIS: {json.dumps(data, indent=2)}")

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
        print(f"[analyze_voice_answer] Error: {e}")
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
    candidate ACTUALLY said (using their exact words/phrases where helpful)
    and probes the most critical gap identified in the analysis.

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

    gaps    = analysis.get("content_analysis", {}).get("key_gaps", [])
    top_tip = analysis.get("top_tip", "")

    system = (
        "You are a sharp interviewer. Generate follow-up questions that feel "
        "personal and incisive — referencing the candidate's actual words. "
        "Return valid JSON only, no markdown fences."
    )

    user = f"""
INTERVIEW CONTEXT:
- Role: {role} at {company}
- Original question: "{question}"

CANDIDATE'S SPOKEN ANSWER (verbatim transcript):
\"\"\"{transcript}\"\"\"

KEY GAPS IDENTIFIED IN THEIR ANSWER:
{chr(10).join(f"- {g}" for g in gaps) if gaps else "- Answer was vague in places"}

COACHING NOTE: {top_tip}

Task:
1. Find the most important gap or vague/unsubstantiated claim in their answer.
2. Quote the EXACT phrase from their transcript that was weakest (2–6 words).
3. Write ONE follow-up question (1–2 sentences) that:
   - References their actual words naturally (e.g., "You mentioned you 'led the migration'...")
   - Probes specifically for what was missing
   - Sounds like a real interviewer, not a chatbot

Return ONLY this JSON:

print(f"FOLLOWUP INPUT: {transcript[:100]}...")
{{
  "followup": "...",
  "probe_target": "one phrase describing what this tests (e.g., 'ownership depth', 'quantifiable impact')",
  "quote_used": "the 2-6 word phrase from transcript that triggered this follow-up"
}}
"""

    try:
        if not client:
            raise RuntimeError("No client")
        response = client.chat.completions.create(
            model       = "gpt-4o-mini",
            messages    = [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature = 0.65,
        )
        raw  = response.choices[0].message.content.strip()
        raw  = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        if "followup" in data:
            return data
        raise ValueError("Missing followup key")
    except Exception as e:
        print(f"[generate_voice_followup] Error: {e}")
        return {
            "followup":    "Can you give me a concrete example with specific numbers or outcomes?",
            "probe_target": "specificity and impact",
            "quote_used":   "",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def generate_voice_followup(
    transcript:    str,
    question:      str,
    analysis:      dict,
    company:       str,
    role:          str,
) -> dict:
    """
    Agentic voice follow-up generator.

    Keeps the frontend response shape while selecting the follow-up from the
    candidate's actual answer, analysis gaps, role, and company context.
    """
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
        if not client:
            raise RuntimeError("No client")
        response = client.chat.completions.create(
            model       = "gpt-4o-mini",
            messages    = [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature = 0.75,
        )
        data = parse_json_object(response.choices[0].message.content.strip())
        if "followup" not in data:
            print(f"FOLLOWUP OUTPUT: {data.get('followup')}")
            raise ValueError("Missing followup key")
        return {
            "followup": data["followup"],
            "probe_target": data.get("probe_target", data.get("reason", "")),
            "quote_used": data.get("quote_used", ""),
        }
    except Exception as e:
        print(f"[generate_voice_followup] Agent error: {e}")
        result = fallback_followup(question, transcript, company, role)
        return {
            "followup": result["followup"],
            "probe_target": result.get("probe_target", "specificity"),
            "quote_used": result.get("quote_used", ""),
        }


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
    # Detect poor content / "bullshit" answers
    if word_count < 15:
        score = 2
    elif word_count < 40:
        score = 4

    if word_count > 80 and score >= 4:  score += 1
    if filler_words["count"] < 3: score += 1
    if avg_wpm in range(120, 161) and word_count >= 15: score += 1

    print(f"FALLBACK SCORES: content={score}, delivery={10 - filler_words['count']}")

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
