"""Thin streaming wrappers around the supported LLM providers."""

from collections.abc import AsyncIterator
from typing import Protocol

from app.core.config import Settings

Message = dict[str, str]  # {"role": "user" | "assistant", "content": "..."}


class LLMClient(Protocol):
    name: str

    def stream(self, system: str, messages: list[Message]) -> AsyncIterator[str]: ...


class AnthropicClient:
    name = "anthropic"

    def __init__(self, api_key: str, model: str, max_tokens: int) -> None:
        from anthropic import AsyncAnthropic

        self._client = AsyncAnthropic(api_key=api_key, timeout=30, max_retries=1)
        self._model = model
        self._max_tokens = max_tokens

    async def stream(self, system: str, messages: list[Message]) -> AsyncIterator[str]:
        async with self._client.messages.stream(
            model=self._model,
            max_tokens=self._max_tokens,
            system=system,
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for text in stream.text_stream:
                yield text


class OpenAIClient:
    name = "openai"

    def __init__(self, api_key: str, model: str, max_tokens: int) -> None:
        from openai import AsyncOpenAI

        self._client = AsyncOpenAI(api_key=api_key, timeout=30, max_retries=1)
        self._model = model
        self._max_tokens = max_tokens

    async def stream(self, system: str, messages: list[Message]) -> AsyncIterator[str]:
        response = await self._client.chat.completions.create(
            model=self._model,
            max_completion_tokens=self._max_tokens,
            stream=True,
            messages=[{"role": "system", "content": system}, *messages],  # type: ignore[list-item]
        )
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


def build_llm(settings: Settings) -> LLMClient | None:
    """Return a configured client, or None to use the keyword-retrieval fallback."""
    key = settings.llm_api_key
    if not key:
        return None
    model = settings.resolved_llm_model
    if settings.llm_provider == "anthropic":
        return AnthropicClient(key, model, settings.llm_max_tokens)
    if settings.llm_provider == "openai":
        return OpenAIClient(key, model, settings.llm_max_tokens)
    return None
