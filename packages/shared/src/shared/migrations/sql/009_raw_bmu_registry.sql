CREATE TABLE IF NOT EXISTS raw.bmu_registry
(
    elexon_bm_unit        LowCardinality(String),
    national_grid_bm_unit LowCardinality(String),
    bm_unit_name          Nullable(String),
    fuel_type             LowCardinality(Nullable(String)),
    lead_party_name       Nullable(String),
    ingested_at           DateTime DEFAULT now(),
    ingest_version        UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
-- Reference registry of Balancing Mechanism Units. Either id can be absent (stored as ''),
-- so the two together form the key.
ORDER BY (elexon_bm_unit, national_grid_bm_unit);
