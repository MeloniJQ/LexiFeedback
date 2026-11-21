import os
from typing import Any
import requests

from .base_provider import BaseLLMProvider


class GeminiProvider(BaseLLMProvider):
    def __init__(self) -> None:
        self.api_url = os.getenv("GEMINI_API_URL")
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_url or not self.api_key:
            raise RuntimeError("GEMINI_API_URL and GEMINI_API_KEY are required for Gemini provider")
        self.model = os.getenv("AI_MODEL", "gemini-pro")

    def chat(self, system: str, user: str, temperature: float = 0.7, timeout: int | None = None) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
        }
        response = requests.post(
            f"{self.api_url}/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Gemini provider returned no choices")
        return choices[0].get("message", {}).get("content", "").strip()

    def name(self) -> str:
        return "gemini"
