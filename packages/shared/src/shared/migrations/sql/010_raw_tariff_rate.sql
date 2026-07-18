CREATE TABLE IF NOT EXISTS raw.tariff_rate
(
    tariff_code     LowCardinality(String),
    valid_from      DateTime,
    valid_to        Nullable(DateTime),
    value_exc_vat   Float64,
    value_inc_vat   Float64,
    ingested_at     DateTime DEFAULT now(),
    ingest_version  UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(valid_from)
-- One rate per half-hour per tariff, keyed by the validity start.
ORDER BY (tariff_code, valid_from);
