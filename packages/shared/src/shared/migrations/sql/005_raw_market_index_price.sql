CREATE TABLE IF NOT EXISTS raw.market_index_price
(
    settlement_date   Date,
    settlement_period UInt8,
    measured_at       DateTime,
    data_provider     LowCardinality(String),
    price             Float64,
    volume            Float64,
    ingested_at       DateTime DEFAULT now(),
    ingest_version    UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(settlement_date)
-- The Market Index Price emits one row per provider (APX, N2EX) per settlement period, so
-- the provider is part of the natural key.
ORDER BY (settlement_date, settlement_period, data_provider);
