"""Read a windowed metric series from the mart_metrics rollup."""

from __future__ import annotations

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import TimeseriesPoint


def fetch_timeseries(
    client: Client, metric: str, granularity: str, hours: int
) -> list[TimeseriesPoint]:
    """Points for one metric/granularity within `hours` of that series' latest bucket."""
    rows = query_rows(
        client,
        "SELECT bucket, value FROM mart_metrics "
        "WHERE metric = {m:String} AND granularity = {g:String} "
        "  AND bucket >= ("
        "    SELECT max(bucket) FROM mart_metrics "
        "    WHERE metric = {m:String} AND granularity = {g:String}"
        "  ) - INTERVAL {hours:UInt32} HOUR "
        "ORDER BY bucket",
        {"m": metric, "g": granularity, "hours": hours},
    )
    return [TimeseriesPoint(bucket=b, value=v) for b, v in rows]
