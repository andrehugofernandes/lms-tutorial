# utils_stream.py
import asyncio
import inspect
from queue import Empty, Queue
from typing import Any, Callable, Iterator, Optional

try:
    from .utils_async_runner import AsyncLoopRunner
except ImportError:  # pragma: no cover - legacy direct execution
    from utils_async_runner import AsyncLoopRunner

_SENTINEL = object()


def _run_cancel_check(cancel_check: Optional[Callable[[], None]]) -> None:
    if callable(cancel_check):
        cancel_check()


def iter_sync(stream_obj: Any, cancel_check: Optional[Callable[[], None]] = None) -> Iterator[str]:
    """
    Converte:
      - iterável normal → retorna direto
      - async generator → drena no event loop dedicado e entrega via Queue
      - coroutine/future → resolve no loop dedicado; reprocessa resultado
    """
    # 1) iterável síncrono
    if hasattr(stream_obj, "__iter__") and not isinstance(stream_obj, (str, bytes)):
        for item in stream_obj:
            _run_cancel_check(cancel_check)
            yield str(item)
        return

    runner = AsyncLoopRunner()

    # 2) coroutine/future → resolve
    if inspect.iscoroutine(stream_obj) or isinstance(stream_obj, asyncio.Future):
        resolved = runner.run(stream_obj)
        yield from iter_sync(resolved, cancel_check=cancel_check)
        return

    # 3) async generator → drena em task no loop dedicado
    if hasattr(stream_obj, "__aiter__"):
        q: "Queue[object]" = Queue(maxsize=0)

        async def _drain_async_gen():
            try:
                async for tok in stream_obj: # type: ignore
                    q.put(tok)
            finally:
                q.put(_SENTINEL)

        future = runner.submit(_drain_async_gen())

        try:
            while True:
                _run_cancel_check(cancel_check)
                try:
                    item = q.get(timeout=0.10)
                except Empty:
                    if future.done():
                        future.result()
                        break
                    continue
                if item is _SENTINEL:
                    future.result()
                    break
                _run_cancel_check(cancel_check)
                yield str(item)
        except BaseException:
            future.cancel()
            aclose = getattr(stream_obj, "aclose", None)
            if callable(aclose):
                try:
                    runner.submit(aclose())
                except Exception:
                    pass
            raise
        return

    # 4) único valor (str/bytes/etc.)
    if stream_obj is not None:
        _run_cancel_check(cancel_check)
        yield str(stream_obj)
