"""Dagster code location for RenewablePulse."""

from dagster import Definitions

from orchestrator.assets import generation_fuelinst

defs = Definitions(assets=[generation_fuelinst])
