"""TianguisWatt API — application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    accepted_actions,
    bid_stack,
    events,
    health,
    history,
    snapshot,
    timeseries,
)
from app.core.config import settings
from app.core.events import EventHub
from app.queries.util import query_rows
from shared.clickhouse import get_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = get_client()

    def fetch_latest() -> str | None:
        # query_rows degrades to [] when the marts don't exist yet (fresh deploy / warming
        # up), so the SSE poller stays quiet instead of raising an UNKNOWN_TABLE every cycle.
        rows = query_rows(
            client, "SELECT maxOrNull(measured_at) FROM mart_generation_by_fuel"
        )
        ts = rows[0][0] if rows else None
        return ts.isoformat() if ts is not None else None

    app.state.hub = EventHub(fetch_latest)
    try:
        yield
    finally:
        await app.state.hub.aclose()
        client.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Cross-origin access for the SPA when it's served from a different host (e.g. the API on
# api.<domain>). Off in dev, where the Vite proxy makes calls same-origin.
if settings.backend_cors_origins:
    app.add_middleware(
        CORSMiddleware,  # ty: ignore[invalid-argument-type]  (ParamSpec inference limitation)
        allow_origins=settings.backend_cors_origins,
        allow_methods=["GET"],  # the API is read-only
        allow_headers=["*"],
    )

app.include_router(health.router, prefix="/api")
app.include_router(snapshot.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(bid_stack.router, prefix="/api")
app.include_router(timeseries.router, prefix="/api")
app.include_router(accepted_actions.router, prefix="/api")
app.include_router(events.router, prefix="/api")
