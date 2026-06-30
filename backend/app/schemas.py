"""API response schemas (read-only DTOs shaped for the dashboard)."""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel


class GenerationMixItem(BaseModel):
    fuel_type: str
    generation_mw: float
    share_pct: float | None


class SupplyDemand(BaseModel):
    settlement_period: int
    demand_mw: int
    transmission_demand_mw: int
    total_generation_mw: float | None


class Carbon(BaseModel):
    from_ts: dt.datetime
    intensity_gco2: int | None
    intensity_index: str


class Snapshot(BaseModel):
    """Latest values across all domains for the dashboard's first paint."""

    measured_at: dt.datetime | None
    generation: list[GenerationMixItem]
    supply_demand: SupplyDemand | None
    carbon: Carbon | None
