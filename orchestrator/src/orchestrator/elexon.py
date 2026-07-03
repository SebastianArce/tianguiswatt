"""Fetch and parse Elexon datasets (FUELINST generation, demand outturn)."""

from __future__ import annotations

import httpx

from shared.models import (
    BidOfferAcceptanceRecord,
    BidOfferRecord,
    DemandRecord,
    FuelInstRecord,
    MarketIndexPriceRecord,
    SystemPriceRecord,
)
from orchestrator._retry import retrying

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1"
FUELINST_URL = f"{ELEXON_BASE}/datasets/FUELINST"
DEMAND_URL = f"{ELEXON_BASE}/demand/outturn"
SYSTEM_PRICE_URL = f"{ELEXON_BASE}/balancing/settlement/system-prices"
MID_URL = f"{ELEXON_BASE}/datasets/MID"
BOD_URL = f"{ELEXON_BASE}/datasets/BOD"
BOALF_URL = f"{ELEXON_BASE}/datasets/BOALF"


@retrying
def fetch_fuelinst(client: httpx.Client | None = None) -> list[dict]:
    """Fetch the latest FUELINST rows. Retries transient failures with backoff."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        response = client.get(FUELINST_URL, params={"format": "json"})
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


@retrying
def fetch_demand(
    settlement_date_from: str,
    settlement_date_to: str,
    client: httpx.Client | None = None,
) -> list[dict]:
    """Fetch demand outturn for an inclusive settlement-date range."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        response = client.get(
            DEMAND_URL,
            params={
                "settlementDateFrom": settlement_date_from,
                "settlementDateTo": settlement_date_to,
                "format": "json",
            },
        )
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


def parse_fuelinst(payload: list[dict]) -> list[FuelInstRecord]:
    """Validate raw FUELINST rows into typed records."""
    return [FuelInstRecord.model_validate(row) for row in payload]


def parse_demand(payload: list[dict]) -> list[DemandRecord]:
    """Validate raw demand rows into typed records."""
    return [DemandRecord.model_validate(row) for row in payload]


@retrying
def fetch_system_prices(
    settlement_date: str, client: httpx.Client | None = None
) -> list[dict]:
    """Fetch every settlement period's system (imbalance) price for a date."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        response = client.get(
            f"{SYSTEM_PRICE_URL}/{settlement_date}", params={"format": "json"}
        )
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


@retrying
def fetch_market_index_price(
    from_iso: str, to_iso: str, client: httpx.Client | None = None
) -> list[dict]:
    """Fetch Market Index Price rows (per provider) for an ISO datetime range."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        response = client.get(
            MID_URL, params={"from": from_iso, "to": to_iso, "format": "json"}
        )
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


def parse_system_prices(payload: list[dict]) -> list[SystemPriceRecord]:
    """Validate raw system-price rows into typed records."""
    return [SystemPriceRecord.model_validate(row) for row in payload]


def parse_market_index_price(payload: list[dict]) -> list[MarketIndexPriceRecord]:
    """Validate raw Market Index Price rows into typed records."""
    return [MarketIndexPriceRecord.model_validate(row) for row in payload]


@retrying
def fetch_bid_offer(
    from_iso: str, to_iso: str, client: httpx.Client | None = None
) -> list[dict]:
    """Fetch Balancing Mechanism bid-offer pairs (BOD) for an ISO datetime range."""
    owns_client = client is None
    client = client or httpx.Client(timeout=60)
    try:
        response = client.get(
            BOD_URL, params={"from": from_iso, "to": to_iso, "format": "json"}
        )
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


@retrying
def fetch_bid_offer_acceptances(
    from_iso: str, to_iso: str, client: httpx.Client | None = None
) -> list[dict]:
    """Fetch accepted BM actions (BOALF) for an ISO datetime range."""
    owns_client = client is None
    client = client or httpx.Client(timeout=60)
    try:
        response = client.get(
            BOALF_URL, params={"from": from_iso, "to": to_iso, "format": "json"}
        )
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


def parse_bid_offer(payload: list[dict]) -> list[BidOfferRecord]:
    """Validate raw BOD rows into typed records."""
    return [BidOfferRecord.model_validate(row) for row in payload]


def parse_bid_offer_acceptances(payload: list[dict]) -> list[BidOfferAcceptanceRecord]:
    """Validate raw BOALF rows into typed records."""
    return [BidOfferAcceptanceRecord.model_validate(row) for row in payload]
