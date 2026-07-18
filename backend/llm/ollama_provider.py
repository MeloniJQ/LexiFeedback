import os
import requests
from .base_provider import BaseLLMProvider


class OllamaProvider(BaseLLMProvider):
    def __init__(self) -> None:
        self.api_url = os.getenv("OLLAMA_API_URL", "http://127.0.0.1:11434")
        self.model = os.getenv("AI_MODEL", "llama2")

    def chat(self, system: str, user: str, temperature: float = 0.7, timeout: int | None = None) -> str:
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
            json=payload,
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Ollama provider returned no choices")
        return choices[0].get("message", {}).get("content", "").strip()

    def name(self) -> str:
        return "ollama"
