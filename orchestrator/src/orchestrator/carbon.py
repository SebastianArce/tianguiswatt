"""Fetch and parse NESO Carbon Intensity data."""

from __future__ import annotations

import httpx

from shared.models import CarbonIntensityRecord
from orchestrator._retry import retrying

CARBON_INTENSITY_BASE = "https://api.carbonintensity.org.uk/intensity"
CARBON_INTENSITY_DATE_URL = f"{CARBON_INTENSITY_BASE}/date"

# The API caps range queries at 14 days.
MAX_RANGE_DAYS = 14


@retrying
def fetch_carbon_intensity(client: httpx.Client | None = None) -> list[dict]:
    """Fetch today's national carbon-intensity half-hours. Retries with backoff."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30, headers={"Accept": "application/json"})
    try:
        response = client.get(CARBON_INTENSITY_DATE_URL)
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


@retrying
def fetch_carbon_intensity_range(
    from_iso: str, to_iso: str, client: httpx.Client | None = None
) -> list[dict]:
    """Fetch national carbon intensity for an ISO datetime range (≤ 14 days)."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30, headers={"Accept": "application/json"})
    try:
        response = client.get(f"{CARBON_INTENSITY_BASE}/{from_iso}/{to_iso}")
        response.raise_for_status()
        return response.json()["data"]
    finally:
        if owns_client:
            client.close()


def parse_carbon_intensity(payload: list[dict]) -> list[CarbonIntensityRecord]:
    """Validate raw carbon-intensity rows into typed records."""
    return [CarbonIntensityRecord.model_validate(row) for row in payload]
