"""ClickHouse client as a FastAPI dependency."""

from __future__ import annotations

from functools import lru_cache

from clickhouse_connect.driver.client import Client

from shared.clickhouse import get_client


@lru_cache
def get_clickhouse() -> Client:
    """Return a process-wide ClickHouse client (reused across requests).

    Used via ``Depends(get_clickhouse)`` so tests can override it.
    """
    return get_client()
