"""Tests for the /api/bid-stack endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_bid_stack_returns_latest_offer_stack(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        data = TestClient(app).get("/api/bid-stack").json()
    finally:
        app.dependency_overrides.clear()

    assert data["settlement_period"] == 42
    # cheapest offer first; bids excluded; the older period excluded
    units = [e["national_grid_bm_unit"] for e in data["entries"]]
    assert units == ["AAA-1", "BBB-1"]

    aaa = data["entries"][0]
    assert aaa["offer_price"] == 60
    assert aaa["volume_mw"] == 10  # max level_to (10) − min level_from (0)
    assert aaa["accepted"] is True
    assert data["entries"][1]["accepted"] is False


def test_bid_stack_empty_when_mart_absent(empty_ch):
    app.dependency_overrides[get_clickhouse] = lambda: empty_ch
    try:
        data = TestClient(app).get("/api/bid-stack").json()
    finally:
        app.dependency_overrides.clear()
    assert data["settlement_period"] is None
    assert data["entries"] == []
