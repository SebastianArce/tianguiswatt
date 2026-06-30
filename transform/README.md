# transform

dbt project transforming ClickHouse `raw.*` landing tables into clean **staging** models
(and, later, marts). Staging resolves `ReplacingMergeTree` to the latest row per key via
`argMax(..., ingest_version)`, so the API never pays `FINAL`.

## Run

Connection is env-driven (`CLICKHOUSE_*`; defaults match the local compose stack). The
`raw.*` tables must exist first (run the migrations).

```bash
uv run dbt build --project-dir transform --profiles-dir transform
```

Models live in `models/staging/`; `_sources.yml` declares the `raw.*` sources.
