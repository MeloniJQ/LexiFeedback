from flask import Blueprint, jsonify
from utils.jwt_handler import token_required
from models import InterviewSession, InterviewEvaluation, InterviewQuestionHistory

history_bp = Blueprint("history", __name__)


@history_bp.route("/sessions", methods=["GET"])
@token_required
def get_history(payload):
    try:
        sessions = InterviewSession.query.filter_by(user_id=payload["user_id"]).order_by(InterviewSession.created_at.desc()).all()
        items = []
        for session in sessions:
            evaluation = InterviewEvaluation.query.filter_by(interview_session_id=session.id).order_by(InterviewEvaluation.created_at.desc()).first()
            questions = InterviewQuestionHistory.query.filter_by(interview_session_id=session.id).order_by(InterviewQuestionHistory.created_at.asc()).all()
            items.append(
                {
                    "session": session.to_dict(),
                    "evaluation": evaluation.to_dict() if evaluation else None,
                    "questions": [question.to_dict() for question in questions],
                }
            )
        return jsonify({"history": items}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
