"""Behavioural profiles for a metric — intraday percentile bands + a weekday×hour heatmap.

Both are computed on the fly from the hourly rows of `mart_metrics` with ClickHouse quantile
aggregations; the window is relative to the metric's latest hourly bucket.
"""

from __future__ import annotations

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import IntradayBucket, MetricProfile, WeekdayHourCell

# hourly rows within `days` of this metric's most recent hourly bucket
_WINDOW = (
    "metric = {m:String} AND granularity = 'hour' "
    "AND bucket >= ("
    "  SELECT max(bucket) FROM mart_metrics "
    "  WHERE metric = {m:String} AND granularity = 'hour'"
    ") - INTERVAL {d:UInt16} DAY"
)


def fetch_profile(client: Client, metric: str, days: int) -> MetricProfile:
    params = {"m": metric, "d": days}

    # bucket is stored in UTC; pin toHour/toDayOfWeek to UTC so hour-of-day and weekday
    # don't shift with the ClickHouse server timezone.
    intraday_rows = query_rows(
        client,
        "SELECT toHour(bucket, 'UTC') AS h, "
        "  quantiles(0.1, 0.25, 0.5, 0.75, 0.9)(value) AS q "
        f"FROM mart_metrics WHERE {_WINDOW} "
        "GROUP BY h ORDER BY h",
        params,
    )
    intraday = [
        IntradayBucket(hour=h, p10=q[0], p25=q[1], p50=q[2], p75=q[3], p90=q[4])
        for h, q in intraday_rows
    ]

    weekly_rows = query_rows(
        client,
        "SELECT toDayOfWeek(bucket, 0, 'UTC') AS wd, toHour(bucket, 'UTC') AS h, "
        "  quantile(0.5)(value) AS med "
        f"FROM mart_metrics WHERE {_WINDOW} "
        "GROUP BY wd, h ORDER BY wd, h",
        params,
    )
    weekly = [
        WeekdayHourCell(weekday=wd, hour=h, median=med) for wd, h, med in weekly_rows
    ]

    return MetricProfile(metric=metric, days=days, intraday=intraday, weekly=weekly)
