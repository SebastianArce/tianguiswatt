"""ClickHouse client as a FastAPI dependency."""

from __future__ import annotations

from functools import lru_cache

from clickhouse_connect.driver.client import Client

from shared.clickhouse import get_client


@lru_cache
def get_clickhouse() -> Client:
    """Return a process-wide ClickHouse client (reused across requests).

    Sessions are disabled so the one shared client is safe under FastAPI's thread pool —
    a session id would serialise queries per session and make concurrent requests fail
    ("concurrent queries within the same session"). Reads need no session state.

    Used via ``Depends(get_clickhouse)`` so tests can override it.
    """
    return get_client(autogenerate_session_id=False)
