from typing import Any


def _normalize_list(values: list[Any]) -> list[str]:
    normalized = []
    seen = set()
    for item in values or []:
        if not item:
            continue
        text = str(item).strip()
        if text and text.lower() not in seen:
            seen.add(text.lower())
            normalized.append(text)
    return normalized


def _top_items(values: list[str], count: int = 3) -> list[str]:
    return values[:count]


def build_interview_plan(
    candidate_name: str | None = None,
    resume_data: dict[str, Any] | None = None,
    jd_data: dict[str, Any] | None = None,
    match_data: dict[str, Any] | None = None,
    mode: str | None = None,
    round_type: str | None = None,
    company: str | None = None,
    role: str | None = None,
) -> dict[str, Any]:
    resume_data = resume_data or {}
    jd_data = jd_data or {}
    match_data = match_data or {}

    required_skills = _normalize_list(jd_data.get("required_skills", []))
    required_technologies = _normalize_list(jd_data.get("required_technologies", []))
    preferred_domain = _normalize_list(jd_data.get("preferred_domain", []))
    matching_skills = _normalize_list(match_data.get("matching_skills", []))
    missing_skills = _normalize_list(match_data.get("missing_skills", []))
    top_resume_skills = _normalize_list(resume_data.get("skills", []))
    top_frameworks = _normalize_list(resume_data.get("frameworks", []))
    top_tools = _normalize_list(resume_data.get("tools", []))

    strengths = matching_skills or _normalize_list(top_resume_skills + top_frameworks + top_tools)
    gaps = missing_skills or [skill for skill in required_skills if skill not in strengths]

    role = (role or "").strip()
    company = (company or "").strip()

    if role and company:
        plan_title = f"Interview plan for {role} at {company}"
    elif candidate_name:
        plan_title = f"Interview plan for {candidate_name}"
    else:
        plan_title = "Interview plan"

    role_summary = role or jd_data.get("preferred_experience") or "Target role preparation"
    domain_summary = ", ".join(preferred_domain) if preferred_domain else "general technical and behavioral readiness"
    # `mode`/`round_type` are only ever passed explicitly by a caller that wants to
    # override the interview style; when absent, fall back to the real role/company
    # instead of a hardcoded example so the blueprint never leaks a fake job title
    # into the question-generation prompt.
    mode_label = (mode or role or "General").strip()
    round_label = (round_type or "Technical Round").strip()

    focus_areas = []
    if matching_skills:
        focus_areas.append(f"Highlight your strengths in {', '.join(_top_items(matching_skills, 3))}")
    if gaps:
        focus_areas.append(f"Address gaps in {', '.join(_top_items(gaps, 3))}")
    if preferred_domain:
        focus_areas.append(f"Demonstrate experience or interest in {', '.join(preferred_domain)}")
    if not focus_areas:
        focus_areas.append("Emphasize your core technical and communication strengths.")

    blueprint = [
        {
            "section": "Opening and positioning",
            "description": (
                "Start with a concise summary of your background, key accomplishments, and how your skills align "
                "with the role."),
        },
        {
            "section": "Technical depth",
            "description": (
                "Discuss the most relevant tools, frameworks, and systems from your experience. "
                "Use examples that closely match the role’s required skills."),
        },
        {
            "section": "Project storytelling",
            "description": (
                "Frame 2–3 impact-driven stories from your resume that show problem-solving, collaboration, "
                "and measurable outcomes."),
        },
        {
            "section": "Behavior and culture fit",
            "description": (
                "Answer questions with structured examples that show leadership, teamwork, and adaptability."),
        },
        {
            "section": "Closing questions",
            "description": (
                "Prepare thoughtful questions about the team, the product roadmap, and success metrics."),
        },
    ]

    question_themes = []
    if required_skills:
        question_themes.extend(required_skills)
    if preferred_domain:
        question_themes.extend(preferred_domain)
    if gaps:
        question_themes.extend(_top_items(gaps, 3))
    question_themes = _normalize_list(question_themes)

    return {
        "title": plan_title,
        "company": company,
        "role": role,
        "role_summary": role_summary,
        "domain_summary": domain_summary,
        "mode": mode_label,
        "round_type": round_label,
        "strengths": _top_items(strengths, 5),
        "gaps": _top_items(gaps, 5),
        "focus_areas": focus_areas,
        "question_themes": question_themes,
        "interview_blueprint": blueprint,
        "notes": (
            "Use the blueprint to structure your answers: open with impact, add technical detail, "
            "then close with measurable results and learning."),
    }
