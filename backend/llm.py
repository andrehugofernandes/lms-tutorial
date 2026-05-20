import os
from typing import Any, Iterator

from lms_backend.utils_stream import iter_sync
from modelo_local.query_handler import AsyncDeepSeekHandler
from modelo_local.query_handler import get_handler as _get_handler


DEFAULT_MODEL_NAME = "gpt-oss:20b"


class SyncLLMAdapter:
    def __init__(self, handler: Any):
        self.handler = handler

    def query(self, *args, **kwargs) -> Iterator[str]:
        yield from iter_sync(self.handler.query(*args, **kwargs))

    def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        user_id: str = "quiz-generator",
    ) -> str:
        chunks = self.query(
            question=user_prompt,
            prompt_sistema={"role": "system", "content": system_prompt},
            user_id=user_id,
            model=model or os.getenv("LLM_MODEL") or DEFAULT_MODEL_NAME,
        )
        return "".join(chunks).strip()


class GroqSyncAdapter:
    def __init__(self, api_key: str | None):
        self.handler = _get_handler("groq", groq_api_key=api_key)

    def query(self, *args, **kwargs) -> Iterator[str]:
        yield from self.handler.query(*args, **kwargs) # type: ignore

    def generate_text(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        model: str | None = None,
        user_id: str = "quiz-generator",
    ) -> str:
        chunks = self.query(
            user_prompt,
            {"role": "system", "content": system_prompt},
            model or os.getenv("LLM_MODEL") or "openai/gpt-oss-120b",
        )
        return "".join(chunks).strip()


def get_llm_handler(source: str | None = None):
    """
    Retorna um handler com interface sincrona .query(...) e .generate_text(...).
    O provedor padrao e local, usando AsyncDeepSeekHandler por baixo.
    """
    provider = (source or os.getenv("LLM_PROVIDER") or "local").lower()

    if provider == "groq":
        return GroqSyncAdapter(os.getenv("GROQ_API_KEY"))

    if provider in {"local", "deepseek"}:
        return SyncLLMAdapter(AsyncDeepSeekHandler())

    raise ValueError(f"LLM_PROVIDER desconhecido: {provider}")


def generate_text(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    user_id: str = "quiz-generator",
    source: str | None = None,
) -> str:
    return get_llm_handler(source).generate_text(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=model,
        user_id=user_id,
    )
