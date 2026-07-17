from typing import Any

QUESTION_TEMPLATE = {
    "id": "string",
    "question": "string",
    "category": "Project | Core Technical | Programming | Database | Framework | Behavioral | Scenario | Problem Solving | System Design | HR",
    "topic": "string",
    "difficulty": "Easy | Medium | Hard",
    "expected_skills": ["string"],
    "estimated_duration": "string",
    "expected_keywords": ["string"],
    "project": "string",
    "metadata": {"notes": "string"},
}


def build_question_generation_prompt(
    candidate_profile: Any,
    blueprint: dict[str, Any],
    count: int = 10,
) -> tuple[str, str]:
    profile_data = candidate_profile.profile_data or {}
    resume = profile_data.get("resume", {})
    jd = profile_data.get("job_description", {})
    match = profile_data.get("match", {})
    plan_title = blueprint.get("title", "Interview plan")
    role = resume.get("role") or profile_data.get("job_description", {}).get("role") or "Target role"

    system = (
        "You are a professional interview question generator. "
        "You must generate high-quality, personalized interview questions using the provided interview blueprint, candidate profile, resume summary, job description summary, and match insights. "
        "Do NOT generate questions directly from the raw resume. The planner decides what should be asked. The generator creates questions only based on the blueprint and candidate context. "
        "Return valid JSON only, with no markdown fences."
    )

    user = f"""
Interview Blueprint:
{blueprint}

Candidate Profile Resume Summary:
{resume}

Job Description Summary:
{jd}

Match Data:
{match}

Rules:
1. Generate exactly {count} unique questions.
2. Respect the planner's interview blueprint and question distribution.
3. Include project questions, technical questions, programming questions, database questions, framework questions, behavioral questions, scenario questions, problem solving questions, system design questions, and HR questions where appropriate.
4. Use the candidate's strongest skills and gaps to personalize each question.
5. Provide metadata for each question: category, topic, difficulty, expected_skills, estimated_duration, expected_keywords, project.
6. Avoid repetition, vague language, or generic internet interview questions.
7. Keep questions realistic, professional, and follow-up worthy.

Output format:
[
  {{"id": "1", "question": "...", "category": "Project", "topic": "...", "difficulty": "Medium", "expected_skills": ["..."], "estimated_duration": "5 minutes", "expected_keywords": ["..."], "project": "...", "metadata": {{"notes": "..."}}}},
  ...
]

Candidate role: {role}
Plan title: {plan_title}
"""
    return system, user
