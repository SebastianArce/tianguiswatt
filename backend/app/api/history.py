"""Recent-history endpoints for the dashboard's time-series charts."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from clickhouse_connect.driver.client import Client

from app.core.clickhouse import get_clickhouse
from app.queries.history import (
    fetch_carbon,
    fetch_generation,
    fetch_prices,
    fetch_supply_demand,
)
from app.schemas import CarbonPoint, GenerationPoint, PricePoint, SupplyDemandPoint

router = APIRouter()

Hours = Annotated[int, Query(ge=1, le=168, description="History window in hours.")]
CH = Annotated[Client, Depends(get_clickhouse)]


@router.get("/generation", response_model=list[GenerationPoint])
def generation(client: CH, hours: Hours = 6) -> list[GenerationPoint]:
    return fetch_generation(client, hours)


@router.get("/supply-demand", response_model=list[SupplyDemandPoint])
def supply_demand(client: CH, hours: Hours = 6) -> list[SupplyDemandPoint]:
    return fetch_supply_demand(client, hours)


@router.get("/carbon", response_model=list[CarbonPoint])
def carbon(client: CH, hours: Hours = 6) -> list[CarbonPoint]:
    return fetch_carbon(client, hours)


@router.get("/prices", response_model=list[PricePoint])
def prices(client: CH, hours: Hours = 6) -> list[PricePoint]:
    return fetch_prices(client, hours)
