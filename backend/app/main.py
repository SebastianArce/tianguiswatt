"""RenewablePulse API — application entrypoint."""

from fastapi import FastAPI

from app.api import health, snapshot
from app.core.config import settings

app = FastAPI(title=settings.app_name)

app.include_router(health.router, prefix="/api")
app.include_router(snapshot.router, prefix="/api")
