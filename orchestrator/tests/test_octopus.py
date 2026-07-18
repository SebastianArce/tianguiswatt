"""Tests for Octopus Agile tariff-rate ingestion.

Parse and pagination tests are pure; the load test needs ClickHouse (conftest fixture).
"""

from __future__ import annotations

import datetime as dt

import httpx

from shared.migrations.runner import migrate
from orchestrator.assets import load_tariff_rates
from orchestrator.octopus import fetch_tariff_rates, parse_tariff_rates, tariff_code

IMPORT_TARIFF = tariff_code("AGILE-24-10-01")

SAMPLE: list[dict] = [
    {
        "value_exc_vat": 23.04,
        "value_inc_vat": 24.192,
        "valid_from": "2026-07-18T21:30:00Z",
        "valid_to": "2026-07-18T22:00:00Z",
        "payment_method": None,
    },
    {
        # plunge pricing: a negative import rate on an oversupplied half-hour
        "value_exc_vat": -2.5,
        "value_inc_vat": -2.625,
        "valid_from": "2026-07-18T21:00:00Z",
        "valid_to": "2026-07-18T21:30:00Z",
        "payment_method": None,
    },
]


def test_parse_tariff_rates():
    records = parse_tariff_rates(SAMPLE, IMPORT_TARIFF)
    assert len(records) == 2

    first = records[0]
    assert first.tariff_code == IMPORT_TARIFF
    assert first.valid_from == dt.datetime(2026, 7, 18, 21, 30, tzinfo=dt.UTC)
    assert first.valid_to == dt.datetime(2026, 7, 18, 22, 0, tzinfo=dt.UTC)
    assert first.value_inc_vat == 24.192

    assert records[1].value_inc_vat < 0  # negative rates must survive validation


def test_fetch_follows_pagination():
    requested: list[httpx.URL] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested.append(request.url)
        if request.url.params.get("page") == "2":
            return httpx.Response(200, json={"next": None, "results": [SAMPLE[1]]})
        return httpx.Response(
            200, json={"next": str(request.url) + "&page=2", "results": SAMPLE}
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as mock_client:
        rows = fetch_tariff_rates(
            "AGILE-24-10-01",
            "2026-07-17T00:00:00Z",
            "2026-07-19T00:00:00Z",
            client=mock_client,
        )

    assert len(rows) == 3  # both pages concatenated
    assert requested[0].params["period_from"] == "2026-07-17T00:00:00Z"
    # the second request follows `next` verbatim, keeping the original range params
    assert requested[1].params["page"] == "2"
    assert requested[1].params["period_to"] == "2026-07-19T00:00:00Z"


def test_load_tariff_rates_is_idempotent_and_revisable(client):
    migrate(client)

    load_tariff_rates(
        client, parse_tariff_rates(SAMPLE, IMPORT_TARIFF), ingest_version=1
    )
    revised = parse_tariff_rates([{**SAMPLE[0], "value_inc_vat": 25.0}], IMPORT_TARIFF)
    load_tariff_rates(client, revised, ingest_version=2)

    total = client.query("SELECT count() FROM raw.tariff_rate FINAL").result_rows[0][0]
    assert total == 2

    value = client.query(
        "SELECT value_inc_vat FROM raw.tariff_rate FINAL "
        "WHERE valid_from = '2026-07-18 21:30:00'"
    ).result_rows
    assert value == [(25.0,)]
