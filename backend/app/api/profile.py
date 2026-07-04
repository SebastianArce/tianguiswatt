"""Metric-profile endpoint — how a metric behaves across the day and the week."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from clickhouse_connect.driver.client import Client

from app.core.clickhouse import get_clickhouse
from app.queries.profile import fetch_profile
from app.schemas import MetricProfile

router = APIRouter()

Metric = Literal["demand", "generation", "carbon", "price"]
Days = Annotated[int, Query(ge=1, le=365, description="Days of history to profile.")]
CH = Annotated[Client, Depends(get_clickhouse)]


@router.get("/profile", response_model=MetricProfile)
def profile(client: CH, metric: Metric, days: Days = 30) -> MetricProfile:
    return fetch_profile(client, metric, days)
