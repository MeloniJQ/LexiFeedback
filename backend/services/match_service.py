from typing import Any


def _flatten_resume_values(resume_data: dict[str, Any]) -> list[str]:
    values = []
    for key in ["skills", "programming_languages", "frameworks", "databases", "cloud_technologies", "tools", "soft_skills"]:
        values.extend(resume_data.get(key, []) or [])
    return [value for value in values if value]


def _flatten_jd_values(jd_data: dict[str, Any]) -> list[str]:
    values = []
    for key in ["required_skills", "programming_languages", "frameworks", "database_technologies", "required_tools", "required_technologies"]:
        values.extend(jd_data.get(key, []) or [])
    return [value for value in values if value]


def generate_profile_match(resume_data: dict[str, Any], jd_data: dict[str, Any]) -> dict[str, Any]:
    resume_values = {value.lower(): value for value in _flatten_resume_values(resume_data)}
    jd_values = {value.lower(): value for value in _flatten_jd_values(jd_data)}

    matching_skills = [resume_values[name] for name in jd_values if name in resume_values]
    missing_skills = [jd_values[name] for name in jd_values if name not in resume_values]

    if jd_values:
        skill_match_percentage = round((len(matching_skills) / len(jd_values)) * 100)
    else:
        skill_match_percentage = 0

    project_match = 100 if (resume_data.get("projects") or resume_data.get("work_experience")) else 40
    technology_match = round((len(matching_skills) / max(1, len(jd_values))) * 100) if jd_values else 0

    strength_areas = matching_skills[:5]
    improvement_areas = missing_skills[:5]

    return {
        "matching_skills": _sorted_unique(matching_skills),
        "missing_skills": _sorted_unique(missing_skills),
        "skill_match_percentage": skill_match_percentage,
        "project_match": project_match,
        "technology_match": technology_match,
        "strength_areas": strength_areas,
        "improvement_areas": improvement_areas,
    }


def _sorted_unique(values: list[str]) -> list[str]:
    seen = set()
    normalized = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            normalized.append(value)
    return sorted(normalized, key=str.lower)
