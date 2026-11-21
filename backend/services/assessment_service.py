"""
LexiFeed CEFR Initial English Level Assessment — Feature 1.

Builds a 5-part placement test (Grammar, Vocabulary, Reading, Listening,
Speaking) and scores it into a CEFR level (A1-C2) that then drives every
other practice mode's difficulty.

Design notes:
  - Grammar/Vocabulary use a static, hand-authored item bank spanning all
    six CEFR levels (2 items per level). This is a placement test, not a
    dynamically-generated one — instant, deterministic to score, and
    doesn't depend on an AI provider being reachable, which matters because
    this runs on a brand-new user's very first screen.
  - Reading and Listening REUSE the existing `generate_ai_passage()` /
    fallback-pool machinery from ai_service.py (same function Feature 3
    extends), so we don't maintain a second passage generator.
  - Speaking REUSES `analyze_pronunciation()` (read-aloud accuracy) and
    adds a dedicated open-ended speaking analysis (grammar/vocabulary/
    fluency/confidence/hesitation) scored via the same provider-with-
    fallback pattern used across the rest of the app.
"""

import json
import logging
import random
import re
from concurrent.futures import ThreadPoolExecutor

from services.ai_service import generate_ai_passage, analyze_pronunciation, _chat, _clean_json_text, _fallback_passage
from utils.cefr import CEFR_LEVELS, score_to_level

logger = logging.getLogger("lexifeed.assessment_service")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(name)s %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


# ─────────────────────────────────────────────────────────────
# Static Grammar / Vocabulary item banks (2 per CEFR level)
# ─────────────────────────────────────────────────────────────

GRAMMAR_BANK = [
    {"id": "g_a1_1", "level": "A1", "question": "She ___ a teacher.", "options": ["is", "are", "be", "am"], "answer": 0},
    {"id": "g_a1_2", "level": "A1", "question": "I ___ two brothers.", "options": ["has", "have", "having", "had"], "answer": 1},
    {"id": "g_a2_1", "level": "A2", "question": "Yesterday, we ___ to the cinema.", "options": ["go", "goes", "went", "gone"], "answer": 2},
    {"id": "g_a2_2", "level": "A2", "question": "There ___ some milk in the fridge.", "options": ["is", "are", "be", "were"], "answer": 0},
    {"id": "g_b1_1", "level": "B1", "question": "If it rains tomorrow, we ___ the picnic.", "options": ["cancel", "will cancel", "cancelled", "canceling"], "answer": 1},
    {"id": "g_b1_2", "level": "B1", "question": "By the time she arrived, the meeting ___ already ___.", "options": ["has / started", "had / started", "was / starting", "have / started"], "answer": 1},
    {"id": "g_b2_1", "level": "B2", "question": "The report ___ by the manager before it is sent out.", "options": ["reviews", "is reviewing", "must be reviewed", "reviewed"], "answer": 2},
    {"id": "g_b2_2", "level": "B2", "question": "Hardly ___ the presentation when the fire alarm rang.", "options": ["I had started", "had I started", "I started", "did I start"], "answer": 1},
    {"id": "g_c1_1", "level": "C1", "question": "___ the delay, the project was delivered on budget.", "options": ["Despite of", "Although", "Notwithstanding", "Even so"], "answer": 2},
    {"id": "g_c1_2", "level": "C1", "question": "Were it not for her intervention, the deal ___ fallen through.", "options": ["would have", "will have", "had", "would"], "answer": 0},
    {"id": "g_c2_1", "level": "C2", "question": "Rarely has a policy proposal generated ___ controversy as this one.", "options": ["such", "so", "as much as", "such a"], "answer": 0},
    {"id": "g_c2_2", "level": "C2", "question": "The committee's decision, ___ many had anticipated, sparked immediate backlash.", "options": ["as", "which", "that", "so"], "answer": 0},
]

VOCABULARY_BANK = [
    {"id": "v_a1_1", "level": "A1", "question": "Choose the opposite of 'big'.", "options": ["small", "tall", "long", "heavy"], "answer": 0},
    {"id": "v_a1_2", "level": "A1", "question": "What do you use to write?", "options": ["a spoon", "a pen", "a chair", "a plate"], "answer": 1},
    {"id": "v_a2_1", "level": "A2", "question": "'Purchase' most nearly means:", "options": ["sell", "buy", "borrow", "return"], "answer": 1},
    {"id": "v_a2_2", "level": "A2", "question": "Choose the word that fits: 'The weather was so ___ we stayed inside all day.'", "options": ["terrible", "delicious", "quiet", "expensive"], "answer": 0},
    {"id": "v_b1_1", "level": "B1", "question": "'Reluctant' means:", "options": ["eager", "unwilling", "confused", "confident"], "answer": 1},
    {"id": "v_b1_2", "level": "B1", "question": "Choose the best word: 'Despite the traffic, she ___ arrived on time.'", "options": ["barely", "somehow", "hardly", "rarely"], "answer": 1},
    {"id": "v_b2_1", "level": "B2", "question": "'To undermine' someone's confidence means to:", "options": ["strengthen it", "weaken it gradually", "ignore it", "praise it"], "answer": 1},
    {"id": "v_b2_2", "level": "B2", "question": "Which word best fits: 'The negotiations reached a ___ after months of disagreement.'", "options": ["stalemate", "compromise", "collision", "vacancy"], "answer": 1},
    {"id": "v_c1_1", "level": "C1", "question": "'Ambivalent' best describes someone who is:", "options": ["completely certain", "having mixed feelings", "extremely angry", "indifferent"], "answer": 1},
    {"id": "v_c1_2", "level": "C1", "question": "Choose the closest meaning of 'pragmatic': ", "options": ["idealistic", "impractical", "practical and realistic", "emotional"], "answer": 2},
    {"id": "v_c2_1", "level": "C2", "question": "'Ephemeral' most nearly means:", "options": ["everlasting", "short-lived", "expensive", "harmful"], "answer": 1},
    {"id": "v_c2_2", "level": "C2", "question": "A statement that is 'unequivocal' is:", "options": ["ambiguous", "unclear", "leaving no doubt", "poetic"], "answer": 2},
]

# Fallback comprehension questions used if AI-generated comprehension
# questions fail (kept generic so they don't depend on passage content).
_FALLBACK_COMPREHENSION = [
    {"question": "What was the main purpose of the passage/segment you just read or heard?",
     "options": ["To inform or explain", "To sell a product", "To tell a joke", "To give driving directions"],
     "answer": 0},
    {"question": "Which of these best describes the overall tone?",
     "options": ["Angry", "Neutral/informative", "Romantic", "Threatening"],
     "answer": 1},
]

SPEAKING_READALOUD_SENTENCES = [
    "Learning a new language takes practice, patience, and a little bit of courage every single day.",
    "Even on busy mornings, she always found a few quiet minutes to plan out her day.",
    "The best way to improve your speaking is to talk as often as you can, even if you make mistakes.",
]

SPEAKING_OPEN_QUESTIONS = [
    "Tell me about your typical day — what do you usually do from morning to evening?",
    "Describe a place you would like to visit and explain why.",
    "What are your goals for improving your English, and how do you plan to reach them?",
    "Talk about a challenge you faced recently and how you dealt with it.",
]


# ─────────────────────────────────────────────────────────────
# Building the assessment package
# ─────────────────────────────────────────────────────────────

def build_assessment() -> dict:
    """
    Assemble the full first-time placement test. Grammar/vocabulary items
    span every CEFR band since we don't know the user's level yet.
    Reading/listening passages default to an intermediate (B1-ish) starting
    difficulty, which is standard placement-test practice — scoring adapts
    from there rather than trying to be adaptive item-by-item.

    Performance note: this makes up to 4 live AI calls (reading passage,
    listening script, then comprehension questions for each). Each call is
    individually timeout-bounded (see llm/*_provider.py), but running them
    one after another can still make this endpoint noticeably slow,
    especially on a rate-limited free-tier provider. They're independent of
    each other except that comprehension questions need their passage first,
    so we run the two passage-generation calls in parallel, then the two
    comprehension-question calls in parallel — roughly halving worst-case
    latency instead of taking 4x a single call's time.
    """
    grammar_items = list(GRAMMAR_BANK)
    vocabulary_items = list(VOCABULARY_BANK)
    random.shuffle(grammar_items)
    random.shuffle(vocabulary_items)

    # Use fast fallbacks for the initial placement assessment to avoid AI timeouts
    # and ensure instant loading for brand-new users.
    reading_passage = _fallback_passage("intermediate", "standard")
    listening_script = _fallback_passage("intermediate", "journalist")

    reading_questions = _fallback_comprehension_from_passage(reading_passage.get("content", ""))
    listening_questions = _fallback_comprehension_from_passage(listening_script.get("content", ""))

    speaking_sentence = random.choice(SPEAKING_READALOUD_SENTENCES)
    speaking_questions = random.sample(SPEAKING_OPEN_QUESTIONS, k=2)

    # Strip answer keys before sending to the client — keep them only in the
    # scoring step (submit_assessment) so answers can't be inspected client-side.
    def _strip(items):
        return [{k: v for k, v in item.items() if k != "answer"} for item in items]

    return {
        "grammar": {"items": _strip(grammar_items)},
        "vocabulary": {"items": _strip(vocabulary_items)},
        "reading": {
            "title": reading_passage.get("title", "Reading Passage"),
            "content": reading_passage.get("content", ""),
            "questions": _strip(reading_questions),
        },
        "listening": {
            "title": listening_script.get("title", "Listening Segment"),
            "script": listening_script.get("content", ""),
            "questions": _strip(listening_questions),
        },
        "speaking": {
            "readaloud_sentence": speaking_sentence,
            "open_questions": speaking_questions,
        },
        # answer keys are returned separately so routes/assessment.py can
        # keep them server-side (in the session) rather than trust the client.
        "_answer_key": {
            "grammar": {i["id"]: i["answer"] for i in grammar_items},
            "vocabulary": {i["id"]: i["answer"] for i in vocabulary_items},
            "reading": reading_questions,
            "listening": listening_questions,
        },
    }


def _generate_comprehension_questions(passage_text: str) -> list:
    """AI-generate 2 MCQ comprehension questions for a passage/script, with
    a safe static fallback if the AI call fails."""
    if not passage_text.strip():
        return [dict(q) for q in _FALLBACK_COMPREHENSION]

    system = (
        "You write reading/listening comprehension questions for an English "
        "placement test. Always respond with valid JSON only."
    )
    user = f"""
Based on this passage, write exactly 2 multiple-choice comprehension questions.
Each question must have exactly 4 options and one correct answer.

PASSAGE:
\"\"\"{passage_text}\"\"\"

Return ONLY JSON in this shape:
{{
  "questions": [
    {{"question": "...", "options": ["...", "...", "...", "..."], "answer": 0}},
    {{"question": "...", "options": ["...", "...", "...", "..."], "answer": 2}}
  ]
}}
(The "answer" field is the 0-based index of the correct option.)
"""
    try:
        raw = _chat(system, user, temperature=0.4, json_mode=True)
        data = json.loads(_clean_json_text(raw))
        questions = data.get("questions", [])
        if len(questions) >= 2 and all("options" in q and "answer" in q for q in questions[:2]):
            return questions[:2]
        raise ValueError("Malformed comprehension questions from AI")
    except Exception as e:
        logger.warning(f"[_generate_comprehension_questions] AI generation failed ({e}); using passage-derived fallback.")
        return _fallback_comprehension_from_passage(passage_text)


# Distinctive-looking filler words that are very unlikely to appear in a
# short passage — used as plausible-looking WRONG options for the
# passage-derived fallback comprehension questions below.
_DISTRACTOR_WORD_POOL = [
    "volcano", "orchestra", "spreadsheet", "umbrella", "telescope", "backpack",
    "committee", "sculpture", "avalanche", "keyboard", "aquarium", "elevator",
    "lighthouse", "parliament", "escalator", "microscope", "warehouse", "battery",
]

_COMMON_STOPWORDS = {
    "about", "after", "again", "their", "there", "these", "those", "which",
    "while", "would", "could", "should", "where", "being", "other", "still",
    "every", "first", "never", "since", "under", "until", "though", "through",
}


def _fallback_comprehension_from_passage(passage_text: str) -> list:
    """
    When AI-generated comprehension questions aren't available, build a
    "which word actually appeared" recognition check straight from the real
    passage text instead of falling back to a fully generic, passage-
    unrelated question. It's a coarser signal than true comprehension
    (it checks attentive reading/listening rather than understanding), but
    unlike a disconnected static question, a correct answer here still
    requires having actually read/heard THIS passage — so the assessment
    stays diagnostic even during an AI outage instead of becoming a coin flip.
    """
    words = re.findall(r"[A-Za-z]{5,}", passage_text)
    seen = set()
    candidates = []
    for w in words:
        lw = w.lower()
        if lw in _COMMON_STOPWORDS or lw in seen:
            continue
        seen.add(lw)
        candidates.append(w)

    if len(candidates) < 6:
        # Passage too short/sparse to build a fair question from — fall
        # back to the generic pair rather than risk a broken/trivial question.
        return [dict(q) for q in _FALLBACK_COMPREHENSION]

    random.shuffle(candidates)
    questions = []
    for correct_word in candidates[:2]:
        distractors = random.sample(
            [d for d in _DISTRACTOR_WORD_POOL if d.lower() not in seen], 3
        )
        options = distractors + [correct_word]
        random.shuffle(options)
        questions.append({
            "question": "Which of these words actually appeared in the passage/segment you just read or heard?",
            "options": options,
            "answer": options.index(correct_word),
        })
    return questions


# ─────────────────────────────────────────────────────────────
# Scoring
# ─────────────────────────────────────────────────────────────

def _score_mcq_section(items_with_keys: list, user_answers: dict) -> float:
    """items_with_keys: list of {id, level, answer}. user_answers: {id: chosen_index}."""
    if not items_with_keys:
        return 0.0
    correct = 0
    for item in items_with_keys:
        chosen = user_answers.get(item["id"])
        if chosen is not None and int(chosen) == int(item["answer"]):
            correct += 1
    return round((correct / len(items_with_keys)) * 100, 1)


def _score_comprehension(questions_with_keys: list, user_answers: list) -> float:
    if not questions_with_keys:
        return 0.0
    correct = 0
    for idx, q in enumerate(questions_with_keys):
        chosen = user_answers[idx] if idx < len(user_answers) else None
        if chosen is not None and int(chosen) == int(q.get("answer", -1)):
            correct += 1
    return round((correct / len(questions_with_keys)) * 100, 1)


_FILLERS = re.compile(r"\b(um+|uh+|erm+|like|you know|sort of|kind of|i mean)\b", re.IGNORECASE)


def _analyze_open_speech(transcripts: list) -> dict:
    """
    Analyze open-ended spoken answers for grammar, vocabulary, fluency,
    confidence, and hesitation. Returns scores 0-100 for each.
    Falls back to a local heuristic (filler-word ratio + sentence length)
    if the AI call fails, so the assessment never hard-fails on this step.
    """
    combined = "\n\n".join(t for t in transcripts if t and t.strip())
    if not combined.strip():
        return {"grammar": 0, "vocabulary": 0, "fluency": 0, "confidence": 0, "hesitation": 0}

    system = (
        "You are a CEFR-certified English examiner scoring a spoken placement test. "
        "Score strictly against CEFR descriptors. Respond with valid JSON only."
    )
    user = f"""
Score these spoken answers from an English learner on a 0-100 scale for each dimension.

TRANSCRIPTS:
\"\"\"{combined}\"\"\"

Return ONLY this JSON:
{{
  "grammar": <0-100>,
  "vocabulary": <0-100>,
  "fluency": <0-100>,
  "confidence": <0-100>,
  "hesitation": <0-100 — HIGHER means LESS hesitation (more fluent delivery)>
}}
"""
    try:
        raw = _chat(system, user, temperature=0.3, json_mode=True)
        data = json.loads(_clean_json_text(raw))
        return {
            k: max(0, min(100, float(data.get(k, 50))))
            for k in ["grammar", "vocabulary", "fluency", "confidence", "hesitation"]
        }
    except Exception as e:
        logger.warning(f"[_analyze_open_speech] AI scoring failed ({e}); using heuristic fallback.")
        words = combined.split()
        filler_count = len(_FILLERS.findall(combined))
        filler_ratio = filler_count / max(1, len(words))
        sentence_count = len(re.findall(r"[.!?]+", combined)) or 1
        avg_sentence_len = len(words) / sentence_count
        # Heuristic: longer, more varied answers with fewer fillers score higher.
        base = min(100, max(10, len(set(w.lower() for w in words)) / max(1, len(words)) * 200))
        hesitation = max(0, 100 - filler_ratio * 500)
        fluency = max(0, min(100, avg_sentence_len * 6))
        return {
            "grammar": round(base * 0.8, 1),
            "vocabulary": round(base, 1),
            "fluency": round(fluency, 1),
            "confidence": round((fluency + hesitation) / 2, 1),
            "hesitation": round(hesitation, 1),
        }


def score_assessment(answer_key: dict, submission: dict) -> dict:
    """
    submission = {
      "grammar": {item_id: chosen_index, ...},
      "vocabulary": {item_id: chosen_index, ...},
      "reading_answers": [chosen_index, ...],
      "listening_answers": [chosen_index, ...],
      "speaking": {
          "readaloud_transcript": "...",
          "readaloud_reference": "...",
          "open_transcripts": ["...", "..."],
      }
    }
    Returns all the per-section + overall scores that get persisted on the User row.
    """
    grammar_items = [{"id": i, "level": None, "answer": a} for i, a in answer_key["grammar"].items()]
    vocabulary_items = [{"id": i, "level": None, "answer": a} for i, a in answer_key["vocabulary"].items()]

    grammar_mcq_score = _score_mcq_section(grammar_items, submission.get("grammar", {}))
    vocabulary_mcq_score = _score_mcq_section(vocabulary_items, submission.get("vocabulary", {}))
    reading_score = _score_comprehension(answer_key["reading"], submission.get("reading_answers", []))
    listening_score = _score_comprehension(answer_key["listening"], submission.get("listening_answers", []))

    speaking = submission.get("speaking", {})
    readaloud_transcript = speaking.get("readaloud_transcript", "")
    readaloud_reference = speaking.get("readaloud_reference", "")
    open_transcripts = speaking.get("open_transcripts", [])

    if readaloud_transcript and readaloud_reference:
        pron_result = analyze_pronunciation(readaloud_transcript, readaloud_reference)
        pronunciation_score = float(pron_result.get("accuracy_score", 50) or 50)
    else:
        pronunciation_score = 0.0

    speech = _analyze_open_speech(open_transcripts)

    # Blend written (MCQ) + spoken evidence for grammar/vocabulary so a
    # single bad multiple-choice guess doesn't dominate the level decision.
    grammar_score = round(grammar_mcq_score * 0.65 + speech["grammar"] * 0.35, 1)
    vocabulary_score = round(vocabulary_mcq_score * 0.65 + speech["vocabulary"] * 0.35, 1)
    fluency_score = round((speech["fluency"] + speech["hesitation"]) / 2, 1)
    speaking_score = round(
        (pronunciation_score + speech["fluency"] + speech["confidence"] + speech["hesitation"]) / 4, 1
    )

    overall_score = round(
        grammar_score * 0.2
        + vocabulary_score * 0.2
        + reading_score * 0.2
        + listening_score * 0.2
        + speaking_score * 0.2,
        1,
    )

    level = score_to_level(overall_score)

    return {
        "english_level": level,
        "overall_score": overall_score,
        "grammar_score": grammar_score,
        "vocabulary_score": vocabulary_score,
        "pronunciation_score": round(pronunciation_score, 1),
        "fluency_score": fluency_score,
        "speaking_score": speaking_score,
        "reading_score": reading_score,
        "listening_score": listening_score,
    }
