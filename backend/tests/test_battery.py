"""Tests for the Battery Lab endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_validation_needs_no_db():
    client = TestClient(app)
    assert client.get("/api/battery/simulation?battery=99kwh").status_code == 422
    assert client.get("/api/battery/simulation?months=0").status_code == 422
    assert client.get("/api/battery/context?months=99").status_code == 422


def _get(ch_client, path: str):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        return TestClient(app).get(path)
    finally:
        app.dependency_overrides.clear()


def test_simulation_runs_all_strategies(ch_client):
    response = _get(ch_client, "/api/battery/simulation?battery=10kwh")
    assert response.status_code == 200
    body = response.json()

    assert body["battery"]["capacity_kwh"] == 10
    assert body["days"] == 2
    assert body["periods"] == 96  # 2 seeded days × 48 half-hours
    assert body["baseline_cost_gbp_year"] > 0
    assert {(r["strategy"], r["optimizer"]) for r in body["runs"]} == {
        (s, o)
        for s in ("arbitrage", "self_consumption", "green")
        for o in ("greedy", "lp")
    }

    by_key = {(r["strategy"], r["optimizer"]): r for r in body["runs"]}
    lp_arb = by_key[("arbitrage", "lp")]
    # the seeded 10p→35p spread comfortably clears the 90% round-trip loss
    assert lp_arb["saving_gbp"] > 0
    assert lp_arb["saving_gbp_year"] > lp_arb["saving_gbp"]  # annualised from 2 days
    assert lp_arb["payback_years"] is not None
    assert len(lp_arb["typical_day"]) == 48
    # months are local-clock: the last UTC half-hours spill into a July stub bucket
    assert [m["month"] for m in lp_arb["monthly"]] == ["2026-06-01", "2026-07-01"]
    assert sum(m["saving_gbp"] for m in lp_arb["monthly"]) == pytest.approx(
        lp_arb["saving_gbp"], abs=0.02
    )
    # optimality: lp never loses to greedy on the same strategy
    for strategy in ("arbitrage", "self_consumption", "green"):
        assert (
            by_key[(strategy, "lp")]["saving_gbp"]
            >= by_key[(strategy, "greedy")]["saving_gbp"]
        )


def test_context_reports_profiles_and_constants(ch_client):
    response = _get(ch_client, "/api/battery/context")
    assert response.status_code == 200
    body = response.json()

    assert body["tdcv_kwh"] == 2500
    assert len(body["presets"]) == 3
    assert len(body["intraday"]) == 48
    assert len(body["demand_profile"]) == 48
    # seeded shape: overnight import p50 (10p) well below the evening (35p)
    by_sp = {b["settlement_period"]: b for b in body["intraday"]}
    assert by_sp[4]["import_p50"] < by_sp[36]["import_p50"]
    # cheap and green coincide in the seed, so overlap is high
    assert body["green_overlap_pct"] is not None
    assert body["green_overlap_pct"] > 50
    # solar stats: seeded daytime bell → positive average, sunny midday, dark night
    assert body["avg_solar_cf"] > 0
    assert by_sp[24]["solar_cf_p50"] > 0  # ~11:30 UTC
    assert by_sp[4]["solar_cf_p50"] == 0


def test_bigger_household_saves_more(ch_client):
    medium = _get(ch_client, "/api/battery/simulation?battery=10kwh").json()
    big = _get(
        ch_client, "/api/battery/simulation?battery=10kwh&household=electrified"
    ).json()
    assert medium["household_kwh"] == 2500
    assert big["household_kwh"] == 6500

    # more demand in expensive hours → more avoidable import → more savings
    def pick(body):
        return next(
            r
            for r in body["runs"]
            if r["strategy"] == "self_consumption" and r["optimizer"] == "lp"
        )

    assert pick(big)["saving_gbp"] > pick(medium)["saving_gbp"]
    assert big["baseline_cost_gbp_year"] > medium["baseline_cost_gbp_year"]


def test_solar_lowers_the_baseline_and_keeps_windows_comparable(ch_client):
    plain = _get(ch_client, "/api/battery/simulation?battery=10kwh").json()
    solar = _get(ch_client, "/api/battery/simulation?battery=10kwh&solar=5kwp").json()

    assert plain["solar_kwp"] == 0
    assert solar["solar_kwp"] == 5
    assert solar["solar_generation_kwh_year"] > 0
    # the array pays part of the bill before the battery does anything
    assert solar["baseline_cost_gbp_year"] < plain["baseline_cost_gbp_year"]
    # both modes replay the identical half-hours (unconditional solar predicate)
    assert solar["periods"] == plain["periods"]
    # the typical day surfaces generation and solar-charging
    lp = next(
        r
        for r in solar["runs"]
        if r["strategy"] == "self_consumption" and r["optimizer"] == "lp"
    )
    assert sum(b["solar_kwh"] for b in lp["typical_day"]) > 0
    assert all("charge_solar_kwh" in b for b in lp["typical_day"])

    assert _get(ch_client, "/api/battery/simulation?solar=99kwp").status_code == 422


def test_warming_up_returns_503(empty_ch):
    response = _get(empty_ch, "/api/battery/simulation")
    assert response.status_code == 503
