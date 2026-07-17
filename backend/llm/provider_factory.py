import os

from .base_provider import BaseLLMProvider
from .openai_provider import OpenAIProvider
from .ollama_provider import OllamaProvider
from .gemini_provider import GeminiProvider
from .openrouter_provider import OpenRouterProvider


def get_provider() -> BaseLLMProvider:
    provider_key = os.getenv("AI_PROVIDER", "openrouter").strip().lower()

    if provider_key == "openrouter":
        return OpenRouterProvider()
    if provider_key == "openai":
        return OpenAIProvider()
    if provider_key == "ollama":
        return OllamaProvider()
    if provider_key == "gemini":
        return GeminiProvider()

    raise RuntimeError(f"Invalid AI_PROVIDER value: {provider_key}")
