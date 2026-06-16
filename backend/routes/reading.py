from flask import Blueprint, request, jsonify
from utils.jwt_handler import token_required
from services.ai_service import generate_ai_passage, analyze_pronunciation

reading_bp = Blueprint("reading", __name__)

@reading_bp.route("/generate", methods=["POST"])
@token_required
def generate(payload):
    """
    POST /api/practice/reading/generate
    JSON body:
      {
        "difficulty": "beginner" | "intermediate" | "advanced",
        "mode": "standard" | "journalist"
      }
    """
    try:
        data = request.json or {}
        difficulty = data.get("difficulty", "intermediate").lower()
        mode = data.get("mode", "standard").lower()

        if difficulty not in ["beginner", "intermediate", "advanced"]:
            difficulty = "intermediate"
        if mode not in ["standard", "journalist"]:
            mode = "standard"

        passage_data = generate_ai_passage(difficulty=difficulty, mode=mode)
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

        analysis = analyze_pronunciation(transcript=transcript, original_text=original_text)
        return jsonify(analysis), 200

    except Exception as e:
        print(f"[reading/feedback] Route error: {e}")
        return jsonify({"error": str(e)}), 500
