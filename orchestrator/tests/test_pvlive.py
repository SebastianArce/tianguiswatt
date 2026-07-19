"""Tests for PV_Live solar-outturn ingestion.

Parse and fetch tests are pure; the load test needs ClickHouse (conftest fixture).
"""

from __future__ import annotations

import datetime as dt

import httpx

from shared.migrations.runner import migrate
from orchestrator.assets import load_solar_generation
from orchestrator.pvlive import fetch_solar_generation, parse_solar_generation

# The API returns positional rows keyed by a separate meta list; fetch zips them.
META = ["gsp_id", "datetime_gmt", "generation_mw", "installedcapacity_mwp"]
SAMPLE: list[dict] = [
    dict(zip(META, [0, "2026-07-15T12:30:00Z", 14342.8, 23300.507])),
    # the not-yet-estimated leading edge: generation and capacity can be null
    dict(zip(META, [0, "2026-07-15T13:00:00Z", None, None])),
]


def test_parse_solar_generation():
    records = parse_solar_generation(SAMPLE)
    assert len(records) == 2

    first = records[0]
    assert first.gsp_id == 0
    assert first.period_end_ts == dt.datetime(2026, 7, 15, 12, 30, tzinfo=dt.UTC)
    assert first.generation_mw == 14342.8
    assert first.capacity_mwp == 23300.507

    assert records[1].generation_mw is None
    assert records[1].capacity_mwp is None


def test_fetch_zips_meta_with_rows():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["extra_fields"] == "installedcapacity_mwp"
        assert request.url.params["start"] == "2026-07-15T00:00:00"
        return httpx.Response(
            200,
            json={
                "meta": META,
                "data": [[0, "2026-07-15T12:30:00Z", 14342.8, 23300.507]],
            },
        )

    with httpx.Client(transport=httpx.MockTransport(handler)) as mock_client:
        rows = fetch_solar_generation(
            "2026-07-15T00:00:00", "2026-07-15T23:59:59", client=mock_client
        )

    assert rows == [
        {
            "gsp_id": 0,
            "datetime_gmt": "2026-07-15T12:30:00Z",
            "generation_mw": 14342.8,
            "installedcapacity_mwp": 23300.507,
        }
    ]


def test_load_solar_is_idempotent_and_revisable(client):
    migrate(client)

    load_solar_generation(client, parse_solar_generation(SAMPLE), ingest_version=1)
    # PV_Live revises provisional estimates: same period, later ingest supersedes
    revised = parse_solar_generation(
        [dict(zip(META, [0, "2026-07-15T12:30:00Z", 14500.0, 23300.507]))]
    )
    load_solar_generation(client, revised, ingest_version=2)

    total = client.query("SELECT count() FROM raw.solar_generation FINAL").result_rows[
        0
    ][0]
    assert total == 2

    value = client.query(
        "SELECT generation_mw FROM raw.solar_generation FINAL "
        "WHERE period_end_ts = '2026-07-15 12:30:00'"
    ).result_rows
    assert value == [(14500.0,)]
