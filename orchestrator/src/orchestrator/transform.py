"""Dagster asset that runs dbt to build staging + marts from raw."""

import os
import subprocess
from pathlib import Path

from dagster import AssetExecutionContext, MaterializeResult, asset

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
    tariff_rates,
)


def _dbt_project_dir() -> Path:
    override = os.environ.get("DBT_PROJECT_DIR")
    if override:
        return Path(override)
    # repo/transform, relative to this file (repo/orchestrator/src/orchestrator/transform.py)
    return Path(__file__).resolve().parents[3] / "transform"


@asset(
    # every raw source dbt reads — so marts build after the whole cycle's fresh data lands
    deps=[
        generation_fuelinst,
        demand,
        carbon_intensity_national,
        system_price,
        market_index_price,
        bid_offer,
        bid_offer_acceptance,
        system_frequency,
        bmu_registry,
        tariff_rates,
    ],
    description="dbt staging + marts, built from raw.* (runs `dbt build`).",
)
def marts(context: AssetExecutionContext) -> MaterializeResult:
    project = _dbt_project_dir()
    result = subprocess.run(
        ["dbt", "build", "--project-dir", str(project), "--profiles-dir", str(project)],
        capture_output=True,
        text=True,
        check=False,
    )
    context.log.info(result.stdout[-2000:])
    if result.returncode != 0:
        context.log.error(result.stderr[-2000:])
        raise RuntimeError("dbt build failed")
    return MaterializeResult(metadata={"dbt": "built"})
