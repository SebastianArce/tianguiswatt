CREATE TABLE IF NOT EXISTS raw.bid_offer_acceptance
(
    settlement_date        Date,
    settlement_period_from UInt8,
    settlement_period_to   UInt8,
    bm_unit                LowCardinality(String),
    acceptance_number      UInt64,
    acceptance_time        DateTime,
    time_from              DateTime,
    time_to                DateTime,
    level_from             Int32,
    level_to               Int32,
    so_flag                Bool,
    stor_flag              Bool,
    national_grid_bm_unit  LowCardinality(String),
    ingested_at            DateTime DEFAULT now(),
    ingest_version         UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(settlement_date)
-- Accepted Balancing Mechanism actions (BOALF): one row per acceptance, so the acceptance
-- number is the natural key. A revised acceptance supersedes by ingest_version.
ORDER BY (settlement_date, acceptance_number);
