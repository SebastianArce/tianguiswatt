-- Fails if a bid-offer pair appears more than once per settlement period.
select
    settlement_date,
    settlement_period,
    national_grid_bm_unit,
    pair_id,
    count() as n
from {{ ref('mart_bid_stack') }}
group by settlement_date, settlement_period, national_grid_bm_unit, pair_id
having count() > 1
