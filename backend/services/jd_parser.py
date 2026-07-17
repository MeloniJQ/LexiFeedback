import re
from typing import Any


TECHNOLOGY_TERMS = {
    "programming_languages": [
        "python", "javascript", "typescript", "java", "c#", "c++", "go", "ruby", "php", "swift", "kotlin", "scala"
    ],
    "frameworks": [
        "flask", "django", "fastapi", "express", "react", "next.js", "vue", "angular", "spring", "rails", "laravel"
    ],
    "databases": [
        "postgresql", "mysql", "sql server", "mongodb", "redis", "sqlite", "oracle", "cassandra", "elasticsearch"
    ],
    "cloud": ["aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "terraform"],
    "tools": ["git", "github", "jenkins", "jira", "confluence", "tableau", "power bi", "airflow", "linux"],
}

DOMAIN_TERMS = {
    "saas": ["saas", "software as a service"],
    "fintech": ["fintech", "payments", "banking"],
    "healthcare": ["healthcare", "health-tech", "medical"],
    "ecommerce": ["ecommerce", "retail", "commerce"],
    "education": ["education", "edtech"],
    "enterprise": ["enterprise", "b2b"],
    "logistics": ["logistics", "supply chain"],
}

DOMAIN_LABELS = {
    "saas": "SaaS",
    "fintech": "Fintech",
    "healthcare": "Healthcare",
    "ecommerce": "Ecommerce",
    "education": "Education",
    "enterprise": "Enterprise",
    "logistics": "Logistics",
}


def _normalize_value(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    lookup = {
        "python": "Python",
        "saas": "SaaS",
        "javascript": "JavaScript",
        "typescript": "TypeScript",
        "c#": "C#",
        "c++": "C++",
        "next.js": "Next.js",
        "sql server": "SQL Server",
        "google cloud": "Google Cloud",
        "power bi": "Power BI",
        "postgresql": "PostgreSQL",
        "mysql": "MySQL",
        "mongodb": "MongoDB",
        "redis": "Redis",
        "sqlite": "SQLite",
        "aws": "AWS",
        "azure": "Azure",
        "gcp": "GCP",
        "docker": "Docker",
        "kubernetes": "Kubernetes",
        "terraform": "Terraform",
        "flask": "Flask",
        "django": "Django",
        "fastapi": "FastAPI",
        "react": "React",
        "vue": "Vue",
        "angular": "Angular",
        "spring": "Spring",
        "rails": "Rails",
        "laravel": "Laravel",
        "github": "GitHub",
        "jira": "Jira",
        "confluence": "Confluence",
        "airflow": "Airflow",
        "linux": "Linux",
    }

    lowered = text.lower()
    if lowered in lookup:
        return lookup[lowered]

    words = re.split(r"[\s/.-]+", text)
    parts = []
    for word in words:
        if not word:
            continue
        if word.isupper() and len(word) > 1:
            parts.append(word)
        else:
            parts.append(word.capitalize())
    return " ".join(parts)


def _dedupe(values: list[str]) -> list[str]:
    seen = set()
    normalized = []
    for value in values:
        item = _normalize_value(value)
        if not item:
            continue
        if item not in seen:
            seen.add(item)
            normalized.append(item)
    return normalized


def _extract_list_from_text(text: str, label: str) -> list[str]:
    pattern = re.compile(rf"\b{re.escape(label)}\b\s*[:\-]\s*([^\.\n]+)", re.I)
    match = pattern.search(text)
    if not match:
        return []
    raw = match.group(1)
    items = re.split(r"[;,|]+", raw)
    return [item.strip() for item in items if item.strip()]


def _extract_from_categories(text: str) -> dict[str, list[str]]:
    lowered = text.lower()
    result = {
        "programming_languages": [],
        "frameworks": [],
        "database_technologies": [],
        "required_tools": [],
        "required_skills": [],
    }

    for category, terms in TECHNOLOGY_TERMS.items():
        for term in terms:
            if term in lowered:
                normalized = _normalize_value(term)
                target_key = {
                    "programming_languages": "programming_languages",
                    "frameworks": "frameworks",
                    "databases": "database_technologies",
                    "cloud": "required_tools",
                    "tools": "required_tools",
                }[category]
                result[target_key].append(normalized)

    result["required_skills"] = _dedupe(result["programming_languages"] + result["frameworks"] + result["database_technologies"] + result["required_tools"])
    return result


def extract_job_description_data(job_description_text: str) -> dict[str, Any]:
    text = (job_description_text or "").strip()
    if not text:
        return {
            "required_skills": [],
            "required_technologies": [],
            "programming_languages": [],
            "frameworks": [],
            "database_technologies": [],
            "required_tools": [],
            "preferred_experience": "",
            "responsibilities": [],
            "preferred_domain": [],
        }

    parsed = _extract_from_categories(text)
    parsed.update(
        {
            "required_technologies": _dedupe(parsed["programming_languages"] + parsed["frameworks"] + parsed["database_technologies"] + parsed["required_tools"]),
            "preferred_experience": "",
            "responsibilities": [],
            "preferred_domain": [],
        }
    )

    for label in ["required skills", "required technologies", "skills", "technologies"]:
        values = _extract_list_from_text(text, label)
        if values:
            parsed["required_skills"] = _dedupe(parsed["required_skills"] + values)
            break

    experience_match = re.search(r"preferred experience\s*[:\-]\s*(.+)", text, re.I)
    if experience_match:
        parsed["preferred_experience"] = experience_match.group(1).strip()

    responsibilities_match = re.search(r"responsibilities\s*[:\-]\s*(.+)", text, re.I)
    if responsibilities_match:
        parsed["responsibilities"] = [responsibilities_match.group(1).strip()]
    else:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        parsed["responsibilities"] = [sentence for sentence in sentences if len(sentence.split()) > 4][:4]

    domains = []
    for domain, terms in DOMAIN_TERMS.items():
        if any(term in text.lower() for term in terms):
            domains.append(DOMAIN_LABELS.get(domain, domain.capitalize()))
    parsed["preferred_domain"] = _dedupe(domains)

    return parsed
