"""Read the most recent accepted Balancing Mechanism actions (BOALF)."""

from __future__ import annotations

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import AcceptedAction


def fetch_accepted_actions(client: Client, limit: int) -> list[AcceptedAction]:
    """The latest `limit` accepted actions, most recent first."""
    rows = query_rows(
        client,
        "SELECT national_grid_bm_unit, bm_unit, unit_name, fuel_type, "
        "  acceptance_time, level_from, level_to, so_flag "
        "FROM mart_accepted_actions ORDER BY acceptance_time DESC LIMIT {n:UInt32}",
        {"n": limit},
    )
    return [
        AcceptedAction(
            national_grid_bm_unit=u,
            bm_unit=bmu,
            unit_name=name or None,
            fuel_type=fuel or None,
            acceptance_time=t,
            level_from=lf,
            level_to=lt,
            so_flag=bool(so),
        )
        for u, bmu, name, fuel, t, lf, lt, so in rows
    ]
