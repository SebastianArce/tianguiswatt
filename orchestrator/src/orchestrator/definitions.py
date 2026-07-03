"""Dagster code location for TianguisWatt."""

from dagster import Definitions

from orchestrator.assets import (
    carbon_intensity_national,
    demand,
    generation_fuelinst,
    market_index_price,
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
        marts,
    ],
    schedules=[pipeline_schedule],
)
