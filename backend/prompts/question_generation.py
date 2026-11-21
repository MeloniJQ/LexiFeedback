from typing import Any

QUESTION_TEMPLATE = {
    "id": "string",
    "question": "string",
    "category": "Project | Core Technical | Programming | Database | Framework | Behavioral | Scenario | Problem Solving | System Design | HR | Coding",
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
    include_coding: bool = False,
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

    # This is the user's explicit choice from the setup screen — the ONLY
    # supported languages for a real coding question are Python and
    # JavaScript, since that's all services/code_execution_service.py can
    # actually compile/run. When the candidate opted out (or the role isn't
    # a coding role), no "Coding" category question may appear at all, and
    # "Programming" questions must stay purely verbal/conceptual — never
    # asking the candidate to write, type, or produce actual code.
    if include_coding:
        coding_clause = f"""
10. Include EXACTLY 1 question with "category": "Coding" — a real, self-contained coding problem
    the candidate must write actual code for (e.g. a two-sum/array/string/hash-map style problem,
    NOT open-ended system design). For this ONE question only, also include these extra top-level
    fields, all required:
    - "language": either "python" or "javascript" ONLY (no other language is supported).
    - "function_name": the exact function name the candidate must define (snake_case for python,
      camelCase for javascript).
    - "starter_code": a short function stub/signature only (no implementation), matching
      "function_name" exactly, in the chosen "language".
    - "examples": 1-2 {{"input": "...", "output": "..."}} pairs describing expected behaviour.
    - "test_cases": 3-5 objects {{"input": [<arg1>, <arg2>, ...], "expected_output": <value>}}.
      CRITICAL: "input" must be a JSON array of the EXACT positional arguments passed to
      "function_name", and "expected_output" the EXACT JSON-serialisable return value — these are
      fed directly into a real interpreter, so they must be 100% correct and unambiguous.
    Keep the problem solvable in 10-15 minutes — moderate difficulty, not leetcode-hard.
"""
        coding_example = (
            ', {"id": "11", "question": "...", "category": "Coding", "topic": "...", '
            '"difficulty": "Medium", "expected_skills": ["..."], "estimated_duration": "15 minutes", '
            '"expected_keywords": ["..."], "project": "...", "metadata": {"notes": "..."}, '
            '"language": "python", "function_name": "two_sum", '
            '"starter_code": "def two_sum(nums, target):\\n    pass", '
            '"examples": [{"input": "nums=[2,7,11,15], target=9", "output": "[0,1]"}], '
            '"test_cases": [{"input": [[2,7,11,15], 9], "expected_output": [0,1]}]}'
        )
    else:
        coding_clause = """
10. Do NOT include a "Coding" category question, and do NOT ask the candidate to write, type, or
    produce any actual code, pseudocode, or code snippet as their answer anywhere in this
    interview. "Programming"-category questions must stay purely verbal/conceptual — ask about
    approach, reasoning, trade-offs, debugging strategy, or complexity analysis IN WORDS, e.g.
    "How would you approach debugging X?" or "What's your reasoning for choosing Y over Z?" —
    never "write a function that..." or "implement..." or "what would this code output...".
"""
        coding_example = ""

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
{coding_clause}
Output format:
[
  {{"id": "1", "question": "...", "category": "Project", "topic": "...", "difficulty": "Medium", "expected_skills": ["..."], "estimated_duration": "5 minutes", "expected_keywords": ["..."], "project": "...", "metadata": {{"notes": "..."}}}}{coding_example}
]

Plan title: {plan_title}
"""
    return system, user