"""Dagster code location for TianguisWatt."""

from dagster import Definitions

from orchestrator.assets import (
    bid_offer,
    bid_offer_acceptance,
    bmu_registry,
    carbon_intensity_national,
    demand,
    generation_fuelinst,
    market_index_price,
    system_frequency,
    system_price,
)
from orchestrator.schedules import pipeline_schedule
from orchestrator.transform import marts

defs = Definitions(
    assets=[
        generation_fuelinst,
        demand,
        carbon_intensity_national,
        system_price,
        market_index_price,
        bid_offer,
        bid_offer_acceptance,
        system_frequency,
        bmu_registry,
        marts,
    ],
    schedules=[pipeline_schedule],
)
