"""
Клиент TheCocktailDB: таймауты, повторы, простой rate limit, нормализация ответа.
Базовый URL и интервал задаются через окружение (ключ API в публичном API вшит в путь v1/1).
"""
from __future__ import annotations

import os
import threading
import time
from typing import Any, List, Optional, Tuple

import httpx

_throttle_lock = threading.Lock()
_last_request_mono = 0.0


def _throttle() -> None:
    global _last_request_mono
    min_interval = float(os.getenv("EXTERNAL_COCKTAIL_API_MIN_INTERVAL", "0.35"))
    with _throttle_lock:
        now = time.monotonic()
        wait = min_interval - (now - _last_request_mono)
        if wait > 0:
            time.sleep(wait)
        _last_request_mono = time.monotonic()


def _normalize_drink(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "external_id": str(raw.get("idDrink") or "").strip(),
        "name": (raw.get("strDrink") or "").strip(),
        "thumb_url": raw.get("strDrinkThumb"),
        "category": raw.get("strCategory"),
    }


def search_cocktails_by_name(
    name: str,
    *,
    timeout: float | None = None,
    max_retries: int = 3,
    max_items: int = 12,
) -> Tuple[List[dict[str, Any]], Optional[str]]:
    """
    Возвращает (items, error_message). При ошибке после ретраев items пустой, error_message — текст причины.
    """
    base = os.getenv(
        "COCKTAILDB_BASE_URL",
        "https://www.thecocktaildb.com/api/json/v1/1",
    ).rstrip("/")
    q = name.strip()[:120]
    if not q:
        return [], None

    read_timeout = timeout if timeout is not None else float(os.getenv("EXTERNAL_COCKTAIL_API_TIMEOUT", "8.0"))
    url = f"{base}/search.php"
    last_err: Optional[str] = None

    for attempt in range(max_retries):
        try:
            _throttle()
            with httpx.Client(timeout=read_timeout) as client:
                response = client.get(url, params={"s": q})
                response.raise_for_status()
                payload = response.json()
            drinks = payload.get("drinks")
            if drinks is None:
                return [], None
            items = [_normalize_drink(d) for d in drinks[:max_items] if isinstance(d, dict)]
            items = [i for i in items if i.get("external_id") and i.get("name")]
            return items, None
        except Exception as exc:  # noqa: BLE001 — внешний API, возвращаем деградацию наверх
            last_err = f"{type(exc).__name__}: {exc}"
            time.sleep(0.35 * (attempt + 1))

    return [], last_err
