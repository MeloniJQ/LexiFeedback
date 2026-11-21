"""
LexiFeed Agentic Analysis Service — Intelligent evaluation of interview answers

This module provides sophisticated, context-aware analysis of interview answers using an agentic AI approach:
- Evaluates each answer in context of the role, company, and prior answers
- Identifies competency gaps and strengths across the session
- Adapts analysis based on answer patterns
- Provides differentiated feedback that improves as the interview progresses

─────────────────────────────────────────────────────────────────────────────
MIGRATION NOTE (OpenAI → Google Gemini):
This file previously called OpenAI's `gpt-4o-mini` via the `openai` SDK.
It now calls Google's `gemini-2.5-flash` via the official `google-genai` SDK.

  * All public function names, parameters, and return shapes are UNCHANGED.
  * The API key is read from GEMINI_API_KEY (see .env).
  * JSON-producing calls use Gemini's native `response_mime_type =
    "application/json"` config for reliable structured output.
─────────────────────────────────────────────────────────────────────────────
"""

import json
import re
import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

from llm.provider_factory import get_provider

load_dotenv()

logger = logging.getLogger("lexifeed.agentic_analysis")
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
        "GEMINI_API_KEY is not set — agentic analysis calls will use local fallbacks."
    )


def _chat(system: str, user: str, temperature: float = 0.7, json_mode: bool = True) -> str:
    """
    Preferred path: the configured AI_PROVIDER (OpenRouter by default, via
    llm/provider_factory.get_provider()). Falls back to a direct Gemini call
    if the primary provider fails for any reason (missing/invalid key, rate
    limit, network error, provider outage). If both fail, the caller's own
    except block takes over with a static fallback analysis.
    """
    try:
        provider = get_provider()
        return provider.chat(system=system, user=user, temperature=temperature)
    except Exception as e:
        logger.warning(f"[_chat] Primary provider failed ({e}); falling back to Gemini.")
        return _gemini_chat(system, user, temperature=temperature, json_mode=json_mode)


def _gemini_chat(system: str, user: str, temperature: float = 0.7, json_mode: bool = True) -> str:
    """Thin wrapper around Gemini's generate_content call. Used as a fallback
    when the primary provider (OpenRouter) is unavailable."""
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


def analyze_answer_contextually(
    transcript: str,
    question: str,
    question_type: str,
    company: str,
    role: str,
    previous_analyses: list[dict] | None = None,
    question_num: int = 1,
    total_questions: int = 5,
) -> dict:
    """
    Agentic analysis that evaluates each answer in context of:
    - The specific role and company
    - Prior answers in this session (to track pattern development)
    - Question type and expected competencies
    
    Returns sophisticated breakdown including adaptive scoring.
    """
    if not transcript.strip():
        logger.warning("[analyze_answer_contextually] Empty transcript received.")
        return _empty_analysis()

    # Build context about prior answers for comparison
    prior_context = ""
    if previous_analyses and len(previous_analyses) > 0:
        prior_context = "\n\nPrevious answers in this session:\n"
        for i, analysis in enumerate(previous_analyses, 1):
            prior_context += f"\nQ{i} ({analysis.get('question_type', 'unknown')}):\n"
            prior_context += f"- Scores: content {analysis['scores']['content']}/10, delivery {analysis['scores']['delivery']}/10\n"
            prior_context += f"- Key issue: {analysis.get('key_gap', 'none identified')}\n"

    system = (
        "You are an agentic interview analysis expert. Your role is to:\n"
        "1. Evaluate answers in context of the role, company, and prior answers\n"
        "2. Identify patterns in candidate performance\n"
        "3. Provide differentiated, context-aware feedback\n"
        "4. Track competency development throughout the interview\n"
        "Return valid JSON only with no markdown fences."
    )

    user = f"""
ANALYSIS REQUEST
================

ROLE: {role} at {company}
QUESTION #{question_num} of {total_questions}
TYPE: {question_type}

QUESTION:
"{question}"

CANDIDATE ANSWER:
\"\"\"{transcript}\"\"\"

{prior_context}

TASK:
Provide a comprehensive, context-aware analysis that:

1. **Contextual Scoring** (1-10 scale):
   - content: How well does the answer demonstrate competencies needed for this role at this company?
   - delivery: Speaking quality, clarity, structure, confidence?
   - vocabulary: Word choice sophistication, industry language?
   - overall: Composite score factoring in all dimensions and comparison to priors

2. **Content Analysis**:
   - star_used: Boolean - does it follow STAR method?
   - relevance: How directly does it address the question?
   - specificity: Is it concrete or vague?
   - key_strength: Most impressive aspect (1 sentence)
   - key_gap: Most important missing evidence (1 sentence)

3. **Pattern Analysis** (considering prior answers):
   - pattern_trend: "improving", "consistent", or "declining" (based on prior scores)
   - recurring_strength: If visible in multiple answers
   - recurring_gap: If visible in multiple answers
   - demonstrates_growth: How has the candidate adapted from earlier answers?

4. **Competency Alignment**:
   - For {role} at {company}, what competencies does this answer demonstrate?
   - confidence_level: "strong", "moderate", or "weak" match to role requirements
   - risk_flag: Any red flags for this specific role?

5. **Actionable Coaching**:
   - immediate_tip: One concrete thing to improve in the next answer
   - if_to_improve: Specific phrase or concept to incorporate

Return JSON only (no markdown fences):
{{
  "scores": {{
    "content": <int 1-10>,
    "delivery": <int 1-10>,
    "vocabulary": <int 1-10>,
    "overall": <int 1-10>
  }},
  "content_analysis": {{
    "star_used": <bool>,
    "relevance": "...",
    "specificity": "...",
    "key_strength": "...",
    "key_gap": "..."
  }},
  "pattern_analysis": {{
    "pattern_trend": "improving|consistent|declining",
    "recurring_strength": "...",
    "recurring_gap": "...",
    "demonstrates_growth": "..."
  }},
  "competency_alignment": {{
    "demonstrated_competencies": ["...", "...", "..."],
    "confidence_level": "strong|moderate|weak",
    "risk_flag": "... or null"
  }},
  "coaching": {{
    "immediate_tip": "...",
    "if_to_improve": "..."
  }}
}}
"""
    try:
        raw = _chat(system, user, temperature=0.5, json_mode=True)
        raw = re.sub(r"```json|```", "", raw).strip()
        logger.info(f"[analyze_answer_contextually] transcript_preview={transcript[:100]!r}")
        result = json.loads(raw)

        # Ensure all required fields exist
        return _normalize_analysis(result)
    except Exception as e:
        logger.error(f"[analyze_answer_contextually] Gemini error: {e}. Using fallback.")
        return _fallback_analysis(transcript, question_type)


def generate_session_comparison(
    all_answers: list[dict],
    company: str,
    role: str,
) -> dict:
    """
    Generate a cross-cutting analysis comparing all answers and identifying:
    - Strengths shown across multiple answers
    - Consistent gaps
    - Growth trajectory
    - Overall competency fit
    """
    if not all_answers:
        return {}

    answers_summary = "\n".join([
        f"Q{i+1} ({a.get('question_type', 'unknown')}): "
        f"scores {a['scores']['overall']}/10, "
        f"gap: {a['content_analysis']['key_gap']}"
        for i, a in enumerate(all_answers[:5])
    ])

    system = (
        "You are a senior hiring manager doing final competency evaluation. "
        "Review the interview arc and provide strategic insights. "
        "Return valid JSON only."
    )

    user = f"""
FINAL COMPARISON ANALYSIS
==========================

ROLE: {role} at {company}
TOTAL ANSWERS ANALYZED: {len(all_answers)}

ANSWER BREAKDOWN:
{answers_summary}

TASK:
Synthesize the answers into a comparative analysis:

1. **Strengths Profile**: What competencies are consistently strong?
2. **Growth Areas**: What gaps appear across multiple answers?
3. **Interview Arc**: How did performance evolve through the session?
4. **Role Fit**: How well does this candidate fit the {role} role at {company}?
5. **Risk Assessment**: Any major red flags for hiring managers?
6. **Hiring Recommendation**: "Strong hire", "Hire with growth plan", "Needs more evaluation", or "Not recommended"?

Return JSON:
{{
  "strengths_profile": ["...", "...", "..."],
  "growth_areas": ["...", "...", "..."],
  "interview_arc": "...",
  "role_fit": "strong|moderate|weak",
  "risk_assessment": "...",
  "hiring_recommendation": "Strong hire|Hire with growth plan|Needs more evaluation|Not recommended",
  "final_thoughts": "..."
}}
"""
    try:
        raw = _chat(system, user, temperature=0.7, json_mode=True)
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        logger.error(f"[generate_session_comparison] Gemini error: {e}")
        return {}


def _normalize_analysis(analysis: dict) -> dict:
    """Ensure analysis has all required fields with proper structure."""
    return {
        "scores": {
            "content": analysis.get("scores", {}).get("content", 5),
            "delivery": analysis.get("scores", {}).get("delivery", 5),
            "vocabulary": analysis.get("scores", {}).get("vocabulary", 5),
            "overall": analysis.get("scores", {}).get("overall", 5),
        },
        "content_analysis": {
            "star_used": analysis.get("content_analysis", {}).get("star_used", False),
            "relevance": analysis.get("content_analysis", {}).get("relevance", "N/A"),
            "specificity": analysis.get("content_analysis", {}).get("specificity", "N/A"),
            "key_strength": analysis.get("content_analysis", {}).get("key_strength", "N/A"),
            "key_gap": analysis.get("content_analysis", {}).get("key_gap", "N/A"),
        },
        "pattern_analysis": {
            "pattern_trend": analysis.get("pattern_analysis", {}).get("pattern_trend", "consistent"),
            "recurring_strength": analysis.get("pattern_analysis", {}).get("recurring_strength", ""),
            "recurring_gap": analysis.get("pattern_analysis", {}).get("recurring_gap", ""),
            "demonstrates_growth": analysis.get("pattern_analysis", {}).get("demonstrates_growth", ""),
        },
        "competency_alignment": {
            "demonstrated_competencies": analysis.get("competency_alignment", {}).get("demonstrated_competencies", []),
            "confidence_level": analysis.get("competency_alignment", {}).get("confidence_level", "moderate"),
            "risk_flag": analysis.get("competency_alignment", {}).get("risk_flag"),
        },
        "coaching": {
            "immediate_tip": analysis.get("coaching", {}).get("immediate_tip", "Continue building on this answer."),
            "if_to_improve": analysis.get("coaching", {}).get("if_to_improve", "Add more specific examples."),
        },
    }


def _fallback_analysis(transcript: str, question_type: str) -> dict:
    """Fallback analysis when API is unavailable."""
    word_count = len(transcript.split())
    has_metrics = bool(re.search(r'\b\d+%|\d+x|\$\d+|improved|increased|reduced\b', transcript.lower()))
    has_star = bool(re.search(r'situation|task|action|result|challenge|problem', transcript, re.I))

    # Detection for very poor / low-effort answers
    is_very_short = word_count < 15

    score_adjustments = {
        "content": 2 if is_very_short else 5,
        "delivery": 3 if is_very_short else 5,
        "vocabulary": 3 if is_very_short else 5,
    }

    if not is_very_short:
        if word_count < 40:
            score_adjustments["content"] -= 1
    if word_count > 180:
        score_adjustments["content"] += 1

    if has_metrics:
        score_adjustments["content"] += 2
    else:
        score_adjustments["content"] -= 1

    if has_star:
        score_adjustments["content"] += 1

    score_adjustments["overall"] = sum(score_adjustments.values()) // 3

    logger.info(f"[_fallback_analysis] scores={score_adjustments}")

    return {
        "scores": {
            "content": max(1, min(10, score_adjustments["content"])),
            "delivery": max(1, min(10, score_adjustments["delivery"])),
            "vocabulary": max(1, min(10, score_adjustments["vocabulary"])),
            "overall": max(1, min(10, score_adjustments["overall"])),
        },
        "content_analysis": {
            "star_used": has_star,
            "relevance": "Unable to fully assess without API",
            "specificity": "Brief answer — could use more detail" if word_count < 50 else "Reasonably detailed",
            "key_strength": "Answer structure is clear",
            "key_gap": "Missing quantifiable metrics" if not has_metrics else "Good use of specific examples",
        },
        "pattern_analysis": {
            "pattern_trend": "consistent",
            "recurring_strength": "",
            "recurring_gap": "",
            "demonstrates_growth": "Unable to assess with single answer",
        },
        "competency_alignment": {
            "demonstrated_competencies": [],
            "confidence_level": "moderate",
            "risk_flag": None,
        },
        "coaching": {
            "immediate_tip": "Add more specific examples and metrics to demonstrate impact",
            "if_to_improve": "Include measurable outcomes (numbers, percentages, timeline)",
        },
    }


def _empty_analysis() -> dict:
    """Return empty analysis structure when there's no answer."""
    return {
        "scores": {"content": 0, "delivery": 0, "vocabulary": 0, "overall": 0},
        "content_analysis": {
            "star_used": False,
            "relevance": "No answer provided",
            "specificity": "N/A",
            "key_strength": "N/A",
            "key_gap": "No content to analyze",
        },
        "pattern_analysis": {
            "pattern_trend": "N/A",
            "recurring_strength": "",
            "recurring_gap": "",
            "demonstrates_growth": "",
        },
        "competency_alignment": {
            "demonstrated_competencies": [],
            "confidence_level": "N/A",
            "risk_flag": "No answer provided",
        },
        "coaching": {
            "immediate_tip": "Provide a detailed answer to the question",
            "if_to_improve": "Use the STAR method: Situation, Task, Action, Result",
        },
    }