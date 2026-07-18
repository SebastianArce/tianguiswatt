"""Dagster ingestion assets: land Elexon data into ClickHouse raw.*."""

# NOTE: no `from __future__ import annotations` — Dagster introspects the `context`
# parameter's annotation at runtime, and PEP 563 string annotations break that check.

import datetime as dt

from clickhouse_connect.driver.client import Client
from dagster import AssetExecutionContext, MaterializeResult, asset

from shared.clickhouse import get_client
from shared.models import (
    BidOfferAcceptanceRecord,
    BidOfferRecord,
    BmuRegistryRecord,
    CarbonIntensityRecord,
    DemandRecord,
    FrequencyRecord,
    FuelInstRecord,
    MarketIndexPriceRecord,
    SystemPriceRecord,
    TariffRateRecord,
)
from orchestrator.carbon import fetch_carbon_intensity, parse_carbon_intensity
from orchestrator.octopus import (
    EXPORT_PRODUCT,
    IMPORT_PRODUCT,
    fetch_tariff_rates,
    parse_tariff_rates,
    tariff_code,
)
from orchestrator.elexon import (
    fetch_bid_offer,
    fetch_bid_offer_acceptances,
    fetch_bmu_registry,
    fetch_demand,
    fetch_frequency,
    fetch_fuelinst,
    fetch_market_index_price,
    fetch_system_prices,
    parse_bid_offer,
    parse_bid_offer_acceptances,
    parse_bmu_registry,
    parse_demand,
    parse_frequency,
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

TARIFF_RATE_TABLE = "raw.tariff_rate"
TARIFF_RATE_COLUMNS = [
    "tariff_code",
    "valid_from",
    "valid_to",
    "value_exc_vat",
    "value_inc_vat",
    "ingest_version",
]

BID_OFFER_TABLE = "raw.bid_offer"
BID_OFFER_COLUMNS = [
    "settlement_date",
    "settlement_period",
    "bm_unit",
    "pair_id",
    "time_from",
    "time_to",
    "level_from",
    "level_to",
    "bid",
    "offer",
    "national_grid_bm_unit",
    "ingest_version",
]

BOALF_TABLE = "raw.bid_offer_acceptance"
BOALF_COLUMNS = [
    "settlement_date",
    "settlement_period_from",
    "settlement_period_to",
    "bm_unit",
    "acceptance_number",
    "acceptance_time",
    "time_from",
    "time_to",
    "level_from",
    "level_to",
    "so_flag",
    "stor_flag",
    "national_grid_bm_unit",
    "ingest_version",
]


FREQUENCY_TABLE = "raw.system_frequency"
FREQUENCY_COLUMNS = ["measured_at", "frequency_hz", "ingest_version"]

BMU_REGISTRY_TABLE = "raw.bmu_registry"
BMU_REGISTRY_COLUMNS = [
    "elexon_bm_unit",
    "national_grid_bm_unit",
    "bm_unit_name",
    "fuel_type",
    "lead_party_name",
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


def load_tariff_rates(
    client: Client, records: list[TariffRateRecord], ingest_version: int
) -> int:
    """Insert tariff-rate records tagged with an ingest version."""
    rows = [
        [
            r.tariff_code,
            r.valid_from,
            r.valid_to,
            r.value_exc_vat,
            r.value_inc_vat,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(TARIFF_RATE_TABLE, rows, column_names=TARIFF_RATE_COLUMNS)
    return len(rows)


def load_bid_offer(
    client: Client, records: list[BidOfferRecord], ingest_version: int
) -> int:
    """Insert bid-offer records tagged with an ingest version."""
    rows = [
        [
            r.settlement_date,
            r.settlement_period,
            r.bm_unit,
            r.pair_id,
            r.time_from,
            r.time_to,
            r.level_from,
            r.level_to,
            r.bid,
            r.offer,
            r.national_grid_bm_unit,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(BID_OFFER_TABLE, rows, column_names=BID_OFFER_COLUMNS)
    return len(rows)


def load_bid_offer_acceptances(
    client: Client, records: list[BidOfferAcceptanceRecord], ingest_version: int
) -> int:
    """Insert bid-offer acceptance records tagged with an ingest version."""
    rows = [
        [
            r.settlement_date,
            r.settlement_period_from,
            r.settlement_period_to,
            r.bm_unit,
            r.acceptance_number,
            r.acceptance_time,
            r.time_from,
            r.time_to,
            r.level_from,
            r.level_to,
            r.so_flag,
            r.stor_flag,
            r.national_grid_bm_unit,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(BOALF_TABLE, rows, column_names=BOALF_COLUMNS)
    return len(rows)


def load_frequency(
    client: Client, records: list[FrequencyRecord], ingest_version: int
) -> int:
    """Insert system-frequency readings tagged with an ingest version."""
    rows = [[r.measured_at, r.frequency_hz, ingest_version] for r in records]
    client.insert(FREQUENCY_TABLE, rows, column_names=FREQUENCY_COLUMNS)
    return len(rows)


def load_bmu_registry(
    client: Client, records: list[BmuRegistryRecord], ingest_version: int
) -> int:
    """Insert BMU registry records tagged with an ingest version."""
    rows = [
        [
            r.elexon_bm_unit or "",
            r.national_grid_bm_unit or "",
            r.bm_unit_name,
            r.fuel_type,
            r.lead_party_name,
            ingest_version,
        ]
        for r in records
    ]
    client.insert(BMU_REGISTRY_TABLE, rows, column_names=BMU_REGISTRY_COLUMNS)
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


@asset(
    description="Octopus Agile import/export half-hourly tariff rates (Octopus API)."
)
def tariff_rates(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch yesterday→tomorrow rates for both Agile tariffs and load into raw."""
    now = dt.datetime.now(tz=dt.UTC)
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    period_from = (now - dt.timedelta(days=1)).strftime(fmt)
    # Tomorrow's 48 rates appear ~16:00 today; the +2d bound picks them up as published.
    period_to = (now + dt.timedelta(days=2)).strftime(fmt)
    records = [
        record
        for product in (IMPORT_PRODUCT, EXPORT_PRODUCT)
        for record in parse_tariff_rates(
            fetch_tariff_rates(product, period_from, period_to), tariff_code(product)
        )
    ]
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_tariff_rates(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(
        f"Ingested {rows} tariff-rate rows (ingest_version={ingest_version})"
    )
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


# BOD is high-volume (~8k rows per settlement period) and the API caps the query range at
# 1 hour, so we ingest a recent rolling window (current + previous SP); ReplacingMergeTree
# dedupes the overlap by ingest_version.
_BM_WINDOW = dt.timedelta(minutes=55)


@asset(description="Balancing Mechanism bid-offer pairs, recent window (Elexon BOD).")
def bid_offer(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch the last few hours of BOD, validate, and load into ClickHouse raw."""
    now = dt.datetime.now(tz=dt.UTC)
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    records = parse_bid_offer(
        fetch_bid_offer((now - _BM_WINDOW).strftime(fmt), now.strftime(fmt))
    )
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_bid_offer(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} BOD rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


@asset(
    description="Accepted Balancing Mechanism actions, recent window (Elexon BOALF)."
)
def bid_offer_acceptance(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch the last few hours of BOALF, validate, and load into ClickHouse raw."""
    now = dt.datetime.now(tz=dt.UTC)
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    records = parse_bid_offer_acceptances(
        fetch_bid_offer_acceptances((now - _BM_WINDOW).strftime(fmt), now.strftime(fmt))
    )
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_bid_offer_acceptances(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(f"Ingested {rows} BOALF rows (ingest_version={ingest_version})")
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


@asset(description="GB system frequency, recent window (Elexon).")
def system_frequency(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch the last 30 minutes of frequency readings and load into ClickHouse raw."""
    now = dt.datetime.now(tz=dt.UTC)
    start = now - dt.timedelta(minutes=30)
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    records = parse_frequency(fetch_frequency(start.strftime(fmt), now.strftime(fmt)))
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_frequency(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(
        f"Ingested {rows} frequency rows (ingest_version={ingest_version})"
    )
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})


@asset(description="Balancing Mechanism Unit reference registry (Elexon).")
def bmu_registry(context: AssetExecutionContext) -> MaterializeResult:
    """Fetch the full BMU registry (unit → name/fuel/party) and load into ClickHouse raw."""
    records = parse_bmu_registry(fetch_bmu_registry())
    ingest_version = _ingest_version()
    client = get_client()
    try:
        rows = load_bmu_registry(client, records, ingest_version)
    finally:
        client.close()
    context.log.info(
        f"Ingested {rows} BMU registry rows (ingest_version={ingest_version})"
    )
    return MaterializeResult(metadata={"rows": rows, "ingest_version": ingest_version})
