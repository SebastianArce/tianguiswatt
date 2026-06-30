-- Latest value per reading, resolving ReplacingMergeTree without FINAL.
select
    settlement_date,
    settlement_period,
    fuel_type,
    measured_at,
    argMax(generation_mw, ingest_version) as generation_mw
from {{ source('raw', 'generation_fuelinst') }}
group by settlement_date, settlement_period, fuel_type, measured_at
