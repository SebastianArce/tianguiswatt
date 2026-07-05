"""ClickHouse client shared by the orchestrator (writes) and backend (reads)."""

from __future__ import annotations

import clickhouse_connect
from clickhouse_connect.driver.client import Client

from shared.config import ClickHouseSettings


def get_client(
    settings: ClickHouseSettings | None = None,
    *,
    autogenerate_session_id: bool = True,
) -> Client:
    """Create a ClickHouse client from settings (env-driven by default).

    Pass ``autogenerate_session_id=False`` when one client is shared across threads
    (e.g. the backend's process-wide read client): a session id serialises queries to
    one-at-a-time, so concurrent requests otherwise fail with "concurrent queries within
    the same session". Read-only callers don't need session state.
    """
    settings = settings or ClickHouseSettings()
    return clickhouse_connect.get_client(
        host=settings.host,
        port=settings.port,
        username=settings.user,
        password=settings.password,
        database=settings.db,
        autogenerate_session_id=autogenerate_session_id,
    )
