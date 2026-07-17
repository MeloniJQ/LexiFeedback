from typing import Any

from models import CandidateProfile, InterviewPlan, Question, db
from services.candidate_profile import get_latest_candidate_profile
from services.planning_service import get_latest_interview_plan
from agents.question_generator import generate_questions_from_blueprint, save_questions


def generate_and_save_questions(user_id: int, count: int = 10) -> list[Question]:
    profile = get_latest_candidate_profile(user_id)
    if not profile:
        raise ValueError("No candidate profile found for this user.")

    plan = get_latest_interview_plan(user_id)
    if not plan:
        raise ValueError("No interview plan available. Generate an interview plan first.")

    questions = generate_questions_from_blueprint(profile, plan.plan_data, count=count)

    Question.query.filter_by(candidate_profile_id=profile.id).delete()
    db.session.commit()

    saved_questions = save_questions(profile, questions)
    return saved_questions


def get_questions_for_profile(user_id: int) -> list[Question]:
    profile = get_latest_candidate_profile(user_id)
    if not profile:
        return []
    return Question.query.filter_by(candidate_profile_id=profile.id).order_by(Question.created_at.asc()).all()


def get_question_by_id(user_id: int, question_id: str) -> Question | None:
    profile = get_latest_candidate_profile(user_id)
    if not profile:
        return None

    question = Question.query.filter(
        (Question.question_id == question_id) | (Question.id == question_id)
    ).first()
    if question is None or question.candidate_profile_id != profile.id:
        return None
    return question
