"""Tests for the narrative front-page aggregates."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.clickhouse import get_clickhouse
from app.main import app


def _get(ch, path: str):
    app.dependency_overrides[get_clickhouse] = lambda: ch
    try:
        return TestClient(app).get(path)
    finally:
        app.dependency_overrides.clear()


def test_story_merges_wedge_and_peak_flex(ch_client):
    response = _get(ch_client, "/api/story")
    assert response.status_code == 200
    body = response.json()

    # constants are always present and the fee stack accounts for the whole rate
    assert body["price_cap_p_kwh"] > 20
    assert sum(f["share_pct"] for f in body["fee_stack"]) == 100

    months = {m["month"]: m for m in body["monthly"]}
    # June 2026 has both sides of the wedge (seeded prices + tariffs)
    june = months["2026-06-01"]
    assert june["system_gbp_mwh"] == 77.5  # avg of 95 and 60
    assert june["apx_gbp_mwh"] is not None
    assert june["agile_import_p_kwh"] is not None
    # the last UTC half-hours of 30 June fall in July on the local clock: an
    # agile-only bucket must exist, proving Europe/London month bucketing
    assert "2026-07-01" in months
    assert months["2026-07-01"]["system_gbp_mwh"] is None
    assert months["2026-07-01"]["agile_import_p_kwh"] is not None

    flex = body["peak_flex"]
    # marginal offer must consider ACCEPTED offers only (the stack has an unaccepted
    # 120) and must exclude the defensive £99,999 sentinel on the accepted unit
    assert flex["max_accepted_offer_gbp_mwh"] == 80
    assert flex["avg_system_gbp_mwh"] is not None
    assert flex["accepted_actions_7d"] == 2


def test_story_renders_partially_on_cold_warehouse(empty_ch):
    response = _get(empty_ch, "/api/story")
    assert response.status_code == 200
    body = response.json()
    assert body["monthly"] == []
    assert body["window_from"] is None
    assert body["peak_flex"]["max_accepted_offer_gbp_mwh"] is None
    assert body["peak_flex"]["accepted_actions_7d"] == 0
    # the page can still tell the fee-stack part of the story
    assert body["price_cap_p_kwh"] > 0
    assert len(body["fee_stack"]) == 5
