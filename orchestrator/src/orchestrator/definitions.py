"""Dagster code location for TianguisWatt."""

from dagster import Definitions

from orchestrator.assets import (
    carbon_intensity_national,
    demand,
    generation_fuelinst,
)
from orchestrator.schedules import pipeline_schedule
from orchestrator.transform import marts

defs = Definitions(
    assets=[generation_fuelinst, demand, carbon_intensity_national, marts],
    schedules=[pipeline_schedule],
)
