#!/usr/bin/env bash
# Populate the local ClickHouse with data for the dashboard: run migrations, ingest all
# domains, and build the dbt marts. Run on the host while the compose stack is up
# (ClickHouse is exposed on localhost:8123).
set -euo pipefail
cd "$(dirname "$0")/.."

uv run --all-packages python -c "from shared.migrations.runner import migrate; print('migrated:', migrate())"
uv run --all-packages dagster asset materialize --select '*' -m orchestrator.definitions
uv run --all-packages python scripts/backfill_tariff_rates.py
uv run dbt build --project-dir transform --profiles-dir transform
echo "Seed complete — open the dashboard at http://localhost:5173"
