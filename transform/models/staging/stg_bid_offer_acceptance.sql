-- Latest acceptance per acceptance number, resolving ReplacingMergeTree without FINAL.
select
    acceptance_number,
    argMax(settlement_date, ingest_version) as settlement_date,
    argMax(settlement_period_from, ingest_version) as settlement_period_from,
    argMax(settlement_period_to, ingest_version) as settlement_period_to,
    argMax(national_grid_bm_unit, ingest_version) as national_grid_bm_unit,
    argMax(so_flag, ingest_version) as so_flag,
    argMax(stor_flag, ingest_version) as stor_flag
from {{ source('raw', 'bid_offer_acceptance') }}
group by acceptance_number
