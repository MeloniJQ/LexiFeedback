from __future__ import annotations

from typing import Any


def build_notifications(session: Any, report: dict[str, Any] | None = None, recommendations: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
    """Create a small notification feed for recent interview activity."""
    notifications = [
        {
            "type": "interview_completed",
            "title": "Interview completed",
            "message": f"Your interview session {session.id} is ready for review.",
            "is_read": False,
        }
    ]
    if report:
        notifications.append(
            {
                "type": "report_ready",
                "title": "Report ready",
                "message": f"Overall score {report.get('overall_score', 0)}/100 is now available.",
                "is_read": False,
            }
        )
    if recommendations:
        notifications.append(
            {
                "type": "recommendation_available",
                "title": "Recommendations available",
                "message": f"{len(recommendations)} tailored learning suggestions are ready.",
                "is_read": False,
            }
        )
    return notifications
