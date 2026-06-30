"""Pydantic models for GB electricity-market data.

Per-source models normalize the differing API envelopes (Elexon Insights,
Carbon Intensity) into typed records shared by the orchestrator (writes) and the
backend (reads).
"""

from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field


class FuelInstRecord(BaseModel):
    """One Elexon FUELINST row: instantaneous generation (MW) for a fuel type in a
    settlement period. Field aliases map the raw API keys to our column names."""

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod")
    measured_at: dt.datetime = Field(alias="startTime")
    fuel_type: str = Field(alias="fuelType")
    generation_mw: float = Field(alias="generation")
