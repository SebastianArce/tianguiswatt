"""Tests for prices ingestion (system price + Market Index Price).

`test_parse_*` are pure unit tests; the load tests need ClickHouse (conftest fixture).
"""

from __future__ import annotations

import datetime as dt

from shared.migrations.runner import migrate
from orchestrator.assets import load_market_index_price, load_system_prices
from orchestrator.elexon import parse_market_index_price, parse_system_prices

SYSTEM_PRICE: list[dict] = [
    {
        "settlementDate": "2026-07-01",
        "settlementPeriod": 20,
        "startTime": "2026-07-01T08:30:00Z",
        "systemSellPrice": 93.33,
        "systemBuyPrice": 93.33,
        "netImbalanceVolume": -16.0,
        "priceDerivationCode": "N",
    }
]

MID: list[dict] = [
    {
        "dataset": "MID",
        "startTime": "2026-07-01T09:30:00Z",
        "dataProvider": "APXMIDP",
        "settlementDate": "2026-07-01",
        "settlementPeriod": 22,
        "price": 106.83,
        "volume": 3310.45,
    },
    {
        "dataset": "MID",
        "startTime": "2026-07-01T09:30:00Z",
        "dataProvider": "N2EXMIDP",
        "settlementDate": "2026-07-01",
        "settlementPeriod": 22,
        "price": 0.0,
        "volume": 0.0,
    },
]


def test_parse_system_prices():
    records = parse_system_prices(SYSTEM_PRICE)
    assert len(records) == 1
    r = records[0]
    assert r.settlement_period == 20
    assert r.system_sell_price == 93.33
    assert r.price_derivation_code == "N"
    assert r.measured_at == dt.datetime(2026, 7, 1, 8, 30, tzinfo=dt.UTC)


def test_parse_market_index_price():
    records = parse_market_index_price(MID)
    assert [r.data_provider for r in records] == ["APXMIDP", "N2EXMIDP"]
    assert records[0].price == 106.83


def test_load_system_prices_is_idempotent_and_revisable(client):
    migrate(client)
    load_system_prices(client, parse_system_prices(SYSTEM_PRICE), ingest_version=1)
    revised = parse_system_prices(
        [{**SYSTEM_PRICE[0], "systemSellPrice": 95.0, "systemBuyPrice": 95.0}]
    )
    load_system_prices(client, revised, ingest_version=2)

    total = client.query("SELECT count() FROM raw.system_price FINAL").result_rows[0][0]
    assert total == 1
    price = client.query(
        "SELECT system_sell_price FROM raw.system_price FINAL"
    ).result_rows
    assert price == [(95.0,)]


def test_load_market_index_price_keeps_row_per_provider(client):
    migrate(client)
    load_market_index_price(client, parse_market_index_price(MID), ingest_version=1)
    total = client.query(
        "SELECT count() FROM raw.market_index_price FINAL"
    ).result_rows[0][0]
    assert total == 2
