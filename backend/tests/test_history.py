"""Tests for the recent-history endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_hours_out_of_range_returns_422():
    # validation happens before the ClickHouse dependency, so this needs no DB
    client = TestClient(app)
    assert client.get("/api/generation?hours=0").status_code == 422
    assert client.get("/api/generation?hours=999").status_code == 422


def test_generation_history_respects_window(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        client = TestClient(app)
        narrow = client.get("/api/generation?hours=3").json()  # only the 20:00 instant
        wide = client.get(
            "/api/generation?hours=12"
        ).json()  # includes the 14:00 instant
    finally:
        app.dependency_overrides.clear()

    assert len(narrow) == 2
    assert {p["fuel_type"] for p in narrow} == {"CCGT", "WIND"}
    assert len(wide) == 3  # + the older CCGT row


def test_supply_demand_history(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        points = TestClient(app).get("/api/supply-demand?hours=24").json()
    finally:
        app.dependency_overrides.clear()

    assert len(points) == 1
    point = points[0]
    assert point["settlement_period"] == 42
    assert point["demand_mw"] == 27367
    # period_start derived from date + period: 2026-06-30 + 41*30min = 20:30
    assert point["period_start"].startswith("2026-06-30T20:30")


def test_carbon_history(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        points = TestClient(app).get("/api/carbon?hours=24").json()
    finally:
        app.dependency_overrides.clear()

    assert len(points) == 1
    assert points[0]["intensity_gco2"] == 225
    assert points[0]["intensity_index"] == "high"


def test_history_empty_when_marts_absent(empty_ch):
    app.dependency_overrides[get_clickhouse] = lambda: empty_ch
    try:
        response = TestClient(app).get("/api/generation?hours=6")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == []
