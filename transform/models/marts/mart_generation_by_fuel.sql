{{ config(order_by=['measured_at', 'fuel_type']) }}

-- Generation by fuel for each 5-minute instant, with each fuel's share of the mix.
with gen as (
    select
        measured_at,
        settlement_date,
        settlement_period,
        fuel_type,
        generation_mw
    from {{ ref('stg_generation_fuelinst') }}
),

instant_totals as (
    select
        measured_at,
        sum(generation_mw) as total_mw
    from gen
    group by measured_at
)

select
    g.measured_at,
    g.settlement_date,
    g.settlement_period,
    g.fuel_type,
    g.generation_mw,
    round(100 * g.generation_mw / nullIf(t.total_mw, 0), 2) as share_pct
from gen as g
inner join instant_totals as t on g.measured_at = t.measured_at
