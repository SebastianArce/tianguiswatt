"""Tests for GB system-frequency ingestion.

`test_parse_*` are pure unit tests; the load test needs ClickHouse (conftest fixture).
"""

from __future__ import annotations

from shared.migrations.runner import migrate
from orchestrator.assets import load_frequency
from orchestrator.elexon import parse_frequency

FREQ: list[dict] = [
    {"measurementTime": "2026-07-03T17:35:30Z", "frequency": 50.01},
    {"measurementTime": "2026-07-03T17:35:45Z", "frequency": 49.9},
]


def test_parse_frequency():
    records = parse_frequency(FREQ)
    assert len(records) == 2
    assert records[1].frequency_hz == 49.9


def test_load_frequency_is_idempotent(client):
    migrate(client)
    load_frequency(client, parse_frequency(FREQ), ingest_version=1)
    # a revised reading at the same time supersedes by version
    load_frequency(
        client, parse_frequency([{**FREQ[1], "frequency": 50.02}]), ingest_version=2
    )
    total = client.query("SELECT count() FROM raw.system_frequency FINAL").result_rows[
        0
    ][0]
    assert total == 2
    latest = client.query(
        "SELECT frequency_hz FROM raw.system_frequency FINAL ORDER BY measured_at DESC LIMIT 1"
    ).result_rows
    assert latest == [(50.02,)]
