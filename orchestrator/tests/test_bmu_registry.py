"""Tests for BMU registry ingestion.

`test_parse_*` are pure unit tests; the load test needs ClickHouse (conftest fixture).
"""

from __future__ import annotations

from shared.migrations.runner import migrate
from orchestrator.assets import load_bmu_registry
from orchestrator.elexon import parse_bmu_registry

REGISTRY: list[dict] = [
    {
        "nationalGridBmUnit": "PEMB-11",
        "elexonBmUnit": "T_PEMB-11",
        "fuelType": "CCGT",
        "bmUnitName": "Pembroke Unit 11",
        "leadPartyName": "RWE Generation UK plc",
    },
    {
        "nationalGridBmUnit": "ACHYW-1",  # ~90 units have a NG id but no Elexon id
        "elexonBmUnit": None,
        "fuelType": "WIND",
        "bmUnitName": None,
        "leadPartyName": None,
    },
]


def test_parse_bmu_registry():
    records = parse_bmu_registry(REGISTRY)
    assert records[0].national_grid_bm_unit == "PEMB-11"
    assert records[0].bm_unit_name == "Pembroke Unit 11"
    assert records[1].elexon_bm_unit is None  # nulls tolerated (coalesced at load)
    assert records[1].national_grid_bm_unit == "ACHYW-1"


def test_load_bmu_registry_is_idempotent(client):
    migrate(client)
    load_bmu_registry(client, parse_bmu_registry(REGISTRY), ingest_version=1)
    load_bmu_registry(client, parse_bmu_registry(REGISTRY), ingest_version=2)
    total = client.query("SELECT count() FROM raw.bmu_registry FINAL").result_rows[0][0]
    assert total == 2
    name = client.query(
        "SELECT bm_unit_name FROM raw.bmu_registry FINAL WHERE elexon_bm_unit = 'T_PEMB-11'"
    ).result_rows
    assert name == [("Pembroke Unit 11",)]
