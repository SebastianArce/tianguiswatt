{{ config(order_by=['settlement_date', 'settlement_period', 'national_grid_bm_unit', 'pair_id']) }}

-- The bid-offer ladder per settlement period: each BM unit's bid/offer pairs, flagged with
-- whether NESO accepted an action for that unit in the period. The /explore view orders
-- offers by price to draw the merit-order stack.
with accepted as (
    -- expand each acceptance's period range (from..to inclusive) into individual periods
    select distinct
        national_grid_bm_unit,
        settlement_date,
        toUInt8(sp) as settlement_period
    from {{ ref('stg_bid_offer_acceptance') }}
    array join range(settlement_period_from, settlement_period_to + 1) as sp
)

select
    b.settlement_date,
    b.settlement_period,
    b.national_grid_bm_unit,
    b.bm_unit,
    b.pair_id,
    b.bid,
    b.offer,
    b.level_from,
    b.level_to,
    b.pair_id > 0 as is_offer,
    -- a left join fills unmatched rows with '' (join_use_nulls=0), so a non-empty match
    -- means the unit had an accepted action in this period
    a.national_grid_bm_unit != '' as accepted
from {{ ref('stg_bid_offer') }} as b
left join accepted as a
    on b.national_grid_bm_unit = a.national_grid_bm_unit
    and b.settlement_date = a.settlement_date
    and b.settlement_period = a.settlement_period
