"""Unit tests for the battery dispatch engine. All pure — no ClickHouse needed."""

from __future__ import annotations

import datetime as dt
import random
import time

import pytest

from app.simulation import Battery, Optimizer, Period, Strategy, simulate

BASE = dt.datetime(2026, 1, 5, tzinfo=dt.UTC)  # a Monday

# 1 kWh capacity, 2 kW power → a full kWh can move in one half-hour; lossless.
IDEAL = Battery(capacity_kwh=1, power_kw=2, round_trip_efficiency=1)


def make_periods(
    import_p: list[float],
    export_p: list[float] | None = None,
    carbon: list[float] | None = None,
    demand: list[float] | None = None,
    start: dt.datetime = BASE,
) -> list[Period]:
    return [
        Period(
            from_ts=start + dt.timedelta(minutes=30 * i),
            import_p_kwh=imp,
            export_p_kwh=export_p[i] if export_p else imp,
            intensity_gco2=carbon[i] if carbon else None,
            demand_kwh=demand[i] if demand else 0.0,
        )
        for i, imp in enumerate(import_p)
    ]


def test_lp_golden_toy_day():
    """Hand-computable: charge at 10, sell at 50, twice → 80p."""
    periods = make_periods([10, 50, 10, 50])
    result = simulate(periods, IDEAL, Strategy.ARBITRAGE, Optimizer.LP)
    assert result.saving_gbp == pytest.approx(0.80)
    charged = [d.charge_kwh for d in result.dispatch]
    exported = [d.discharge_export_kwh for d in result.dispatch]
    assert charged == pytest.approx([1, 0, 1, 0])
    assert exported == pytest.approx([0, 1, 0, 1])


def test_no_cycle_when_spread_is_below_efficiency_loss():
    """Buying at 10 to sell at 10.8 loses money at 90% round-trip: stay idle."""
    battery = Battery(capacity_kwh=1, power_kw=2, round_trip_efficiency=0.9)
    periods = make_periods([10, 10.8])
    for optimizer in Optimizer:
        result = simulate(periods, battery, Strategy.ARBITRAGE, optimizer)
        assert result.saving_gbp == pytest.approx(0, abs=1e-9)
        assert all(d.charge_kwh == 0 for d in result.dispatch)


def test_power_limit_binds_before_capacity():
    """2.5 kW over 4 cheap half-hours moves only 5 kWh of the 10 kWh capacity."""
    battery = Battery(capacity_kwh=10, power_kw=2.5, round_trip_efficiency=1)
    periods = make_periods([10] * 4 + [50] * 4)
    result = simulate(periods, battery, Strategy.ARBITRAGE, Optimizer.LP)
    assert sum(d.charge_kwh for d in result.dispatch) == pytest.approx(5)
    assert result.saving_gbp == pytest.approx(5 * 40 / 100)


def test_negative_import_price_is_paid_to_charge():
    """Plunge pricing: get paid 5p to charge, then earn 25p exporting → 30p."""
    periods = make_periods([-5, 30], export_p=[0, 25])
    result = simulate(periods, IDEAL, Strategy.ARBITRAGE, Optimizer.LP)
    assert result.saving_gbp == pytest.approx(0.30)


def test_lp_never_loses_to_greedy():
    """The LP is optimal per horizon, so it must match or beat the heuristic."""
    rng = random.Random(42)
    prices = [max(-10, rng.gauss(22, 12)) for _ in range(48 * 3)]
    exports = [max(0, p - 8) for p in prices]
    demand = [0.3 if 34 <= i % 48 <= 41 else 0.1 for i in range(48 * 3)]
    periods = make_periods(prices, export_p=exports, demand=demand)
    battery = Battery(capacity_kwh=5, power_kw=2.5, round_trip_efficiency=0.9)
    for strategy in (Strategy.ARBITRAGE, Strategy.SELF_CONSUMPTION):
        lp = simulate(periods, battery, strategy, Optimizer.LP)
        greedy = simulate(periods, battery, strategy, Optimizer.GREEDY)
        assert lp.saving_gbp >= greedy.saving_gbp - 1e-9, strategy


def test_self_consumption_discharge_respects_demand():
    """With a worthless export rate, discharge is capped by the household's demand."""
    demand = [0.0, 0.0, 0.4, 0.4]
    periods = make_periods([10, 10, 50, 50], export_p=[0, 0, 0, 0], demand=demand)
    result = simulate(periods, IDEAL, Strategy.SELF_CONSUMPTION, Optimizer.LP)
    for d, want in zip(result.dispatch, demand):
        assert d.discharge_home_kwh <= want + 1e-9
        assert d.discharge_export_kwh == 0
    assert result.saving_gbp == pytest.approx(0.8 * 40 / 100)


def test_green_trades_money_for_carbon():
    """Cheap-but-dirty vs dear-but-clean charging windows: green picks clean,
    cheapest picks cheap, and each wins on its own objective."""
    prices = [10, 40, 30, 60]
    carbon = [500.0, 100.0, 400.0, 450.0]
    demand = [0.0, 0.0, 0.0, 1.0]
    periods = make_periods(prices, export_p=[0] * 4, carbon=carbon, demand=demand)
    green = simulate(periods, IDEAL, Strategy.GREEN, Optimizer.LP)
    cheapest = simulate(periods, IDEAL, Strategy.SELF_CONSUMPTION, Optimizer.LP)
    assert green.carbon_saved_kg > cheapest.carbon_saved_kg
    assert cheapest.saving_gbp > green.saving_gbp
    # green charged in the clean half-hour, cheapest in the cheap one
    assert green.dispatch[1].charge_kwh == pytest.approx(1)
    assert cheapest.dispatch[0].charge_kwh == pytest.approx(1)


def test_green_requires_carbon_data():
    with pytest.raises(ValueError, match="intensity_gco2"):
        simulate(make_periods([10, 20]), IDEAL, Strategy.GREEN, Optimizer.LP)


def test_lp_carries_charge_overnight():
    """A cheap day before an expensive day: the rolling horizon holds the charge
    across midnight; greedy (day-blind) earns nothing."""
    day1 = make_periods([10, 11, 12, 13], start=BASE)
    day2 = make_periods([50, 51, 52, 53], start=BASE + dt.timedelta(days=1))
    periods = day1 + day2
    lp = simulate(periods, IDEAL, Strategy.ARBITRAGE, Optimizer.LP)
    end_of_day1 = lp.dispatch[3]
    assert end_of_day1.soc_kwh == pytest.approx(1)
    assert lp.saving_gbp == pytest.approx((53 - 10) / 100)
    greedy = simulate(periods, IDEAL, Strategy.ARBITRAGE, Optimizer.GREEDY)
    assert greedy.saving_gbp < lp.saving_gbp


def test_full_year_is_fast_enough():
    """A year of half-hours must simulate quickly enough to serve on request."""
    rng = random.Random(7)
    prices = [max(-10, rng.gauss(22, 12)) for _ in range(48 * 365)]
    periods = make_periods(prices, export_p=[max(0, p - 8) for p in prices])
    battery = Battery(capacity_kwh=10, power_kw=5, round_trip_efficiency=0.9)
    started = time.monotonic()
    simulate(periods, battery, Strategy.ARBITRAGE, Optimizer.LP)
    assert time.monotonic() - started < 5
