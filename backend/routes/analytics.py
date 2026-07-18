from flask import Blueprint, jsonify, request
from utils.jwt_handler import token_required
from models import InterviewEvaluation, InterviewSession, db
from services.analytics_service import build_interview_analytics

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/summary", methods=["GET"])
@token_required
def get_analytics(payload):
    try:
        sessions = InterviewSession.query.filter_by(user_id=payload["user_id"]).order_by(InterviewSession.created_at.asc()).all()
        evaluations = []
        for session in sessions:
            eval_record = InterviewEvaluation.query.filter_by(interview_session_id=session.id).order_by(InterviewEvaluation.created_at.desc()).first()
            if eval_record:
                evaluations.append(
                    {
                        "overall_score": eval_record.overall_score,
                        "overall_technical": eval_record.overall_technical,
                        "overall_communication": eval_record.overall_communication,
                        "overall_vocabulary": eval_record.overall_vocabulary,
                        "overall_confidence": eval_record.overall_confidence,
                        "strong_topics": eval_record.strong_topics,
                        "weak_topics": eval_record.weak_topics,
                    }
                )
        return jsonify(build_interview_analytics(evaluations)), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
