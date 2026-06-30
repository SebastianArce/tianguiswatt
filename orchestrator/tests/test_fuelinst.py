"""Tests for FUELINST ingestion.

`test_parse_fuelinst` is a pure unit test. The load test is an integration test that
needs a running ClickHouse (see the `client` fixture in conftest.py).
"""

from __future__ import annotations

import datetime as dt

from shared.migrations.runner import migrate
from orchestrator.assets import load_fuelinst
from orchestrator.elexon import parse_fuelinst

SAMPLE: list[dict] = [
    {
        "dataset": "FUELINST",
        "publishTime": "2026-06-29T20:40:00Z",
        "startTime": "2026-06-29T20:35:00Z",
        "settlementDate": "2026-06-29",
        "settlementPeriod": 44,
        "fuelType": "BIOMASS",
        "generation": 1582,
    },
    {
        "dataset": "FUELINST",
        "publishTime": "2026-06-29T20:40:00Z",
        "startTime": "2026-06-29T20:35:00Z",
        "settlementDate": "2026-06-29",
        "settlementPeriod": 44,
        "fuelType": "WIND",
        "generation": 5000,
    },
]


def test_parse_fuelinst():
    records = parse_fuelinst(SAMPLE)
    assert len(records) == 2

    biomass = records[0]
    assert biomass.fuel_type == "BIOMASS"
    assert biomass.generation_mw == 1582.0
    assert biomass.settlement_period == 44
    assert biomass.settlement_date == dt.date(2026, 6, 29)
    assert biomass.measured_at == dt.datetime(2026, 6, 29, 20, 35, tzinfo=dt.UTC)


def test_load_fuelinst_is_idempotent_and_revisable(client):
    migrate(client)

    # initial ingest
    load_fuelinst(client, parse_fuelinst(SAMPLE), ingest_version=1)
    # re-ingest with a revised BIOMASS value at a higher version
    revised = parse_fuelinst([{**SAMPLE[0], "generation": 9999}, SAMPLE[1]])
    load_fuelinst(client, revised, ingest_version=2)

    # FINAL resolves ReplacingMergeTree: no duplicates, latest version wins
    total = client.query(
        "SELECT count() FROM raw.generation_fuelinst FINAL"
    ).result_rows[0][0]
    assert total == 2

    biomass = client.query(
        "SELECT generation_mw FROM raw.generation_fuelinst FINAL WHERE fuel_type = 'BIOMASS'"
    ).result_rows
    assert biomass == [(9999.0,)]
