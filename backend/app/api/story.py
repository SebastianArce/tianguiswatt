"""Narrative front-page aggregates — the wedge and peak-flexibility stats."""

from typing import Annotated

from clickhouse_connect.driver.client import Client
from fastapi import APIRouter, Depends

from app.core.clickhouse import get_clickhouse
from app.queries.story import fetch_story
from app.schemas import Story

router = APIRouter()

CH = Annotated[Client, Depends(get_clickhouse)]


@router.get("/story", response_model=Story)
def story(client: CH) -> Story:
    return fetch_story(client)
