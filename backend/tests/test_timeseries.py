"""Tests for the /api/timeseries endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_timeseries_returns_windowed_metric(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        data = (
            TestClient(app)
            .get(
                "/api/timeseries",
                params={"metric": "demand", "granularity": "hour", "hours": 24},
            )
            .json()
        )
    finally:
        app.dependency_overrides.clear()

    # only demand/hour within 24h of the latest bucket (20:00); the 06-25 row is excluded
    values = [p["value"] for p in data]
    buckets = [p["bucket"] for p in data]
    assert len(data) == 3
    assert values == [22000, 21000, 20000]  # ordered by bucket asc (18:00 → 20:00)
    assert buckets == sorted(buckets)


def test_timeseries_rejects_unknown_metric():
    app.dependency_overrides[get_clickhouse] = lambda: None
    try:
        r = TestClient(app).get("/api/timeseries", params={"metric": "banana"})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422  # Literal enum validation


def test_timeseries_empty_when_mart_absent(empty_ch):
    app.dependency_overrides[get_clickhouse] = lambda: empty_ch
    try:
        data = (
            TestClient(app).get("/api/timeseries", params={"metric": "demand"}).json()
        )
    finally:
        app.dependency_overrides.clear()
    assert data == []
