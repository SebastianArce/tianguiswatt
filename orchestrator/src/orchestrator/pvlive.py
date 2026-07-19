"""Fetch and parse GB national solar outturn from Sheffield Solar's PV_Live API.

PV_Live estimates the generation of the whole (mostly unmetered) GB solar fleet per
half-hour, alongside the installed capacity — their ratio is a national capacity
factor, which the battery simulator scales to a domestic array. The API is public and
unauthenticated; rows are positional arrays keyed by a separate `meta` name list, and
timestamps label the END of each half-hour (UTC).
"""

from __future__ import annotations

import httpx

from shared.models import SolarGenerationRecord
from orchestrator._retry import retrying

# GSP 0 is the national aggregate.
PVLIVE_URL = "https://api.pvlive.uk/pvlive/api/v4/gsp/0"


@retrying
def fetch_solar_generation(
    start_iso: str, end_iso: str, client: httpx.Client | None = None
) -> list[dict]:
    """Fetch national solar rows for an ISO datetime range, as name-keyed dicts."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        response = client.get(
            PVLIVE_URL,
            params={
                "start": start_iso,
                "end": end_iso,
                "extra_fields": "installedcapacity_mwp",
            },
        )
        response.raise_for_status()
        body = response.json()
        return [dict(zip(body["meta"], row)) for row in body["data"]]
    finally:
        if owns_client:
            client.close()


def parse_solar_generation(payload: list[dict]) -> list[SolarGenerationRecord]:
    """Validate raw PV_Live rows into typed records."""
    return [SolarGenerationRecord.model_validate(row) for row in payload]
