"""Integration test for /api/snapshot against seeded marts."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_snapshot_returns_latest_across_domains(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        response = TestClient(app).get("/api/snapshot")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()

    # generation mix, ordered by share desc
    assert [g["fuel_type"] for g in data["generation"]] == ["CCGT", "WIND"]
    assert data["generation"][0]["share_pct"] == 57.35
    assert data["measured_at"] is not None

    assert data["supply_demand"]["demand_mw"] == 27367
    assert data["supply_demand"]["total_generation_mw"] == 28297.0

    assert data["carbon"]["intensity_gco2"] == 225
    assert data["carbon"]["intensity_index"] == "high"

    assert data["price"]["settlement_period"] == 42
    assert data["price"]["system_price"] == 95.0
    assert data["price"]["apx_price"] == 101.14

    assert data["frequency_hz"] == 49.97  # latest reading


def test_snapshot_empty_when_marts_absent(empty_ch):
    # fresh deploy / warming up: marts don't exist yet -> 200 with empty payload, not 500
    app.dependency_overrides[get_clickhouse] = lambda: empty_ch
    try:
        response = TestClient(app).get("/api/snapshot")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    data = response.json()
    assert data["generation"] == []
    assert data["supply_demand"] is None
    assert data["carbon"] is None
    assert data["price"] is None
    assert data["measured_at"] is None
    assert data["frequency_hz"] is None
