import asyncio
import os
from typing import Any, Dict, Optional
from modelo_local.query_handler import get_handler as _get_handler # type: ignore
from modelo_local.query_handler import AsyncDeepSeekHandler

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
MODEL_NAME = 'openai/gpt-oss-120b'


def get_llm_handler(source: str | None = None):
    """
    Retorna um handler com interface SÍNCRONA .query(...),
    independentemente de ser internamente assíncrono.
    """
    if source == "groq":
        # Handler já síncrono (ex.: via _get_handler)
        return _get_handler(source, manager=_manager, groq_api_key=GROQ_API_KEY)  # type: ignore
    else:
        # Envelopa o handler assíncrono no adapter síncrono
        return AsyncDeepSeekHandler()  # <= NÃO retorne AsyncDeepSeekHandler cru
