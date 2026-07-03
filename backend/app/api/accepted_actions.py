"""Accepted-actions endpoint — recent Balancing Mechanism acceptances (BOALF)."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from clickhouse_connect.driver.client import Client

from app.core.clickhouse import get_clickhouse
from app.queries.accepted_actions import fetch_accepted_actions
from app.schemas import AcceptedAction

router = APIRouter()

CH = Annotated[Client, Depends(get_clickhouse)]
Limit = Annotated[int, Query(ge=1, le=50, description="Number of recent actions.")]


@router.get("/accepted-actions", response_model=list[AcceptedAction])
def accepted_actions(client: CH, limit: Limit = 8) -> list[AcceptedAction]:
    return fetch_accepted_actions(client, limit)
