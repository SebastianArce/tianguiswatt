"""Integration tests for the ClickHouse migration runner (need a running ClickHouse).

Skipped locally when ClickHouse is unreachable; required (hard-fail) in CI, where a
ClickHouse service container is provided.
"""

from __future__ import annotations

import datetime as dt
import os

import pytest

from shared.clickhouse import get_client
from shared.migrations.runner import _statements, migrate


def test_statements_ignores_semicolons_in_comments():
    """A `;` inside a `-- comment` must not split the statement (regression)."""
    sql = "CREATE TABLE t (...) ENGINE = MergeTree\n-- the period is the key;\nORDER BY x;"
    stmts = _statements(sql)
    assert len(stmts) == 1
    assert "ORDER BY x" in stmts[0]
    assert "key" not in stmts[0]  # comment stripped entirely


@pytest.fixture
def client():
    try:
        c = get_client()
        c.command("SELECT 1")
    except Exception as exc:
        if os.getenv("CI"):
            raise
        pytest.skip(f"ClickHouse not available: {exc}")

    def reset() -> None:
        c.command("DROP TABLE IF EXISTS schema_migrations")
        c.command("DROP DATABASE IF EXISTS raw")

    reset()
    yield c
    reset()


def test_migrate_creates_raw_table_and_is_idempotent(client):
    applied = migrate(client)
    assert "000_create_databases.sql" in applied
    assert "001_raw_generation_fuelinst.sql" in applied

    # re-running applies nothing
    assert migrate(client) == []

    exists = client.query(
        "SELECT count() FROM system.tables "
        "WHERE database = 'raw' AND name = 'generation_fuelinst'"
    ).result_rows[0][0]
    assert exists == 1


def test_client_can_write_and_read_raw(client):
    migrate(client)
    client.insert(
        "raw.generation_fuelinst",
        [
            [
                dt.date(2026, 6, 30),
                1,
                dt.datetime(2026, 6, 30, 0, 0, 0),
                "WIND",
                1234.5,
                1,
            ]
        ],
        column_names=[
            "settlement_date",
            "settlement_period",
            "measured_at",
            "fuel_type",
            "generation_mw",
            "ingest_version",
        ],
    )
    rows = client.query(
        "SELECT fuel_type, generation_mw FROM raw.generation_fuelinst"
    ).result_rows
    assert rows == [("WIND", 1234.5)]
