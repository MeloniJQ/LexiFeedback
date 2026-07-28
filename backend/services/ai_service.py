"""
LexiFeed AI Service — Resume-aware question generation, follow-up engine,
reading-passage generation, TV-news-script generation, and feedback.

  - generate_questions_from_resume()  →  parses resume text, generates deep questions
  - generate_followup_question()      →  given Q+A pair, asks 1 smart follow-up
  - generate_feedback()               →  end-of-session full analysis
  - extract_resume_text()             →  PDF / DOCX / plain-text extractor
  - generate_ai_passage()             →  reading passages + TV news anchor scripts
  - analyze_pronunciation()           →  compares spoken transcript to reference text

─────────────────────────────────────────────────────────────────────────────
MIGRATION NOTE (OpenAI → Google Gemini):
This file previously called OpenAI's `gpt-4o-mini` via the `openai` SDK.
It now calls Google's `gemini-2.5-flash` via the official `google-genai` SDK.

  * All public function names, parameters, and return shapes are UNCHANGED —
    every route/service that imports from this module keeps working as-is.
  * The API key is read from GEMINI_API_KEY (see .env).
  * JSON-producing calls now use Gemini's native `response_mime_type =
    "application/json"` config instead of asking the model nicely and
    regex-stripping markdown fences (Gemini still occasionally wraps output
    in fences, so we keep the stripping as a defensive fallback).
─────────────────────────────────────────────────────────────────────────────
"""

import os
import re
import json
import random
import logging
import threading
from google import genai
from google.genai import types
from dotenv import load_dotenv

from services.interview_agent import (
    build_followup_prompt,
    build_interview_context,
    build_question_generation_prompt,
    fallback_followup,
    generate_fallback_questions,
    parse_json_object,
    validate_questions,
)
from llm.provider_factory import get_provider
from utils.cefr import CEFR_READING_TOPICS, READING_LENGTHS, normalize_level

load_dotenv()

logger = logging.getLogger("lexifeed.ai_service")
if not logger.handlers:
    # Keep logging config local to this module so we don't clobber any
    # app-wide logging setup — just ensures messages surface even if the
    # rest of the app hasn't configured logging yet.
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] %(name)s %(levelname)s: %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

GEMINI_MODEL = "gemini-2.5-flash"

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

if not client:
    logger.warning(
        "GEMINI_API_KEY is not set — all AI generation calls will use local fallbacks."
    )


# ─────────────────────────────────────────────
# Resume extraction  (unchanged — no AI provider involved)
# ─────────────────────────────────────────────

def extract_resume_text(filepath: str) -> str:
    ext = os.path.splitext(filepath)[1].lower()

    try:
        if ext == ".pdf":
            try:
                import pdfplumber
                with pdfplumber.open(filepath) as pdf:
                    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
                return text[:4000].strip()
            except ImportError:
                pass

            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(filepath)
                text = "\n".join(page.extract_text() or "" for page in reader.pages)
                return text[:4000].strip()
            except ImportError:
                return ""

        elif ext == ".docx":
            try:
                import docx
                doc = docx.Document(filepath)
                text = "\n".join(p.text for p in doc.paragraphs)
                return text[:4000].strip()
            except ImportError:
                return ""

        else:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()[:4000].strip()

    except Exception as e:
        logger.error(f"[extract_resume_text] Error: {e}")
        return ""


# ─────────────────────────────────────────────
# Chat — OpenRouter (preferred) with Gemini fallback
# ─────────────────────────────────────────────

def _chat(system: str, user: str, temperature: float = 0.7, json_mode: bool = False) -> str:
    """
    Single choke point for every AI call in this service.

    Preferred path: the configured AI_PROVIDER (OpenRouter by default, via
    llm/provider_factory.get_provider()). If that call fails for any reason
    (missing/invalid key, rate limit, network error, provider outage), we
    fall back to a direct Gemini call. If both external calls fail, the
    caller's own except block takes over with a static/template fallback.
    """
    try:
        provider = get_provider()
        return provider.chat(system=system, user=user, temperature=temperature)
    except Exception as e:
        logger.warning(f"[_chat] Primary provider failed ({e}); falling back to Gemini.")
        return _gemini_chat(system, user, temperature=temperature, json_mode=json_mode)


def _gemini_chat(system: str, user: str, temperature: float = 0.7, json_mode: bool = False) -> str:
    """
    Thin wrapper around Gemini's generate_content call. Used as a fallback
    when the primary provider (OpenRouter) is unavailable.

    json_mode=True tells Gemini to return valid JSON natively (response_mime_type),
    which is more reliable than asking for JSON in the prompt text alone.
    """
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
    """Strip markdown code fences Gemini occasionally adds even in JSON mode."""
    return re.sub(r"```json|```", "", raw).strip()


# ─────────────────────────────────────────────
# Questions
# ─────────────────────────────────────────────

def generate_questions_from_resume(
    company: str,
    role: str,
    resume_text: str = "",
    job_description: str = "",
    key_skills: str = "",
    asked_questions: list[str] | None = None,
    num_questions: int = 5,
) -> list[dict]:

    context = build_interview_context(
        company=company,
        role=role,
        resume_text=resume_text,
        job_description=job_description,
        key_skills=key_skills,
        asked_questions=asked_questions,
    )

    num_questions = max(1, min(num_questions, 20))

    system, user = build_question_generation_prompt(context, num_questions=num_questions)

    try:
        raw = _chat(system, user, temperature=0.9, json_mode=True)
        parsed = parse_json_object(_clean_json_text(raw))

        # ensure list safety
        if not isinstance(parsed, list):
            parsed = []

        return validate_questions(parsed, context, num_questions=num_questions)

    except Exception as e:
        logger.error(f"[generate_questions] Gemini error: {e}. Using fallback questions.")
        return generate_fallback_questions(context, count=num_questions)


# ─────────────────────────────────────────────
# Follow-up
# ─────────────────────────────────────────────

def generate_followup_question(
    original_question: str,
    candidate_answer: str,
    company: str,
    role: str,
    previous_pairs: list[dict] | None = None,
    resume_context: str = "",
) -> dict:
    system, user = build_followup_prompt(
        original_question=original_question,
        candidate_answer=candidate_answer,
        previous_pairs=previous_pairs,
        resume_context=resume_context,
        company=company,
        role=role,
    )

    try:
        raw = _chat(system, user, temperature=0.75, json_mode=True)
        result = parse_json_object(_clean_json_text(raw))

        if not isinstance(result, dict):
            raise ValueError("Invalid followup JSON")

        if "followup" in result:
            result.setdefault(
                "reason",
                "This probes missing evidence in the answer."
            )
            result.setdefault("probe_target", "")
            result.setdefault("quote_used", "")
            return result

        raise ValueError("Missing followup key")

    except Exception as e:
        logger.error(f"[followup] Gemini error: {e}. Using fallback follow-up.")
        return fallback_followup(original_question, candidate_answer, company, role)


# ─────────────────────────────────────────────
# Feedback
# ─────────────────────────────────────────────

def generate_feedback(transcript: str, company: str, role: str) -> str:
    system = (
        "You are an expert interviewer and communication coach. "
        "Be precise, structured, and helpful."
    )

    user = f"""
Analyse interview for {role} at {company}.

{transcript}

Return:
- Language Quality
- Content Strengths
- Areas for Improvement
- Overall Score X/10
"""

    try:
        return _chat(system, user, temperature=0.7)
    except Exception as e:
        logger.error(f"[feedback] Gemini error: {e}. Using local fallback feedback.")
        return _local_feedback(transcript, role, company)


# ─────────────────────────────────────────────
# Legacy
# ─────────────────────────────────────────────

def generate_questions(company: str, role: str) -> str:
    qs = generate_questions_from_resume(company, role)
    return "\n".join([f"{q['id']}. {q['question']}" for q in qs])


# ─────────────────────────────────────────────
# Local (non-AI) fallbacks
# ─────────────────────────────────────────────

def _local_feedback(transcript: str, role: str, company: str) -> str:
    words = len(transcript.split())

    score = 6 if words < 20 else 8

    return f"""
**Interview Feedback**

Role: {role} at {company}

- Response length: {words} words
- Overall clarity: {"low" if words < 20 else "good"}

**Overall Score: {score}/10**
"""


# ─────────────────────────────────────────────
# Reading Passages + TV News Anchor Scripts
# ─────────────────────────────────────────────

# Topic pool for STANDARD reading passages (Task 3). A topic is chosen at
# random on every single generation call so consecutive requests explore
# different subject matter instead of the model drifting back to the same
# handful of "safe" topics.
READING_TOPICS = [
    "Technology", "Health", "Travel", "Education", "Psychology", "Business",
    "Science", "Environment", "Sports", "Culture", "Innovation", "History",
    "Daily life", "Productivity", "Communication", "Nature", "Space", "Wildlife",
]

# A parallel topic pool tailored to news-style stories for the TV News
# Anchor mode — broad enough to feel like a real bulletin rotation.
NEWS_TOPICS = [
    "local government announcement", "technology breakthrough", "sports championship",
    "severe weather event", "economic development", "community initiative",
    "scientific discovery", "cultural festival", "public health advisory",
    "environmental protection effort", "transportation infrastructure update",
    "education milestone", "small business spotlight", "wildlife conservation story",
    "space exploration update", "national holiday celebration",
]

# Word-count targets per difficulty for STANDARD passages (Task 3).
# Difficulty is expressed primarily through vocabulary/grammar/sentence
# complexity in the prompt — length increases only modestly across levels.
STANDARD_LENGTH_RULES = {
    "beginner": (180, 220, "simple, everyday vocabulary, short-to-medium sentences (8-14 words), basic grammar (present/past simple, simple connectors like 'and', 'but', 'because')"),
    "intermediate": (250, 320, "moderate vocabulary, a mix of simple and compound-complex sentences, varied grammar (relative clauses, conditionals, passive voice used naturally)"),
    "advanced": (350, 450, "sophisticated, precise vocabulary, long and complex sentence structures, nuanced grammar (subordinate clauses, varied transitions, idiomatic phrasing)"),
}

# Word-count targets per difficulty for TV NEWS ANCHOR scripts (Task 4).
NEWS_LENGTH_RULES = {
    "beginner": (90, 130, "very simple vocabulary and short sentences, like a children's or beginner-friendly news bulletin — clear, friendly, and easy to read aloud"),
    "intermediate": (150, 200, "moderate vocabulary, professional news style, natural transitions between story beats, confident and neutral tone"),
    "advanced": (220, 300, "rich vocabulary, formal journalism tone, complex but natural sentence structures, realistic reporting style similar to a real TV news anchor"),
}

# In-memory "recently generated" tracker so we never hand back the exact
# same title twice in a row for the same (mode, difficulty) combination —
# this covers both the Gemini path (via a "do not reuse" instruction) and
# the fallback pool path (via random.choice excluding the last pick).
# Keyed by f"{mode}:{difficulty}" -> last title/index used.
# NOTE: This is per-process memory (not persisted), which is sufficient to
# stop "consecutive" repeats as required by Task 3/7 without needing a DB.
_last_generated_title: dict = {}
_last_fallback_index: dict = {}
_recent_titles_lock = threading.Lock()


def _build_passage_prompt(difficulty: str, mode: str, level: str = None, length: str = None):
    """
    Builds (system_prompt, user_prompt, chosen_topic) for either a standard
    reading passage or a TV news anchor script, with a randomly chosen topic
    and a "don't repeat the last one" instruction baked in.

    level  — optional CEFR level (A1-C2). When given, topics are drawn from
             the CEFR-appropriate pool (utils/cefr.CEFR_READING_TOPICS)
             instead of the generic difficulty-tier pool, per Feature 3.
    length — optional "short" | "medium" | "long" (utils/cefr.READING_LENGTHS).
             Overrides the word-count target while difficulty still controls
             vocabulary/grammar complexity via the existing style_rules.
    """
    key = f"{mode}:{difficulty}"

    system_prompt = (
        "You are an expert English language coach and content writer for a "
        "language-learning app. You write original, engaging reading passages "
        "and news scripts. Always respond with valid JSON only — no markdown "
        "fences, no commentary outside the JSON object."
    )

    with _recent_titles_lock:
        last_title = _last_generated_title.get(key, "")

    avoid_clause = (
        f'Do NOT reuse or closely paraphrase this previously generated title/topic: "{last_title}". '
        "Choose a genuinely different angle or subject."
        if last_title else ""
    )

    topic_pool = CEFR_READING_TOPICS[normalize_level(level)] if level else None
    length_override = READING_LENGTHS.get(length) if length else None

    if mode == "journalist":
        topic = random.choice(topic_pool) if topic_pool else random.choice(NEWS_TOPICS)
        min_words, max_words, style_rules = NEWS_LENGTH_RULES.get(difficulty, NEWS_LENGTH_RULES["intermediate"])
        if length_override:
            min_words, max_words = length_override

        tone_rules = {
            "beginner": (
                "Write it like a friendly, simple news bulletin for beginner English learners or children. "
                "Use short, clear sentences and everyday words. Still keep a warm anchor greeting and sign-off."
            ),
            "intermediate": (
                "Write it in a moderate, professional broadcast-news style with natural transitions between "
                "points, the way a competent local news anchor would deliver a standard segment."
            ),
            "advanced": (
                "Write it the way a seasoned, professional TV news anchor delivers a formal segment on a major "
                "network — rich vocabulary, confident pacing, complex but natural sentence structures, and a "
                "realistic journalistic tone."
            ),
        }.get(difficulty, "")

        user_prompt = f"""
Write a completely original TV news anchor broadcast script.

TOPIC AREA: {topic}
{avoid_clause}

STYLE:
- {tone_rules}
- Open with a natural anchor greeting appropriate to the tone (e.g. a warm "Good evening" for beginner, a
  polished network-style opening for advanced) and close with a clear anchor sign-off.
- {style_rules}
- Target length: {min_words}-{max_words} words. Stay within this range.
- The story must be a plausible, realistic-sounding news item (do not claim it is real/breaking factual news —
  it is a practice script), and must NOT repeat facts or wording from previous scripts.

Return ONLY a JSON object with 'title' and 'content' keys, no markdown formatting or backticks:
{{
  "title": "Segment Title",
  "content": "Full anchor script text goes here..."
}}
"""
    else:
        topic = random.choice(topic_pool) if topic_pool else random.choice(READING_TOPICS)
        min_words, max_words, style_rules = STANDARD_LENGTH_RULES.get(difficulty, STANDARD_LENGTH_RULES["intermediate"])
        if length_override:
            min_words, max_words = length_override

        user_prompt = f"""
Write a completely original educational reading passage for an English-learning app.

TOPIC AREA: {topic}
{avoid_clause}

STYLE:
- Difficulty level: {difficulty}. Express difficulty mainly through {style_rules}.
- Do NOT simply pad the passage to hit a word count — keep every sentence purposeful and the content
  genuinely interesting and informative.
- Target length: {min_words}-{max_words} words. Stay within this range.
- The passage must read naturally, like a well-written short educational or feature article, and must not
  repeat facts, phrasing, or structure from previous passages.

Return ONLY a JSON object with 'title' and 'content' keys, no markdown formatting or backticks:
{{
  "title": "Passage Title",
  "content": "Full passage text goes here..."
}}
"""

    return system_prompt, user_prompt, topic


def generate_ai_passage(difficulty: str, mode: str, level: str = None, length: str = None, exclude_titles: list = None) -> dict:
    """
    Generate an AI passage (standard reading passage or TV news anchor script)
    using Gemini 2.5 Flash.

    Public signature is backward-compatible — difficulty/mode are unchanged
    and remain the only required args. New optional args (Feature 3):
      level          — CEFR level (A1-C2), picks a level-appropriate topic pool
      length         — "short" | "medium" | "long"
      exclude_titles — recent titles (any source) to actively avoid repeating;
                        triggers up to 2 regeneration attempts on collision.

    Return shape is unchanged: {"title": "...", "content": "..."}
    """
    exclude_titles = [t.strip().lower() for t in (exclude_titles or []) if t]

    for attempt in range(3):
        system_prompt, user_prompt, topic = _build_passage_prompt(difficulty, mode, level=level, length=length)

        try:
            raw = _chat(system_prompt, user_prompt, temperature=0.9, json_mode=True)
            raw = _clean_json_text(raw)
            data = json.loads(raw)

            if "title" not in data or "content" not in data:
                raise ValueError("Invalid JSON keys returned by Gemini")

            if data["title"].strip().lower() in exclude_titles and attempt < 2:
                logger.info(f"[generate_ai_passage] Duplicate title '{data['title']}' — regenerating (attempt {attempt + 1}).")
                continue

            key = f"{mode}:{difficulty}"
            with _recent_titles_lock:
                _last_generated_title[key] = data["title"]
            logger.info(f"[generate_ai_passage] mode={mode} difficulty={difficulty} level={level} topic={topic} -> '{data['title']}'")
            return data

        except Exception as e:
            logger.error(
                f"[generate_ai_passage] Gemini error (mode={mode}, difficulty={difficulty}, attempt={attempt + 1}): {e}."
            )
            continue

    logger.error(f"[generate_ai_passage] All attempts failed/duplicated (mode={mode}, difficulty={difficulty}). Using fallback pool.")
    return _fallback_passage(difficulty, mode, exclude_titles=exclude_titles)


# ─────────────────────────────────────────────
# Fallback passage pool (Task 9: large pool, randomly selected, never the
# same one twice in a row for the same mode/difficulty)
# ─────────────────────────────────────────────

_FALLBACK_STANDARD_BEGINNER = [
    {
        "title": "The Big Sun",
        "content": "The sun is a very big star. It is hot and bright. The sun gives us light and warm days. Plants need the sun to grow. Animals need the sun too. We can see the sun in the sky during the day. It goes down at night, and then the moon comes out. Every morning, the sun rises again in the east. People use the sun's energy to make electricity with solar panels. Without the sun, our planet would be cold and dark, and nothing could live here."
    },
    {
        "title": "My Favorite Season",
        "content": "Spring is a happy season. The weather becomes warm after a cold winter. Flowers start to bloom in gardens and parks. Birds sing new songs every morning. Trees grow fresh green leaves. Many animals wake up from their long winter sleep. Children like to play outside more often. Farmers begin planting seeds in their fields. People open their windows to let in fresh air. Spring reminds us that new things can always begin."
    },
    {
        "title": "A Trip to the Market",
        "content": "Every Saturday, my family goes to the market. We buy fresh fruit and vegetables there. The market has many colorful stalls. Some sellers shout to tell people about their goods. We usually buy apples, bananas, and tomatoes. My mother likes to talk with the fruit seller. He always gives us a good price. After shopping, we walk home together. We carry our bags and talk about the week. I enjoy these simple trips with my family very much."
    },
    {
        "title": "Learning to Swim",
        "content": "Last summer, I learned how to swim. My teacher was very kind and patient. First, I learned to float on the water. Then I learned to kick my legs. It was hard at first, but I did not give up. Every day, I practiced a little more. After two weeks, I could swim across the pool. My family was very proud of me. Now I swim every weekend with my friends. Swimming makes me feel happy and strong."
    },
]

_FALLBACK_STANDARD_INTERMEDIATE = [
    {
        "title": "The Great Barrier Reef",
        "content": "The Great Barrier Reef is the world's largest coral reef system. It is located in the Coral Sea, off the coast of Queensland, Australia. The reef is so large that it can be seen from space. It is composed of billions of tiny organisms, known as coral polyps. This vibrant underwater ecosystem supports a wide diversity of marine life, including sea turtles, sharks, and thousands of species of colorful fish. Scientists estimate that the reef stretches over two thousand kilometers, making it one of the most complex natural structures on Earth. However, climate change poses a major threat to its survival, as rising ocean temperatures cause coral bleaching. Conservation groups are working closely with local communities to protect this fragile ecosystem for future generations."
    },
    {
        "title": "The Rise of Remote Work",
        "content": "Over the past decade, remote work has transformed how millions of people earn a living. What began as a niche arrangement for a small number of freelancers has become a mainstream option across many industries. Companies discovered that employees could remain productive, and sometimes even more engaged, without a daily commute to a physical office. This shift has reshaped city planning, as fewer workers travel downtown each day, and it has changed how people think about work-life balance. At the same time, remote work introduces new challenges, such as maintaining team communication and preventing employees from feeling isolated. Businesses are now experimenting with hybrid models that combine the flexibility of remote work with the collaboration benefits of in-person meetings, hoping to find an arrangement that works for everyone involved."
    },
    {
        "title": "The Science of Sleep",
        "content": "Sleep is one of the most essential, yet frequently misunderstood, aspects of human health. During sleep, the brain cycles through several distinct stages, each serving a different biological purpose. Deep sleep allows the body to repair tissue and strengthen the immune system, while REM sleep plays a crucial role in memory consolidation and emotional processing. Researchers have found that consistently getting fewer than seven hours of sleep per night is linked to a higher risk of heart disease, obesity, and cognitive decline. Despite this evidence, many people in modern society continue to sacrifice sleep in favor of work or entertainment. Experts recommend establishing a consistent sleep schedule, limiting screen exposure before bedtime, and creating a cool, dark sleeping environment to improve overall sleep quality."
    },
    {
        "title": "Traveling Off the Beaten Path",
        "content": "While famous landmarks attract millions of visitors every year, a growing number of travelers are choosing to explore lesser-known destinations instead. These off-the-beaten-path locations often offer a more authentic glimpse into local culture, free from the crowds and inflated prices found at popular tourist sites. Small mountain villages, quiet fishing towns, and rural farming communities can provide travelers with meaningful interactions and unique experiences that are difficult to find elsewhere. Additionally, spreading tourism across a wider range of locations can help distribute economic benefits more evenly and reduce the environmental strain placed on overcrowded destinations. Of course, traveling to remote areas requires more careful planning, since infrastructure and services may be limited, but many adventurous travelers consider this a small price to pay for a richer, more genuine journey."
    },
]

_FALLBACK_STANDARD_ADVANCED = [
    {
        "title": "Quantum Entanglement",
        "content": "Quantum entanglement is a physical phenomenon that occurs when pairs or groups of particles are generated, interact, or share spatial proximity in ways such that the quantum state of each particle cannot be described independently of the state of the others. Even when separated by astronomical distances, measurements of physical properties such as position, momentum, spin, and polarization performed on entangled particles are found to be perfectly correlated. This counterintuitive behavior, which Einstein famously referred to as spooky action at a distance, lies at the heart of quantum computing and cryptographic engineering. Contemporary researchers continue to grapple with the philosophical implications of entanglement, particularly regarding locality and causality, while simultaneously racing to harness the phenomenon for practical applications such as quantum key distribution and fault-tolerant quantum processors. As experimental fidelity improves, entanglement is transitioning from a theoretical curiosity into a foundational resource for next-generation information technologies."
    },
    {
        "title": "The Paradox of Choice in Modern Economies",
        "content": "Contemporary consumer markets are characterized by an unprecedented proliferation of choice, a phenomenon that behavioral economists have increasingly scrutinized for its psychological ramifications. While classical economic theory posits that greater choice invariably enhances consumer welfare by enabling closer alignment between preferences and outcomes, empirical research suggests a more nuanced reality. Beyond a certain threshold, the cognitive burden associated with evaluating an ever-expanding array of options can precipitate decision paralysis, diminished satisfaction, and heightened post-purchase regret—a cluster of effects collectively termed the paradox of choice. This phenomenon has profound implications for market design, prompting some firms to deliberately curate more limited assortments as a competitive strategy. Simultaneously, policymakers have begun exploring choice architecture interventions, informed by insights from behavioral science, to help consumers navigate increasingly complex decisions in domains ranging from retirement planning to healthcare enrollment, without resorting to outright paternalism."
    },
    {
        "title": "Epigenetics and the Malleability of the Genome",
        "content": "For much of the twentieth century, genetic determinism dominated scientific thinking, positing that an organism's DNA sequence alone dictates its phenotypic outcomes. The emergence of epigenetics has substantially complicated this narrative by revealing that gene expression can be modulated without any alteration to the underlying nucleotide sequence. Mechanisms such as DNA methylation, histone modification, and non-coding RNA activity function as molecular switches, dynamically regulating which genes are transcribed in response to environmental stimuli. Remarkably, accumulating evidence suggests that certain epigenetic modifications can persist across generations, challenging longstanding assumptions about the immutability of inherited traits and reviving, in a modified form, debates reminiscent of Lamarckian inheritance. These discoveries carry significant implications for fields ranging from oncology, where aberrant epigenetic patterns are implicated in tumorigenesis, to public health, where prenatal and early-life exposures are now understood to exert lasting biological consequences mediated through epigenetic pathways."
    },
    {
        "title": "The Architecture of Persuasion in Digital Media",
        "content": "The proliferation of algorithmically curated digital platforms has given rise to sophisticated architectures of persuasion that operate largely beneath the threshold of conscious awareness. Unlike traditional advertising, which relies on overt appeals, contemporary attention-based business models are engineered to exploit well-documented cognitive biases—variable reward schedules, social proof cascades, and the fear of missing out—in order to maximize user engagement metrics. Scholars of media studies and cognitive psychology have increasingly converged on the view that these design choices are not incidental but constitute a deliberate, empirically refined discipline sometimes termed persuasive technology. The societal ramifications of this architecture extend beyond individual attention capture, implicating broader phenomena such as political polarization, the erosion of sustained deep reading, and diminished capacity for reflective deliberation. In response, a nascent movement advocating for humane technology design has emerged, proposing regulatory and design-based interventions intended to realign platform incentives with genuine user wellbeing rather than engagement maximization alone."
    },
]

_FALLBACK_JOURNALIST_BEGINNER = [
    {
        "title": "Breaking News: Local Cat Rescued",
        "content": "Good morning. This is LexiFeed News. A small cat is safe today. The cat was in a tall tree. Firefighters helped the cat come down. Many people came to watch and cheer. The cat is now home with its family. Everyone is happy about the good news. I am reporting live from the scene. Back to you in the studio."
    },
    {
        "title": "Good News: New Park Opens Today",
        "content": "Good afternoon, everyone. This is LexiFeed News. A brand new park opened today in our town. It has swings, slides, and a big green field. Many families came to see the park this morning. Children played happily all day long. The mayor said the park was a gift for the community. People are very excited about this new place. That is all for now. Thank you for watching LexiFeed News."
    },
    {
        "title": "Weather Update: Sunny Skies Ahead",
        "content": "Hello and good morning! This is your LexiFeed weather update. Today will be a bright and sunny day. The sky will be clear with no rain. It will be a good day to play outside. Tomorrow will be a little cooler with some clouds. Remember to drink water and wear a hat in the sun. That is your weather for today. Have a wonderful day, and thank you for watching."
    },
]

_FALLBACK_JOURNALIST_INTERMEDIATE = [
    {
        "title": "Daily Update: City Park Renovation",
        "content": "Good afternoon. This is LexiFeed News, reporting live from City Park. Today, local officials announced a major renovation plan. The project will cost two million dollars and take six months. Workers will build new playgrounds, plant hundreds of trees, and repair walking trails. Residents are excited about these improvements, saying the park has been neglected for too long. Local business owners also expect the renovation to bring more visitors to the area. We will bring you updates as construction begins next week. This is LexiFeed News, back to you."
    },
    {
        "title": "Local School Wins National Science Award",
        "content": "Good evening, and thank you for joining us. This is LexiFeed News. A local high school has won a national award for its student science program. The team designed a water filtration system that could help communities without clean water access. Judges praised the students for their creativity and teamwork. The school's principal said this achievement will inspire more students to pursue science careers. The winning team will travel to the capital next month to present their project. We congratulate all the students involved. This has been LexiFeed News."
    },
    {
        "title": "New Bike Lanes Coming to Downtown",
        "content": "Good evening. This is LexiFeed News with your local update. The city council approved a plan today to add new bike lanes across downtown streets. Officials say the project aims to reduce traffic and encourage healthier commuting options. Construction will begin next month and should finish by early autumn. Some business owners have raised concerns about reduced parking, while cycling groups have welcomed the change enthusiastically. City planners say they will monitor the impact closely after the lanes open. That is tonight's top story. This is LexiFeed News, signing off."
    },
]

_FALLBACK_JOURNALIST_ADVANCED = [
    {
        "title": "Special Report: Global Economic Summit",
        "content": "Good evening. Reporting live for LexiFeed, we are broadcasting from the international convention center where world leaders have gathered to address volatile financial fluctuations. Economists warning of impending inflation are urging immediate regulatory interventions. The discourse revolves around fiscal policies, sustainable infrastructure subsidies, and trade deficits. Analysts remain highly skeptical about a consensus being reached, highlighting systemic polarization among member states. Sources close to the negotiations suggest that a preliminary framework could be unveiled by the end of the week, though significant disagreements over implementation timelines persist. We will continue monitoring these high-stakes negotiations as they unfold throughout the evening. This is LexiFeed News, signing off."
    },
    {
        "title": "Investigative Report: The Future of Urban Transit",
        "content": "Good evening, and welcome to LexiFeed News. Tonight, we turn our attention to a comprehensive investigation into the future of urban transportation infrastructure. Municipal planners across the region are grappling with aging transit systems, ballooning maintenance costs, and mounting public pressure to reduce carbon emissions. Our correspondents have spent the past month reviewing internal documents and interviewing transportation officials, revealing a complex web of competing priorities between rapid modernization and fiscal restraint. Critics argue that incremental reforms have proven insufficient, while proponents of the current approach caution against the risks of overextending municipal budgets. As this story continues to develop, LexiFeed News will provide ongoing coverage of this critical infrastructure debate. Reporting for LexiFeed, this has been our special investigative segment."
    },
    {
        "title": "Breaking Analysis: Shifts in Global Trade Policy",
        "content": "Good evening, and thank you for tuning in to LexiFeed News. Tonight's lead story examines a significant recalibration in international trade policy, as several major economies have signaled intentions to renegotiate longstanding tariff agreements. Financial markets reacted swiftly to the announcement, with analysts describing the volatility as emblematic of deeper anxieties surrounding global supply chain resilience. Industry leaders have expressed cautious optimism, suggesting that renegotiated terms could ultimately foster more equitable trading relationships, while skeptics warn of potential retaliatory measures that could destabilize fragile economic recoveries. Our senior economic correspondent will continue to track developments as diplomatic talks progress in the coming weeks. This has been a special report from LexiFeed News."
    },
]

_FALLBACK_POOLS = {
    "standard": {
        "beginner": _FALLBACK_STANDARD_BEGINNER,
        "intermediate": _FALLBACK_STANDARD_INTERMEDIATE,
        "advanced": _FALLBACK_STANDARD_ADVANCED,
    },
    "journalist": {
        "beginner": _FALLBACK_JOURNALIST_BEGINNER,
        "intermediate": _FALLBACK_JOURNALIST_INTERMEDIATE,
        "advanced": _FALLBACK_JOURNALIST_ADVANCED,
    },
}


def _fallback_passage(difficulty: str, mode: str, exclude_titles: list = None) -> dict:
    """
    Returns a fallback passage when Gemini is unavailable or errors out.

    Unlike the previous single-passage-per-key implementation, this now
    randomly selects from a pool of several passages per (mode, difficulty),
    while actively avoiding picking the same one twice in a row, and
    (Feature 3) avoiding any title already in exclude_titles when possible.
    """
    mode_key = mode if mode in _FALLBACK_POOLS else "standard"
    difficulty_key = difficulty if difficulty in _FALLBACK_POOLS[mode_key] else "intermediate"
    pool = _FALLBACK_POOLS[mode_key][difficulty_key]
    exclude_titles = set(exclude_titles or [])

    key = f"{mode_key}:{difficulty_key}"
    with _recent_titles_lock:
        last_index = _last_fallback_index.get(key, -1)

    candidates = [
        i for i in range(len(pool))
        if i != last_index and pool[i]["title"].strip().lower() not in exclude_titles
    ]
    if not candidates:
        # Every item is either the last one shown or already seen recently —
        # fall back to "just not the immediately previous one" rather than
        # blocking the user entirely.
        candidates = [i for i in range(len(pool)) if i != last_index] or [0]

    chosen_index = random.choice(candidates)

    with _recent_titles_lock:
        _last_fallback_index[key] = chosen_index

    logger.info(f"[_fallback_passage] mode={mode_key} difficulty={difficulty_key} -> pool index {chosen_index}")
    return dict(pool[chosen_index])  # return a copy so callers can't mutate the pool


# ─────────────────────────────────────────────
# Pronunciation analysis
# ─────────────────────────────────────────────

def analyze_pronunciation(transcript: str, original_text: str) -> dict:
    """
    Compare user's reading transcript with original text to assess pronunciation.
    """
    if not transcript or not transcript.strip():
        return {
            "accuracy_score": 0,
            "fluency_score": 0,
            "mispronounced_words": [],
            "added_words": [],
            "feedback_markdown": "No reading input detected. Please try recording again."
        }

    system_prompt = (
        "You are an expert English pronunciation coach. Your task is to compare a user's spoken "
        "reading transcript against the original text they were supposed to read. "
        "Assess their accuracy and fluency. Identify mispronounced, omitted, or heavily substituted words. "
        "Be constructive, objective, and precise. Respond with valid JSON only — no markdown fences."
    )

    user_prompt = f"""
    ORIGINAL TEXT:
    \"\"\"{original_text}\"\"\"

    USER TRANSCRIPT (from speech-to-text):
    \"\"\"{transcript}\"\"\"

    Task:
    1. Compare the two texts. Identify discrepancies.
    2. Calculate an 'accuracy_score' (0-100) based on matches.
    3. Calculate a 'fluency_score' (0-100) based on smoothness and correct phrasing (penalize if many words are missed or repeated).
    4. Compile a list of 'mispronounced_words' (words in the original text that the user missed, spoke wrong, or substituted). Keep this list clean, lowercase, with duplicates removed.
    5. Compile a list of 'added_words' (extra words in transcript that are not in the original text).
    6. Provide a helpful, formatted 'feedback_markdown' summarizing their performance, listing specific pronunciation drills or tips for their key problem words.

    Return ONLY this JSON structure:
    {{
      "accuracy_score": <int>,
      "fluency_score": <int>,
      "mispronounced_words": ["word1", "word2"],
      "added_words": ["word3"],
      "feedback_markdown": "detailed feedback in markdown"
    }}
    """

    try:
        raw = _chat(system_prompt, user_prompt, temperature=0.5, json_mode=True)
        raw = _clean_json_text(raw)
        data = json.loads(raw)

        # Validate keys
        required_keys = ["accuracy_score", "fluency_score", "mispronounced_words", "added_words", "feedback_markdown"]
        for key in required_keys:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        return data
    except Exception as e:
        logger.error(f"[analyze_pronunciation] Gemini error: {e}. Running local fallback comparison.")
        return _fallback_pronunciation_analysis(transcript, original_text)


def _fallback_pronunciation_analysis(transcript: str, original_text: str) -> dict:
    # Basic local string distance check for words
    def clean_words(text):
        return re.findall(r"\b\w+\b", text.lower())

    orig_words = clean_words(original_text)
    trans_words = clean_words(transcript)

    orig_set = set(orig_words)
    trans_set = set(trans_words)

    # Simple matching logic
    mispronounced = list(orig_set - trans_set)
    added = list(trans_set - orig_set)

    # Calculate scores
    total_words = len(orig_words) or 1
    matched_count = sum(1 for w in orig_words if w in trans_set)
    accuracy = min(100, round((matched_count / total_words) * 100))

    # Fluency is accuracy adjusted by added filler words
    filler_words = ["um", "uh", "like", "you know"]
    filler_count = sum(1 for w in trans_words if w in filler_words)
    fluency = max(0, accuracy - (filler_count * 5))

    feedback = f"""### Pronunciation Feedback (Local Analyser)

**Accuracy:** {accuracy}%
**Fluency:** {fluency}%

**Key Observations:**
- You successfully read {matched_count} out of {total_words} words.
- Try to slow down and focus on pronouncing every word clearly.

**Words to Practice:**
{", ".join(mispronounced) if mispronounced else "None! Excellent job."}
"""

    return {
        "accuracy_score": accuracy,
        "fluency_score": fluency,
        "mispronounced_words": mispronounced,
        "added_words": added,
        "feedback_markdown": feedback
    }