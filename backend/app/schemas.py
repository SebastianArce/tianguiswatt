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


class Price(BaseModel):
    settlement_period: int
    system_price: float  # single imbalance/cash-out price (sell == buy)
    net_imbalance_volume: float
    apx_price: float | None
    n2ex_price: float | None


class Snapshot(BaseModel):
    """Latest values across all domains for the dashboard's first paint."""

    measured_at: dt.datetime | None
    generation: list[GenerationMixItem]
    supply_demand: SupplyDemand | None
    carbon: Carbon | None
    price: Price | None
    frequency_hz: float | None


# --- time-series history points ---


class GenerationPoint(BaseModel):
    measured_at: dt.datetime
    fuel_type: str
    generation_mw: float
    share_pct: float | None


class SupplyDemandPoint(BaseModel):
    period_start: dt.datetime
    settlement_period: int
    demand_mw: int
    transmission_demand_mw: int
    total_generation_mw: float | None


class CarbonPoint(BaseModel):
    from_ts: dt.datetime
    forecast_gco2: int | None
    actual_gco2: int | None
    intensity_gco2: int | None
    intensity_index: str


class PricePoint(BaseModel):
    period_start: dt.datetime
    settlement_period: int
    system_price: float
    net_imbalance_volume: float
    apx_price: float | None
    n2ex_price: float | None


class BidStackEntry(BaseModel):
    national_grid_bm_unit: str
    offer_price: float  # cheapest offer £/MWh for the unit
    volume_mw: float  # offerable band (max offer level − min offer level)
    accepted: bool  # NESO accepted an action for this unit in the period


class BidStack(BaseModel):
    """The balancing-mechanism offer stack for the latest settlement period, cheapest first."""

    settlement_period: int | None
    entries: list[BidStackEntry]


class TimeseriesPoint(BaseModel):
    bucket: dt.datetime
    value: float


class IntradayBucket(BaseModel):
    """Distribution of a metric at a given hour-of-day across the profiled window."""

    hour: int
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class WeekdayHourCell(BaseModel):
    weekday: int  # ClickHouse toDayOfWeek: 1 = Monday … 7 = Sunday
    hour: int
    median: float


class MetricProfile(BaseModel):
    """How a metric typically behaves — across the day (bands) and the week (heatmap)."""

    metric: str
    days: int
    intraday: list[IntradayBucket]
    weekly: list[WeekdayHourCell]


class AcceptedAction(BaseModel):
    """One accepted Balancing Mechanism action (BOALF); level_from → level_to is the ramp."""

    national_grid_bm_unit: str
    bm_unit: str | None
    unit_name: str | None  # human-readable station/unit name from the registry
    fuel_type: str | None  # registry fuel type (CCGT, WIND, …)
    acceptance_time: dt.datetime
    level_from: float
    level_to: float
    so_flag: bool
