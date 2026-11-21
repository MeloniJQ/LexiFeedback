import json
import re
from typing import Any

from llm.provider_factory import get_provider
from prompts.evaluation_prompt import (
    build_answer_evaluation_prompt,
    build_interview_summary_prompt,
)


class EvaluationAgent:
    def __init__(self):
        self.provider = get_provider()

    def evaluate_answer(
        self,
        question_text: str,
        question_type: str,
        expected_keywords: list[str],
        answer_text: str,
        profile_summary: str,
        resume_projects: list[str],
        job_description_summary: str,
        plan_focus_areas: list[str],
        conversation_memory: list[dict[str, Any]],
        previous_evaluations: list[dict[str, Any]],
        lexical_metrics: dict[str, Any],
        company: str,
        role: str,
    ) -> dict[str, Any]:
        system, user = build_answer_evaluation_prompt(
            question_text=question_text,
            question_type=question_type,
            expected_keywords=expected_keywords,
            answer_text=answer_text,
            profile_summary=profile_summary,
            resume_projects=resume_projects,
            job_description_summary=job_description_summary,
            plan_focus_areas=plan_focus_areas,
            conversation_memory=conversation_memory,
            previous_evaluations=previous_evaluations,
            lexical_metrics=lexical_metrics,
            company=company,
            role=role,
        )

        raw = self.provider.chat(system=system, user=user, temperature=0.5)
        parsed = self._parse_json(raw)
        return self._normalize(parsed)

    def summarize_interview(
        self,
        answer_evaluations: list[dict[str, Any]],
        profile_summary: str,
        resume_projects: list[str],
        job_description_summary: str,
        plan_focus_areas: list[str],
        company: str,
        role: str,
    ) -> dict[str, Any]:
        system, user = build_interview_summary_prompt(
            answer_evaluations=answer_evaluations,
            profile_summary=profile_summary,
            resume_projects=resume_projects,
            job_description_summary=job_description_summary,
            plan_focus_areas=plan_focus_areas,
            company=company,
            role=role,
        )

        raw = self.provider.chat(system=system, user=user, temperature=0.55)
        parsed = self._parse_json(raw)
        return self._normalize_summary(parsed)

    def _parse_json(self, raw: str) -> dict[str, Any]:
        cleaned = re.sub(r'```json|```', '', raw, flags=re.IGNORECASE).strip()
        try:
            return json.loads(cleaned)
        except Exception:
            # try to extract JSON block
            match = re.search(r'\{.*\}', cleaned, flags=re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(0))
                except Exception:
                    pass
        return {
            'technical_score': 5,
            'communication_score': 5,
            'vocabulary_score': 5,
            'grammar_score': 5,
            'confidence_score': 5,
            'completeness_score': 5,
            'relevance_score': 5,
            'overall_score': 5,
            'strengths': [],
            'weaknesses': [],
            'missing_topics': [],
            'suggestions': [],
            'raw_feedback': {},
        }

    def _normalize(self, parsed: dict[str, Any]) -> dict[str, Any]:
        return {
            'technical_score': int(parsed.get('technical_score', 5) or 5),
            'communication_score': int(parsed.get('communication_score', 5) or 5),
            'vocabulary_score': int(parsed.get('vocabulary_score', 5) or 5),
            'grammar_score': int(parsed.get('grammar_score', 5) or 5),
            'confidence_score': int(parsed.get('confidence_score', 5) or 5),
            'completeness_score': int(parsed.get('completeness_score', 5) or 5),
            'relevance_score': int(parsed.get('relevance_score', 5) or 5),
            'overall_score': int(parsed.get('overall_score', 5) or 5),
            'strengths': parsed.get('strengths', []) or [],
            'weaknesses': parsed.get('weaknesses', []) or [],
            'missing_topics': parsed.get('missing_topics', []) or [],
            'suggestions': parsed.get('suggestions', []) or [],
            'raw_feedback': parsed.get('raw_feedback', {}) or {},
        }

    def _normalize_summary(self, parsed: dict[str, Any]) -> dict[str, Any]:
        return {
            'overall_technical': int(parsed.get('overall_technical', 5) or 5),
            'overall_communication': int(parsed.get('overall_communication', 5) or 5),
            'overall_vocabulary': int(parsed.get('overall_vocabulary', 5) or 5),
            'overall_grammar': int(parsed.get('overall_grammar', 5) or 5),
            'overall_confidence': int(parsed.get('overall_confidence', 5) or 5),
            'overall_completeness': int(parsed.get('overall_completeness', 5) or 5),
            'overall_score': int(parsed.get('overall_score', 5) or 5),
            'strong_topics': parsed.get('strong_topics', []) or [],
            'weak_topics': parsed.get('weak_topics', []) or [],
            'frequently_missed_concepts': parsed.get('frequently_missed_concepts', []) or [],
            'project_knowledge': parsed.get('project_knowledge', []) or [],
            'domain_knowledge': parsed.get('domain_knowledge', []) or [],
            'behavioral_performance': parsed.get('behavioral_performance', []) or [],
            'recommendations': parsed.get('recommendations', []) or [],
            'summary': parsed.get('summary', '') or '',
            'raw_analysis': parsed,
        }
