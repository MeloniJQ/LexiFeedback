"""
LexiFeed Conversation Routes — Casual Conversation Practice

  GET  /api/practice/conversation/topics          → list of 20 topics (title/icon/description)
  GET  /api/practice/conversation/topics/<id>      → full topic detail (prompt + instructions)
  POST /api/practice/conversation/feedback         → transcript + topic + duration → full IELTS-style report
"""

from flask import Blueprint, request, jsonify
from utils.jwt_handler import token_required
from services.conversation_service import (
    get_all_topics,
    get_topic_by_id,
    generate_conversation_feedback,
)
from services.goal_service import auto_track_progress

conversation_bp = Blueprint("conversation", __name__)


# ─────────────────────────────────────────────────────────────────────────────
# GET /topics
# ─────────────────────────────────────────────────────────────────────────────

@conversation_bp.route("/topics", methods=["GET"])
@token_required
def list_topics(payload):
    try:
        return jsonify(get_all_topics()), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# GET /topics/<topic_id>
# ─────────────────────────────────────────────────────────────────────────────

@conversation_bp.route("/topics/<topic_id>", methods=["GET"])
@token_required
def get_topic(payload, topic_id):
    try:
        topic = get_topic_by_id(topic_id)
        if not topic:
            return jsonify({"error": "Topic not found"}), 404
        return jsonify(topic), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
# POST /feedback
# ─────────────────────────────────────────────────────────────────────────────

@conversation_bp.route("/feedback", methods=["POST"])
@token_required
def feedback(payload):
    """
    Body:
      {
        "transcript":        "Full spoken transcript",
        "topic_id":          "daily-routine",        (optional if topic_title/topic_prompt given directly)
        "topic_title":       "Daily Routine",         (used if topic_id not provided)
        "topic_prompt":      "Describe your daily routine.",
        "duration_seconds":  95
      }

    Returns the full IELTS/TOEFL-style evaluation object (see conversation_service.py).
    """
    try:
        data = request.json or {}
        transcript = (data.get("transcript") or "").strip()
        duration_seconds = float(data.get("duration_seconds", 0))

        if not transcript:
            return jsonify({"error": "transcript is required"}), 400

        topic_id = data.get("topic_id")
        if topic_id:
            topic = get_topic_by_id(topic_id)
            if not topic:
                return jsonify({"error": "Invalid topic_id"}), 400
            topic_title = topic["title"]
            topic_prompt = topic["prompt"]
        else:
            topic_title = (data.get("topic_title") or "General Conversation").strip()
            topic_prompt = (data.get("topic_prompt") or "").strip()

        result = generate_conversation_feedback(
            transcript=transcript,
            topic_title=topic_title,
            topic_prompt=topic_prompt,
            duration_seconds=duration_seconds,
        )

        # Auto-track progress on any active "Casual Conversation" goals,
        # same pattern used by interview.py / reading.py.
        try:
            auto_track_progress(payload["user_id"], "conversation")
        except Exception:
            pass  # never let goal tracking break the main feedback response

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500