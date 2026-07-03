"""Backend test fixtures.

`ch_client` seeds minimal mart tables in ClickHouse so the API's real SQL is exercised.
Skipped locally when ClickHouse is unreachable; required (hard-fail) in CI.
"""

from __future__ import annotations

import datetime as dt
import os
from collections.abc import Iterator

import pytest
from clickhouse_connect.driver.client import Client

from shared.clickhouse import get_client

# Set before app import — settings + the CORS middleware are read at import time. Lets the
# CORS test assert the header; harmless elsewhere (only affects requests with an Origin header).
os.environ.setdefault("RP_BACKEND_CORS_ORIGINS", "https://tianguiswatt.com")

_MART_TABLES = (
    "mart_generation_by_fuel",
    "mart_supply_demand",
    "mart_carbon",
    "mart_prices",
    "mart_bid_stack",
)


def _seed(ch: Client) -> None:
    ch.command(
        "CREATE TABLE mart_generation_by_fuel "
        "(measured_at DateTime, fuel_type String, generation_mw Float64, "
        "share_pct Nullable(Float64)) ENGINE = MergeTree ORDER BY (measured_at, fuel_type)"
    )
    ch.command(
        "CREATE TABLE mart_supply_demand "
        "(settlement_date Date, settlement_period UInt8, demand_mw Int32, "
        "transmission_demand_mw Int32, total_generation_mw Nullable(Float64)) "
        "ENGINE = MergeTree ORDER BY (settlement_date, settlement_period)"
    )
    ch.command(
        "CREATE TABLE mart_carbon "
        "(from_ts DateTime, forecast_gco2 Nullable(Int32), actual_gco2 Nullable(Int32), "
        "intensity_gco2 Nullable(Int32), intensity_index String) "
        "ENGINE = MergeTree ORDER BY from_ts"
    )
    ch.command(
        "CREATE TABLE mart_prices "
        "(settlement_date Date, settlement_period UInt8, measured_at DateTime, "
        "system_sell_price Float64, system_buy_price Float64, net_imbalance_volume Float64, "
        "price_derivation_code String, apx_price Nullable(Float64), "
        "apx_volume Nullable(Float64), n2ex_price Nullable(Float64), "
        "n2ex_volume Nullable(Float64)) "
        "ENGINE = MergeTree ORDER BY (settlement_date, settlement_period)"
    )
    instant = dt.datetime(2026, 6, 30, 20, 0)
    older = dt.datetime(2026, 6, 30, 14, 0)  # 6h earlier — for window tests
    ch.insert(
        "mart_generation_by_fuel",
        [
            [instant, "CCGT", 16228.0, 57.35],
            [instant, "WIND", 2060.0, 7.28],
            [older, "CCGT", 10000.0, 50.0],
        ],
        column_names=["measured_at", "fuel_type", "generation_mw", "share_pct"],
    )
    ch.insert(
        "mart_supply_demand",
        [[dt.date(2026, 6, 30), 42, 27367, 28000, 28297.0]],
        column_names=[
            "settlement_date",
            "settlement_period",
            "demand_mw",
            "transmission_demand_mw",
            "total_generation_mw",
        ],
    )
    ch.insert(
        "mart_carbon",
        [[dt.datetime(2026, 6, 30, 19, 0), 230, 225, 225, "high"]],
        column_names=[
            "from_ts",
            "forecast_gco2",
            "actual_gco2",
            "intensity_gco2",
            "intensity_index",
        ],
    )
    ch.insert(
        "mart_prices",
        [
            # SP 42 → period_start 20:30 (latest); SP 30 → 14:30 (6h earlier, for windows)
            [
                dt.date(2026, 6, 30),
                42,
                instant,
                95.0,
                95.0,
                -16.0,
                "N",
                101.14,
                3300.0,
                0.0,
                0.0,
            ],
            [
                dt.date(2026, 6, 30),
                30,
                older,
                60.0,
                60.0,
                5.0,
                "N",
                62.0,
                2000.0,
                0.0,
                0.0,
            ],
        ],
        column_names=[
            "settlement_date",
            "settlement_period",
            "measured_at",
            "system_sell_price",
            "system_buy_price",
            "net_imbalance_volume",
            "price_derivation_code",
            "apx_price",
            "apx_volume",
            "n2ex_price",
            "n2ex_volume",
        ],
    )
    ch.command(
        "CREATE TABLE mart_bid_stack "
        "(settlement_date Date, settlement_period UInt8, national_grid_bm_unit String, "
        "bm_unit Nullable(String), pair_id Int16, bid Float64, offer Float64, "
        "level_from Int32, level_to Int32, is_offer Bool, accepted Bool) "
        "ENGINE = MergeTree ORDER BY (settlement_date, settlement_period)"
    )
    d = dt.date(2026, 6, 30)
    ch.insert(
        "mart_bid_stack",
        [
            # latest period 42: AAA (cheap, accepted, 10 MW band), BBB (dearer, 20 MW band)
            [d, 42, "AAA-1", "T_AAA-1", 1, 40.0, 60.0, 0, 0, True, True],
            [d, 42, "AAA-1", "T_AAA-1", 2, 60.0, 80.0, 10, 10, True, True],
            [
                d,
                42,
                "AAA-1",
                "T_AAA-1",
                -1,
                30.0,
                50.0,
                -5,
                -5,
                False,
                True,
            ],  # a bid: excluded
            [d, 42, "BBB-1", "T_BBB-1", 1, 90.0, 100.0, 0, 0, True, False],
            [d, 42, "BBB-1", "T_BBB-1", 2, 110.0, 120.0, 20, 20, True, False],
            [
                d,
                30,
                "AAA-1",
                "T_AAA-1",
                1,
                40.0,
                55.0,
                0,
                8,
                True,
                False,
            ],  # older period
        ],
        column_names=[
            "settlement_date",
            "settlement_period",
            "national_grid_bm_unit",
            "bm_unit",
            "pair_id",
            "bid",
            "offer",
            "level_from",
            "level_to",
            "is_offer",
            "accepted",
        ],
    )


@pytest.fixture
def ch_client() -> Iterator[Client]:
    try:
        ch = get_client()
        ch.command("SELECT 1")
    except Exception as exc:
        if os.getenv("CI"):
            raise
        pytest.skip(f"ClickHouse not available: {exc}")

    for table in _MART_TABLES:
        ch.command(f"DROP TABLE IF EXISTS {table}")
    _seed(ch)
    yield ch
    for table in _MART_TABLES:
        ch.command(f"DROP TABLE IF EXISTS {table}")


@pytest.fixture
def empty_ch() -> Iterator[Client]:
    """A client where the marts do NOT exist (fresh-deploy / warming-up state)."""
    try:
        ch = get_client()
        ch.command("SELECT 1")
    except Exception as exc:
        if os.getenv("CI"):
            raise
        pytest.skip(f"ClickHouse not available: {exc}")

    for table in _MART_TABLES:
        ch.command(f"DROP TABLE IF EXISTS {table}")
    yield ch
