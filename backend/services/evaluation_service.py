import re
from typing import Any

from agents.evaluation_agent import EvaluationAgent
from models import CandidateProfile, InterviewPlan, InterviewSession, InterviewQuestionHistory, AnswerEvaluation, InterviewEvaluation, db
from services.voice_service import _count_fillers


def evaluate_answer_for_session(
    session: InterviewSession,
    question_history: InterviewQuestionHistory,
    answer_text: str,
) -> AnswerEvaluation:
    profile = CandidateProfile.query.get(session.candidate_profile_id)
    plan = InterviewPlan.query.get(session.plan_id) if session.plan_id else None

    profile_summary = _build_profile_summary(profile)
    resume_projects = _extract_resume_projects(profile)
    job_description_summary = _extract_job_description_summary(profile)
    plan_focus_areas = plan.plan_data.get('focus_areas', []) if plan else []
    expected_keywords = question_history.question_text and _extract_expected_keywords(question_history)

    conversation_memory = [h.to_dict() for h in InterviewQuestionHistory.query.filter_by(interview_session_id=session.id).order_by(InterviewQuestionHistory.created_at.asc()).all()]
    previous_evaluations = [e.to_dict() for e in AnswerEvaluation.query.filter_by(interview_session_id=session.id).order_by(AnswerEvaluation.created_at.asc()).all()]

    lexical_metrics = _calculate_lexical_metrics(answer_text)

    evaluation_agent = EvaluationAgent()
    result = evaluation_agent.evaluate_answer(
        question_text=question_history.question_text,
        question_type=question_history.question_type or 'technical',
        expected_keywords=expected_keywords,
        answer_text=answer_text,
        profile_summary=profile_summary,
        resume_projects=resume_projects,
        job_description_summary=job_description_summary,
        plan_focus_areas=plan_focus_areas,
        conversation_memory=conversation_memory,
        previous_evaluations=previous_evaluations,
        lexical_metrics=lexical_metrics,
        company=plan.plan_data.get('company', '') if plan else '',
        role=plan.plan_data.get('role', '') if plan else '',
    )

    answer_eval = AnswerEvaluation(
        interview_session_id=session.id,
        question_history_id=question_history.id,
        technical_score=result['technical_score'],
        communication_score=result['communication_score'],
        vocabulary_score=result['vocabulary_score'],
        grammar_score=result['grammar_score'],
        confidence_score=result['confidence_score'],
        completeness_score=result['completeness_score'],
        relevance_score=result['relevance_score'],
        overall_score=result['overall_score'],
        strengths=result['strengths'],
        weaknesses=result['weaknesses'],
        missing_topics=result['missing_topics'],
        suggestions=result['suggestions'],
        raw_analysis=result.get('raw_feedback', {}),
    )
    db.session.add(answer_eval)
    db.session.commit()
    return answer_eval


def generate_interview_summary_for_session(session: InterviewSession) -> InterviewEvaluation:
    profile = CandidateProfile.query.get(session.candidate_profile_id)
    plan = InterviewPlan.query.get(session.plan_id) if session.plan_id else None
    profile_summary = _build_profile_summary(profile)
    resume_projects = _extract_resume_projects(profile)
    job_description_summary = _extract_job_description_summary(profile)
    plan_focus_areas = plan.plan_data.get('focus_areas', []) if plan else []
    answer_evaluations = [e.to_dict() for e in AnswerEvaluation.query.filter_by(interview_session_id=session.id).order_by(AnswerEvaluation.created_at.asc()).all()]

    evaluation_agent = EvaluationAgent()
    summary = evaluation_agent.summarize_interview(
        answer_evaluations=answer_evaluations,
        profile_summary=profile_summary,
        resume_projects=resume_projects,
        job_description_summary=job_description_summary,
        plan_focus_areas=plan_focus_areas,
        company=plan.plan_data.get('company', '') if plan else '',
        role=plan.plan_data.get('role', '') if plan else '',
    )

    interview_eval = InterviewEvaluation(
        interview_session_id=session.id,
        overall_technical=summary['overall_technical'],
        overall_communication=summary['overall_communication'],
        overall_vocabulary=summary['overall_vocabulary'],
        overall_grammar=summary['overall_grammar'],
        overall_confidence=summary['overall_confidence'],
        overall_completeness=summary['overall_completeness'],
        overall_score=summary['overall_score'],
        strong_topics=summary['strong_topics'],
        weak_topics=summary['weak_topics'],
        frequently_missed_concepts=summary['frequently_missed_concepts'],
        project_knowledge=summary['project_knowledge'],
        domain_knowledge=summary['domain_knowledge'],
        behavioral_performance=summary['behavioral_performance'],
        recommendations=summary['recommendations'],
        summary=summary.get('summary', {}),
        raw_analysis=summary,
    )
    db.session.add(interview_eval)
    db.session.commit()
    return interview_eval


# ─────────────────────────────────────────────────────────────────────────────
# Local helper functions
# ─────────────────────────────────────────────────────────────────────────────

def _calculate_lexical_metrics(text: str) -> dict[str, Any]:
    words = re.findall(r"\b\w+\b", text.lower())
    distinct_words = set(words)
    word_count = len(words)
    sentence_count = len(re.findall(r"[.!?]+", text)) or 1
    avg_sentence_length = round(word_count / sentence_count, 1)
    repeated_words = [w for w in distinct_words if words.count(w) > 2]
    filler = _count_fillers(text)

    return {
        'word_count': word_count,
        'unique_word_count': len(distinct_words),
        'lexical_density': round(len(distinct_words) / max(word_count, 1) * 100, 1),
        'avg_sentence_length': avg_sentence_length,
        'sentence_count': sentence_count,
        'vocabulary_diversity': round(len(distinct_words) / max(word_count, 1) * 100, 1),
        'repeated_words': repeated_words,
        'filler_count': filler['count'],
        'filler_words': filler['list'],
        'has_filler': filler['count'] > 0,
    }


def _build_profile_summary(profile: CandidateProfile | None) -> str:
    if not profile or not profile.profile_data:
        return ''
    summary = profile.profile_data.get('summary', '')
    if not summary:
        resume_text = profile.profile_data.get('resume', {}).get('summary', '')
        summary = resume_text
    return summary or ''


def _extract_resume_projects(profile: CandidateProfile | None) -> list[str]:
    if not profile or not profile.profile_data:
        return []
    projects = profile.profile_data.get('projects', [])
    if isinstance(projects, list):
        return [str(p) for p in projects][:5]
    return []


def _extract_job_description_summary(profile: CandidateProfile | None) -> str:
    if not profile or not profile.profile_data:
        return ''
    return profile.profile_data.get('job_description', {}).get('summary', '') or ''


def _extract_expected_keywords(question_history: InterviewQuestionHistory) -> list[str]:
    if question_history.question_type and question_history.question_type.lower() == 'technical':
        return question_history.question_text.split()[:8]
    return []
