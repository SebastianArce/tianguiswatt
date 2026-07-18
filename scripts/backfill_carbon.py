"""Backfill carbon-intensity history to match the tariff backfill window.

The scheduled asset only ever fetches today, so history starts whenever the pipeline
first ran; the green charging strategy needs carbon for the whole tariff backtest
window. Idempotent one-off: pages through 14-day windows from BACKFILL_START and loads
under one ingest version (ReplacingMergeTree dedupes overlaps). Run on the host while
the compose stack is up, after migrations:

    uv run --all-packages python scripts/backfill_carbon.py
"""

from __future__ import annotations

import datetime as dt

from shared.clickhouse import get_client
from orchestrator.assets import _ingest_version, load_carbon_intensity
from orchestrator.carbon import (
    MAX_RANGE_DAYS,
    fetch_carbon_intensity_range,
    parse_carbon_intensity,
)

# Matches the tariff backfill window (scripts/backfill_tariff_rates.py).
BACKFILL_START = dt.datetime(2025, 7, 1, tzinfo=dt.UTC)

_FMT = "%Y-%m-%dT%H:%MZ"


def main() -> None:
    now = dt.datetime.now(tz=dt.UTC)
    ingest_version = _ingest_version()
    client = get_client()
    total = 0
    try:
        window_start = BACKFILL_START
        while window_start < now:
            window_end = min(window_start + dt.timedelta(days=MAX_RANGE_DAYS), now)
            records = parse_carbon_intensity(
                fetch_carbon_intensity_range(
                    window_start.strftime(_FMT), window_end.strftime(_FMT)
                )
            )
            total += load_carbon_intensity(client, records, ingest_version)
            window_start = window_end
    finally:
        client.close()
    print(f"carbon intensity: {total} half-hours loaded from {BACKFILL_START:%Y-%m-%d}")


if __name__ == "__main__":
    main()
