CREATE TABLE IF NOT EXISTS raw.solar_generation
(
    -- PV_Live labels each half-hour with the timestamp at the END of the interval (UTC).
    period_end_ts    DateTime,
    gsp_id           UInt16,
    generation_mw    Nullable(Float64),
    capacity_mwp     Nullable(Float64),
    ingested_at      DateTime DEFAULT now(),
    ingest_version   UInt64
)
ENGINE = ReplacingMergeTree(ingest_version)
PARTITION BY toYYYYMM(period_end_ts)
-- One national (gsp 0) reading per half-hour, keyed by the period end.
ORDER BY (period_end_ts);
