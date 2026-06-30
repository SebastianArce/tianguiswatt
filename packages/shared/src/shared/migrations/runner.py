"""Apply versioned ClickHouse schema migrations from ``sql/*.sql`` files.

dbt owns derived models (staging/marts); this runner owns the tables we write to
directly and must not drop — ``raw.*`` and the migration ledger.
"""

from __future__ import annotations

import re
from pathlib import Path

from clickhouse_connect.driver.client import Client

from shared.clickhouse import get_client

SQL_DIR = Path(__file__).parent / "sql"


def _ensure_ledger(client: Client) -> None:
    client.command(
        "CREATE TABLE IF NOT EXISTS schema_migrations "
        "(version String, applied_at DateTime DEFAULT now()) "
        "ENGINE = MergeTree ORDER BY version"
    )


def _applied_versions(client: Client) -> set[str]:
    rows = client.query("SELECT version FROM schema_migrations").result_rows
    return {row[0] for row in rows}


def _statements(sql: str) -> list[str]:
    # Strip `-- line comments` first so a semicolon inside a comment can't split a
    # statement, then split the remaining SQL on `;`.
    without_comments = re.sub(r"--[^\n]*", "", sql)
    return [stmt.strip() for stmt in without_comments.split(";") if stmt.strip()]


def migrate(client: Client | None = None) -> list[str]:
    """Apply pending migrations in filename order; return the versions applied."""
    client = client or get_client()
    _ensure_ledger(client)
    applied = _applied_versions(client)

    newly_applied: list[str] = []
    for path in sorted(SQL_DIR.glob("*.sql")):
        version = path.name
        if version in applied:
            continue
        for statement in _statements(path.read_text()):
            client.command(statement)
        client.insert("schema_migrations", [[version]], column_names=["version"])
        newly_applied.append(version)
    return newly_applied


if __name__ == "__main__":
    done = migrate()
    print(
        f"Applied {len(done)} migration(s): {done}"
        if done
        else "No pending migrations."
    )
