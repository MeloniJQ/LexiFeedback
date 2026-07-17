import json
import random
import re
import uuid
from typing import Any

from models import CandidateProfile, Question, db
from llm.provider_factory import get_provider
from prompts.question_generation import build_question_generation_prompt

QUESTION_CATEGORIES = [
    "Project",
    "Core Technical",
    "Programming",
    "Database",
    "Framework",
    "Behavioral",
    "Scenario",
    "Problem Solving",
    "System Design",
    "HR",
]

QUESTION_DIFFICULTIES = ["Easy", "Medium", "Hard"]


def generate_questions_from_blueprint(
    candidate_profile: CandidateProfile,
    blueprint: dict[str, Any],
    count: int = 10,
    mode: str | None = None,
    round_type: str | None = None,
) -> list[dict[str, Any]]:
    provider = get_provider()
    system, user = build_question_generation_prompt(
        candidate_profile=candidate_profile,
        blueprint=blueprint,
        count=count,
    )

    try:
        raw = provider.chat(system=system, user=user, temperature=0.8)
        questions = _parse_question_set(raw)
        if not questions:
            raise ValueError("Empty question set")
        questions = _normalize_questions(questions, count, blueprint, candidate_profile)
        if mode or round_type:
            for question in questions:
                question.setdefault("metadata", {})
                question["metadata"]["mode"] = mode or "General Software Engineer"
                question["metadata"]["round_type"] = round_type or "Technical Round"
        return questions
    except Exception as exc:
        print(f"[question_generator] Error: {exc}")
        return _fallback_questions(candidate_profile, blueprint, count)


def _parse_question_set(raw: str) -> list[dict[str, Any]]:
    raw = re.sub(r"```json|```", "", raw).strip()
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        # Try to extract JSON substring
        match = re.search(r"(\[.*\])", raw, re.S)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                return []
    return []


def _normalize_questions(raw: list[dict[str, Any]], count: int, blueprint: dict[str, Any], candidate_profile: CandidateProfile) -> list[dict[str, Any]]:
    unique_texts = set()
    normalized: list[dict[str, Any]] = []

    for item in raw:
        if not isinstance(item, dict):
            continue

        text = str(item.get("question", "")).strip()
        if not text:
            continue

        key = re.sub(r"[^a-z0-9]", "", text.lower())
        if key in unique_texts:
            continue

        unique_texts.add(key)

        normalized.append({
            "question_id": str(item.get("id") or item.get("question_id") or uuid.uuid4()),
            "question_text": text,
            "category": item.get("category") or "Core Technical",
            "topic": item.get("topic") or item.get("project") or "General",
            "difficulty": item.get("difficulty") or "Medium",
            "expected_skills": item.get("expected_skills") or [],
            "estimated_duration": item.get("estimated_duration") or "5 minutes",
            "expected_keywords": item.get("expected_keywords") or [],
            "project": item.get("project") or blueprint.get("title") if isinstance(blueprint, dict) else "",
            "metadata": item.get("metadata") or {},
        })

        if len(normalized) >= count:
            break

    if len(normalized) < count:
        normalized.extend(_fallback_questions(candidate_profile, blueprint, count - len(normalized)))

    return normalized[:count]


def _fallback_questions(candidate_profile: CandidateProfile, blueprint: dict[str, Any], count: int) -> list[dict[str, Any]]:
    """
    Used ONLY when the live OpenRouter call fails or returns fewer unique
    questions than requested. THIS was the actual root cause of "all 5
    questions were identical" — it used to build the exact same question_text
    in a loop `count` times, with only question_id differing. Now pulls from
    a pool spanning multiple QUESTION_CATEGORIES (technical, scenario, HR,
    behavioral, etc.), shuffled per call so repeated fallbacks aren't identical.
    """
    topic = blueprint.get("domain_summary") or candidate_profile.profile_data.get("job_description", {}).get("preferred_domain", ["General"])[0]
    base_project = blueprint.get("title") or "Candidate Interview"

    pool = [
        ("Project", f"Describe a project from your experience that best demonstrates your ability to work with {topic}."),
        ("Core Technical", f"What are the core technical concepts in {topic} that you rely on most day-to-day?"),
        ("Programming", "Walk me through how you'd debug a piece of code that's producing incorrect output intermittently."),
        ("Database", "How do you decide between normalizing and denormalizing a database schema for a new feature?"),
        ("Framework", f"What trade-offs have you run into while working with the tools or frameworks on your resume related to {topic}?"),
        ("Behavioral", "Tell me about a time you disagreed with a technical decision on your team — how did you handle it?"),
        ("Scenario", "Imagine a critical bug is discovered in production right before a major release — walk me through what you'd do."),
        ("Problem Solving", "How would you approach a problem you've never seen before, with no clear reference material?"),
        ("System Design", f"How would you design a system that needs to scale reliably around {topic}?"),
        ("HR", "What are you looking for in your next role, and why does this one fit?"),
    ]

    rng = random.Random(uuid.uuid4().int)
    rng.shuffle(pool)

    questions = []
    for i in range(count):
        category, text = pool[i % len(pool)]
        questions.append({
            "question_id": str(uuid.uuid4()),
            "question_text": text,
            "category": category,
            "topic": topic,
            "difficulty": "Medium",
            "expected_skills": [topic],
            "estimated_duration": "5 minutes",
            "expected_keywords": [topic],
            "project": base_project,
            "metadata": {"fallback": True, "mode": "General Software Engineer", "round_type": "Technical Round"},
        })
    return questions


def save_questions(candidate_profile: CandidateProfile, questions: list[dict[str, Any]]) -> list[Question]:
    saved = []
    for item in questions:
        question = Question(
            question_id=item["question_id"],
            candidate_profile_id=candidate_profile.id,
            question_text=item["question_text"],
            category=item["category"],
            topic=item.get("topic"),
            difficulty=item.get("difficulty"),
            expected_skills=item.get("expected_skills"),
            estimated_duration=item.get("estimated_duration"),
            expected_keywords=item.get("expected_keywords"),
            project=item.get("project"),
            meta_data=item.get("metadata"),
        )
        db.session.add(question)
        saved.append(question)

    db.session.commit()
    return saved
