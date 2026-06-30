"""Snapshot endpoint — latest values across all domains."""

from fastapi import APIRouter, Depends
from clickhouse_connect.driver.client import Client

from app.core.clickhouse import get_clickhouse
from app.queries.snapshot import fetch_snapshot
from app.schemas import Snapshot

router = APIRouter()


@router.get("/snapshot", response_model=Snapshot)
def snapshot(client: Client = Depends(get_clickhouse)) -> Snapshot:
    return fetch_snapshot(client)
