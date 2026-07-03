"""Tests for the /api/accepted-actions endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def test_accepted_actions_returns_recent_first(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        data = TestClient(app).get("/api/accepted-actions").json()
    finally:
        app.dependency_overrides.clear()

    # ordered by acceptance_time desc (MINP 20:05, then PEMB 20:00)
    assert [a["national_grid_bm_unit"] for a in data] == ["MINP-1", "PEMB-1"]
    assert data[0]["level_from"] == 400
    assert data[0]["level_to"] == 580
    assert data[0]["so_flag"] is False
    assert data[0]["unit_name"] is None  # no registry match
    assert data[1]["so_flag"] is True
    assert data[1]["unit_name"] == "Pembroke Unit 1"  # enriched from the registry
    assert data[1]["fuel_type"] == "CCGT"


def test_accepted_actions_respects_limit(ch_client):
    app.dependency_overrides[get_clickhouse] = lambda: ch_client
    try:
        data = TestClient(app).get("/api/accepted-actions", params={"limit": 1}).json()
    finally:
        app.dependency_overrides.clear()
    assert len(data) == 1
    assert data[0]["national_grid_bm_unit"] == "MINP-1"


def test_accepted_actions_empty_when_mart_absent(empty_ch):
    app.dependency_overrides[get_clickhouse] = lambda: empty_ch
    try:
        data = TestClient(app).get("/api/accepted-actions").json()
    finally:
        app.dependency_overrides.clear()
    assert data == []
