import os
import tempfile
from uuid import uuid4

from flask import Blueprint, jsonify, request

from models import db, JobDescriptionData, ProfileMatch, ResumeData
from services.candidate_profile import (
    build_candidate_profile_payload,
    create_or_update_candidate_profile,
    get_latest_candidate_profile,
    save_profile_match,
)
from services.jd_parser import extract_job_description_data
from services.match_service import generate_profile_match
from services.resume_parser import extract_resume_data, extract_resume_text_from_file
from utils.jwt_handler import token_required

candidate_bp = Blueprint("candidate_intelligence", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "candidate_intelligence")


def _ensure_upload_dir() -> None:
    os.makedirs(UPLOAD_DIR, exist_ok=True)


@candidate_bp.route("/api/candidate/resume/upload", methods=["POST"])
@candidate_bp.route("/api/resume/upload", methods=["POST"])
@token_required
def upload_resume(payload):
    try:
        if "file" not in request.files or not request.files["file"].filename:
            return jsonify({"error": "Resume file is required"}), 400

        uploaded_file = request.files["file"]
        ext = (uploaded_file.filename or "").rsplit(".", 1)[-1].lower()
        if ext != "pdf":
            return jsonify({"error": "Only PDF files are supported for candidate intelligence parsing"}), 400

        _ensure_upload_dir()
        temp_path = os.path.join(UPLOAD_DIR, f"{uuid4().hex}_{uploaded_file.filename}")
        uploaded_file.save(temp_path)

        try:
            extracted_text = extract_resume_text_from_file(temp_path)
            if not extracted_text.strip():
                return jsonify({"error": "The uploaded resume was empty or could not be parsed"}), 400

            parsed_resume = extract_resume_data(extracted_text, uploaded_file.filename)
            if not any(parsed_resume.values()):
                return jsonify({"error": "The uploaded resume could not be parsed into structured data"}), 400

            resume_record = ResumeData(
                user_id=payload["user_id"],
                filename=uploaded_file.filename,
                file_type=ext,
                extracted_text=extracted_text[:4000],
                parsed_data=parsed_resume,
            )
            db.session.add(resume_record)
            db.session.flush()

            current_profile = get_latest_candidate_profile(payload["user_id"])
            match_data = None
            if current_profile and current_profile.job_description_data_id:
                jd_record = JobDescriptionData.query.get(current_profile.job_description_data_id)
                if jd_record:
                    match_data = generate_profile_match(parsed_resume, jd_record.parsed_data or {})

            profile = create_or_update_candidate_profile(
                user_id=payload["user_id"],
                resume_record=resume_record,
                profile_data=build_candidate_profile_payload(resume_data=parsed_resume, jd_data=(jd_record.parsed_data if match_data else None), match_data=match_data),
            )

            if match_data:
                save_profile_match(profile, match_data)

            return jsonify({
                "message": "Resume parsed successfully",
                "resume_summary": parsed_resume,
                "candidate_profile": profile.to_dict(),
                "match_summary": match_data,
            }), 200
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Resume parsing failed: {exc}"}), 500


@candidate_bp.route("/api/candidate/jd/analyze", methods=["POST"])
@candidate_bp.route("/api/jd/analyze", methods=["POST"])
@token_required
def analyze_job_description(payload):
    try:
        data = request.get_json(silent=True) or {}
        job_description_text = (data.get("job_description") or "").strip()
        if not job_description_text:
            return jsonify({"error": "A job description is required"}), 400

        jd_data = extract_job_description_data(job_description_text)
        if not any(jd_data.values()):
            return jsonify({"error": "The job description could not be parsed"}), 400

        job_record = JobDescriptionData(
            user_id=payload["user_id"],
            raw_text=job_description_text[:4000],
            parsed_data=jd_data,
        )
        db.session.add(job_record)
        db.session.flush()

        current_profile = get_latest_candidate_profile(payload["user_id"])
        profile_data = build_candidate_profile_payload(jd_data=jd_data)
        if current_profile and current_profile.resume_data_id:
            resume_record = ResumeData.query.get(current_profile.resume_data_id)
            if resume_record:
                match_data = generate_profile_match(resume_record.parsed_data or {}, jd_data)
                profile_data["match"] = match_data
                profile_data["resume"] = resume_record.parsed_data or {}

        profile = create_or_update_candidate_profile(
            user_id=payload["user_id"],
            job_description_record=job_record,
            profile_data=profile_data,
        )

        match_data = None
        if profile.resume_data_id:
            resume_record = ResumeData.query.get(profile.resume_data_id)
            if resume_record:
                match_data = generate_profile_match(resume_record.parsed_data or {}, jd_data)
                save_profile_match(profile, match_data)

        return jsonify({
            "message": "Job description analyzed successfully",
            "job_description_summary": jd_data,
            "candidate_profile": profile.to_dict(),
            "match_summary": match_data,
        }), 200

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Job description analysis failed: {exc}"}), 500


@candidate_bp.route("/api/candidate/profile", methods=["GET"])
@candidate_bp.route("/api/profile", methods=["GET"])
@token_required
def get_candidate_profile(payload):
    try:
        profile = get_latest_candidate_profile(payload["user_id"])
        if not profile:
            return jsonify({"message": "No candidate profile has been created yet"}), 404
        return jsonify(profile.to_dict()), 200
    except Exception as exc:
        return jsonify({"error": f"Unable to load profile: {exc}"}), 500


@candidate_bp.route("/api/candidate/match", methods=["GET"])
@candidate_bp.route("/api/match", methods=["GET"])
@token_required
def get_candidate_match(payload):
    try:
        profile = get_latest_candidate_profile(payload["user_id"])
        if not profile or not profile.resume_data_id or not profile.job_description_data_id:
            return jsonify({"error": "A resume and job description are required to generate a profile match"}), 404

        resume_record = ResumeData.query.get(profile.resume_data_id)
        jd_record = JobDescriptionData.query.get(profile.job_description_data_id)
        if not resume_record or not jd_record:
            return jsonify({"error": "Stored profile data is incomplete"}), 404

        match_data = generate_profile_match(resume_record.parsed_data or {}, jd_record.parsed_data or {})
        latest_match = ProfileMatch.query.filter_by(candidate_profile_id=profile.id).order_by(ProfileMatch.created_at.desc()).first()
        if latest_match is None or latest_match.match_data != match_data:
            latest_match = save_profile_match(profile, match_data)

        return jsonify({
            "candidate_profile_id": profile.id,
            "match_summary": match_data,
            "latest_match": latest_match.to_dict(),
        }), 200
    except Exception as exc:
        return jsonify({"error": f"Unable to generate match: {exc}"}), 500
