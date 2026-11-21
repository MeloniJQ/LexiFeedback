from typing import Any


def build_answer_evaluation_prompt(
    question_text: str,
    question_type: str,
    expected_keywords: list[str],
    answer_text: str,
    profile_summary: str,
    resume_projects: list[str],
    job_description_summary: str,
    plan_focus_areas: list[str],
    conversation_memory: list[dict[str, Any]],
    previous_evaluations: list[dict[str, Any]],
    lexical_metrics: dict[str, Any],
    company: str,
    role: str,
) -> tuple[str, str]:
    system = (
        "You are an AI evaluation engine for interview practice. "
        "Your job is to evaluate a single candidate answer across technical, communication, vocabulary, grammar, confidence, completeness, and relevance. "
        "Use the provided question, expected keywords, candidate profile, resume projects, job description summary, conversation memory, and prior answer evaluations. "
        "Return valid JSON only, with no markdown fences, no extra commentary."
    )

    previous_context = ""
    if conversation_memory:
        previous_context = "Previous conversation memory and answer history:\n"
        for idx, entry in enumerate(conversation_memory[-5:], 1):
            prev_q = entry.get("question_text", "")
            prev_a = entry.get("answer_text", "")
            previous_context += f"{idx}. Q: {prev_q} | A: {prev_a}\n"

    previous_scores = ""
    if previous_evaluations:
        previous_scores = "Previous answer evaluations:\n"
        for idx, eval_item in enumerate(previous_evaluations[-5:], 1):
            previous_scores += (
                f"{idx}. technical={eval_item.get('technical_score')}/10, "
                f"communication={eval_item.get('communication_score')}/10, "
                f"vocabulary={eval_item.get('vocabulary_score')}/10, "
                f"overall={eval_item.get('overall_score')}/10\n"
            )

    expected_keywords_text = ", ".join(expected_keywords) if expected_keywords else "none"
    projects_text = ", ".join(resume_projects) if resume_projects else "none"
    focus_text = ", ".join(plan_focus_areas) if plan_focus_areas else "none"

    user = f'''
QUESTION:
"{question_text}"

QUESTION TYPE: {question_type}
EXPECTED KEYWORDS: {expected_keywords_text}
ROLE: {role}
COMPANY: {company}

PROFILE SUMMARY:
{profile_summary or 'No profile summary available.'}

RESUME PROJECTS:
{projects_text}

JOB DESCRIPTION SUMMARY:
{job_description_summary or 'No JD summary available.'}

INTERVIEW FOCUS AREAS:
{focus_text}

LEXICAL METRICS:
{lexical_metrics}

{previous_context}
{previous_scores}

CANDIDATE ANSWER:
"""
{answer_text}
"""

Return ONLY a JSON object with the following keys:
{{
  "technical_score": <1-10>,
  "communication_score": <1-10>,
  "vocabulary_score": <1-10>,
  "grammar_score": <1-10>,
  "confidence_score": <1-10>,
  "completeness_score": <1-10>,
  "relevance_score": <1-10>,
  "overall_score": <1-10>,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_topics": ["..."],
  "suggestions": ["..."],
  "raw_feedback": {{
    "technical_feedback": "...",
    "communication_feedback": "...",
    "vocabulary_feedback": "...",
    "grammar_feedback": "...",
    "confidence_feedback": "...",
    "completeness_feedback": "...",
    "relevance_feedback": "..."
  }}
}}
'''
    return system, user


def build_interview_summary_prompt(
    answer_evaluations: list[dict[str, Any]],
    profile_summary: str,
    resume_projects: list[str],
    job_description_summary: str,
    plan_focus_areas: list[str],
    company: str,
    role: str,
) -> tuple[str, str]:
    system = (
        "You are an AI evaluation engine that provides an interview-level summary. "
        "Your job is to synthesize multiple answer evaluations into a concise final assessment, including strengths, weak topics, missed concepts, project knowledge, domain knowledge, behavioral performance, and recommendations. "
        "Return valid JSON only, no markdown fences."
    )

    answer_summary = ""
    for idx, evaluation in enumerate(answer_evaluations, 1):
        answer_summary += (
            f"Q{idx}: overall={evaluation.get('overall_score')}/10, "
            f"technical={evaluation.get('technical_score')}/10, "
            f"communication={evaluation.get('communication_score')}/10, "
            f"weaknesses={evaluation.get('weaknesses', [])}\n"
        )

    projects_text = ", ".join(resume_projects) if resume_projects else "none"
    focus_text = ", ".join(plan_focus_areas) if plan_focus_areas else "none"

    user = f"""
ROLE: {role}
COMPANY: {company}

PROFILE SUMMARY:
{profile_summary or 'No profile summary available.'}

RESUME PROJECTS:
{projects_text}

JOB DESCRIPTION SUMMARY:
{job_description_summary or 'No JD summary available.'}

INTERVIEW FOCUS AREAS:
{focus_text}

ANSWER EVALUATIONS:
{answer_summary}

Return ONLY this JSON object:
{{
  "overall_technical": <1-10>,
  "overall_communication": <1-10>,
  "overall_vocabulary": <1-10>,
  "overall_grammar": <1-10>,
  "overall_confidence": <1-10>,
  "overall_completeness": <1-10>,
  "overall_score": <1-10>,
  "strong_topics": ["..."],
  "weak_topics": ["..."],
  "frequently_missed_concepts": ["..."],
  "project_knowledge": ["..."],
  "domain_knowledge": ["..."],
  "behavioral_performance": ["..."],
  "recommendations": ["..."],
  "summary": "..."
}}
"""
    return system, user
