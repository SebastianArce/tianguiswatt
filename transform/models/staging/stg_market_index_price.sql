-- Latest Market Index Price per (settlement period, provider), resolving
-- ReplacingMergeTree without FINAL. One row per provider (APX, N2EX) per period.
select
    settlement_date,
    settlement_period,
    data_provider,
    argMax(measured_at, ingest_version) as measured_at,
    argMax(price, ingest_version) as price,
    argMax(volume, ingest_version) as volume
from {{ source('raw', 'market_index_price') }}
group by settlement_date, settlement_period, data_provider
