# Backend image (FastAPI). Multi-stage: build the venv with uv, then copy only the
# venv + source into a slim runtime with no build tools. Build context = repo root.

# --- builder ---
FROM python:3.12-slim-bookworm AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY backend ./backend
COPY packages ./packages
# orchestrator manifest only — needed to resolve the workspace, not installed here.
COPY orchestrator/pyproject.toml orchestrator/README.md ./orchestrator/

# Install ONLY the backend package's subtree (fastapi, shared, clickhouse-connect …),
# no Dagster, no dbt, no dev tools.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --package backend --no-dev

# --- runtime ---
FROM python:3.12-slim-bookworm AS runtime
WORKDIR /app
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/backend /app/backend
COPY --from=builder /app/packages /app/packages
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
