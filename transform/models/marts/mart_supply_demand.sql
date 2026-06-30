{{ config(order_by=['settlement_date', 'settlement_period']) }}

-- Demand vs total generation per settlement period. Generation is the sum across fuels
-- at the latest 5-minute instant in the period (snapshots within a period would
-- otherwise over-count).
with latest_instant as (
    select
        settlement_date,
        settlement_period,
        max(measured_at) as measured_at
    from {{ ref('stg_generation_fuelinst') }}
    group by settlement_date, settlement_period
),

generation_total as (
    select
        g.settlement_date,
        g.settlement_period,
        sum(g.generation_mw) as total_generation_mw
    from {{ ref('stg_generation_fuelinst') }} as g
    inner join latest_instant as l
        on g.settlement_date = l.settlement_date
        and g.settlement_period = l.settlement_period
        and g.measured_at = l.measured_at
    group by g.settlement_date, g.settlement_period
)

select
    d.settlement_date,
    d.settlement_period,
    d.indo_mw as demand_mw,
    d.itsdo_mw as transmission_demand_mw,
    gt.total_generation_mw
from {{ ref('stg_demand') }} as d
left join generation_total as gt
    on d.settlement_date = gt.settlement_date
    and d.settlement_period = gt.settlement_period
