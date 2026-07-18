"""Fetch and parse Octopus Energy half-hourly tariff rates (Agile import + export).

Agile passes the EPEX day-ahead auction through to households: all 48 half-hourly
rates for tomorrow are published around 16:00 today, so within a day the price series
is known in advance. The rates API is public and unauthenticated.
"""

from __future__ import annotations

import httpx

from shared.models import TariffRateRecord
from orchestrator._retry import retrying

OCTOPUS_BASE = "https://api.octopus.energy/v1"

# Agile rates are regional (the day-ahead multiplier and adder vary by DNO region);
# a single region keeps the series internally comparable. C = London.
REGION = "C"

IMPORT_PRODUCT = "AGILE-24-10-01"
EXPORT_PRODUCT = "AGILE-OUTGOING-19-05-13"

# The API pages at up to 1,500 rows (~31 days of half-hours); fetches follow `next`.
_PAGE_SIZE = 1500


def tariff_code(product: str) -> str:
    """Tariff code for a product in our region (E-1R = single-rate electricity)."""
    return f"E-1R-{product}-{REGION}"


def _rates_url(product: str) -> str:
    return (
        f"{OCTOPUS_BASE}/products/{product}"
        f"/electricity-tariffs/{tariff_code(product)}/standard-unit-rates/"
    )


@retrying
def fetch_tariff_rates(
    product: str,
    period_from: str,
    period_to: str,
    client: httpx.Client | None = None,
) -> list[dict]:
    """Fetch a product's unit rates for an ISO datetime range, following page links."""
    owns_client = client is None
    client = client or httpx.Client(timeout=30)
    try:
        rows: list[dict] = []
        url: str | None = _rates_url(product)
        params: dict | None = {
            "period_from": period_from,
            "period_to": period_to,
            "page_size": _PAGE_SIZE,
        }
        while url:
            response = client.get(url, params=params)
            response.raise_for_status()
            body = response.json()
            rows.extend(body["results"])
            url, params = body.get("next"), None  # `next` carries the query string
        return rows
    finally:
        if owns_client:
            client.close()


def parse_tariff_rates(payload: list[dict], tariff: str) -> list[TariffRateRecord]:
    """Validate raw rate rows into typed records, tagged with their tariff code."""
    return [
        TariffRateRecord.model_validate({**row, "tariff_code": tariff})
        for row in payload
    ]
