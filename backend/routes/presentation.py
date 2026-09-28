"""
LexiFeed Presentation Routes

  POST /api/practice/presentation/log  → record a completed slide practice
                                          attempt so it shows up in the
                                          Progress/Analysis dashboard and
                                          counts toward "Presentation Mode"
                                          goals.

Presentation feedback itself is generated client-side (Next.js API route,
app/api/practice/presentation/feedback/route.ts) since it calls Groq
directly with the browser's env vars — this endpoint just persists the
result the frontend already has, the same way interview/reading/
conversation persist theirs server-side.
"""

from flask import Blueprint, request, jsonify
from utils.jwt_handler import token_required
from services.session_logger import log_practice_session

presentation_bp = Blueprint("presentation", __name__)


@presentation_bp.route("/log", methods=["POST"])
@token_required
def log_presentation_session(payload):
    """
    Body (JSON):
      {
        "topic":        "...",            (optional — presentation topic/title)
        "slideNumber":  1,                (optional)
        "transcript":   "...",            (what the user said for this slide)
        "feedbackText": "...",            (rendered feedback summary/text)
        "score":        7.4,              (0-10 overallScore from the feedback)
        "durationSec":  42                (optional — how long the user spoke for this slide)
      }
    """
    try:
        data = request.json or {}
        topic = (data.get("topic") or "").strip()
        slide_number = data.get("slideNumber")
        transcript = (data.get("transcript") or "").strip()
        feedback_text = data.get("feedbackText") or ""
        score = data.get("score")
        duration_sec = data.get("durationSec")

        title = f"Presentation: {topic}" if topic else "Presentation Practice"
        if slide_number:
            title += f" (Slide {slide_number})"

        record = log_practice_session(
            user_id=payload["user_id"],
            session_type="presentation",
            title=title,
            transcript=transcript,
            feedback=feedback_text,
            score_out_of_10=score,
            duration_seconds=duration_sec,
        )

        return jsonify({
            "message": "Session saved successfully",
            "session": record.to_dict(),
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500