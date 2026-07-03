CREATE TABLE IF NOT EXISTS raw.system_price
(
    settlement_date       Date,
    settlement_period     UInt8,
    measured_at           DateTime,
    system_sell_price     Float64,
    system_buy_price      Float64,
    net_imbalance_volume  Float64,
    price_derivation_code LowCardinality(String),
    ingested_at           DateTime DEFAULT now(),
    ingest_version        UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(settlement_date)
-- The single imbalance (cash-out) price per settlement period. Since EBSCR (2015) sell and
-- buy prices are equal, but we keep both for fidelity. ReplacingMergeTree dedupes
-- re-publishes of the same period by ingest_version.
ORDER BY (settlement_date, settlement_period);
