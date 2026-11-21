from __future__ import annotations

from typing import Any


def build_interview_analytics(evaluations: list[dict[str, Any]]) -> dict[str, Any]:
    """Create multi-interview analytics from stored evaluation summaries."""
    if not evaluations:
        return {
            "performance_trend": [],
            "communication_improvement": 0,
            "vocabulary_growth": 0,
            "technical_growth": 0,
            "confidence_trend": [],
            "skill_wise_improvement": [],
            "weak_topics_history": [],
            "strength_history": [],
            "score_cards": [],
        }

    trend = [
        {"session": idx + 1, "score": int(item.get("overall_score", 0) or 0)}
        for idx, item in enumerate(evaluations)
    ]
    communication_scores = [int(item.get("overall_communication", 0) or 0) for item in evaluations]
    vocabulary_scores = [int(item.get("overall_vocabulary", 0) or 0) for item in evaluations]
    technical_scores = [int(item.get("overall_technical", 0) or 0) for item in evaluations]

    return {
        "performance_trend": trend,
        "communication_improvement": max(communication_scores) - min(communication_scores) if communication_scores else 0,
        "vocabulary_growth": max(vocabulary_scores) - min(vocabulary_scores) if vocabulary_scores else 0,
        "technical_growth": max(technical_scores) - min(technical_scores) if technical_scores else 0,
        "confidence_trend": [
            {"session": idx + 1, "score": int(item.get("overall_confidence", 0) or 0)}
            for idx, item in enumerate(evaluations)
        ],
        "skill_wise_improvement": [
            {"skill": "Technical", "score": round(sum(technical_scores) / max(len(technical_scores), 1), 1)},
            {"skill": "Communication", "score": round(sum(communication_scores) / max(len(communication_scores), 1), 1)},
            {"skill": "Vocabulary", "score": round(sum(vocabulary_scores) / max(len(vocabulary_scores), 1), 1)},
        ],
        "weak_topics_history": [
            {"topic": item, "count": 1}
            for item in sorted({topic for entry in evaluations for topic in entry.get("weak_topics", [])})
        ],
        "strength_history": [
            {"topic": item, "count": 1}
            for item in sorted({topic for entry in evaluations for topic in entry.get("strong_topics", [])})
        ],
        "score_cards": [
            {"label": "Average Score", "value": round(sum(item.get("overall_score", 0) for item in evaluations) / len(evaluations), 1)},
            {"label": "Average Technical", "value": round(sum(item.get("overall_technical", 0) for item in evaluations) / len(evaluations), 1)},
            {"label": "Average Confidence", "value": round(sum(item.get("overall_confidence", 0) for item in evaluations) / len(evaluations), 1)},
        ],
    }
