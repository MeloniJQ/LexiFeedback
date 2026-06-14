"""
LexiFeed AI Service — Step 1: Resume-aware question generation + follow-up engine.

Architecture:
  - generate_questions_from_resume()  →  parses resume text, generates 5 deep questions
  - generate_followup_question()      →  given Q+A pair, asks 1 smart follow-up
  - generate_feedback()               →  end-of-session full analysis
  - extract_resume_text()             →  PDF / DOCX / plain-text extractor
"""

"""
LexiFeed AI Service — Step 1: Resume-aware question generation + follow-up engine.
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
    if not client:
        raise RuntimeError("OPENAI_API_KEY missing")

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
    )
    return res.choices[0].message.content.strip()


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