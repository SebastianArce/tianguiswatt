# orchestrator

Dagster orchestration for RenewablePulse — ingestion assets that fetch GB
electricity-market data and land it in ClickHouse `raw.*`.

Run the Dagster UI locally:

```bash
uv run dagster dev -m orchestrator.definitions
```
