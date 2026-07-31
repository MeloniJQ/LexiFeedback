"""
LexiFeed Conversation Service — Casual Conversation Practice

Provides:
  - CONVERSATION_TOPICS        → 20 topics, each with its own unique prompt,
                                  speaking instructions, and estimated duration
  - get_all_topics()           → list view (title, description, icon, estimated time)
  - get_topic_by_id()          → full detail (prompt + instructions) for one topic
  - generate_conversation_feedback() → IELTS/TOEFL-style speaking evaluation,
                                  powered by Gemini 2.5 Flash, focused heavily
                                  on vocabulary as requested

This mirrors the same "primary provider + Gemini fallback" pattern already
established in ai_service.py / voice_service.py / agentic_analysis.py: try
the configured AI_PROVIDER (via llm/provider_factory.get_provider(), which
defaults to OpenRouter) first, and fall back to a direct Gemini call if that
fails. Kept in its own file rather than folded into ai_service.py, matching
how this codebase already splits large features into their own service
modules (evaluation_service.py, planning_service.py, etc.)
"""

import os
import re
import json
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

from llm.provider_factory import get_provider

load_dotenv()

logger = logging.getLogger("lexifeed.conversation_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(name)s %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

GEMINI_MODEL = "gemini-2.5-flash"

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

if not client:
    logger.warning(
        "GEMINI_API_KEY is not set — conversation feedback will use a local fallback "
        "if the primary AI_PROVIDER also fails."
    )


def _chat(system: str, user: str, temperature: float = 0.6, json_mode: bool = True) -> str:
    """
    Single choke point for AI calls in this service, matching ai_service.py's
    _chat(): try the configured AI_PROVIDER (OpenRouter by default) first,
    and fall back to a direct Gemini call if that fails for any reason
    (missing/invalid key, rate limit, network error, provider outage).
    """
    try:
        provider = get_provider()
        return provider.chat(system=system, user=user, temperature=temperature)
    except Exception as e:
        logger.warning(f"[_chat] Primary provider failed ({e}); falling back to Gemini.")
        return _gemini_chat(system, user, temperature=temperature, json_mode=json_mode)


def _gemini_chat(system: str, user: str, temperature: float = 0.6, json_mode: bool = True) -> str:
    """Direct Gemini call — used as the fallback when the primary provider is unavailable."""
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
# Topics — each with a unique prompt, instructions, and estimated duration
# ─────────────────────────────────────────────────────────────────────────────

CONVERSATION_TOPICS = [
    {
        "id": "daily-routine",
        "title": "Daily Routine",
        "icon": "sun",
        "description": "Talk about your typical day from morning until night.",
        "prompt": "Describe your daily routine.",
        "instructions": [
            "When you wake up",
            "Your morning activities",
            "Breakfast",
            "College/work",
            "Your hobbies",
            "Your evening routine",
            "Your night routine",
            "Anything else you usually do during the day",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "my-family",
        "title": "My Family",
        "icon": "users",
        "description": "Introduce the people in your family and your relationship with them.",
        "prompt": "Talk about your family.",
        "instructions": [
            "Who is in your family",
            "What each person does",
            "Who you are closest to and why",
            "A family tradition you enjoy",
            "How your family spends time together",
            "A memory with your family you value",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "my-hobbies",
        "title": "My Hobbies",
        "icon": "palette",
        "description": "Share what you like to do in your free time and why.",
        "prompt": "Talk about your hobbies and interests.",
        "instructions": [
            "What your main hobbies are",
            "How you got interested in them",
            "How often you practice them",
            "What you enjoy most about them",
            "A hobby you'd like to start",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "college-life",
        "title": "College Life",
        "icon": "graduation-cap",
        "description": "Describe your experience studying at college or university.",
        "prompt": "Talk about your college life.",
        "instructions": [
            "What you are studying",
            "A typical day at college",
            "Your favorite subject and why",
            "Challenges you've faced",
            "Friends and campus life",
            "Your goals after graduating",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "favorite-food",
        "title": "Favorite Food",
        "icon": "utensils",
        "description": "Talk about the foods you love and your eating habits.",
        "prompt": "Talk about your favorite food.",
        "instructions": [
            "What your favorite dish is",
            "Why you like it",
            "Who usually cooks it",
            "A memorable meal you've had",
            "Food from your culture you'd recommend",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "my-best-friend",
        "title": "My Best Friend",
        "icon": "heart-handshake",
        "description": "Describe your closest friend and your friendship.",
        "prompt": "Talk about your best friend.",
        "instructions": [
            "How you met",
            "What they are like",
            "Why you get along so well",
            "Something you enjoy doing together",
            "A memory that stands out",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "weekend-activities",
        "title": "Weekend Activities",
        "icon": "calendar",
        "description": "Explain how you usually spend your weekends.",
        "prompt": "Talk about your weekend activities.",
        "instructions": [
            "What you typically do on Saturdays and Sundays",
            "Who you spend time with",
            "A recent weekend you enjoyed",
            "The difference between your weekdays and weekends",
            "What an ideal weekend looks like for you",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "travel-experience",
        "title": "Travel Experience",
        "icon": "plane",
        "description": "Share a memorable trip or place you've visited.",
        "prompt": "Talk about a travel experience.",
        "instructions": [
            "Where you went",
            "Who you traveled with",
            "What you did there",
            "Something that surprised you",
            "Whether you'd like to go back",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "future-goals",
        "title": "Future Goals",
        "icon": "target",
        "description": "Talk about your ambitions and plans for the future.",
        "prompt": "Talk about your future goals.",
        "instructions": [
            "Your short-term goals",
            "Your long-term goals",
            "Why these goals matter to you",
            "Steps you're taking to achieve them",
            "Obstacles you expect to face",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "memorable-day",
        "title": "A Memorable Day",
        "icon": "star",
        "description": "Describe a day you'll never forget and why it mattered.",
        "prompt": "Talk about a memorable day in your life.",
        "instructions": [
            "What day you're describing",
            "What happened",
            "Who was there",
            "Why it was memorable",
            "How it affected you afterward",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "technology-daily-life",
        "title": "Technology in Daily Life",
        "icon": "smartphone",
        "description": "Discuss how technology shapes your everyday activities.",
        "prompt": "Talk about how technology affects your daily life.",
        "instructions": [
            "Devices and apps you use daily",
            "How technology helps you",
            "Any downsides you've noticed",
            "How your life would differ without it",
            "A piece of technology you couldn't live without",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "books-and-movies",
        "title": "Books and Movies",
        "icon": "clapperboard",
        "description": "Share your favorite books, films, and what you enjoy about them.",
        "prompt": "Talk about books and movies you enjoy.",
        "instructions": [
            "A book or movie you recently enjoyed",
            "What it was about",
            "Why you liked it",
            "Your favorite genre",
            "Whether you prefer books or movies, and why",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "festivals",
        "title": "Festivals",
        "icon": "party-popper",
        "description": "Describe a festival or celebration important to you.",
        "prompt": "Talk about a festival you celebrate.",
        "instructions": [
            "Which festival you're describing",
            "How it's celebrated",
            "Who you celebrate it with",
            "Food or traditions involved",
            "What it means to you personally",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "health-and-fitness",
        "title": "Health and Fitness",
        "icon": "dumbbell",
        "description": "Talk about how you stay healthy and active.",
        "prompt": "Talk about health and fitness in your life.",
        "instructions": [
            "How you stay active",
            "Your diet and eating habits",
            "Challenges you face staying healthy",
            "A fitness goal you have",
            "How exercise affects your mood",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "shopping",
        "title": "Shopping",
        "icon": "shopping-bag",
        "description": "Discuss your shopping habits and preferences.",
        "prompt": "Talk about your shopping habits.",
        "instructions": [
            "What you usually shop for",
            "Online vs in-store shopping",
            "How often you shop",
            "A recent purchase you're happy with",
            "How you decide what to buy",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "social-media",
        "title": "Social Media",
        "icon": "share-2",
        "description": "Share your thoughts and habits around social media.",
        "prompt": "Talk about social media and how you use it.",
        "instructions": [
            "Which platforms you use",
            "How much time you spend on them",
            "What you use them for",
            "Positive and negative effects on you",
            "How your habits have changed over time",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "my-city",
        "title": "My City",
        "icon": "building-2",
        "description": "Describe the city or town you live in.",
        "prompt": "Talk about your city.",
        "instructions": [
            "Where your city is located",
            "What it's known for",
            "Your favorite place in the city",
            "What you'd change about it",
            "Whether you'd recommend it to visitors",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "dream-job",
        "title": "My Dream Job",
        "icon": "briefcase",
        "description": "Talk about the career you aspire to and why.",
        "prompt": "Talk about your dream job.",
        "instructions": [
            "What your dream job is",
            "Why you want this job",
            "Skills it requires",
            "How you're preparing for it",
            "What success would look like to you",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "environmental-awareness",
        "title": "Environmental Awareness",
        "icon": "leaf",
        "description": "Discuss environmental issues and what you do to help.",
        "prompt": "Talk about environmental awareness and sustainability.",
        "instructions": [
            "An environmental issue that concerns you",
            "What you do to help the environment",
            "Changes you've noticed in your area",
            "What more could be done",
            "How you'd encourage others to help",
        ],
        "estimated_time_seconds": 120,
    },
    {
        "id": "learning-new-skills",
        "title": "Learning New Skills",
        "icon": "lightbulb",
        "description": "Share a skill you've learned recently or want to learn.",
        "prompt": "Talk about learning a new skill.",
        "instructions": [
            "A skill you've learned recently, or want to learn",
            "Why you chose this skill",
            "How you're learning it (courses, practice, etc.)",
            "Challenges you've faced",
            "How this skill will help you",
        ],
        "estimated_time_seconds": 120,
    },
]

_TOPICS_BY_ID = {t["id"]: t for t in CONVERSATION_TOPICS}


def get_all_topics() -> list[dict]:
    """Lightweight list view for the topic-selection grid."""
    return [
        {
            "id": t["id"],
            "title": t["title"],
            "icon": t["icon"],
            "description": t["description"],
            "estimatedTimeSeconds": t["estimated_time_seconds"],
        }
        for t in CONVERSATION_TOPICS
    ]


def get_topic_by_id(topic_id: str):
    """Full detail (prompt + instructions) for the Topic Details screen."""
    t = _TOPICS_BY_ID.get(topic_id)
    if not t:
        return None
    return {
        "id": t["id"],
        "title": t["title"],
        "icon": t["icon"],
        "description": t["description"],
        "prompt": t["prompt"],
        "instructions": t["instructions"],
        "estimatedTimeSeconds": t["estimated_time_seconds"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Feedback generation — IELTS/TOEFL-style, vocabulary-focused
# ─────────────────────────────────────────────────────────────────────────────

def generate_conversation_feedback(
    transcript: str,
    topic_title: str,
    topic_prompt: str,
    duration_seconds: float,
) -> dict:
    """
    Produces a full, structured speaking-evaluation report covering all 10
    sections requested: overall performance, vocabulary (highest priority),
    grammar, fluency, pronunciation, strengths, areas to improve, a sample
    improved response, vocabulary flashcards, and quick tips — plus category
    scores.
    """
    if not transcript.strip():
        logger.warning("[generate_conversation_feedback] Empty transcript received.")
        return _empty_feedback(topic_title)

    word_count = len(transcript.split())
    minutes = int(duration_seconds // 60)
    seconds = int(duration_seconds % 60)
    duration_display = f"{minutes:02d}:{seconds:02d}"

    system = (
        "You are a senior IELTS/TOEFL speaking examiner and English vocabulary coach. "
        "You produce detailed, structured, encouraging-but-honest speaking evaluations. "
        "Vocabulary analysis is your HIGHEST priority section — spend the most effort there. "
        "Return valid JSON only, no markdown fences, no commentary outside the JSON object."
    )

    user = f"""
Evaluate this spoken response from an English learner, in the style of an IELTS/TOEFL speaking exam,
but keep the language easy to understand for a learner reading their own report.

TOPIC: "{topic_title}"
PROMPT GIVEN TO THE LEARNER: "{topic_prompt}"
SPEAKING DURATION: {duration_display} ({duration_seconds:.0f} seconds)
WORD COUNT: {word_count}

TRANSCRIPT:
\"\"\"{transcript}\"\"\"

Produce a full evaluation. Vocabulary analysis must be the most detailed section — identify strong
vocabulary actually used, repeated/overused words (with counts), weak-word-to-strong-word
suggestions, and 10-15 advanced topic-related words the learner should learn next (with short
meanings). Grammar analysis must quote the learner's own incorrect sentences (or clearly-implied
ones) and give corrected versions with a short reason. The sample improved response must cover the
SAME topic in 180-250 words at a B2 level, natural and native-sounding.

For pronunciation, infer 3-8 words from the transcript that are commonly mispronounced by English
learners, or that the transcript's phrasing suggests may have been mispronounced (e.g. unusual
spelling substitutions a speech-to-text engine makes when it mishears a sound). For EACH word,
provide its phonetic_spelling (simple, readable, e.g. "KUHM-ftuh-buhl"), ipa (formal IPA notation),
syllables (hyphen-separated), and stress (which syllable is stressed, in plain English). Be honest
that these are inferred from common learner patterns and transcript context, not measured from audio.

Return ONLY this JSON structure (no markdown fences):
{{
  "overall": {{
    "overall_score": <float 0-10, one decimal>,
    "cefr_level": "A1|A2|B1|B1+|B2|B2+|C1|C2",
    "speaking_duration": "{duration_display}",
    "summary": "2-4 sentence overall summary of the performance"
  }},
  "vocabulary": {{
    "score": <float 0-10>,
    "strong_words_used": ["word1", "word2", "..."],
    "repeated_words": [ {{"word": "then", "count": 12}}, ... ],
    "suggestions": [ {{"weak": "very busy", "stronger": "hectic"}}, ... ],
    "words_to_learn": [ {{"word": "commute", "meaning": "a regular journey to and from work or college"}}, ... ]
  }},
  "grammar": {{
    "score": <float 0-10>,
    "mistakes": [
      {{"incorrect": "I goes to college at 9.", "correct": "I go to college at 9.", "reason": "\\"goes\\" is used only with he/she/it."}}
    ]
  }},
  "fluency": {{
    "score": <float 0-10>,
    "flow_comment": "one sentence about speaking flow and rhythm",
    "filler_words_found": ["um", "like", ...],
    "suggested_transitions": ["After that", "Meanwhile", "In addition", "As a result"]
  }},
  "pronunciation": {{
    "score": <float 0-10>,
    "notes": "comment on likely pronunciation issues inferred from transcript patterns (repeated typos-for-sounds, run-on phonetic spelling, etc.) — be honest that this is inferred, not measured",
    "mispronounced_words": [
      {{
        "word": "comfortable",
        "phonetic_spelling": "KUHM-ftuh-buhl",
        "ipa": "/ˈkʌmf.tə.bəl/",
        "syllables": "com-for-ta-ble",
        "stress": "Stress falls on the 1st syllable (COM)"
      }}
    ]
  }},
  "coherence_score": <float 0-10>,
  "strengths": ["Stayed on topic", "..."],
  "areas_to_improve": ["Reduce repeated vocabulary", "..."],
  "sample_improved_response": "180-250 word natural, advanced, B2-level version of the same topic",
  "vocabulary_practice": [
    {{"word": "...", "definition": "...", "example_sentence": "...", "synonym": "..."}}
  ],
  "quick_tips": ["Replace \\"very good\\" with \\"excellent\\"", "..."]
}}
"""

    try:
        raw = _chat(system, user, temperature=0.6, json_mode=True)
        raw = _clean_json_text(raw)
        data = json.loads(raw)
        logger.info(
            f"[generate_conversation_feedback] topic={topic_title!r} words={word_count} "
            f"overall={data.get('overall', {}).get('overall_score')}"
        )
        return _normalize_feedback(data, duration_display)
    except Exception as e:
        logger.error(f"[generate_conversation_feedback] Gemini error: {e}. Using local fallback.")
        return _fallback_feedback(transcript, topic_title, duration_display, word_count)


def _coerce_num(d: dict, key: str, default: float) -> float:
    v = d.get(key)
    return v if isinstance(v, (int, float)) else default


def _coerce_list(d: dict, key: str, fallback: list | None = None) -> list:
    v = d.get(key)
    if isinstance(v, list):
        return v
    return fallback if fallback is not None else []


def _coerce_str(d: dict, key: str, default: str = "") -> str:
    v = d.get(key)
    return v if isinstance(v, str) else default


def _coerce_word_list(d: dict, key: str) -> list:
    """
    Sanitizes a list of pronunciation-word objects, guaranteeing every entry
    has a non-empty string `word` and safe string defaults for the rest —
    guards against the AI returning null/wrong types for any sub-field,
    same reasoning as _coerce_num/_coerce_list/_coerce_str above.
    """
    raw = d.get(key)
    if not isinstance(raw, list):
        return []

    result = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        word = item.get("word")
        if not isinstance(word, str) or not word.strip():
            continue
        result.append({
            "word": word.strip(),
            "phonetic_spelling": item.get("phonetic_spelling") if isinstance(item.get("phonetic_spelling"), str) else "",
            "ipa": item.get("ipa") if isinstance(item.get("ipa"), str) else "",
            "syllables": item.get("syllables") if isinstance(item.get("syllables"), str) else "",
            "stress": item.get("stress") if isinstance(item.get("stress"), str) else "",
        })
    return result


def _normalize_feedback(data: dict, duration_display: str) -> dict:
    """
    Ensure every expected key exists AND has the correct type, regardless of
    what the AI actually returned. This guards against more than just missing
    keys — LLMs frequently return JSON `null` for "nothing to report" fields
    (e.g. an empty vocabulary list) instead of `[]`, and `dict.get(key,
    default)` only falls back to `default` when the key is ABSENT, not when
    it's present with value `None`. Left unguarded, a `null` here flows
    straight to the frontend, which then crashes calling `.length`/`.map()`
    on it. `_coerce_list`/`_coerce_num`/`_coerce_str` fix that by checking the
    actual type, not just presence.
    """
    overall = data.get("overall") if isinstance(data.get("overall"), dict) else {}
    vocabulary = data.get("vocabulary") if isinstance(data.get("vocabulary"), dict) else {}
    grammar = data.get("grammar") if isinstance(data.get("grammar"), dict) else {}
    fluency = data.get("fluency") if isinstance(data.get("fluency"), dict) else {}
    pronunciation = data.get("pronunciation") if isinstance(data.get("pronunciation"), dict) else {}

    return {
        "overall": {
            "overall_score": _coerce_num(overall, "overall_score", 6.0),
            "cefr_level": _coerce_str(overall, "cefr_level", "B1"),
            "speaking_duration": _coerce_str(overall, "speaking_duration", duration_display),
            "summary": _coerce_str(overall, "summary", "You completed the speaking task."),
        },
        "vocabulary": {
            "score": _coerce_num(vocabulary, "score", 6.0),
            "strong_words_used": _coerce_list(vocabulary, "strong_words_used"),
            "repeated_words": _coerce_list(vocabulary, "repeated_words"),
            "suggestions": _coerce_list(vocabulary, "suggestions"),
            "words_to_learn": _coerce_list(vocabulary, "words_to_learn"),
        },
        "grammar": {
            "score": _coerce_num(grammar, "score", 6.0),
            "mistakes": _coerce_list(grammar, "mistakes"),
        },
        "fluency": {
            "score": _coerce_num(fluency, "score", 6.0),
            "flow_comment": _coerce_str(fluency, "flow_comment"),
            "filler_words_found": _coerce_list(fluency, "filler_words_found"),
            "suggested_transitions": _coerce_list(
                fluency, "suggested_transitions",
                fallback=["After that", "Meanwhile", "In addition", "As a result"],
            ),
        },
        "pronunciation": {
            "score": _coerce_num(pronunciation, "score", 6.0),
            "notes": _coerce_str(pronunciation, "notes"),
            "mispronounced_words": _coerce_word_list(pronunciation, "mispronounced_words"),
        },
        "coherence_score": _coerce_num(data, "coherence_score", 6.0),
        "strengths": _coerce_list(data, "strengths"),
        "areas_to_improve": _coerce_list(data, "areas_to_improve"),
        "sample_improved_response": _coerce_str(data, "sample_improved_response"),
        "vocabulary_practice": _coerce_list(data, "vocabulary_practice"),
        "quick_tips": _coerce_list(data, "quick_tips"),
    }


def _empty_feedback(topic_title: str) -> dict:
    return {
        "overall": {
            "overall_score": 0,
            "cefr_level": "N/A",
            "speaking_duration": "00:00",
            "summary": f"No speech was detected for the '{topic_title}' prompt. Please try recording again.",
        },
        "vocabulary": {"score": 0, "strong_words_used": [], "repeated_words": [], "suggestions": [], "words_to_learn": []},
        "grammar": {"score": 0, "mistakes": []},
        "fluency": {"score": 0, "flow_comment": "", "filler_words_found": [], "suggested_transitions": []},
        "pronunciation": {"score": 0, "notes": "", "mispronounced_words": []},
        "coherence_score": 0,
        "strengths": [],
        "areas_to_improve": ["Record a spoken response to receive feedback."],
        "sample_improved_response": "",
        "vocabulary_practice": [],
        "quick_tips": [],
    }


def _fallback_feedback(transcript: str, topic_title: str, duration_display: str, word_count: int) -> dict:
    """Local, non-AI fallback when Gemini is unavailable — still gives a usable report."""
    words = [w.strip(".,!?;:").lower() for w in transcript.split() if w.strip(".,!?;:")]
    from collections import Counter
    counts = Counter(words)
    stopwords = {"the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "i", "you", "to", "of", "in", "it", "my", "so", "for"}
    repeated = [
        {"word": w, "count": c} for w, c in counts.most_common(10)
        if c >= 3 and w not in stopwords and len(w) > 2
    ]

    filler_pattern = re.compile(r"\b(um+|uh+|like|you know|actually|basically)\b", re.IGNORECASE)
    fillers = list(set(f.lower() for f in filler_pattern.findall(transcript)))

    unique_ratio = len(set(words)) / max(len(words), 1)
    base_score = 5.0
    if word_count > 100:
        base_score += 1
    if unique_ratio > 0.5:
        base_score += 1
    if len(fillers) < 3:
        base_score += 0.5

    base_score = round(min(base_score, 9.0), 1)

    logger.info(f"[_fallback_feedback] topic={topic_title!r} words={word_count} score={base_score}")

    return {
        "overall": {
            "overall_score": base_score,
            "cefr_level": "B1",
            "speaking_duration": duration_display,
            "summary": (
                f"You spoke for about {duration_display} on '{topic_title}' and stayed on topic. "
                "This is a local fallback evaluation — connect a Gemini API key for a full, "
                "detailed vocabulary-focused report."
            ),
        },
        "vocabulary": {
            "score": base_score,
            "strong_words_used": list(set(words))[:8],
            "repeated_words": repeated,
            "suggestions": [],
            "words_to_learn": [],
        },
        "grammar": {"score": base_score, "mistakes": []},
        "fluency": {
            "score": max(base_score - len(fillers) * 0.3, 1),
            "flow_comment": f"{len(fillers)} filler word(s) detected." if fillers else "No major filler words detected.",
            "filler_words_found": fillers,
            "suggested_transitions": ["After that", "Meanwhile", "In addition", "As a result"],
        },
        "pronunciation": {
            "score": base_score,
            "notes": "Pronunciation could not be assessed without the AI evaluator.",
            "mispronounced_words": [],
        },
        "coherence_score": base_score,
        "strengths": ["Completed the full speaking duration", "Stayed on topic"],
        "areas_to_improve": ["Reduce repeated vocabulary", "Use more descriptive language"],
        "sample_improved_response": "",
        "vocabulary_practice": [],
        "quick_tips": ["Try to vary your vocabulary instead of repeating the same words."],
    }
