"""Unit tests for the shared pydantic models — alias mapping against real API shapes."""

from __future__ import annotations

import datetime as dt

from shared.models import (
    BidOfferAcceptanceRecord,
    BidOfferRecord,
    MarketIndexPriceRecord,
    SystemPriceRecord,
)

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


BOD = {
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

BOALF = {
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


def test_bid_offer_record_parses_api_shape():
    r = BidOfferRecord.model_validate(BOD)  # extra "dataset" key ignored
    assert r.bm_unit == "E_ABERDARE"
    assert r.pair_id == -1
    assert r.offer == 220.0 and r.bid == 115.0
    assert r.level_from == -16


def test_bid_offer_acceptance_record_parses_api_shape():
    r = BidOfferAcceptanceRecord.model_validate(BOALF)  # extra flags ignored
    assert r.acceptance_number == 11213
    assert r.so_flag is True and r.stor_flag is False
    assert r.bm_unit == "T_BROCW-1"
