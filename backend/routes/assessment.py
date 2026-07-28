"""
LexiFeed CEFR Initial English Level Assessment routes — Feature 1.

  GET  /api/assessment/status  → does this user still need to take it?
  GET  /api/assessment/start   → build a fresh placement test package
  POST /api/assessment/submit  → score answers, persist CEFR level to User

The generated answer key is kept server-side only (in-memory, keyed by
user_id) between /start and /submit, so a client can't just read the
correct answers out of the JSON response. This mirrors the existing
in-process caching pattern already used in services/ai_service.py
(_last_generated_title) — fine for this app's single-process deployment;
a multi-worker deployment would want to move this to the DB or Redis.
"""

import threading
from datetime import datetime

from flask import Blueprint, request, jsonify
from models import db, User
from utils.jwt_handler import token_required
from services.assessment_service import build_assessment, score_assessment

assessment_bp = Blueprint("assessment", __name__)

_pending_answer_keys: dict = {}
_pending_lock = threading.Lock()


@assessment_bp.route("/status", methods=["GET"])
@token_required
def status(payload):
    user = User.query.get(payload["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "assessment_completed": bool(user.assessment_completed),
        "english_level": user.english_level,
        "assessment_date": user.assessment_date.isoformat() if user.assessment_date else None,
    }), 200


@assessment_bp.route("/start", methods=["GET"])
@token_required
def start(payload):
    """Builds a new placement test (used both for the first-time assessment
    and for on-demand reassessment)."""
    try:
        package = build_assessment()
        answer_key = package.pop("_answer_key")

        with _pending_lock:
            _pending_answer_keys[payload["user_id"]] = answer_key

        return jsonify(package), 200
    except Exception as e:
        print(f"[assessment/start] Route error: {e}")
        return jsonify({"error": "Failed to build assessment. Please try again."}), 500


@assessment_bp.route("/submit", methods=["POST"])
@token_required
def submit(payload):
    """
    JSON body:
    {
      "grammar": {"g_a1_1": 0, ...},
      "vocabulary": {"v_a1_1": 2, ...},
      "reading_answers": [0, 1],
      "listening_answers": [1, 0],
      "speaking": {
        "readaloud_transcript": "...",
        "readaloud_reference": "...",
        "open_transcripts": ["...", "..."]
      }
    }
    """
    try:
        user = User.query.get(payload["user_id"])
        if not user:
            return jsonify({"error": "User not found"}), 404

        with _pending_lock:
            answer_key = _pending_answer_keys.pop(payload["user_id"], None)

        if not answer_key:
            return jsonify({
                "error": "No active assessment found for this user. Please start the assessment again."
            }), 400

        submission = request.json or {}
        result = score_assessment(answer_key, submission)

        # Persist to the user record — this is what drives every other
        # feature's difficulty from here on.
        user.english_level = result["english_level"]
        user.assessment_completed = True
        user.assessment_date = datetime.utcnow()
        user.overall_score = result["overall_score"]
        user.grammar_score = result["grammar_score"]
        user.vocabulary_score = result["vocabulary_score"]
        user.pronunciation_score = result["pronunciation_score"]
        user.fluency_score = result["fluency_score"]
        user.speaking_score = result["speaking_score"]
        user.reading_score = result["reading_score"]
        user.listening_score = result["listening_score"]

        db.session.commit()

        return jsonify({
            **result,
            "message": "Assessment complete.",
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"[assessment/submit] Route error: {e}")
        return jsonify({"error": str(e)}), 500
