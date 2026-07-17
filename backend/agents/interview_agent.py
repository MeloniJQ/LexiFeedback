import random
from typing import Any

from models import CandidateProfile, InterviewPlan, InterviewSession, db
from services.question_service import get_questions_for_profile
from prompts.interview_prompt import build_interview_agent_prompt


class InterviewAgent:
    def __init__(self, profile: CandidateProfile, plan: InterviewPlan, session: InterviewSession):
        self.profile = profile
        self.plan = plan
        self.session = session
        self.memory = self._load_memory()
        self.questions = self._seed_questions()

    def _load_memory(self) -> dict[str, Any]:
        return {
            'previous_questions': [],
            'previous_answers': [],
            'covered_topics': [],
            'strong_areas': [],
            'weak_areas': [],
            'projects_discussed': [],
        }

    def _seed_questions(self) -> list[dict[str, Any]]:
        return get_questions_for_profile(self.profile.user_id)

    def _difficulty_score(self, answer: str) -> int:
        length = len(answer.split())
        if length <= 15:
            return 1
        if length <= 40:
            return 2
        return 3

    def _adjust_difficulty(self, last_question: dict[str, Any], answer: str) -> str:
        score = self._difficulty_score(answer)
        base = last_question.get('difficulty', 'Medium')
        if score >= 3:
            return 'Hard' if base != 'Hard' else 'Hard'
        if score == 2:
            return base
        return 'Easy' if base != 'Easy' else 'Medium'

    def _update_memory(self, question: dict[str, Any], answer: str) -> None:
        self.memory['previous_questions'].append(question['question_text'])
        self.memory['previous_answers'].append(answer)
        topic = question.get('topic')
        if topic and topic not in self.memory['covered_topics']:
            self.memory['covered_topics'].append(topic)
        if question.get('project'):
            self.memory['projects_discussed'].append(question['project'])
        if 'struggle' in answer.lower() or 'hard' in answer.lower() or 'difficult' in answer.lower():
            self.memory['weak_areas'].append(topic or 'General')
        elif 'confident' in answer.lower() or 'experience' in answer.lower():
            self.memory['strong_areas'].append(topic or 'General')

    def _select_by_blueprint(self, unused: list[dict[str, Any]]) -> dict[str, Any] | None:
        blueprint_topics = self.plan.plan_data.get('focus_areas', [])
        for topic in blueprint_topics:
            for q in unused:
                if q.get('topic') == topic and q['question_text'] not in self.memory['previous_questions']:
                    return q
        return None

    def _select_next(self, unused: list[dict[str, Any]]) -> dict[str, Any] | None:
        for q in unused:
            if q['question_text'] not in self.memory['previous_questions']:
                return q
        return None

    def _llm_choose_question(self, unused: list[dict[str, Any]]) -> dict[str, Any] | None:
        if not unused:
            return None

        conversation_history = [
            {'question_text': q, 'answer_text': a}
            for q, a in zip(self.memory['previous_questions'], self.memory['previous_answers'])
        ]
        system, user = build_interview_agent_prompt(
            blueprint=self.plan.plan_data,
            profile=self.profile.profile_data,
            conversation_history=conversation_history,
            last_question=unused[0] if unused else None,
        )
        from llm.provider_factory import get_provider
        provider = get_provider()
        raw = provider.chat(system=system, user=user, temperature=0.7)
        try:
            import json
            candidate = json.loads(raw)
            if isinstance(candidate, dict) and candidate.get('question_id'):
                for q in unused:
                    if q['question_id'] == candidate['question_id']:
                        return q
        except Exception:
            pass
        return None

    def select_next_question(self) -> dict[str, Any]:
        unused = [q.to_dict() if hasattr(q, 'to_dict') else q for q in self.questions]
        unused = [q for q in unused if q['question_text'] not in self.memory['previous_questions']]

        if not unused:
            raise ValueError('No remaining questions available')

        question = self._llm_choose_question(unused) or self._select_by_blueprint(unused) or self._select_next(unused)
        self.session.current_topic = question.get('topic', self.session.current_topic)
        self.session.current_difficulty = question.get('difficulty', self.session.current_difficulty)
        db.session.commit()
        return question

    def update_memory(self, question: str, answer: str, topic: str | None = None) -> None:
        self._update_memory({'question_text': question, 'topic': topic}, answer)
        self._sync_session_memory()

    def _sync_session_memory(self) -> None:
        self.session.meta_data['covered_topics'] = self.memory['covered_topics']
        self.session.meta_data['strong_areas'] = self.memory['strong_areas']
        self.session.meta_data['weak_areas'] = self.memory['weak_areas']
        self.session.meta_data['projects_discussed'] = self.memory['projects_discussed']
        db.session.commit()
