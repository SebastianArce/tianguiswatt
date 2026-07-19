"""Battery Lab endpoints — strategy simulations and the explainer's supporting stats."""

from typing import Annotated, Literal

from clickhouse_connect.driver.client import Client
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.clickhouse import get_clickhouse
from app.queries.battery import fetch_context, fetch_simulation
from app.schemas import BatteryContext, BatterySimulation

router = APIRouter()

PresetKey = Literal["5kwh", "10kwh", "13.5kwh"]
HouseholdKey = Literal["low", "medium", "high", "electrified"]
SolarKey = Literal["none", "3.5kwp", "5kwp"]
Months = Annotated[
    int, Query(ge=1, le=24, description="Months of history to simulate.")
]
CH = Annotated[Client, Depends(get_clickhouse)]


@router.get("/battery/simulation", response_model=BatterySimulation)
def battery_simulation(
    client: CH,
    battery: PresetKey = "10kwh",
    household: HouseholdKey = "medium",
    solar: SolarKey = "none",
    months: Months = 12,
) -> BatterySimulation:
    simulation = fetch_simulation(client, battery, months, household, solar)
    if simulation is None:
        raise HTTPException(status_code=503, detail="Tariff data not available yet.")
    return simulation


@router.get("/battery/context", response_model=BatteryContext)
def battery_context(client: CH, months: Months = 12) -> BatteryContext:
    context = fetch_context(client, months)
    if context is None:
        raise HTTPException(status_code=503, detail="Tariff data not available yet.")
    return context
