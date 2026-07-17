from flask import Blueprint, jsonify, request

from services.question_service import (
    generate_and_save_questions,
    get_questions_for_profile,
    get_question_by_id,
)
from utils.jwt_handler import token_required

question_bp = Blueprint("question_generation", __name__)


@question_bp.route("/generate", methods=["POST"])
@token_required
def generate_questions(payload):
    data = request.get_json(silent=True) or {}
    count = int(data.get("count", 10))
    count = max(1, min(count, 20))

    try:
        questions = generate_and_save_questions(payload["user_id"], count=count)
        return jsonify({
            "message": "Questions generated successfully",
            "questions": [q.to_dict() for q in questions],
        }), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@question_bp.route("", methods=["GET"])
@token_required
def list_questions(payload):
    questions = get_questions_for_profile(payload["user_id"])
    return jsonify([q.to_dict() for q in questions]), 200


@question_bp.route("/<question_id>", methods=["GET"])
@token_required
def get_question(payload, question_id):
    question = get_question_by_id(payload["user_id"], question_id)
    if not question:
        return jsonify({"error": "Question not found"}), 404
    return jsonify(question.to_dict()), 200
