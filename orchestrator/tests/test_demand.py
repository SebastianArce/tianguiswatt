"""Tests for demand ingestion.

`test_parse_demand` is a pure unit test; the load test needs ClickHouse (conftest fixture).
"""

from __future__ import annotations

import datetime as dt

from shared.migrations.runner import migrate
from orchestrator.assets import load_demand
from orchestrator.elexon import parse_demand

SAMPLE: list[dict] = [
    {
        "publishTime": "2026-06-29T20:30:00Z",
        "startTime": "2026-06-29T20:00:00Z",
        "settlementDate": "2026-06-29",
        "settlementPeriod": 43,
        "initialDemandOutturn": 26805,
        "initialTransmissionSystemDemandOutturn": 30851,
    }
]


def test_parse_demand():
    records = parse_demand(SAMPLE)
    assert len(records) == 1

    row = records[0]
    assert row.settlement_period == 43
    assert row.indo_mw == 26805
    assert row.itsdo_mw == 30851
    assert row.measured_at == dt.datetime(2026, 6, 29, 20, 0, tzinfo=dt.UTC)


def test_load_demand_is_idempotent_and_revisable(client):
    migrate(client)

    load_demand(client, parse_demand(SAMPLE), ingest_version=1)
    revised = parse_demand([{**SAMPLE[0], "initialDemandOutturn": 27000}])
    load_demand(client, revised, ingest_version=2)

    total = client.query("SELECT count() FROM raw.demand FINAL").result_rows[0][0]
    assert total == 1

    indo = client.query("SELECT indo_mw FROM raw.demand FINAL").result_rows
    assert indo == [(27000,)]
