-- Latest registry row per Elexon BM unit, resolving ReplacingMergeTree without FINAL.
-- Deduplicated to one row per National Grid BMU id (the join key for accepted actions).
select
    national_grid_bm_unit,
    argMax(bm_unit_name, ingest_version) as bm_unit_name,
    argMax(fuel_type, ingest_version) as fuel_type,
    argMax(lead_party_name, ingest_version) as lead_party_name
from {{ source('raw', 'bmu_registry') }}
where national_grid_bm_unit != ''
group by national_grid_bm_unit
