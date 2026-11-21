from typing import Any

from models import db, CandidateProfile, JobDescriptionData, ProfileMatch, ResumeData
from services.jd_parser import extract_job_description_data
from services.match_service import generate_profile_match
from services.resume_parser import extract_resume_data


def build_candidate_profile_payload(resume_data: dict[str, Any] | None = None, jd_data: dict[str, Any] | None = None, match_data: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if resume_data:
        payload["resume"] = resume_data
    if jd_data:
        payload["job_description"] = jd_data
    if match_data:
        payload["match"] = match_data
    return payload


def create_or_update_candidate_profile(user_id: int, resume_record: ResumeData | None = None, job_description_record: JobDescriptionData | None = None, profile_data: dict[str, Any] | None = None) -> CandidateProfile:
    profile = CandidateProfile.query.filter_by(user_id=user_id).order_by(CandidateProfile.updated_at.desc()).first()
    if profile is None:
        profile = CandidateProfile(user_id=user_id)

    if resume_record is not None:
        profile.resume_data_id = resume_record.id
    if job_description_record is not None:
        profile.job_description_data_id = job_description_record.id
    if profile_data is not None:
        profile.profile_data = profile_data

    db.session.add(profile)
    db.session.commit()
    return profile


def save_profile_match(candidate_profile: CandidateProfile, match_data: dict[str, Any]) -> ProfileMatch:
    match_record = ProfileMatch(candidate_profile_id=candidate_profile.id, match_data=match_data)
    db.session.add(match_record)
    db.session.commit()
    return match_record


def get_latest_candidate_profile(user_id: int) -> CandidateProfile | None:
    return CandidateProfile.query.filter_by(user_id=user_id).order_by(CandidateProfile.updated_at.desc()).first()


def get_latest_profile_payload(user_id: int) -> dict[str, Any] | None:
    profile = get_latest_candidate_profile(user_id)
    if not profile:
        return None
    return profile.to_dict()
