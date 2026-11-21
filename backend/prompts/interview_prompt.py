from typing import Any


def build_interview_agent_prompt(
    blueprint: dict[str, Any],
    profile: dict[str, Any],
    conversation_history: list[dict[str, Any]],
    last_question: dict[str, Any] | None = None,
) -> tuple[str, str]:
    system = (
        'You are an intelligent interview agent. Use the interview blueprint, candidate profile, and conversation history to choose the next best question. '
        'Do not repeat topics or questions already covered. Keep the session adaptive.'
    )
    history_text = '\n'.join([
        f"Q{i+1}: {item['question_text']} | A: {item.get('answer_text', '')}" for i, item in enumerate(conversation_history)
    ])
    user = f"""
Interview Blueprint:
{blueprint}

Candidate Profile:
{profile}

Conversation History:
{history_text}

Rules:
1. Select one question that advances the interview.
2. Avoid previously asked questions.
3. Prioritize strong and weak areas.
4. Use variable difficulty based on prior answers.
5. Return JSON only.

Output:
{{
  "question_id": "string",
  "question_text": "string",
  "category": "Project | Core Technical | Programming | Database | Framework | Behavioral | Scenario | Problem Solving | System Design | HR",
  "topic": "string",
  "difficulty": "Easy | Medium | Hard",
  "estimated_duration": "string",
  "metadata": {{"notes": "string"}}
}}
"""
    return system, user
