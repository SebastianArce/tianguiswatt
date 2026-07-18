# Orchestrator image (Dagster + dbt). Shared by the dagster-webserver and dagster-daemon
# services. Multi-stage; build context = repo root.

# --- builder ---
FROM python:3.12-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY orchestrator ./orchestrator
COPY packages ./packages
# backend manifest only — needed to resolve the workspace, not installed here.
COPY backend/pyproject.toml ./backend/

# Install the orchestrator subtree (Dagster, dbt-clickhouse, dagster-postgres, shared …).
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --package orchestrator --no-dev

# --- runtime ---
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    DAGSTER_HOME=/app/dagster_home \
    DBT_PROJECT_DIR=/app/transform
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/orchestrator /app/orchestrator
COPY --from=builder /app/packages /app/packages
COPY transform ./transform
# one-off operational scripts (backfills) runnable via `docker compose exec orchestrator`
COPY scripts ./scripts
COPY orchestrator/dagster.yaml /app/dagster_home/dagster.yaml
CMD ["dagster-webserver", "-h", "0.0.0.0", "-p", "3000", "-m", "orchestrator.definitions"]
