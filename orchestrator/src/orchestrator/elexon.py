"""Fetch and parse Elexon datasets (FUELINST generation, demand outturn)."""

from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from shared.models import DemandRecord, FuelInstRecord

ELEXON_BASE = "https://data.elexon.co.uk/bmrs/api/v1"
FUELINST_URL = f"{ELEXON_BASE}/datasets/FUELINST"
DEMAND_URL = f"{ELEXON_BASE}/demand/outturn"

# Shared retry policy for transient HTTP failures.
_retrying = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    reraise=True,
)


@_retrying
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


@_retrying
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
