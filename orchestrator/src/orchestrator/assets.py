"""Dagster asset: ingest Elexon FUELINST into raw.generation_fuelinst."""

# NOTE: no `from __future__ import annotations` — Dagster introspects the `context`
# parameter's annotation at runtime, and PEP 563 string annotations break that check.

import datetime as dt

from clickhouse_connect.driver.client import Client
from dagster import AssetExecutionContext, MaterializeResult, asset

from shared.clickhouse import get_client
from shared.models import FuelInstRecord
from orchestrator.elexon import fetch_fuelinst, parse_fuelinst

RAW_TABLE = "raw.generation_fuelinst"
COLUMNS = [
    "settlement_date",
    "settlement_period",
    "measured_at",
    "fuel_type",
    "generation_mw",
    "ingest_version",
]


def load_fuelinst(
    client: Client, records: list[FuelInstRecord], ingest_version: int
) -> int:
    """Insert records into the raw table tagged with an ingest version.

    Re-ingesting the same settlement periods with a higher ingest_version supersedes
    earlier rows on merge (ReplacingMergeTree), so re-runs are idempotent.
    """
    rows = [
        [
            r.settlement_date,
            r.settlement_period,
            r.measured_at,
            r.fuel_type,
            r.generation_mw,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(RAW_TABLE, rows, column_names=COLUMNS)
    return len(rows)


@asset(description="Instantaneous GB generation by fuel type (Elexon FUELINST).")
def generation_fuelinst(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch FUELINST, validate, and load into ClickHouse raw."""
    records = parse_fuelinst(fetch_fuelinst())
    ingest_version = int(dt.datetime.now(tz=dt.UTC).timestamp())
    client = get_client()
    try:
        rows = load_fuelinst(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} FUELINST rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})
