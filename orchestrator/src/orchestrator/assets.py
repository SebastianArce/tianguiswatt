"""Dagster ingestion assets: land Elexon data into ClickHouse raw.*."""

# NOTE: no `from __future__ import annotations` — Dagster introspects the `context`
# parameter's annotation at runtime, and PEP 563 string annotations break that check.

import datetime as dt

from clickhouse_connect.driver.client import Client
from dagster import AssetExecutionContext, MaterializeResult, asset

from shared.clickhouse import get_client
from shared.models import (
    CarbonIntensityRecord,
    DemandRecord,
    FuelInstRecord,
    MarketIndexPriceRecord,
    SystemPriceRecord,
)
from orchestrator.carbon import fetch_carbon_intensity, parse_carbon_intensity
from orchestrator.elexon import (
    fetch_demand,
    fetch_fuelinst,
    fetch_market_index_price,
    fetch_system_prices,
    parse_demand,
    parse_fuelinst,
    parse_market_index_price,
    parse_system_prices,
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

CARBON_TABLE = "raw.carbon_intensity_national"
CARBON_COLUMNS = [
    "from_ts",
    "to_ts",
    "forecast_gco2",
    "actual_gco2",
    "intensity_index",
    "ingest_version",
]

SYSTEM_PRICE_TABLE = "raw.system_price"
SYSTEM_PRICE_COLUMNS = [
    "settlement_date",
    "settlement_period",
    "measured_at",
    "system_sell_price",
    "system_buy_price",
    "net_imbalance_volume",
    "price_derivation_code",
    "ingest_version",
]

MID_TABLE = "raw.market_index_price"
MID_COLUMNS = [
    "settlement_date",
    "settlement_period",
    "measured_at",
    "data_provider",
    "price",
    "volume",
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


def load_carbon_intensity(
    client: Client, records: list[CarbonIntensityRecord], ingest_version: int
) -> int:
    """Insert carbon-intensity records tagged with an ingest version."""
    rows = [
        [
            r.from_ts,
            r.to_ts,
            r.forecast_gco2,
            r.actual_gco2,
            r.intensity_index,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(CARBON_TABLE, rows, column_names=CARBON_COLUMNS)
    return len(rows)


def load_system_prices(
    client: Client, records: list[SystemPriceRecord], ingest_version: int
) -> int:
    """Insert system-price records tagged with an ingest version."""
    rows = [
        [
            r.settlement_date,
            r.settlement_period,
            r.measured_at,
            r.system_sell_price,
            r.system_buy_price,
            r.net_imbalance_volume,
            r.price_derivation_code,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(SYSTEM_PRICE_TABLE, rows, column_names=SYSTEM_PRICE_COLUMNS)
    return len(rows)


def load_market_index_price(
    client: Client, records: list[MarketIndexPriceRecord], ingest_version: int
) -> int:
    """Insert Market Index Price records tagged with an ingest version."""
    rows = [
        [
            r.settlement_date,
            r.settlement_period,
            r.measured_at,
            r.data_provider,
            r.price,
            r.volume,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(MID_TABLE, rows, column_names=MID_COLUMNS)
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


@asset(
    description="National carbon intensity per half-hour (NESO Carbon Intensity API)."
)
def carbon_intensity_national(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch today's national carbon intensity, validate, and load into ClickHouse raw."""
    records = parse_carbon_intensity(fetch_carbon_intensity())
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_carbon_intensity(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} carbon rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


@asset(
    description="GB system (imbalance/cash-out) price per settlement period (Elexon)."
)
def system_price(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch today's system prices, validate, and load into ClickHouse raw."""
    today = dt.datetime.now(tz=dt.UTC).date().isoformat()
    records = parse_system_prices(fetch_system_prices(today))
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_system_prices(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(
        f"Ingested {rows} system-price rows (ingest_version={ingest_version})"
    )
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


@asset(
    description="Market Index Price (APX/N2EX reference) per settlement period (Elexon)."
)
def market_index_price(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch today's Market Index Price rows, validate, and load into ClickHouse raw."""
    now = dt.datetime.now(tz=dt.UTC)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    records = parse_market_index_price(
        fetch_market_index_price(start.strftime(fmt), now.strftime(fmt))
    )
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_market_index_price(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} MID rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})
