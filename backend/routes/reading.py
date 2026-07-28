from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models import db, User, ReadingPassageHistory
from utils.jwt_handler import token_required
from utils.cefr import normalize_level, difficulty_for_level
from services.ai_service import generate_ai_passage, analyze_pronunciation
from services.goal_service import auto_track_progress

reading_bp = Blueprint("reading", __name__)

# How many of the user's most recent passages (per mode) to actively avoid
# repeating. Keeps the exclude-list small/fast while still covering
# "don't repeat within a session or two" per Feature 3.
RECENT_HISTORY_WINDOW = 15


@reading_bp.route("/generate", methods=["POST"])
@token_required
def generate(payload):
    """
    POST /api/practice/reading/generate
    JSON body:
    {
        "difficulty": "beginner" | "intermediate" | "advanced",  // optional if "level" given
        "level": "A1".."C2",                                     // optional — defaults to the user's assessed CEFR level
        "length": "short" | "medium" | "long",                   // optional, default "medium"
        "mode": "standard" | "journalist"
    }
    """
    try:
        data = request.json or {}
        mode = data.get("mode", "standard").lower()
        if mode not in ["standard", "journalist"]:
            mode = "standard"

        length = data.get("length", "medium").lower()
        if length not in ["short", "medium", "long"]:
            length = "medium"

        # Level resolution: explicit request param > user's assessed CEFR level > explicit
        # legacy "difficulty" param > default intermediate. This keeps the endpoint
        # backward-compatible for any caller that still only sends "difficulty".
        level = data.get("level")
        if not level:
            user = User.query.get(payload["user_id"])
            if user and user.english_level:
                level = user.english_level

        if level:
            level = normalize_level(level)
            difficulty = difficulty_for_level(level)
        else:
            difficulty = data.get("difficulty", "intermediate").lower()
            if difficulty not in ["beginner", "intermediate", "advanced"]:
                difficulty = "intermediate"

        # Pull this user's recent passage titles (same mode) so we never
        # repeat one, not just "not the same as literally the last call".
        cutoff = datetime.utcnow() - timedelta(days=30)
        recent = (
            ReadingPassageHistory.query
            .filter_by(user_id=payload["user_id"], mode=mode)
            .filter(ReadingPassageHistory.created_at >= cutoff)
            .order_by(ReadingPassageHistory.created_at.desc())
            .limit(RECENT_HISTORY_WINDOW)
            .all()
        )
        exclude_titles = [r.title for r in recent]

        passage_data = generate_ai_passage(
            difficulty=difficulty,
            mode=mode,
            level=level,
            length=length,
            exclude_titles=exclude_titles,
        )

        # Record it so the NEXT generation call (for this user) avoids it too.
        try:
            db.session.add(ReadingPassageHistory(
                user_id=payload["user_id"],
                title=passage_data.get("title", "")[:255],
                mode=mode,
                difficulty=difficulty,
                level=level,
                length=length,
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()  # never let history logging break passage delivery

        passage_data["difficulty"] = difficulty
        passage_data["level"] = level
        passage_data["length"] = length
        return jsonify(passage_data), 200

    except Exception as e:
        print(f"[reading/generate] Route error: {e}")
        return jsonify({"error": str(e)}), 500


@reading_bp.route("/feedback", methods=["POST"])
@token_required
def feedback(payload):
    """
    POST /api/practice/reading/feedback

    JSON body:
    {
        "transcript": "what the user said",
        "originalText": "the reference text",
        "difficulty": "...",
        "mode": "..."
    }
    """
    try:
        data = request.json or {}
        transcript = data.get("transcript", "").strip()
        original_text = data.get("originalText", "").strip()

        if not original_text:
            return jsonify({"error": "originalText is required"}), 400

        analysis = analyze_pronunciation(
            transcript=transcript,
            original_text=original_text,
        )

        try:
            auto_track_progress(payload["user_id"], "reading")
        except Exception:
            pass  # never let goal tracking break the main feedback response

        return jsonify(analysis), 200

    except Exception as e:
        print(f"[reading/feedback] Route error: {e}")
        return jsonify({"error": str(e)}), 500