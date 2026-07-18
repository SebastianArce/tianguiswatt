"""Battery Lab queries: assemble simulation inputs from the marts, run the dispatch
engine, and compute the supporting stats for the explainer tab.

Results are cached per (endpoint, preset, months, latest mart row): a year-long LP run
is ~1s per strategy, and outputs only change when new tariff data lands.
"""

from __future__ import annotations

import datetime as dt
from collections import defaultdict
from zoneinfo import ZoneInfo

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import (
    BatteryContext,
    BatterySimulation,
    BatterySpec,
    DemandBucket,
    DispatchBucket,
    MonthlySaving,
    PriceCarbonBucket,
    StrategyRun,
)
from app.simulation import (
    Battery,
    Dispatch,
    Optimizer,
    Period,
    Strategy,
    simulate,
)

# Settlement periods count on the local clock: SP1 starts 00:00 Europe/London.
_LONDON = ZoneInfo("Europe/London")

# Ofgem Typical Domestic Consumption Value, medium household (July 2026 review) — must
# match the `tdcv_kwh` dbt var that scales mart_domestic_profile.
TDCV_KWH = 2500

IMPORT_TARIFF = "E-1R-AGILE-24-10-01-C"
EXPORT_TARIFF = "E-1R-AGILE-OUTGOING-19-05-13-C"
REGION = "London (C)"

# Indicative installed costs for typical 2026 systems (0% VAT).
PRESETS: dict[str, BatterySpec] = {
    key: BatterySpec(
        key=key,
        name=name,
        capacity_kwh=capacity,
        power_kw=power,
        round_trip_efficiency=0.9,
        cost_gbp=cost,
    )
    for key, name, capacity, power, cost in [
        ("5kwh", "Small (5 kWh)", 5.0, 2.6, 3000),
        ("10kwh", "Medium (10 kWh)", 10.0, 5.0, 5500),
        ("13.5kwh", "Large (13.5 kWh)", 13.5, 5.0, 9000),
    ]
}

# One decision row per half-hour: tariff rates + carbon + the synthetic household's
# demand, matched on local month, day type and settlement period. Rows without carbon
# are dropped so all three strategies backtest the same window.
_PERIODS_SQL = """
SELECT
    t.from_ts,
    t.import_p_kwh,
    t.export_p_kwh,
    t.intensity_gco2,
    p.demand_kwh
FROM mart_tariff_periods AS t
LEFT JOIN mart_domestic_profile AS p
    ON p.month = toInt32(toMonth(t.from_ts, 'Europe/London'))
    AND p.day_type = multiIf(
        toDayOfWeek(t.from_ts, 0, 'Europe/London') = 6, 'saturday',
        toDayOfWeek(t.from_ts, 0, 'Europe/London') = 7, 'sunday',
        'weekday'
    )
    AND p.settlement_period = toInt32(
        toHour(t.from_ts, 'Europe/London') * 2 + intDiv(toMinute(t.from_ts), 30) + 1
    )
WHERE t.intensity_gco2 IS NOT NULL
    AND t.from_ts >= (
        SELECT max(from_ts) FROM mart_tariff_periods WHERE intensity_gco2 IS NOT NULL
    ) - INTERVAL {m:UInt8} MONTH
ORDER BY t.from_ts
"""

_DEMAND_SQL = """
SELECT
    settlement_period,
    avg(demand_kwh),
    avgIf(demand_kwh, season = 'winter' AND day_type = 'weekday'),
    avgIf(demand_kwh, season = 'high_summer' AND day_type = 'weekday')
FROM mart_domestic_profile
GROUP BY settlement_period
ORDER BY settlement_period
"""

_cache: dict[tuple, BatterySimulation | BatteryContext] = {}


def _data_stamp(client: Client) -> dt.datetime | None:
    rows = query_rows(client, "SELECT maxOrNull(from_ts) FROM mart_tariff_periods")
    return rows[0][0] if rows else None


def _cached(key: tuple, value):
    if len(_cache) > 16:  # tiny parameter space; just reset when stale keys pile up
        _cache.clear()
    _cache[key] = value
    return value


def _fetch_periods(client: Client, months: int) -> list[Period]:
    rows = query_rows(client, _PERIODS_SQL, {"m": months})
    return [
        Period(
            from_ts=from_ts.replace(tzinfo=dt.UTC),
            import_p_kwh=import_p,
            export_p_kwh=export_p,
            intensity_gco2=carbon,
            demand_kwh=demand or 0.0,
        )
        for from_ts, import_p, export_p, carbon, demand in rows
    ]


def _settlement_period(ts: dt.datetime) -> int:
    local = ts.astimezone(_LONDON)
    return local.hour * 2 + local.minute // 30 + 1


def _typical_day(dispatch: list[Dispatch]) -> list[DispatchBucket]:
    by_sp: dict[int, list[Dispatch]] = defaultdict(list)
    for d in dispatch:
        by_sp[_settlement_period(d.period.from_ts)].append(d)
    buckets = []
    for sp in sorted(by_sp):
        ds = by_sp[sp]
        n = len(ds)
        carbon = [
            d.period.intensity_gco2 for d in ds if d.period.intensity_gco2 is not None
        ]
        buckets.append(
            DispatchBucket(
                settlement_period=sp,
                charge_kwh=round(sum(d.charge_kwh for d in ds) / n, 4),
                discharge_kwh=round(
                    sum(d.discharge_home_kwh + d.discharge_export_kwh for d in ds) / n,
                    4,
                ),
                soc_kwh=round(sum(d.soc_kwh for d in ds) / n, 3),
                import_p_kwh=round(sum(d.period.import_p_kwh for d in ds) / n, 2),
                export_p_kwh=round(sum(d.period.export_p_kwh for d in ds) / n, 2),
                intensity_gco2=round(sum(carbon) / len(carbon), 1) if carbon else None,
            )
        )
    return buckets


def _monthly(dispatch: list[Dispatch]) -> list[MonthlySaving]:
    by_month: dict[dt.date, list[Dispatch]] = defaultdict(list)
    for d in dispatch:
        local = d.period.from_ts.astimezone(_LONDON)
        by_month[local.date().replace(day=1)].append(d)
    return [
        MonthlySaving(
            month=month,
            saving_gbp=round(sum(d.saving_p for d in ds) / 100, 2),
            carbon_saved_kg=round(sum(d.carbon_saved_g for d in ds) / 1000, 1),
        )
        for month, ds in sorted(by_month.items())
    ]


def fetch_simulation(
    client: Client, preset_key: str, months: int
) -> BatterySimulation | None:
    """Run every (strategy × optimizer) combination for a preset; None = no data yet."""
    spec = PRESETS[preset_key]
    key = ("simulation", preset_key, months, _data_stamp(client))
    if (cached := _cache.get(key)) is not None:
        return cached  # type: ignore[return-value]

    periods = _fetch_periods(client, months)
    if not periods:
        return None
    battery = Battery(
        capacity_kwh=spec.capacity_kwh,
        power_kw=spec.power_kw,
        round_trip_efficiency=spec.round_trip_efficiency,
    )
    days = (periods[-1].from_ts.date() - periods[0].from_ts.date()).days + 1
    annual = 365 / days

    runs = []
    baseline_gbp_year = 0.0
    for strategy in Strategy:
        for optimizer in Optimizer:
            result = simulate(periods, battery, strategy, optimizer)
            baseline_gbp_year = result.baseline_cost_gbp * annual
            saving_year = result.saving_gbp * annual
            runs.append(
                StrategyRun(
                    strategy=strategy.value,
                    optimizer=optimizer.value,
                    saving_gbp=round(result.saving_gbp, 2),
                    saving_gbp_year=round(saving_year, 2),
                    carbon_saved_kg_year=round(result.carbon_saved_kg * annual, 1),
                    cycles=round(result.cycles, 1),
                    payback_years=(
                        round(spec.cost_gbp / saving_year, 1)
                        if saving_year > 0
                        else None
                    ),
                    typical_day=_typical_day(result.dispatch),
                    monthly=_monthly(result.dispatch),
                )
            )
    simulation = BatterySimulation(
        battery=spec,
        window_from=periods[0].from_ts.date(),
        window_to=periods[-1].from_ts.date(),
        days=days,
        baseline_cost_gbp_year=round(baseline_gbp_year, 2),
        runs=runs,
    )
    return _cached(key, simulation)


def _quantile(sorted_values: list[float], fraction: float) -> float:
    return sorted_values[round(fraction * (len(sorted_values) - 1))]


def fetch_context(client: Client, months: int) -> BatteryContext | None:
    """Supporting stats for the explainer tab; None = no data yet."""
    key = ("context", months, _data_stamp(client))
    if (cached := _cache.get(key)) is not None:
        return cached  # type: ignore[return-value]

    periods = _fetch_periods(client, months)
    if not periods:
        return None

    by_sp: dict[int, list[Period]] = defaultdict(list)
    for p in periods:
        by_sp[_settlement_period(p.from_ts)].append(p)
    intraday = []
    for sp in sorted(by_sp):
        ps = by_sp[sp]
        imports = sorted(p.import_p_kwh for p in ps)
        exports = sorted(p.export_p_kwh for p in ps)
        carbon = sorted(p.intensity_gco2 for p in ps if p.intensity_gco2 is not None)
        intraday.append(
            PriceCarbonBucket(
                settlement_period=sp,
                import_p10=round(_quantile(imports, 0.1), 2),
                import_p25=round(_quantile(imports, 0.25), 2),
                import_p50=round(_quantile(imports, 0.5), 2),
                import_p75=round(_quantile(imports, 0.75), 2),
                import_p90=round(_quantile(imports, 0.9), 2),
                export_p50=round(_quantile(exports, 0.5), 2),
                carbon_p50=round(_quantile(carbon, 0.5), 1) if carbon else None,
            )
        )

    # How often do "charge on the cheapest 8 half-hours" and "charge on the greenest 8"
    # agree? The gap between the two is the cost of going green.
    by_day: dict[dt.date, list[Period]] = defaultdict(list)
    for p in periods:
        if p.intensity_gco2 is not None:
            by_day[p.from_ts.astimezone(_LONDON).date()].append(p)
    overlaps = []
    for day_periods in by_day.values():
        if len(day_periods) < 16:
            continue  # clock-change stubs / partial edge days
        cheapest = set(
            id(p) for p in sorted(day_periods, key=lambda p: p.import_p_kwh)[:8]
        )
        greenest = set(
            id(p) for p in sorted(day_periods, key=lambda p: p.intensity_gco2 or 0)[:8]
        )
        overlaps.append(len(cheapest & greenest) / 8)
    green_overlap_pct = (
        round(100 * sum(overlaps) / len(overlaps), 1) if overlaps else None
    )

    demand_profile = [
        DemandBucket(
            settlement_period=sp,
            avg_kwh=round(avg, 4),
            winter_weekday_kwh=round(winter, 4),
            summer_weekday_kwh=round(summer, 4),
        )
        for sp, avg, winter, summer in query_rows(client, _DEMAND_SQL)
    ]

    context = BatteryContext(
        window_from=periods[0].from_ts.date(),
        window_to=periods[-1].from_ts.date(),
        days=(periods[-1].from_ts.date() - periods[0].from_ts.date()).days + 1,
        tdcv_kwh=TDCV_KWH,
        import_tariff=IMPORT_TARIFF,
        export_tariff=EXPORT_TARIFF,
        region=REGION,
        avg_import_p_kwh=round(sum(p.import_p_kwh for p in periods) / len(periods), 2),
        avg_export_p_kwh=round(sum(p.export_p_kwh for p in periods) / len(periods), 2),
        green_overlap_pct=green_overlap_pct,
        presets=list(PRESETS.values()),
        intraday=intraday,
        demand_profile=demand_profile,
    )
    return _cached(key, context)
