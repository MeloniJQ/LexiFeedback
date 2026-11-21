import json
from datetime import datetime
from typing import Any

from models import CandidateProfile, InterviewPlan, InterviewSession, InterviewQuestionHistory, ConversationMemory, AnswerEvaluation, InterviewEvaluation, db
from services.question_service import get_questions_for_profile
from services.evaluation_service import evaluate_answer_for_session, generate_interview_summary_for_session
from agents.interview_agent import InterviewAgent
from agents.followup_agent import FollowupAgent
from agents.question_generator import generate_questions_from_blueprint


class InterviewOrchestrator:
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.profile = CandidateProfile.query.filter_by(user_id=user_id).order_by(CandidateProfile.updated_at.desc()).first()
        self.session: InterviewSession | None = None
        self.agent = None
        self.followup_agent = FollowupAgent()

    def _load_latest_plan(self) -> InterviewPlan | None:
        if not self.profile:
            return None
        return InterviewPlan.query.filter_by(candidate_profile_id=self.profile.id).order_by(InterviewPlan.updated_at.desc()).first()

    def create_session(self) -> InterviewSession:
        if not self.profile:
            raise ValueError('No candidate profile for user')

        plan = self._load_latest_plan()
        if not plan:
            raise ValueError('No interview plan available')

        session = InterviewSession(
            user_id=self.user_id,
            candidate_profile_id=self.profile.id,
            plan_id=plan.id,
            status='active',
            current_difficulty='Medium',
            current_topic=plan.plan_data.get('title', 'General'),
            meta_data={
                'question_count': 0,
                'asked_topics': [],
                'strong_areas': [],
                'weak_areas': [],
                'skipped_topics': [],
                'company': plan.plan_data.get('company', 'General'),
                'role': plan.plan_data.get('role', 'General'),
                'mode': 'General Software Engineer',
                'time_analysis': {},
                'answer_quality': {},
            },
        )
        db.session.add(session)
        db.session.commit()

        self.session = session
        self.agent = InterviewAgent(self.profile, plan, session)
        self._save_memory_snapshot('initial')
        return session

    def load_session(self, session_id: int) -> InterviewSession | None:
        session = InterviewSession.query.filter_by(id=session_id, user_id=self.user_id).first()
        if not session:
            return None
        self.session = session
        plan = InterviewPlan.query.filter_by(id=session.plan_id).first() if session.plan_id else self._load_latest_plan()
        self.agent = InterviewAgent(self.profile, plan, session)
        return session

    def get_next_question(self) -> dict[str, Any]:
        if not self.session or not self.agent:
            raise ValueError('Session not loaded')

        question = self.agent.select_next_question()
        history_item = InterviewQuestionHistory(
            interview_session_id=self.session.id,
            question_id=question['question_id'],
            question_text=question['question_text'],
            question_type=question['category'],
            topic=question.get('topic'),
            difficulty=question.get('difficulty'),
            is_followup=False,
        )
        db.session.add(history_item)
        self.session.meta_data['question_count'] = self.session.meta_data.get('question_count', 0) + 1
        asked_topics = set(self.session.meta_data.get('asked_topics', []))
        if question.get('topic'):
            asked_topics.add(question['topic'])
        self.session.meta_data['asked_topics'] = list(asked_topics)
        self.session.meta_data['current_topic'] = question.get('topic')
        self.session.meta_data['current_difficulty'] = question.get('difficulty')
        db.session.commit()
        return question

    def submit_answer(self, question_id: str, answer_text: str) -> dict[str, Any]:
        if not self.session:
            raise ValueError('Session not loaded')
        history = InterviewQuestionHistory.query.filter_by(interview_session_id=self.session.id, question_id=question_id).order_by(InterviewQuestionHistory.created_at.desc()).first()
        if not history:
            raise ValueError('Question record not found')
        history.answer_text = answer_text
        db.session.commit()

        self.agent.update_memory(question=history.question_text, answer=answer_text, topic=history.topic)
        self._save_memory_snapshot('answer')
        evaluation = evaluate_answer_for_session(self.session, history, answer_text)
        followup = self.followup_agent.generate_followup(
            question=history.question_text,
            answer=answer_text,
            history=self._load_history_context(),
            candidate_profile=self.profile,
            plan=self._load_latest_plan(),
        )
        return {
            'followup': followup,
            'evaluation': evaluation.to_dict(),
        }

    def pause(self) -> InterviewSession:
        if not self.session:
            raise ValueError('Session not loaded')
        self.session.status = 'paused'
        self.session.paused_at = datetime.utcnow()
        db.session.commit()
        return self.session

    def resume(self) -> InterviewSession:
        if not self.session:
            raise ValueError('Session not loaded')
        self.session.status = 'active'
        self.session.paused_at = None
        db.session.commit()
        return self.session

    def end(self) -> InterviewSession:
        if not self.session:
            raise ValueError('Session not loaded')
        self.session.status = 'completed'
        self.session.completed_at = datetime.utcnow()
        if not self.session.meta_data:
            self.session.meta_data = {}
        self.session.meta_data['completed'] = True
        self.session.meta_data['summary_ready'] = True
        db.session.commit()
        return self.session

    def _load_history_context(self) -> list[dict[str, Any]]:
        history = InterviewQuestionHistory.query.filter_by(interview_session_id=self.session.id).order_by(InterviewQuestionHistory.created_at.asc()).all()
        return [item.to_dict() for item in history]

    def _save_memory_snapshot(self, memory_type: str) -> None:
        if not self.session:
            return
        memory = ConversationMemory(
            interview_session_id=self.session.id,
            memory_type=memory_type,
            memory_data={
                'metadata': self.session.meta_data,
                'history_count': InterviewQuestionHistory.query.filter_by(interview_session_id=self.session.id).count(),
            },
        )
        db.session.add(memory)
        db.session.commit()
