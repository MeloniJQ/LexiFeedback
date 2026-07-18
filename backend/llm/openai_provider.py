import os
import json
from typing import Any
from openai import OpenAI

from .base_provider import BaseLLMProvider


class OpenAIProvider(BaseLLMProvider):
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY missing")
        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("AI_MODEL", "gpt-4o-mini")

    def chat(self, system: str, user: str, temperature: float = 0.7, timeout: int | None = None) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            timeout=timeout,
        )
        return response.choices[0].message.content.strip()

    def name(self) -> str:
        return "openai"
