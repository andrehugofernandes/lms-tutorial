# query_handler_client.py
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional, Tuple, Union, Generator
import requests
import httpx

# ---------- Config mínima ----------
HOST = os.getenv("LLM_HOST")          # troque p/ "localhost" se for local
ALLOC_PORT = os.getenv("LLM_ALLOC_PORT")
CHAT_PATH = "/api/chat"
HTTP_TIMEOUT = None          # streaming sem timeout total (None = sem timeouts)
REMOTE_API_BASE = os.getenv("LLM_ALLOC_BASE_URL", f"http://{HOST}:{ALLOC_PORT}/api")

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _build_messages(
    prompt_sistema: Union[Dict[str, Any], List[Dict[str, Any]]],
    question: str
) -> List[Dict[str, Any]]:
    """
    Aceita:
      - dict com 'content' => vira system + user
      - lista de mensagens => anexa o user no fim
    """
    if isinstance(prompt_sistema, (list, tuple)):
        msgs = list(prompt_sistema)
    else:
        content = (prompt_sistema or {}).get("content", "")
        msgs = [{"role": "system", "content": content}]
    msgs.append({"role": "user", "content": question})
    return msgs


class AsyncDeepSeekHandler:
    def __init__(self, host: str = HOST):
        self.host = host
        self.remote_api_base = REMOTE_API_BASE

    # ---------------- Infra remota: allocate/release ----------------
    @staticmethod
    def _post_json_sync(url: str, payload: dict, timeout_s: float) -> httpx.Response:
        with httpx.Client(timeout=timeout_s) as client:
            return client.post(url, json=payload)

    async def _allocate_port(self, user_id: str, timeout_s: int = 15) -> Optional[int]:
        url = f"{self.remote_api_base}/instance/allocate"
        logger.info("[ALLOCATE] solicitando porta p/ user_id=%s em %s", user_id, url)
        try:
            r = await asyncio.to_thread(self._post_json_sync, url, {"user_id": user_id}, timeout_s)
            if r.status_code != 200:
                logger.warning("[ALLOCATE] HTTP %s", r.status_code)
                return None
            j = r.json()
            inst = (j or {}).get("instance") or {}
            port = inst.get("port")
            logger.info("[ALLOCATE] porta atribuída: %s", port)
            return int(port) if port is not None else None
        except httpx.RequestError as e:
            logger.warning("[ALLOCATE] falha de rede: %s", e)
            return None
        except Exception as e:
            logger.exception("[ALLOCATE] falha inesperada: %s", e)
            return None

    async def _release(self, user_id: str, port: Optional[int]) -> None:
        if not user_id or port is None:
            return
        url = f"{self.remote_api_base}/instance/release"
        payload = {"user_id": user_id, "port": port}
        try:
            try:
                asyncio.get_running_loop()
                r = await asyncio.to_thread(self._post_json_sync, url, payload, 5)
            except RuntimeError:
                r = self._post_json_sync(url, payload, 5)
            if r.status_code != 200:
                logger.warning("[RELEASE] HTTP %s (user_id=%s, port=%s): %s",
                               r.status_code, user_id, port, r.text[:300])
            else:
                logger.info("[RELEASE] liberado (user_id=%s, port=%s).", user_id, port)
        except httpx.RequestError as e:
            logger.warning("[RELEASE] falha de rede (user_id=%s, port=%s): %s", user_id, port, e)
        except Exception:
            # não derruba o fluxo se falhar
            logger.exception("[RELEASE] falha ao liberar (user_id=%s, port=%s).", user_id, port)

    # ---------------- Helpers de parsing SSE/linhas ----------------
    @staticmethod
    def _iter_json_lines_from_sse(raw_line: str) -> Optional[dict]:
        """
        Converte uma linha streaming tipo SSE em JSON:
        - remove prefixo 'data:'
        - ignora keepalives/linhas vazias
        - retorna None se não for JSON válido
        """
        s = raw_line.strip()
        if not s or s == ":keepalive":
            return None
        if s.startswith("data:"):
            s = s[5:].strip()
        if not s or s == "[DONE]":
            return None
        try:
            return json.loads(s)
        except json.JSONDecodeError:
            return None

    # ---------------- Streaming robusto (texto) ----------------
    async def _stream_text(
        self,
        *,
        port: int,
        model: str,
        messages: List[Dict[str, Any]],
    ) -> AsyncGenerator[str, None]:
        url = f"http://{self.host}:{port}{CHAT_PATH}"
        headers = {"Content-Type": "application/json"}
        payload = {"model": model, "messages": messages, "temperature": 0, "stream": True}

        logger.info("[STREAM_TEXT] POST %s model=%s", url, model)

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    msg = body.decode(errors="ignore") if isinstance(body, (bytes, bytearray)) else str(body)
                    logger.warning("[STREAM_TEXT] HTTP %s: %s", resp.status_code, msg[:300])
                    yield f"\n⚠️ HTTP {resp.status_code}: {msg}\n"
                    return

                async for line in resp.aiter_lines():
                    data = self._iter_json_lines_from_sse(line)
                    if not data:
                        continue
                    content = (data.get("message") or {}).get("content")
                    if content:
                        yield content

    # ---------------- Streaming robusto (imagem) ----------------
    async def _stream_image(
        self,
        *,
        port: int,
        model: str,
        question: str,
        prompt_sistema: Union[Dict[str, Any], List[Dict[str, Any]]],
        image_path: str,
    ) -> AsyncGenerator[str, None]:
        url = f"http://{self.host}:{port}{CHAT_PATH}"
        p = Path(image_path)
        if not p.exists():
            msg = f"⚠️ Imagem não encontrada: {p}"
            logger.warning("[STREAM_IMAGE] %s", msg)
            yield msg
            return

        if isinstance(prompt_sistema, (list, tuple)):
            msgs = list(prompt_sistema)
        else:
            content = (prompt_sistema or {}).get("content", "")
            msgs = [{"role": "system", "content": content}]
        b64 = base64.b64encode(p.read_bytes()).decode()
        msgs.append({"role": "user", "content": question, "images": [b64]})

        headers = {"Content-Type": "application/json"}
        payload = {"model": model, "messages": msgs, "stream": True}

        logger.info("[STREAM_IMAGE] POST %s model=%s image=%s", url, model, p.name)

        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    msg = body.decode(errors="ignore") if isinstance(body, (bytes, bytearray)) else str(body)
                    logger.warning("[STREAM_IMAGE] HTTP %s: %s", resp.status_code, msg[:300])
                    yield f"\n⚠️ HTTP {resp.status_code}: {msg}\n"
                    return

                async for line in resp.aiter_lines():
                    data = self._iter_json_lines_from_sse(line)
                    if not data:
                        continue
                    content = (data.get("message") or {}).get("content")
                    if content:
                        yield content

    # ---------------- Query (aceita kwargs e também forma legada por *args) ----------------
    async def query(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        """
        Aceita:
          - NOVO: query(question=..., prompt_sistema=..., user_id=..., model=..., image_path=...)
          - LEGADO: query(question, prompt_sistema, user_id, model[, image_path])
        """
        # Compatibilidade com chamadas posicionais
        if not kwargs and args:
            if len(args) < 4:
                raise TypeError("Uso legado exige (question, prompt_sistema, user_id, model[, image_path])")
            question, prompt_sistema, user_id, model = args[:4]
            image_path = args[4] if len(args) >= 5 else None
        else:
            question = kwargs["question"]
            prompt_sistema = kwargs["prompt_sistema"]
            user_id = kwargs["user_id"]
            model = kwargs.get("model", "gpt-oss:20b")
            image_path = kwargs.get("image_path")

        # Aloca porta remotamente
        port = await self._allocate_port(user_id)
        if not port:
            # sem capacidade → responda algo curto (compatível com stream)
            yield "⚠️ Todas as instâncias estão ocupadas. Sua requisição foi enfileirada ou tente novamente em instantes."
            return

        try:
            if image_path:
                async for tok in self._stream_image(
                    port=port, model=model, question=question,
                    prompt_sistema=prompt_sistema, image_path=image_path
                ):
                    yield tok
            else:
                messages = _build_messages(prompt_sistema, question)
                async for tok in self._stream_text(port=port, model=model, messages=messages):
                    yield tok
        finally:
            # Libera sempre
            await self._release(user_id=user_id, port=port)

    # ---------------- handle_request (apenas delega; também aceita legado) ----------------
    async def handle_request(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        """
        Aceita:
          - NOVO: handle_request(question=..., prompt_sistema=..., user_id=..., model=..., image_path=...)
          - LEGADO: handle_request(question, prompt_sistema, user_id, model[, image_path])
        """
        async for tok in self.query(*args, **kwargs):
            yield tok

class GroqHandler:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def query(self, question: str, prompt_sistema: dict, model_name: str) -> Generator[str, None, None]:
        """
        Consulta a API da Groq em modo de streaming e retorna pedaços do conteúdo gerado.
        """
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model_name,
            "messages": [
                prompt_sistema,
                {"role": "user", "content": question}
            ],
            "temperature": 0.7,
            "stream": True
        }

        full_response = ""
        print("🧠 Resposta da Groq (stream):\n")

        try:
            with requests.post(url, headers=headers, json=payload, stream=True) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line:
                        decoded_line = line.decode("utf-8")
                        if decoded_line.startswith("data: "):
                            content = decoded_line[6:]
                            if content.strip() == "[DONE]":
                                break
                            try:
                                data = json.loads(content)
                                delta = data["choices"][0]["delta"]
                                if "content" in delta:
                                    text = delta["content"]
                                    full_response += text
                                    print(text, end="", flush=True)
                                    yield text
                            except json.JSONDecodeError as e:
                                print(f"\n⚠️ Erro ao decodificar JSON: {e}")
                                yield "⚠️ Erro ao decodificar resposta da Groq API."

        except requests.exceptions.RequestException as e:
            erro = f"❌ Erro ao comunicar com a API da Groq: {e}"
            print(erro)
            yield erro

        print("\n\n📄 Resposta completa da Groq:\n", full_response)
        # yield full_response


def get_handler(source: str, manager=None, groq_api_key=None):
    if source == "deepseek":
        return AsyncDeepSeekHandler(manager) # type: ignore
    elif source == "groq":
        return GroqHandler(groq_api_key) # type: ignore
    else:
        raise ValueError("Fonte de modelo desconhecida: " + source)
