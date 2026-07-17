import os
import re
from typing import Any


def _normalize_value(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""

    lookup = {
        "python": "Python",
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
        "saas": "SaaS",
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


def _extract_name(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return ""
    first = lines[0]
    if re.search(r"[A-Za-z]", first):
        return first
    return ""


def _extract_contact(text: str) -> dict[str, str]:
    email_match = re.search(r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})", text)
    phone_match = re.search(r"(\+?\d[\d\s().-]{7,}\d)", text)
    return {
        "email": email_match.group(1) if email_match else "",
        "phone": phone_match.group(1).strip() if phone_match else "",
    }


def _extract_education(text: str) -> list[dict[str, Any]]:
    section = re.search(r"education\s*([\s\S]*?)(?=skills|projects|experience|work|internships|certifications|achievements|tools|$)", text, re.I)
    entries = []
    if section:
        for line in section.group(1).splitlines():
            cleaned = line.strip()
            if cleaned and not cleaned.lower().startswith("education"):
                degree_match = re.search(r"(B\.S|B\.E|B\.Tech|M\.S|M\.Tech|Ph\.D|Bachelor|Master|Diploma|Associate|High School)[^,\n]*", cleaned, re.I)
                if degree_match:
                    degree = degree_match.group(0).strip()
                    degree = re.sub(r",?\s*\d{4}$", "", degree).strip()
                    entries.append({"degree": degree, "institution": cleaned.replace(degree_match.group(0), "").strip()})
    if entries:
        return entries
    return []


def _extract_skills(text: str) -> list[str]:
    words = []
    for category in ["skills", "programming languages", "frameworks", "databases", "cloud technologies", "tools", "soft skills"]:
        section = re.search(rf"{category}\s*([\s\S]*?)(?=education|projects|experience|work|internships|certifications|achievements|tools|$)", text, re.I)
        if section:
            for item in re.split(r"[\n,;|/]+", section.group(1)):
                cleaned = item.strip()
                if cleaned and len(cleaned.split()) <= 4:
                    words.append(cleaned)
    return _dedupe(words)


def _extract_projects(text: str) -> list[dict[str, str]]:
    section = re.search(r"projects\s*([\s\S]*?)(?=education|experience|work|internships|certifications|achievements|tools|$)", text, re.I)
    if not section:
        return []
    projects = []
    for line in section.group(1).splitlines():
        cleaned = line.strip()
        if cleaned and not cleaned.lower().startswith("projects"):
            projects.append({"name": cleaned})
    return projects[:5]


def extract_resume_text_from_file(filepath: str) -> str:
    if not os.path.exists(filepath):
        raise FileNotFoundError("Resume file not found")
    ext = os.path.splitext(filepath)[1].lower()
    if ext != ".pdf":
        raise ValueError("Unsupported resume format")

    try:
        import pdfplumber
        with pdfplumber.open(filepath) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(filepath)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise RuntimeError(f"PDF parsing failed: {exc}") from exc


def extract_resume_data(resume_text: str, filename: str | None = None) -> dict[str, Any]:
    text = (resume_text or "").strip()
    if not text:
        return {
            "candidate_name": "",
            "email": "",
            "phone": "",
            "education": [],
            "skills": [],
            "programming_languages": [],
            "frameworks": [],
            "databases": [],
            "cloud_technologies": [],
            "projects": [],
            "internships": [],
            "certifications": [],
            "tools": [],
            "work_experience": [],
            "achievements": [],
            "soft_skills": [],
        }

    contact = _extract_contact(text)
    parsed = {
        "candidate_name": _extract_name(text),
        "email": contact["email"],
        "phone": contact["phone"],
        "education": _extract_education(text),
        "skills": _dedupe(_extract_skills(text) + re.findall(r"\b(?:Python|JavaScript|TypeScript|Java|C#|C\+\+|Go|Ruby|SQL|AWS|Azure|Docker|React|Flask|Django|FastAPI|PostgreSQL|MongoDB|Redis|Kubernetes|Terraform|Git)\b", text, re.I)),
        "programming_languages": _dedupe([item for item in ["Python", "JavaScript", "TypeScript", "Java", "C#", "C++", "Go", "Ruby", "SQL"] if re.search(rf"\b{re.escape(item)}\b", text, re.I)]),
        "frameworks": _dedupe([item for item in ["Flask", "Django", "FastAPI", "React", "Vue", "Angular", "Spring", "Rails", "Laravel"] if re.search(rf"\b{re.escape(item)}\b", text, re.I)]),
        "databases": _dedupe([item for item in ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "SQL Server", "Oracle"] if re.search(rf"\b{re.escape(item)}\b", text, re.I)]),
        "cloud_technologies": _dedupe([item for item in ["AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform"] if re.search(rf"\b{re.escape(item)}\b", text, re.I)]),
        "projects": _extract_projects(text),
        "internships": [],
        "certifications": [],
        "tools": _dedupe([item for item in ["Git", "GitHub", "Jira", "Confluence", "Linux", "Airflow", "Power BI", "Tableau", "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Terraform", "Kubernetes"] if re.search(rf"\b{re.escape(item)}\b", text, re.I)]),
        "work_experience": [],
        "achievements": [],
        "soft_skills": _dedupe([item for item in ["Leadership", "Communication", "Teamwork", "Problem Solving", "Adaptability"] if re.search(rf"\b{re.escape(item)}\b", text, re.I)]),
    }
    if filename:
        parsed["filename"] = filename
    return parsed
