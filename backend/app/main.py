"""RenewablePulse API — application entrypoint."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import events, health, history, snapshot
from app.core.config import settings
from app.core.events import EventHub
from shared.clickhouse import get_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = get_client()

    def fetch_latest() -> str | None:
        rows = client.query(
            "SELECT maxOrNull(measured_at) FROM mart_generation_by_fuel"
        ).result_rows
        ts = rows[0][0] if rows else None
        return ts.isoformat() if ts is not None else None

    app.state.hub = EventHub(fetch_latest)
    try:
        yield
    finally:
        await app.state.hub.aclose()
        client.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.include_router(health.router, prefix="/api")
app.include_router(snapshot.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(events.router, prefix="/api")
