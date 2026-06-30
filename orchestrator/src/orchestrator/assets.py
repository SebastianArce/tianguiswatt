"""Dagster ingestion assets: land Elexon data into ClickHouse raw.*."""

# NOTE: no `from __future__ import annotations` — Dagster introspects the `context`
# parameter's annotation at runtime, and PEP 563 string annotations break that check.

import datetime as dt

from clickhouse_connect.driver.client import Client
from dagster import AssetExecutionContext, MaterializeResult, asset

from shared.clickhouse import get_client
from shared.models import DemandRecord, FuelInstRecord
from orchestrator.elexon import (
    fetch_demand,
    fetch_fuelinst,
    parse_demand,
    parse_fuelinst,
)

FUELINST_TABLE = "raw.generation_fuelinst"
FUELINST_COLUMNS = [
    "settlement_date",
    "settlement_period",
    "measured_at",
    "fuel_type",
    "generation_mw",
    "ingest_version",
]

DEMAND_TABLE = "raw.demand"
DEMAND_COLUMNS = [
    "settlement_date",
    "settlement_period",
    "measured_at",
    "indo_mw",
    "itsdo_mw",
    "ingest_version",
]


def _ingest_version() -> int:
    """Monotonic version stamp; a later run supersedes earlier rows on merge."""
    return int(dt.datetime.now(tz=dt.UTC).timestamp())


def load_fuelinst(
    client: Client, records: list[FuelInstRecord], ingest_version: int
) -> int:
    """Insert FUELINST records tagged with an ingest version (idempotent re-ingest)."""
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
    client.insert(FUELINST_TABLE, rows, column_names=FUELINST_COLUMNS)
    return len(rows)


def load_demand(
    client: Client, records: list[DemandRecord], ingest_version: int
) -> int:
    """Insert demand records tagged with an ingest version (idempotent re-ingest)."""
    rows = [
        [
            r.settlement_date,
            r.settlement_period,
            r.measured_at,
            r.indo_mw,
            r.itsdo_mw,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(DEMAND_TABLE, rows, column_names=DEMAND_COLUMNS)
    return len(rows)


@asset(description="Instantaneous GB generation by fuel type (Elexon FUELINST).")
def generation_fuelinst(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch FUELINST, validate, and load into ClickHouse raw."""
    records = parse_fuelinst(fetch_fuelinst())
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_fuelinst(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} FUELINST rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


@asset(description="GB demand outturn (INDO/ITSDO) per settlement period (Elexon).")
def demand(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch today's demand outturn, validate, and load into ClickHouse raw."""
    today = dt.datetime.now(tz=dt.UTC).date().isoformat()
    records = parse_demand(fetch_demand(today, today))
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_demand(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} demand rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})
