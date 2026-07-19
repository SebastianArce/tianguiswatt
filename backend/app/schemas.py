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


# --- battery lab ---


class BatterySpec(BaseModel):
    """A battery preset with an indicative installed cost (0% VAT, 2026 market)."""

    key: str
    name: str
    capacity_kwh: float
    power_kw: float
    round_trip_efficiency: float
    cost_gbp: float


class DispatchBucket(BaseModel):
    """The battery's average behaviour in one settlement period across the window."""

    settlement_period: int
    charge_kwh: float
    discharge_kwh: float
    soc_kwh: float
    import_p_kwh: float
    export_p_kwh: float
    intensity_gco2: float | None


class MonthlySaving(BaseModel):
    month: dt.date  # first day of the month, local time
    saving_gbp: float
    carbon_saved_kg: float


class StrategyRun(BaseModel):
    """One simulated (strategy × optimizer) run over the window."""

    strategy: str  # arbitrage | self_consumption | green
    optimizer: str  # greedy | lp
    saving_gbp: float  # over the simulated window
    saving_gbp_year: float  # annualised
    carbon_saved_kg_year: float
    cycles: float  # equivalent full cycles over the window
    payback_years: float | None  # None when the strategy loses money
    typical_day: list[DispatchBucket]
    monthly: list[MonthlySaving]


class BatterySimulation(BaseModel):
    """All strategy runs for one battery preset, plus shared context."""

    battery: BatterySpec
    household_kwh: int  # annual consumption the demand profile is scaled to
    window_from: dt.date
    window_to: dt.date
    days: int
    periods: int  # exact number of half-hours simulated
    baseline_cost_gbp_year: float  # the household's import bill with no battery
    runs: list[StrategyRun]


class PriceCarbonBucket(BaseModel):
    """Import-price distribution + typical export/carbon for one settlement period."""

    settlement_period: int
    import_p10: float
    import_p25: float
    import_p50: float
    import_p75: float
    import_p90: float
    export_p50: float
    carbon_p50: float | None


class DemandBucket(BaseModel):
    """Typical household demand in one settlement period (TDCV-scaled Elexon PC1)."""

    settlement_period: int
    avg_kwh: float
    winter_weekday_kwh: float
    summer_weekday_kwh: float


class BatteryContext(BaseModel):
    """Supporting stats for the Battery Lab explainer tab."""

    window_from: dt.date
    window_to: dt.date
    days: int
    periods: int  # exact number of half-hours behind the aggregates
    tdcv_kwh: int
    import_tariff: str
    export_tariff: str
    region: str
    avg_import_p_kwh: float
    avg_export_p_kwh: float
    green_overlap_pct: (
        float | None
    )  # how often the greenest 8 half-hours are also the cheapest 8
    presets: list[BatterySpec]
    intraday: list[PriceCarbonBucket]
    demand_profile: list[DemandBucket]
