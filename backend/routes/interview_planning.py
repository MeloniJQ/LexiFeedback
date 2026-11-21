from flask import Blueprint, jsonify, request

from models import CandidateProfile, JobDescriptionData, ResumeData
from services.candidate_profile import get_latest_candidate_profile
from services.match_service import generate_profile_match
from services.planning_service import (
    build_interview_plan_payload,
    create_or_update_interview_plan,
    get_latest_interview_plan,
)
from utils.jwt_handler import token_required

interview_planning_bp = Blueprint("interview_planning", __name__)


@interview_planning_bp.route("/generate", methods=["POST"])
@token_required
def generate_interview_plan(payload):
    profile = get_latest_candidate_profile(payload["user_id"])
    if not profile:
        return jsonify({"error": "No candidate profile is available for planning."}), 404

    data = request.get_json(silent=True) or {}
    company = (data.get("company") or "").strip()
    role = (data.get("role") or "").strip()

    resume_data = {}
    jd_data = {}
    match_data = None

    if profile.resume_data_id:
        resume_record = ResumeData.query.get(profile.resume_data_id)
        if resume_record:
            resume_data = resume_record.parsed_data or {}

    if profile.job_description_data_id:
        jd_record = JobDescriptionData.query.get(profile.job_description_data_id)
        if jd_record:
            jd_data = jd_record.parsed_data or {}

    if resume_data and jd_data:
        match_data = generate_profile_match(resume_data, jd_data)
    elif profile.profile_data.get("match"):
        match_data = profile.profile_data.get("match")

    if not resume_data and not jd_data:
        return jsonify({"error": "At least a resume or job description is required to build an interview plan."}), 400

    plan_payload = build_interview_plan_payload(
        candidate_name=resume_data.get("candidate_name"),
        resume_data=resume_data,
        jd_data=jd_data,
        match_data=match_data,
        company=company,
        role=role,
    )
    plan_record = create_or_update_interview_plan(profile, plan_payload)

    return jsonify({
        "message": "Interview plan generated successfully",
        "plan_summary": plan_payload,
        "interview_plan": plan_record.to_dict(),
        "candidate_profile": profile.to_dict(),
    }), 200


@interview_planning_bp.route("/latest", methods=["GET"])
@token_required
def get_interview_plan(payload):
    plan_record = get_latest_interview_plan(payload["user_id"])
    if not plan_record:
        return jsonify({"error": "No interview plan was found."}), 404

    return jsonify({
        "interview_plan": plan_record.to_dict(),
        "candidate_profile": plan_record.candidate_profile.to_dict() if plan_record.candidate_profile else None,
    }), 200
