"""
LexiFeed AI Service — Step 1: Resume-aware question generation + follow-up engine.

Architecture:
  - generate_questions_from_resume()  →  parses resume text, generates 5 deep questions
  - generate_followup_question()      →  given Q+A pair, asks 1 smart follow-up
  - generate_feedback()               →  end-of-session full analysis
  - extract_resume_text()             →  PDF / DOCX / plain-text extractor
"""

import os
import re
import json
from openai import OpenAI
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

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key) if api_key else None

# ─────────────────────────────────────────────────────────────────────────────
# Resume text extraction helpers
# ─────────────────────────────────────────────────────────────────────────────

def extract_resume_text(filepath: str) -> str:
    """
    Extract plain text from PDF, DOCX, or plain-text files.
    Returns the text string (max ~4000 chars to stay within token budget).
    """
    ext = os.path.splitext(filepath)[1].lower()

    try:
        if ext == ".pdf":
            try:
                import pdfplumber
                with pdfplumber.open(filepath) as pdf:
                    text = "\n".join(
                        page.extract_text() or "" for page in pdf.pages
                    )
                return text[:4000].strip()
            except ImportError:
                pass  # fall through to pypdf2
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(filepath)
                text = "\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
                return text[:4000].strip()
            except ImportError:
                return ""

        elif ext in (".docx",):
            try:
                import docx
                doc = docx.Document(filepath)
                text = "\n".join(p.text for p in doc.paragraphs)
                return text[:4000].strip()
            except ImportError:
                return ""

        else:
            # Plain text / .txt / .md
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()[:4000].strip()

    except Exception as e:
        print(f"[extract_resume_text] Error reading {filepath}: {e}")
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# Core AI calls
# ─────────────────────────────────────────────────────────────────────────────

def _chat(system: str, user: str, temperature: float = 0.7) -> str:
    """
    Thin wrapper around OpenAI chat completions.
    Raises exception if client unavailable so callers can fall back.
    """
    if not client:
        raise RuntimeError("OpenAI client not initialised — check OPENAI_API_KEY.")
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


def generate_questions_from_resume(
    company: str,
    role: str,
    resume_text: str = "",
    job_description: str = "",
    key_skills: str = "",
) -> list[dict]:
    """
    Generate 5 highly personalised interview questions.

    Each question is one of: behavioral, technical, situational, culture-fit,
    or resume-specific.

    Returns a list of dicts:
      [{"id": 1, "type": "behavioral", "question": "...", "hint": "..."}, ...]

    Hint = short tip telling the candidate what a great answer looks like.
    """
    resume_block = f"\n\nCANDIDATE RESUME:\n{resume_text}" if resume_text else ""
    jd_block     = f"\n\nJOB DESCRIPTION:\n{job_description}" if job_description else ""
    skills_block = f"\n\nKEY SKILLS REQUIRED:\n{key_skills}" if key_skills else ""

    system = (
        "You are a senior hiring manager and expert interviewer. "
        "You generate deeply personalised, incisive interview questions. "
        "Always respond with valid JSON only — no markdown fences."
    )

    user = f"""
Generate exactly 5 interview questions for a **{role}** position at **{company}**.
{resume_block}{jd_block}{skills_block}

Rules:
1. If a resume is provided, at least 3 questions MUST reference specific items
   from that resume (projects, technologies, job titles, gaps, achievements).
2. Cover these types (one each): behavioral, technical, situational,
   culture-fit, and resume-specific (or motivation if no resume).
3. Each question should be open-ended and require a detailed STAR-method answer.
4. For technical questions, be specific to the actual tech stack in the resume
   or the job description — never generic.

Return a JSON array with exactly this shape (no extra keys):
[
  {{
    "id": 1,
    "type": "behavioral",
    "question": "...",
    "hint": "A great answer will cover Situation, Task, Action, Result and demonstrate X."
  }},
  ...
]
"""
    try:
        raw = _chat(system, user, temperature=0.75)
        # Strip any accidental markdown fences
        raw = re.sub(r"```json|```", "", raw).strip()
        questions = json.loads(raw)
        if isinstance(questions, list) and len(questions) == 5:
            return questions
        raise ValueError("Unexpected JSON shape")
    except Exception as e:
        print(f"[generate_questions_from_resume] OpenAI error: {e}. Using fallback.")
        return _fallback_questions(company, role)


def generate_followup_question(
    original_question: str,
    candidate_answer: str,
    company: str,
    role: str,
) -> dict:
    """
    Analyse the candidate's answer to the original question and generate
    ONE targeted follow-up question that probes a gap, assumption, or
    interesting point in their response.

    Returns:
      {
        "followup": "...",
        "reason":   "Why this follow-up was chosen (shown to interviewer/coach only)"
      }
    """
    system = (
        "You are a sharp, empathetic interviewer conducting a mock interview. "
        "Your follow-up questions are precise, probing, and help the candidate "
        "demonstrate depth. Respond with valid JSON only — no markdown fences."
    )
    user = f"""
ROLE: {role} at {company}

ORIGINAL QUESTION:
{original_question}

CANDIDATE ANSWER:
{candidate_answer}

Task:
1. Identify the SINGLE most important gap, vague claim, or interesting point in the answer.
2. Generate ONE concise follow-up question (1–2 sentences) that probes it.
3. Briefly explain WHY you chose this follow-up (1 sentence, for the coaching UI).

Return JSON:
{{
  "followup": "...",
  "reason": "..."
}}
"""
    try:
        raw = _chat(system, user, temperature=0.6)
        raw = re.sub(r"```json|```", "", raw).strip()
        result = json.loads(raw)
        if "followup" in result:
            return result
        raise ValueError("Missing 'followup' key")
    except Exception as e:
        print(f"[generate_followup_question] OpenAI error: {e}. Using fallback.")
        return {
            "followup": "Can you give a specific example that illustrates that point in more detail?",
            "reason": "The answer was general — a concrete example would strengthen it.",
        }


def generate_questions_from_resume(
    company: str,
    role: str,
    resume_text: str = "",
    job_description: str = "",
    key_skills: str = "",
    asked_questions: list[str] | None = None,
    num_questions: int = 5,
) -> list[dict]:
    """
    Agentic interview question generation with configurable question count.

    The agent first extracts resume, role, company, job-description, and skill
    signals, then asks the model for calibrated interview questions. If the
    model is unavailable, the local fallback still varies by role/company/resume
    instead of returning the same fixed question bank every time.
    
    Args:
        num_questions: Number of questions to generate (1-20, default 5)
    """
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
        questions = parse_json_object(raw)
        return validate_questions(questions, context, num_questions=num_questions)
    except Exception as e:
        print(f"[generate_questions_from_resume] Agent error: {e}. Using adaptive fallback.")
        return generate_fallback_questions(context, count=num_questions)


def generate_followup_question(
    original_question: str,
    candidate_answer: str,
    company: str,
    role: str,
    previous_pairs: list[dict] | None = None,
    resume_context: str = "",
) -> dict:
    """
    Agentic follow-up generation that adapts to the answer and prior session.
    """
    system, user = build_followup_prompt(
        original_question=original_question,
        candidate_answer=candidate_answer,
        company=company,
        role=role,
        previous_pairs=previous_pairs,
        resume_context=resume_context,
    )

    try:
        raw = _chat(system, user, temperature=0.75)
        result = parse_json_object(raw)
        if "followup" in result:
            result.setdefault("reason", "This probes the most important missing evidence in the answer.")
            result.setdefault("probe_target", "")
            result.setdefault("quote_used", "")
            return result
        raise ValueError("Missing 'followup' key")
    except Exception as e:
        print(f"[generate_followup_question] Agent error: {e}. Using adaptive fallback.")
        return fallback_followup(original_question, candidate_answer, company, role)


def generate_feedback(transcript: str, company: str, role: str) -> str:
    """
    Generate comprehensive end-of-session feedback with Overall Score: X/10.
    Used by the /interview/feedback endpoint after all Q&A pairs are collected.
    """
    system = (
        "You are an expert English communication coach and senior technical interviewer. "
        "Be direct, constructive, and encouraging."
    )
    user = f"""
Analyse this interview transcript for a **{role}** position at **{company}**.

TRANSCRIPT:
\"\"\"
{transcript}
\"\"\"

Provide feedback in this EXACT Markdown structure:

**Interview Feedback Analysis**

**Language Quality:**
- Grammar, vocabulary depth, sentence structure, filler word usage.

**Content Strengths:**
- Specific strong moments, STAR usage, professional competence shown.

**Areas for Improvement:**
- Actionable recommendations (metrics, clarity, structure).

**Overall Score: X/10**

Keep the tone encouraging, precise, and technical. End with exactly 'Overall Score: X/10'.
"""
    try:
        return _chat(system, user, temperature=0.7)
    except Exception as e:
        print(f"[generate_feedback] OpenAI error: {e}. Using local fallback.")
        return _local_feedback(transcript, role, company)


# ─────────────────────────────────────────────────────────────────────────────
# Legacy wrapper — keep backward-compat with existing /generate endpoint
# ─────────────────────────────────────────────────────────────────────────────

def generate_questions(company: str, role: str) -> str:
    """
    Legacy plain-text question generator (used by old /generate route).
    New code should call generate_questions_from_resume() instead.
    """
    questions = generate_questions_from_resume(company, role)
    lines = []
    for q in questions:
        lines.append(f"{q['id']}. {q['question']}")
    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────────────────────
# Fallback helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_questions(company: str, role: str) -> list[dict]:
    return [
        {
            "id": 1,
            "type": "behavioral",
            "question": f"Tell me about a challenging project you worked on that is most relevant to this {role} role. Walk me through it using the STAR method.",
            "hint": "Cover Situation, Task, Action, Result with quantifiable outcomes.",
        },
        {
            "id": 2,
            "type": "technical",
            "question": f"What are the core technical skills you bring to this {role} position, and how have you applied them in a production environment?",
            "hint": "Be specific — name technologies, architectures, and real-world constraints you solved.",
        },
        {
            "id": 3,
            "type": "situational",
            "question": "Describe a time you had a significant disagreement with a teammate or manager. How did you navigate it?",
            "hint": "Show emotional intelligence, communication skills, and positive resolution.",
        },
        {
            "id": 4,
            "type": "culture-fit",
            "question": f"What specifically draws you to {company}, and how does their mission align with your personal career goals?",
            "hint": "Research {company}'s values and products — show genuine knowledge.",
        },
        {
            "id": 5,
            "type": "resume-specific",
            "question": "Looking at your background, what is the single accomplishment you are most proud of and why?",
            "hint": "Link the achievement to skills directly needed for this role.",
        },
    ]


def _local_feedback(transcript: str, role: str, company: str) -> str:
    word_count = len(transcript.split())
    fillers = re.findall(
        r"\b(um|uh|like|you know|basically|actually|definitely)\b",
        transcript, re.IGNORECASE
    )
    filler_count = len(fillers)

    if word_count < 15:
        score, quality = 5, "Very brief — aim for 80–150 words per answer."
    elif filler_count > 4:
        score = 7
        quality = f"Good length ({word_count} words) but {filler_count} filler words detected."
    else:
        score, quality = 8, f"Well-structured {word_count}-word response."

    filler_tip = (
        f"Replace fillers ({', '.join(set(fillers))}) with deliberate pauses."
        if fillers else "Excellent — no filler words detected!"
    )

    return f"""**Interview Feedback Analysis**

**Language Quality:**
- {quality}
- {filler_tip}

**Content Strengths:**
- Directly addresses the {role} requirements at {company}.
- Shows active ownership of outcomes.

**Areas for Improvement:**
- Add quantifiable metrics (e.g., "reduced load time by 40%").
- Apply strict STAR structure: Situation → Task → Action → Result.

**Overall Score: {score}/10**
"""
