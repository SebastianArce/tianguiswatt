"""The backend's process-wide client is shared across FastAPI's thread pool, so it must
tolerate concurrent queries. With a session id (the driver default) ClickHouse serialises
queries per session and rejects overlap with "concurrent queries within the same session";
``get_clickhouse`` disables sessions to avoid that. This is the regression guard.
"""

from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor

import pytest

from app.core.clickhouse import get_clickhouse


def test_shared_client_allows_concurrent_queries():
    try:
        client = get_clickhouse()
        client.query("SELECT 1")
    except Exception as exc:  # noqa: BLE001 — availability probe (mirrors conftest)
        if os.getenv("CI"):
            raise
        pytest.skip(f"ClickHouse not available: {exc}")

    # A query heavy enough that the 16 threads genuinely overlap — sum() forces iteration
    # (count() is O(1)), so a shared session would collide here.
    def run(_: int) -> int:
        return client.query("SELECT sum(number) FROM numbers(20000000)").result_rows[0][0]

    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(run, range(16)))

    assert len(results) == 16
    assert all(r == results[0] and r > 0 for r in results)
