import os
import re
import time
from openai import OpenAI, RateLimitError

from .base_provider import BaseLLMProvider

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterProvider(BaseLLMProvider):
    """LLM provider that routes requests through OpenRouter.ai.

    OpenRouter exposes an OpenAI-compatible REST API, so we can reuse the
    ``openai`` SDK by overriding ``base_url`` and supplying the OpenRouter
    API key.  The model is controlled by the ``AI_MODEL`` env variable.

    Free-tier models on OpenRouter are shared, best-effort capacity — a
    popular model like meta-llama/llama-3.3-70b-instruct:free can be
    rate-limited (429) across ALL OpenRouter users during busy periods,
    independent of your own account's daily quota. Two things help:
      1. Set AI_MODEL=openrouter/free — OpenRouter's own auto-router, which
         picks whichever free model currently has capacity instead of
         hammering one specific (often congested) model.
      2. A short retry-with-backoff here, honoring the Retry-After hint
         OpenRouter sends back, before giving up and falling back to
         template content.
    """

    MAX_RETRIES = 2

    def __init__(self) -> None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY missing from environment")

        self.client = OpenAI(
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
        )
        self.model = os.getenv("AI_MODEL", "openrouter/free")

    def chat(self, system: str, user: str, temperature: float = 0.7, timeout: int | None = None) -> str:
        last_error = None
        for attempt in range(self.MAX_RETRIES + 1):
            try:
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
            except RateLimitError as e:
                last_error = e
                if attempt >= self.MAX_RETRIES:
                    break
                wait = self._retry_after_seconds(e) or (2 ** attempt)
                # Cap the wait so a single slow request doesn't hang the
                # user's browser for too long — a capped wait + moving on to
                # a fallback beats a long silent hang.
                wait = min(wait, 12)
                print(f"[OpenRouterProvider] 429 rate-limited, retrying in {wait}s "
                      f"(attempt {attempt + 1}/{self.MAX_RETRIES})...")
                time.sleep(wait)
        raise last_error

    @staticmethod
    def _retry_after_seconds(error: RateLimitError) -> float | None:
        """Pull the Retry-After hint out of OpenRouter's error, if present."""
        try:
            body = getattr(error, "response", None)
            if body is not None:
                header_val = body.headers.get("Retry-After")
                if header_val:
                    return float(header_val)
        except Exception:
            pass
        # Some OpenRouter errors carry it in the JSON body instead of headers
        try:
            msg = str(error)
            match = re.search(r"retry_after_seconds['\"]?\s*[:=]\s*([\d.]+)", msg)
            if match:
                return float(match.group(1))
        except Exception:
            pass
        return None

    def name(self) -> str:
        return "openrouter"