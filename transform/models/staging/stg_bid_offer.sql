-- Latest bid-offer pair per (settlement period, BM unit, pairId), resolving
-- ReplacingMergeTree without FINAL. Keyed on the National Grid BMU id (always present).
select
    settlement_date,
    settlement_period,
    national_grid_bm_unit,
    pair_id,
    argMax(bm_unit, ingest_version) as bm_unit,
    argMax(time_from, ingest_version) as time_from,
    argMax(time_to, ingest_version) as time_to,
    argMax(level_from, ingest_version) as level_from,
    argMax(level_to, ingest_version) as level_to,
    argMax(bid, ingest_version) as bid,
    argMax(offer, ingest_version) as offer
from {{ source('raw', 'bid_offer') }}
group by settlement_date, settlement_period, national_grid_bm_unit, pair_id
