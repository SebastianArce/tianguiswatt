"""Backfill wholesale price history (system price + Market Index Price).

The scheduled assets only fetch the current day, so wholesale history starts whenever
the pipeline first ran; the narrative page's wholesale-vs-retail wedge needs monthly
averages across the whole tariff window. Idempotent one-off: loops day by day from
BACKFILL_START under one ingest version (ReplacingMergeTree dedupes overlaps). Run on
the host while the compose stack is up, after migrations:

    uv run --all-packages python scripts/backfill_prices.py
"""

from __future__ import annotations

import datetime as dt

from shared.clickhouse import get_client
from orchestrator.assets import (
    _ingest_version,
    load_market_index_price,
    load_system_prices,
)
from orchestrator.elexon import (
    fetch_market_index_price,
    fetch_system_prices,
    parse_market_index_price,
    parse_system_prices,
)

# Matches the tariff/carbon/solar backfill windows.
BACKFILL_START = dt.date(2025, 7, 1)

_FMT = "%Y-%m-%dT%H:%M:%SZ"


def main() -> None:
    today = dt.datetime.now(tz=dt.UTC).date()
    ingest_version = _ingest_version()
    client = get_client()
    system_total = mid_total = 0
    try:
        day = BACKFILL_START
        while day <= today:
            system_total += load_system_prices(
                client,
                parse_system_prices(fetch_system_prices(day.isoformat())),
                ingest_version,
            )
            day_start = dt.datetime.combine(day, dt.time(), tzinfo=dt.UTC)
            mid_total += load_market_index_price(
                client,
                parse_market_index_price(
                    fetch_market_index_price(
                        day_start.strftime(_FMT),
                        (day_start + dt.timedelta(days=1)).strftime(_FMT),
                    )
                ),
                ingest_version,
            )
            day += dt.timedelta(days=1)
    finally:
        client.close()
    print(
        f"wholesale prices: {system_total} system rows, {mid_total} MID rows "
        f"loaded from {BACKFILL_START:%Y-%m-%d}"
    )


if __name__ == "__main__":
    main()
