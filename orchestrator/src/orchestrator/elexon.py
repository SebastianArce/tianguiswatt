"""Fetch and parse Elexon FUELINST (instantaneous generation by fuel type)."""

from __future__ import annotations

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from shared.models import FuelInstRecord

FUELINST_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELINST"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, max=10),
    reraise=True,
)
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


def parse_fuelinst(payload: list[dict]) -> list[FuelInstRecord]:
    """Validate raw FUELINST rows into typed records."""
    return [FuelInstRecord.model_validate(row) for row in payload]
