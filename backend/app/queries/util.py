"""Query helpers that degrade gracefully before the marts exist.

On a fresh deploy the `mart_*` tables don't exist until the first dbt run, so a query
against them raises ClickHouse error 60 (UNKNOWN_TABLE). We treat that as "no data yet"
(empty result) so the dashboard shows a warming-up state instead of a 500.
"""

from __future__ import annotations

from clickhouse_connect.driver.client import Client
from clickhouse_connect.driver.exceptions import DatabaseError

_UNKNOWN_TABLE = 60


def query_rows(client: Client, sql: str, parameters: dict | None = None) -> list:
    """Return the query's result rows, or [] if a referenced mart doesn't exist yet."""
    try:
        return list(client.query(sql, parameters=parameters).result_rows)
    except DatabaseError as exc:
        if getattr(exc, "code", None) == _UNKNOWN_TABLE:
            return []
        raise
