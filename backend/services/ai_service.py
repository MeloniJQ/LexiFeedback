"""
LexiFeed AI Service — Resume-aware question generation, follow-up engine, and feedback.

  - generate_questions_from_resume()  →  parses resume text, generates deep questions
  - generate_followup_question()      →  given Q+A pair, asks 1 smart follow-up
  - generate_feedback()               →  end-of-session full analysis
  - extract_resume_text()             →  PDF / DOCX / plain-text extractor
"""

import os
import re
import json
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

load_dotenv()

# NOTE: This service used to hardcode an OpenAI client that only worked with
# OPENAI_API_KEY. That variable is never set in our .env (we use OpenRouter),
# so every AI call was silently failing and falling back to static template
# questions/answers. We now route through llm/provider_factory, which reads
# AI_PROVIDER + OPENROUTER_API_KEY from .env (see backend/.env).


# ─────────────────────────────────────────────
# Resume extraction
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
        print(f"[extract_resume_text] Error: {e}")
        return ""


# ─────────────────────────────────────────────
# OpenAI wrapper
# ─────────────────────────────────────────────

def _chat(system: str, user: str, temperature: float = 0.7) -> str:
    """
    Single choke point for every AI call in this service (questions,
    follow-ups, feedback, reading passages, pronunciation analysis).

    Uses llm/provider_factory.get_provider(), which currently returns
    OpenRouterProvider (AI_PROVIDER=openrouter in .env) using the free
    model configured in AI_MODEL (meta-llama/llama-3.3-70b-instruct:free).
    If OPENROUTER_API_KEY is missing, get_provider() raises immediately —
    callers already catch exceptions and fall back gracefully.
    """
    provider = get_provider()
    return provider.chat(system=system, user=user, temperature=temperature)


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
        raw = _chat(system, user, temperature=0.9)

        parsed = parse_json_object(raw)

        # ensure list safety
        if not isinstance(parsed, list):
            parsed = []

        return validate_questions(parsed, context, num_questions=num_questions)

    except Exception as e:
        print(f"[generate_questions] Error: {e}")
        return generate_fallback_questions(context, count=num_questions)


# ─────────────────────────────────────────────
# Follow-up (FIXED CRITICAL BUG HERE)
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
        raw = _chat(system, user, temperature=0.75)
        result = parse_json_object(raw)

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
        print(f"[followup] Error: {e}")
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
        print(f"[feedback] Error: {e}")
        return _local_feedback(transcript, role, company)


# ─────────────────────────────────────────────
# Legacy
# ─────────────────────────────────────────────

def generate_questions(company: str, role: str) -> str:
    qs = generate_questions_from_resume(company, role)
    return "\n".join([f"{q['id']}. {q['question']}" for q in qs])


# ─────────────────────────────────────────────
# Fallbacks
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


def generate_ai_passage(difficulty: str, mode: str) -> dict:
    """
    Generate an AI passage using GPT-4o-mini.
    Returns:
        {"title": "...", "content": "..."}
    """
    system_prompt = (
        "You are an expert English language coach. Generate reading practice passages. "
        "Always respond with valid JSON only — no markdown fences."
    )

    if mode == "journalist":
        script_style = (
            "Generate a TV news anchor broadcast script. The script should start with a classic "
            "news anchor opening (e.g., 'Good evening, I'm reporting live from LexiFeed News...') "
            "and end with an anchor sign-off. The tone should be professional, dramatic, and journalist-like."
        )
    else:
        script_style = (
            "Generate a standard educational, historical, or scientific reading passage."
        )

    if difficulty == "beginner":
        level_rules = (
            "Difficulty level is Beginner. Use simple words, short sentences (5-10 words per sentence), "
            "and very basic grammar. Total length should be around 40 to 60 words."
        )
    elif difficulty == "advanced":
        level_rules = (
            "Difficulty level is Advanced. Use highly advanced, academic, or professional vocabulary, "
            "long and complex sentence structures, and subtle nuances. Total length should be around 150 to 200 words."
        )
    else:  # intermediate
        level_rules = (
            "Difficulty level is Intermediate. Use moderate vocabulary, standard compound sentences, "
            "and clean structures. Total length should be around 80 to 120 words."
        )

    user_prompt = f"""
    Create a unique reading passage based on the following rules:
    - {script_style}
    - {level_rules}
    - Return a JSON object with 'title' and 'content' keys. Do not include markdown formatting or backticks.
    
    Format:
    {{
      "title": "Passage Title",
      "content": "Full passage text goes here..."
    }}
    """

    try:
        raw = _chat(system_prompt, user_prompt, temperature=0.8)
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        if "title" in data and "content" in data:
            return data
        raise ValueError("Invalid JSON keys")
    except Exception as e:
        print(f"[generate_ai_passage] Error: {e}. Using fallback.")
        return _fallback_passage(difficulty, mode)


def _fallback_passage(difficulty: str, mode: str) -> dict:
    if mode == "journalist":
        if difficulty == "beginner":
            return {
                "title": "Breaking News: Local Cat Rescued",
                "content": "Good morning. This is LexiFeed News. A small cat is safe today. The cat was in a tall tree. Firefighters helped the cat. Many people came to watch. The cat is now home. I am reporting live from the scene. Back to you in the studio."
            }
        elif difficulty == "advanced":
            return {
                "title": "Special Report: Global Economic Summit",
                "content": "Good evening. Reporting live for LexiFeed, we are broadcasting from the international convention center where world leaders have gathered to address volatile financial fluctuations. Economists warning of impending inflation are urging immediate regulatory interventions. The discourse revolves around fiscal policies, sustainable infrastructure subsidies, and trade deficits. Analysts remain highly skeptical about a consensus being reached, highlighting systemic polarization among member states. We will continue monitoring these high-stakes negotiations as negotiations unfold. This is LexiFeed News, signing off."
            }
        else:
            return {
                "title": "Daily Update: City Park Renovation",
                "content": "Good afternoon. This is LexiFeed News, reporting live from City Park. Today, local officials announced a major renovation plan. The project will cost two million dollars and take six months. Workers will build new playgrounds, plant hundreds of trees, and repair walking trails. Residents are excited about these improvements, saying the park has been neglected for too long. We will bring you updates as construction begins. This is LexiFeed News, back to you."
            }
    else:
        if difficulty == "beginner":
            return {
                "title": "The Big Sun",
                "content": "The sun is a very big star. It is hot and bright. The sun gives us light and warm days. Plants need the sun to grow. Animals need the sun too. We can see the sun in the sky during the day. It goes down at night."
            }
        elif difficulty == "advanced":
            return {
                "title": "Quantum Entanglement",
                "content": "Quantum entanglement is a physical phenomenon that occurs when pairs or groups of particles are generated, interact, or share spatial proximity in ways such that the quantum state of each particle cannot be described independently of the state of the others. Even when separated by astronomical distances, measurements of physical properties such as position, momentum, spin, and polarization performed on entangled particles are found to be perfectly correlated. This counterintuitive behavior, which Einstein famously referred to as spooky action at a distance, lies at the heart of quantum computing and cryptographic engineering."
            }
        else:
            return {
                "title": "The Great Barrier Reef",
                "content": "The Great Barrier Reef is the world's largest coral reef system. It is located in the Coral Sea, off the coast of Queensland, Australia. The reef is so large that it can be seen from space. It is composed of billions of tiny organisms, known as coral polyps. This vibrant underwater ecosystem supports a wide diversity of marine life, including sea turtles, sharks, and thousands of species of colorful fish. However, climate change poses a major threat to its survival."
            }


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
        raw = _chat(system_prompt, user_prompt, temperature=0.5)
        raw = re.sub(r"```json|```", "", raw).strip()
        data = json.loads(raw)
        
        # Validate keys
        required_keys = ["accuracy_score", "fluency_score", "mispronounced_words", "added_words", "feedback_markdown"]
        for key in required_keys:
            if key not in data:
                raise ValueError(f"Missing key: {key}")
        return data
    except Exception as e:
        print(f"[analyze_pronunciation] AI Error: {e}. Running local fallback comparison.")
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


