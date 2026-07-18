"""Tests for carbon-intensity ingestion.

`test_parse_carbon_intensity` is a pure unit test; the load test needs ClickHouse
(conftest fixture).
"""

from __future__ import annotations

import datetime as dt

import httpx

from shared.migrations.runner import migrate
from orchestrator.assets import load_carbon_intensity
from orchestrator.carbon import fetch_carbon_intensity_range, parse_carbon_intensity

SAMPLE: list[dict] = [
    {
        "from": "2026-06-29T23:00Z",
        "to": "2026-06-29T23:30Z",
        "intensity": {"forecast": 239, "actual": 233, "index": "very high"},
    },
    {
        # a future half-hour: forecast present, actual still null
        "from": "2026-06-29T23:30Z",
        "to": "2026-06-30T00:00Z",
        "intensity": {"forecast": 240, "actual": None, "index": "very high"},
    },
]


def test_parse_carbon_intensity():
    records = parse_carbon_intensity(SAMPLE)
    assert len(records) == 2

    first = records[0]
    assert first.from_ts == dt.datetime(2026, 6, 29, 23, 0, tzinfo=dt.UTC)
    assert first.forecast_gco2 == 239
    assert first.actual_gco2 == 233
    assert first.intensity_index == "very high"

    assert records[1].actual_gco2 is None  # null actual flattened correctly


def test_fetch_carbon_intensity_range_formats_url():
    requested: list[httpx.URL] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested.append(request.url)
        return httpx.Response(200, json={"data": SAMPLE})

    with httpx.Client(transport=httpx.MockTransport(handler)) as mock_client:
        rows = fetch_carbon_intensity_range(
            "2025-07-01T00:00Z", "2025-07-15T00:00Z", client=mock_client
        )

    assert rows == SAMPLE
    assert requested[0].path == "/intensity/2025-07-01T00:00Z/2025-07-15T00:00Z"


def test_load_carbon_is_idempotent_and_revisable(client):
    migrate(client)

    load_carbon_intensity(client, parse_carbon_intensity(SAMPLE), ingest_version=1)
    revised = parse_carbon_intensity(
        [
            {
                **SAMPLE[0],
                "intensity": {"forecast": 239, "actual": 250, "index": "very high"},
            }
        ]
    )
    load_carbon_intensity(client, revised, ingest_version=2)

    total = client.query(
        "SELECT count() FROM raw.carbon_intensity_national FINAL"
    ).result_rows[0][0]
    assert total == 2

    actual = client.query(
        "SELECT actual_gco2 FROM raw.carbon_intensity_national FINAL "
        "WHERE from_ts = '2026-06-29 23:00:00'"
    ).result_rows
    assert actual == [(250,)]
