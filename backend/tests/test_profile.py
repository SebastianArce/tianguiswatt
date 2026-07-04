"""Tests for the /api/profile endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_profile_returns_intraday_and_weekly(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        data = (
            TestClient(app)
            .get("/api/profile", params={"metric": "demand", "days": 30})
            .json()
        )
    finally:
        app.dependency_overrides.clear()

    assert data["metric"] == "demand"

    # intraday: one bucket per hour-of-day; the seeded 20:00 value is 20000
    by_hour = {b["hour"]: b for b in data["intraday"]}
    assert 20 in by_hour
    assert by_hour[20]["p50"] == 20000  # single value → all percentiles equal

    # weekly: a (weekday, hour) heatmap cell for that 20:00 reading
    hour20 = [c for c in data["weekly"] if c["hour"] == 20]
    assert len(hour20) == 1
    assert hour20[0]["median"] == 20000


def test_profile_empty_when_mart_absent(empty_ch):
    app.dependency_overrides[get_clickhouse] = lambda: empty_ch
    try:
        data = TestClient(app).get("/api/profile", params={"metric": "demand"}).json()
    finally:
        app.dependency_overrides.clear()
    assert data["intraday"] == []
    assert data["weekly"] == []
