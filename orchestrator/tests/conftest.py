"""Shared fixtures for orchestrator integration tests.

The ClickHouse fixture is skipped locally when ClickHouse is unreachable, but hard-fails
in CI (where a ClickHouse service container is provided).
"""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest

from shared.clickhouse import get_client


@pytest.fixture
def client() -> Iterator[object]:
    try:
        ch = get_client()
        ch.command("SELECT 1")
    except Exception as exc:
        if os.getenv("CI"):
            raise
        pytest.skip(f"ClickHouse not available: {exc}")

    def reset() -> None:
        ch.command("DROP TABLE IF EXISTS schema_migrations")
        ch.command("DROP DATABASE IF EXISTS raw")

    reset()
    yield ch
    reset()
