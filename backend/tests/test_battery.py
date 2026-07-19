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


def test_warming_up_returns_503(empty_ch):
    response = _get(empty_ch, "/api/battery/simulation")
    assert response.status_code == 503
