from typing import Any


def build_followup_prompt(
    original_question: str,
    candidate_answer: str,
    previous_pairs: list[dict[str, Any]] | None = None,
    resume_context: str = '',
    company: str = '',
    role: str = '',
) -> tuple[str, str]:
    system = (
        'You are an expert technical interviewer. Create a follow-up question that probes deeper into the candidate response. '
        'Use context from the previous Q&A history and the candidate profile.'
    )
    history_lines = []
    if previous_pairs:
        for item in previous_pairs:
            history_lines.append(f"Q: {item.get('question_text') or item.get('question')} | A: {item.get('answer_text') or item.get('candidate_answer', '')}")
    history_text = '\n'.join(history_lines)

    user = f"""
Company: {company}
Role: {role}
Resume context: {resume_context}

Previous conversation:
{history_text}

Original question: {original_question}
Candidate answer: {candidate_answer}

Return valid JSON only:
{{
  "followup": "string",
  "probe_target": "string",
  "quote_used": "string"
}}
"""
    return system, user
