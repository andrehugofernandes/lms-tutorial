from typing import Iterator

from backend.llm import get_llm_handler
from utils_stream import iter_sync as _iter_sync


model = 'gpt-oss:20b'   # exemplo
source, model_name = None, model   # cai no else (local/assíncrono)

handler = get_llm_handler(source)


def iter_stream(handler, *args, cancel_check=None, **kwargs) -> Iterator[str]:
    """
    Abstrai o handler.query para suportar:
      - retorno síncrono (iterável normal)
      - retorno assíncrono (async iterable / async generator)
      - coroutine que resolve em qualquer um dos acima
    """
    res = handler.query(*args, **kwargs)
    yield from _iter_sync(res, cancel_check=cancel_check)