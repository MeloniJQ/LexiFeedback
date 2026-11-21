from flask import Blueprint, jsonify, request
from utils.jwt_handler import token_required
from models import CandidateProfile, InterviewEvaluation, InterviewSession
from agents.recommendation_agent import generate_recommendations

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/latest", methods=["GET"])
@token_required
def get_recommendations(payload):
    try:
        profile = CandidateProfile.query.filter_by(user_id=payload["user_id"]).order_by(CandidateProfile.updated_at.desc()).first()
        sessions = InterviewSession.query.filter_by(user_id=payload["user_id"]).order_by(InterviewSession.created_at.desc()).all()
        latest_eval = None
        for session in sessions:
            latest_eval = InterviewEvaluation.query.filter_by(interview_session_id=session.id).order_by(InterviewEvaluation.created_at.desc()).first()
            if latest_eval:
                break

        resume_skills = []
        if profile and profile.profile_data:
            resume_skills = profile.profile_data.get("skills", []) or []

        recommendations = generate_recommendations(
            resume_skills=resume_skills,
            job_requirements=(profile.profile_data or {}).get("job_description", {}).get("required_skills", []) if profile and profile.profile_data else [],
            weak_skills=(latest_eval.weak_topics if latest_eval else []) or [],
            strong_skills=(latest_eval.strong_topics if latest_eval else []) or [],
            missing_concepts=(latest_eval.frequently_missed_concepts if latest_eval else []) or [],
            interview_performance={
                "technical_score": latest_eval.overall_technical if latest_eval else 0,
                "communication_score": latest_eval.overall_communication if latest_eval else 0,
            },
        )
        return jsonify({"recommendations": recommendations}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
