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
