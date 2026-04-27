# utils_async_runner.py
import asyncio
import threading
from typing import Any, Awaitable

class AsyncLoopRunner:
    """
    Mantém um único event loop em thread dedicada.
    Use .run(coro) para rodar corotinas e .submit(coro) para obter um Future.
    """
    _instance = None

    def __new__(cls) -> "AsyncLoopRunner":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self) -> None:
        self._loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._loop.run_forever, daemon=True)
        self._thread.start()

    @property
    def loop(self) -> asyncio.AbstractEventLoop:
        return self._loop

    def run(self, coro: Awaitable[Any]) -> Any:
        """Executa e retorna o resultado (bloqueia a thread chamadora)."""
        fut = asyncio.run_coroutine_threadsafe(coro, self._loop) # type: ignore
        return fut.result()

    def submit(self, coro: Awaitable[Any]):
        """Agenda e retorna o concurrent.futures.Future (não bloqueia)."""
        return asyncio.run_coroutine_threadsafe(coro, self._loop) # type: ignore

    def stop(self) -> None:
        self._loop.call_soon_threadsafe(self._loop.stop)
        self._thread.join(timeout=2)
