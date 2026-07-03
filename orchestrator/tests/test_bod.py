"""Tests for BM bid-offer ingestion (BOD + BOALF).

`test_parse_*` are pure unit tests; the load tests need ClickHouse (conftest fixture).
"""

from __future__ import annotations

from shared.migrations.runner import migrate
from orchestrator.assets import load_bid_offer, load_bid_offer_acceptances
from orchestrator.elexon import parse_bid_offer, parse_bid_offer_acceptances

BOD: list[dict] = [
    {
        "dataset": "BOD",
        "settlementDate": "2026-07-02",
        "settlementPeriod": 22,
        "timeFrom": "2026-07-02T09:30:00Z",
        "levelFrom": -16,
        "timeTo": "2026-07-02T10:00:00Z",
        "levelTo": -16,
        "pairId": -1,
        "offer": 220.0,
        "bid": 115.0,
        "nationalGridBmUnit": "ABERU-1",
        "bmUnit": "E_ABERDARE",
    }
]

BOALF: list[dict] = [
    {
        "dataset": "BOALF",
        "settlementDate": "2026-07-02",
        "settlementPeriodFrom": 22,
        "settlementPeriodTo": 23,
        "timeFrom": "2026-07-02T09:30:00Z",
        "timeTo": "2026-07-02T10:20:00Z",
        "levelFrom": 5,
        "levelTo": 5,
        "acceptanceNumber": 11213,
        "acceptanceTime": "2026-07-02T09:05:00Z",
        "deemedBoFlag": False,
        "soFlag": True,
        "amendmentFlag": "ORI",
        "storFlag": False,
        "rrFlag": False,
        "nationalGridBmUnit": "BROCW-1",
        "bmUnit": "T_BROCW-1",
    }
]


def test_parse_bid_offer():
    records = parse_bid_offer(BOD)
    assert len(records) == 1
    r = records[0]
    assert r.bm_unit == "E_ABERDARE"
    assert r.pair_id == -1
    assert r.offer == 220.0
    assert r.level_from == -16


def test_bid_offer_allows_null_bm_unit():
    # ~0.8% of live BOD rows have a null bmUnit (unmapped units); nationalGridBmUnit is
    # always present and is the key.
    r = parse_bid_offer([{**BOD[0], "bmUnit": None}])[0]
    assert r.bm_unit is None
    assert r.national_grid_bm_unit == "ABERU-1"


def test_parse_bid_offer_acceptances():
    records = parse_bid_offer_acceptances(BOALF)
    assert records[0].acceptance_number == 11213
    assert records[0].so_flag is True


def test_load_bid_offer_is_idempotent_and_revisable(client):
    migrate(client)
    load_bid_offer(client, parse_bid_offer(BOD), ingest_version=1)
    load_bid_offer(
        client, parse_bid_offer([{**BOD[0], "offer": 230.0}]), ingest_version=2
    )

    total = client.query("SELECT count() FROM raw.bid_offer FINAL").result_rows[0][0]
    assert total == 1
    offer = client.query("SELECT offer FROM raw.bid_offer FINAL").result_rows
    assert offer == [(230.0,)]


def test_load_bid_offer_acceptances(client):
    migrate(client)
    load_bid_offer_acceptances(
        client, parse_bid_offer_acceptances(BOALF), ingest_version=1
    )
    total = client.query(
        "SELECT count() FROM raw.bid_offer_acceptance FINAL"
    ).result_rows[0][0]
    assert total == 1
