{{ config(order_by=['acceptance_time']) }}

-- Recent accepted Balancing Mechanism actions (BOALF), one row per acceptance — powers the
-- control-room "actions accepted" panel. level_from → level_to is the instructed ramp.
select
    acceptance_number,
    national_grid_bm_unit,
    bm_unit,
    acceptance_time,
    settlement_date,
    settlement_period_from,
    level_from,
    level_to,
    so_flag,
    stor_flag
from {{ ref('stg_bid_offer_acceptance') }}
