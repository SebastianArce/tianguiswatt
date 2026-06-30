CREATE TABLE IF NOT EXISTS raw.demand
(
    settlement_date   Date,
    settlement_period UInt8,
    measured_at       DateTime,
    indo_mw           Int32,
    itsdo_mw          Int32,
    ingested_at       DateTime DEFAULT now(),
    ingest_version    UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(settlement_date)
-- One reading per settlement period (demand outturn), so the period is the key.
-- ReplacingMergeTree dedupes re-publishes of the same period by ingest_version.
ORDER BY (settlement_date, settlement_period);
