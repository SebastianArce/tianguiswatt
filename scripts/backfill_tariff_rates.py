"""Backfill Octopus Agile tariff rates so the battery simulator can backtest a year.

Idempotent one-off: fetches both Agile tariffs from BACKFILL_START and loads them under
one ingest version (ReplacingMergeTree dedupes overlap with scheduled ingestion). Run on
the host while the compose stack is up, after migrations:

    uv run --all-packages python scripts/backfill_tariff_rates.py
"""

from __future__ import annotations

import datetime as dt

from shared.clickhouse import get_client
from orchestrator.assets import _ingest_version, load_tariff_rates
from orchestrator.octopus import (
    EXPORT_PRODUCT,
    IMPORT_PRODUCT,
    fetch_tariff_rates,
    parse_tariff_rates,
    tariff_code,
)

# A full year plus headroom; well inside both products' lifetimes.
BACKFILL_START = "2025-07-01T00:00:00Z"


def main() -> None:
    period_to = (dt.datetime.now(tz=dt.UTC) + dt.timedelta(days=2)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    ingest_version = _ingest_version()
    client = get_client()
    try:
        for product in (IMPORT_PRODUCT, EXPORT_PRODUCT):
            records = parse_tariff_rates(
                fetch_tariff_rates(product, BACKFILL_START, period_to),
                tariff_code(product),
            )
            rows = load_tariff_rates(client, records, ingest_version)
            print(f"{tariff_code(product)}: {rows} rates loaded")
    finally:
        client.close()


if __name__ == "__main__":
    main()
