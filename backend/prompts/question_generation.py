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
    company: str | None = None,
    role: str | None = None,
) -> tuple[str, str]:
    profile_data = candidate_profile.profile_data or {}
    resume = profile_data.get("resume", {})
    jd = profile_data.get("job_description", {})
    match = profile_data.get("match", {})
    plan_title = blueprint.get("title", "Interview plan")

    # Prefer the role/company the candidate actually typed in on this session
    # (passed in explicitly, sourced from the interview plan's blueprint) over
    # any guess from resume/JD text — those are frequently missing or stale.
    role = (role or blueprint.get("role") or resume.get("role") or jd.get("role") or "").strip() or "the target role"
    company = (company or blueprint.get("company") or "").strip() or "the target company"

    system = (
        "You are a professional interview question generator. "
        "You must generate high-quality, personalized interview questions using the provided interview blueprint, candidate profile, resume summary, job description summary, and match insights. "
        "Do NOT generate questions directly from the raw resume. The planner decides what should be asked. The generator creates questions only based on the blueprint and candidate context. "
        f"Every single question must be written specifically for a '{role}' interview at '{company}' — do not default to generic Software Engineer questions unless '{role}' actually is a software engineering role. "
        "Return valid JSON only, with no markdown fences."
    )

    user = f"""
TARGET ROLE: {role}
TARGET COMPANY: {company}

Interview Blueprint:
{blueprint}

Candidate Profile Resume Summary:
{resume}

Job Description Summary:
{jd}

Match Data:
{match}

Rules:
1. Generate exactly {count} unique questions, ALL tailored to the "{role}" role at "{company}" — not a generic or unrelated role.
2. Respect the planner's interview blueprint and question distribution.
3. Include project questions, technical questions, programming questions, database questions, framework questions, behavioral questions, scenario questions, problem solving questions, system design questions, and HR questions where relevant to "{role}" (skip categories that don't apply to this role, e.g. skip "Database"/"System Design" for a non-engineering role).
4. Use the candidate's strongest skills and gaps to personalize each question.
5. Provide metadata for each question: category, topic, difficulty, expected_skills, estimated_duration, expected_keywords, project.
6. Avoid repetition, vague language, or generic internet interview questions.
7. Keep questions realistic, professional, and follow-up worthy.
8. Question 1 MUST be a warm, open-ended opener equivalent to "Tell me about yourself and why you're interested in this role at {company}", tagged "difficulty": "Easy" and "category": "Behavioral".
9. Order the remaining questions so difficulty rises gradually: start with "Easy" questions, move through "Medium", and place the hardest "Hard" questions near the end. Never front-load a hard question.

Output format:
[
  {{"id": "1", "question": "...", "category": "Project", "topic": "...", "difficulty": "Medium", "expected_skills": ["..."], "estimated_duration": "5 minutes", "expected_keywords": ["..."], "project": "...", "metadata": {{"notes": "..."}}}},
  ...
]

Plan title: {plan_title}
"""
    return system, user
