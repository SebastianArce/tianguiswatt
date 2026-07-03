{{ config(order_by=['acceptance_time']) }}

-- Recent accepted Balancing Mechanism actions (BOALF), one row per acceptance — powers the
-- control-room "actions accepted" panel. level_from → level_to is the instructed ramp.
-- Enriched with the unit's registry name + fuel type where available.
select
    a.acceptance_number,
    a.national_grid_bm_unit,
    a.bm_unit,
    a.acceptance_time,
    a.settlement_date,
    a.settlement_period_from,
    a.level_from,
    a.level_to,
    a.so_flag,
    a.stor_flag,
    r.bm_unit_name as unit_name,
    r.fuel_type
from {{ ref('stg_bid_offer_acceptance') }} as a
left join {{ ref('stg_bmu_registry') }} as r
    on a.national_grid_bm_unit = r.national_grid_bm_unit
