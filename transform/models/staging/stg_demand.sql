-- Latest demand per settlement period, resolving ReplacingMergeTree without FINAL.
select
    settlement_date,
    settlement_period,
    argMax(measured_at, ingest_version) as measured_at,
    argMax(indo_mw, ingest_version) as indo_mw,
    argMax(itsdo_mw, ingest_version) as itsdo_mw
from {{ source('raw', 'demand') }}
group by settlement_date, settlement_period
