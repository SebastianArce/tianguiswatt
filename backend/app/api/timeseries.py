"""Time-range explorer endpoint — a windowed metric series from the mart_metrics rollup."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from clickhouse_connect.driver.client import Client

from app.core.clickhouse import get_clickhouse
from app.queries.timeseries import fetch_timeseries
from app.schemas import TimeseriesPoint

router = APIRouter()

Metric = Literal["demand", "generation", "carbon", "price"]
Granularity = Literal["sp", "hour", "day"]
Window = Annotated[
    int, Query(ge=1, le=720, description="Window in hours (max 30 days).")
]
CH = Annotated[Client, Depends(get_clickhouse)]


@router.get("/timeseries", response_model=list[TimeseriesPoint])
def timeseries(
    client: CH,
    metric: Metric,
    granularity: Granularity = "hour",
    hours: Window = 24,
) -> list[TimeseriesPoint]:
    return fetch_timeseries(client, metric, granularity, hours)
