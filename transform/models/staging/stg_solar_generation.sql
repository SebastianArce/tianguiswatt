-- Latest PV_Live estimate per half-hour, resolving ReplacingMergeTree without FINAL.
-- PV_Live labels intervals by their END; shift to the period start so every model in
-- this project shares one convention. capacity_factor is the national fleet's output
-- as a fraction of installed capacity, ready to scale to any array size.
-- (The ratio lives outside the aggregation: ClickHouse expands same-select aliases
-- into the expression, which would nest argMax inside an aggregate.)
with deduped as (
    select
        period_end_ts - INTERVAL 30 MINUTE as from_ts,
        argMax(generation_mw, ingest_version) as generation_mw,
        argMax(capacity_mwp, ingest_version) as capacity_mwp
    from {{ source('raw', 'solar_generation') }}
    group by period_end_ts
)

select
    from_ts,
    generation_mw,
    capacity_mwp,
    generation_mw / nullIf(capacity_mwp, 0) as capacity_factor
from deduped
