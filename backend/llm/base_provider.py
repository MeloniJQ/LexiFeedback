from abc import ABC, abstractmethod
from typing import Any


class BaseLLMProvider(ABC):
    @abstractmethod
    def chat(self, system: str, user: str, temperature: float = 0.7, timeout: int | None = None) -> str:
        raise NotImplementedError()

    @abstractmethod
    def name(self) -> str:
        raise NotImplementedError()
