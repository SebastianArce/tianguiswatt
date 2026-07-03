"""Pydantic models for GB electricity-market data.

Per-source models normalize the differing API envelopes (Elexon Insights,
Carbon Intensity) into typed records shared by the orchestrator (writes) and the
backend (reads).
"""

from __future__ import annotations

import datetime as dt

from pydantic import AliasPath, BaseModel, ConfigDict, Field


class FuelInstRecord(BaseModel):
    """One Elexon FUELINST row: instantaneous generation (MW) for a fuel type in a
    settlement period. Field aliases map the raw API keys to our column names."""

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod")
    measured_at: dt.datetime = Field(alias="startTime")
    fuel_type: str = Field(alias="fuelType")
    generation_mw: float = Field(alias="generation")


class DemandRecord(BaseModel):
    """One Elexon demand-outturn reading for a settlement period: INDO (national) and
    ITSDO (transmission-system) demand in MW."""

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod")
    measured_at: dt.datetime = Field(alias="startTime")
    indo_mw: int = Field(alias="initialDemandOutturn")
    itsdo_mw: int = Field(alias="initialTransmissionSystemDemandOutturn")


class CarbonIntensityRecord(BaseModel):
    """One national carbon-intensity half-hour from the NESO Carbon Intensity API.

    The API nests forecast/actual/index under an `intensity` object; AliasPath flattens
    them. forecast/actual can be null (e.g. future half-hours have no actual yet).
    """

    model_config = ConfigDict(populate_by_name=True)

    from_ts: dt.datetime = Field(alias="from")
    to_ts: dt.datetime = Field(alias="to")
    forecast_gco2: int | None = Field(
        default=None, validation_alias=AliasPath("intensity", "forecast")
    )
    actual_gco2: int | None = Field(
        default=None, validation_alias=AliasPath("intensity", "actual")
    )
    intensity_index: str = Field(validation_alias=AliasPath("intensity", "index"))


class SystemPriceRecord(BaseModel):
    """One Elexon system (imbalance / cash-out) price for a settlement period.

    Since EBSCR (2015) GB uses a single imbalance price, so sell and buy are equal; we keep
    both for fidelity, plus the net imbalance volume and the price derivation code.
    """

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod")
    measured_at: dt.datetime = Field(alias="startTime")
    system_sell_price: float = Field(alias="systemSellPrice")
    system_buy_price: float = Field(alias="systemBuyPrice")
    net_imbalance_volume: float = Field(alias="netImbalanceVolume")
    price_derivation_code: str = Field(alias="priceDerivationCode")


class MarketIndexPriceRecord(BaseModel):
    """One Market Index Price reference row — a volume-weighted price per data provider
    (APX, N2EX) per settlement period, so the provider is part of the natural key."""

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod")
    measured_at: dt.datetime = Field(alias="startTime")
    data_provider: str = Field(alias="dataProvider")
    price: float
    volume: float


class BidOfferRecord(BaseModel):
    """One Balancing Mechanism bid-offer pair (Elexon BOD): a BM unit's submitted bid and
    offer prices (£/MWh) over a level (MW) range for a settlement period. `pairId` numbers
    the pairs (negative = bids, positive = offers)."""

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period: int = Field(alias="settlementPeriod")
    bm_unit: str = Field(alias="bmUnit")
    pair_id: int = Field(alias="pairId")
    time_from: dt.datetime = Field(alias="timeFrom")
    time_to: dt.datetime = Field(alias="timeTo")
    level_from: int = Field(alias="levelFrom")
    level_to: int = Field(alias="levelTo")
    bid: float
    offer: float
    national_grid_bm_unit: str = Field(alias="nationalGridBmUnit")


class BidOfferAcceptanceRecord(BaseModel):
    """One accepted Balancing Mechanism action (Elexon BOALF): NESO's acceptance of a
    unit's bid/offer, keyed by acceptance number. `so_flag` marks system (vs energy)
    actions; `stor_flag` marks Short-Term Operating Reserve."""

    model_config = ConfigDict(populate_by_name=True)

    settlement_date: dt.date = Field(alias="settlementDate")
    settlement_period_from: int = Field(alias="settlementPeriodFrom")
    settlement_period_to: int = Field(alias="settlementPeriodTo")
    bm_unit: str = Field(alias="bmUnit")
    acceptance_number: int = Field(alias="acceptanceNumber")
    acceptance_time: dt.datetime = Field(alias="acceptanceTime")
    time_from: dt.datetime = Field(alias="timeFrom")
    time_to: dt.datetime = Field(alias="timeTo")
    level_from: int = Field(alias="levelFrom")
    level_to: int = Field(alias="levelTo")
    so_flag: bool = Field(alias="soFlag")
    stor_flag: bool = Field(alias="storFlag")
    national_grid_bm_unit: str = Field(alias="nationalGridBmUnit")
