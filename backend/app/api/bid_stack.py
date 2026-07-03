"""Bid-stack endpoint — the latest balancing-mechanism offer stack."""

from fastapi import APIRouter, Depends
from clickhouse_connect.driver.client import Client

from app.core.clickhouse import get_clickhouse
from app.queries.bid_stack import fetch_bid_stack
from app.schemas import BidStack

router = APIRouter()


@router.get("/bid-stack", response_model=BidStack)
def bid_stack(client: Client = Depends(get_clickhouse)) -> BidStack:
    return fetch_bid_stack(client)
