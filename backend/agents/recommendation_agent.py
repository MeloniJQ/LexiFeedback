from __future__ import annotations

from typing import Any


def generate_recommendations(
    resume_skills: list[str] | None = None,
    job_requirements: list[str] | None = None,
    weak_skills: list[str] | None = None,
    strong_skills: list[str] | None = None,
    missing_concepts: list[str] | None = None,
    interview_performance: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Generate personalized learning recommendations based on interview context."""
    resume_skills = resume_skills or []
    job_requirements = job_requirements or []
    weak_skills = weak_skills or []
    strong_skills = strong_skills or []
    missing_concepts = missing_concepts or []
    interview_performance = interview_performance or {}

    recommendations: list[dict[str, Any]] = []

    for skill in weak_skills[:3]:
        recommendations.append(
            {
                "category": "practice",
                "title": f"Practice {skill} with mock interviews",
                "description": f"Strengthen your understanding of {skill} through targeted drills and follow-up questions.",
                "priority": "high",
            }
        )

    for concept in missing_concepts[:3]:
        recommendations.append(
            {
                "category": "resource",
                "title": f"Study {concept}",
                "description": f"Review the core principles behind {concept} to close the knowledge gap.",
                "priority": "high",
            }
        )

    if interview_performance.get("technical_score", 0) < 80:
        recommendations.append(
            {
                "category": "roadmap",
                "title": "Technical interview roadmap",
                "description": "Follow a structured roadmap covering algorithms, system design, and debugging discussions.",
                "priority": "high",
            }
        )

    if strong_skills:
        recommendations.append(
            {
                "category": "tips",
                "title": "Leverage your strengths",
                "description": f"Use your experience in {', '.join(strong_skills[:2])} to frame sharper stories and examples.",
                "priority": "medium",
            }
        )

    recommendations.append(
        {
            "category": "resource",
            "title": "Interview preparation playlist",
            "description": "Watch curated interview prep videos and revisit notes after each mock session.",
            "priority": "medium",
        }
    )
    return recommendations[:6]
