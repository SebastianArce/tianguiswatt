"""Backfill PV_Live solar-outturn history to match the tariff backfill window.

The scheduled asset only fetches a rolling two-day window, so history starts whenever
the pipeline first ran; the solar mode needs a capacity factor for the whole tariff
backtest window. Idempotent one-off: pages through 30-day windows from BACKFILL_START
and loads under one ingest version (ReplacingMergeTree dedupes overlaps). Run on the
host while the compose stack is up, after migrations:

    uv run --all-packages python scripts/backfill_solar.py
"""

from __future__ import annotations

import datetime as dt

from shared.clickhouse import get_client
from orchestrator.assets import _ingest_version, load_solar_generation
from orchestrator.pvlive import fetch_solar_generation, parse_solar_generation

# Matches the tariff and carbon backfill windows.
BACKFILL_START = dt.datetime(2025, 7, 1, tzinfo=dt.UTC)

_WINDOW = dt.timedelta(days=30)
_FMT = "%Y-%m-%dT%H:%M:%S"


def main() -> None:
    now = dt.datetime.now(tz=dt.UTC)
    ingest_version = _ingest_version()
    client = get_client()
    total = 0
    try:
        window_start = BACKFILL_START
        while window_start < now:
            window_end = min(window_start + _WINDOW, now)
            records = parse_solar_generation(
                fetch_solar_generation(
                    window_start.strftime(_FMT), window_end.strftime(_FMT)
                )
            )
            total += load_solar_generation(client, records, ingest_version)
            window_start = window_end
    finally:
        client.close()
    print(f"solar generation: {total} half-hours loaded from {BACKFILL_START:%Y-%m-%d}")


if __name__ == "__main__":
    main()
