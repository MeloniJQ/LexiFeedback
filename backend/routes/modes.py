from flask import Blueprint, jsonify, request
from utils.jwt_handler import token_required
from models import InterviewPlan, InterviewSession, db

modes_bp = Blueprint("modes", __name__)

SUPPORTED_MODES = [
    "Google",
    "Microsoft",
    "Amazon",
    "Meta",
    "Apple",
    "Netflix",
    "TCS",
    "Infosys",
    "Wipro",
    "Accenture",
    "Capgemini",
    "Deloitte",
    "General Software Engineer",
    "Backend Developer",
    "Frontend Developer",
    "Full Stack Developer",
    "AI Engineer",
    "Machine Learning Engineer",
    "Data Scientist",
    "Cloud Engineer",
    "Cybersecurity Engineer",
]


@modes_bp.route("/list", methods=["GET"])
@token_required
def list_modes(payload):
    return jsonify({"modes": SUPPORTED_MODES}), 200


@modes_bp.route("/apply", methods=["POST"])
@token_required
def apply_mode(payload):
    data = request.json or {}
    mode = (data.get("mode") or "General Software Engineer").strip()
    if mode not in SUPPORTED_MODES:
        return jsonify({"error": "Unsupported interview mode"}), 400

    session_id = data.get("session_id")
    session = InterviewSession.query.filter_by(id=session_id, user_id=payload["user_id"]).first() if session_id else None
    if session:
        session.meta_data = session.meta_data or {}
        session.meta_data["mode"] = mode
        db.session.commit()

    return jsonify({"mode": mode, "message": f"{mode} mode configured"}), 200
