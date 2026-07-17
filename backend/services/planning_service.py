from typing import Any

from models import CandidateProfile, InterviewPlan, JobDescriptionData, ResumeData, db
from services.match_service import generate_profile_match
from agents.interview_planner import build_interview_plan


def get_latest_interview_plan(user_id: int) -> InterviewPlan | None:
    profile = CandidateProfile.query.filter_by(user_id=user_id).order_by(CandidateProfile.updated_at.desc()).first()
    if not profile:
        return None
    return InterviewPlan.query.filter_by(candidate_profile_id=profile.id).order_by(InterviewPlan.updated_at.desc()).first()


def build_interview_plan_payload(
    resume_data: dict[str, Any] | None = None,
    jd_data: dict[str, Any] | None = None,
    match_data: dict[str, Any] | None = None,
    candidate_name: str | None = None,
    company: str | None = None,
    role: str | None = None,
) -> dict[str, Any]:
    return build_interview_plan(
        candidate_name=candidate_name,
        resume_data=resume_data or {},
        jd_data=jd_data or {},
        match_data=match_data or {},
        company=company,
        role=role,
    )


def create_or_update_interview_plan(candidate_profile: CandidateProfile, plan_data: dict[str, Any]) -> InterviewPlan:
    plan_record = InterviewPlan(candidate_profile_id=candidate_profile.id, plan_data=plan_data)
    db.session.add(plan_record)
    db.session.commit()
    return plan_record
