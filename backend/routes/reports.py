from flask import Blueprint, jsonify, request
from utils.jwt_handler import token_required
from models import InterviewEvaluation, InterviewSession
from services.report_service import build_session_report, export_report

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/session/<int:session_id>", methods=["GET"])
@token_required
def get_session_report(payload, session_id):
    try:
        session = InterviewSession.query.filter_by(id=session_id, user_id=payload["user_id"]).first()
        if not session:
            return jsonify({"error": "Session not found"}), 404

        evaluation = InterviewEvaluation.query.filter_by(interview_session_id=session.id).order_by(InterviewEvaluation.created_at.desc()).first()
        report = build_session_report(session, evaluation)
        return jsonify({"report": report}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@reports_bp.route("/session/<int:session_id>/export", methods=["GET"])
@token_required
def export_session_report(payload, session_id):
    try:
        fmt = (request.args.get("format") or "json").lower()
        session = InterviewSession.query.filter_by(id=session_id, user_id=payload["user_id"]).first()
        if not session:
            return jsonify({"error": "Session not found"}), 404

        evaluation = InterviewEvaluation.query.filter_by(interview_session_id=session.id).order_by(InterviewEvaluation.created_at.desc()).first()
        report = build_session_report(session, evaluation)
        exported = export_report(report, fmt)
        return jsonify({"format": fmt, "exported": exported}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
