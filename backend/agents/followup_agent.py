import re
from typing import Any

from prompts.followup_prompt import build_followup_prompt


class FollowupAgent:
    def __init__(self):
        pass

    def generate_followup(
        self,
        question: str,
        answer: str,
        history: list[dict[str, Any]],
        candidate_profile: Any,
        plan: Any,
    ) -> dict[str, Any]:
        system, user = build_followup_prompt(
            original_question=question,
            candidate_answer=answer,
            previous_pairs=history,
            resume_context=candidate_profile.profile_data.get('resume', {}).get('summary', ''),
            company=plan.plan_data.get('company', ''),
            role=plan.plan_data.get('role', ''),
        )
        from llm.provider_factory import get_provider
        provider = get_provider()
        raw = provider.chat(system=system, user=user, temperature=0.75)
        parsed = self._parse_json(raw)
        return parsed

    def _parse_json(self, raw: str) -> dict[str, Any]:
        raw = re.sub(r'```json|```', '', raw, flags=re.IGNORECASE).strip()
        try:
            import json
            data = json.loads(raw)
            if isinstance(data, dict) and 'followup' in data:
                return data
        except Exception:
            pass
        return {
            'followup': f'Can you explain more about: {raw[:80]}?',
            'probe_target': 'clarity',
            'quote_used': raw[:50],
        }
