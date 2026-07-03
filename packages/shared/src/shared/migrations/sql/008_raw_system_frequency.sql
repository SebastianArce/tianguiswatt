CREATE TABLE IF NOT EXISTS raw.system_frequency
(
    measured_at    DateTime,
    frequency_hz   Float64,
    ingested_at    DateTime DEFAULT now(),
    ingest_version UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(measured_at)
-- One system-frequency reading per measurement time (~15s resolution).
ORDER BY measured_at;
