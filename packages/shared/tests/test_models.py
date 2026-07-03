"""Unit tests for the shared pydantic models — alias mapping against real API shapes."""

from __future__ import annotations

import datetime as dt

from shared.models import MarketIndexPriceRecord, SystemPriceRecord

# Shapes verified against the live Elexon Insights API.
SYSTEM_PRICE = {
    "settlementDate": "2026-07-01",
    "settlementPeriod": 20,
    "startTime": "2026-07-01T08:30:00Z",
    "createdDateTime": "2026-07-02T09:14:58Z",
    "systemSellPrice": 93.33,
    "systemBuyPrice": 93.33,
    "netImbalanceVolume": -16.009287843915345,
    "priceDerivationCode": "N",
}

MID = {
    "dataset": "MID",
    "startTime": "2026-07-01T09:30:00Z",
    "dataProvider": "APXMIDP",
    "settlementDate": "2026-07-01",
    "settlementPeriod": 22,
    "price": 106.83,
    "volume": 3310.45,
}


def test_system_price_record_parses_api_shape():
    r = SystemPriceRecord.model_validate(SYSTEM_PRICE)  # extra keys ignored
    assert r.settlement_period == 20
    assert r.system_sell_price == 93.33 and r.system_buy_price == 93.33
    assert r.price_derivation_code == "N"
    assert r.measured_at == dt.datetime(2026, 7, 1, 8, 30, tzinfo=dt.UTC)


def test_market_index_price_record_parses_api_shape():
    r = MarketIndexPriceRecord.model_validate(MID)  # extra "dataset" key ignored
    assert r.data_provider == "APXMIDP"
    assert r.settlement_period == 22
    assert r.price == 106.83
    assert r.volume == 3310.45
