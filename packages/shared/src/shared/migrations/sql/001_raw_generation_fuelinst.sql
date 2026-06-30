CREATE TABLE IF NOT EXISTS raw.generation_fuelinst
(
    settlement_date   Date,
    settlement_period UInt8,
    measured_at       DateTime,
    fuel_type         LowCardinality(String),
    generation_mw     Float64,
    ingested_at       DateTime DEFAULT now(),
    ingest_version    UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(settlement_date)
-- measured_at is in the key: FUELINST publishes ~every 5 min, so each settlement
-- period holds several readings per fuel and we must keep every snapshot. Replacing
-- still dedupes true re-publishes of the same instant by ingest_version.
ORDER BY (settlement_date, settlement_period, fuel_type, measured_at);
