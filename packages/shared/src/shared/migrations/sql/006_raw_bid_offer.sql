CREATE TABLE IF NOT EXISTS raw.bid_offer
(
    settlement_date       Date,
    settlement_period     UInt8,
    bm_unit               LowCardinality(Nullable(String)),
    pair_id               Int16,
    time_from             DateTime,
    time_to               DateTime,
    level_from            Int32,
    level_to              Int32,
    bid                   Float64,
    offer                 Float64,
    national_grid_bm_unit LowCardinality(String),
    ingested_at           DateTime DEFAULT now(),
    ingest_version        UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(settlement_date)
-- Balancing Mechanism bid-offer pairs (BOD). Keyed on the National Grid BMU id (always
-- present; bmUnit is null for a few unmapped units) plus the numbered pair (pairId).
ORDER BY (settlement_date, settlement_period, national_grid_bm_unit, pair_id);
