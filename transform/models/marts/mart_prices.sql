{{ config(order_by=['settlement_date', 'settlement_period']) }}

-- One row per settlement period: the system (imbalance/cash-out) price, plus the APX and
-- N2EX Market Index Prices pivoted into columns. System price is published for every
-- period; MID is a reference and may be missing, so it's a left join.
with mid as (
    select
        settlement_date,
        settlement_period,
        anyIf(price, data_provider = 'APXMIDP') as apx_price,
        anyIf(volume, data_provider = 'APXMIDP') as apx_volume,
        anyIf(price, data_provider = 'N2EXMIDP') as n2ex_price,
        anyIf(volume, data_provider = 'N2EXMIDP') as n2ex_volume
    from {{ ref('stg_market_index_price') }}
    group by settlement_date, settlement_period
)

select
    sp.settlement_date,
    sp.settlement_period,
    sp.measured_at,
    sp.system_sell_price,
    sp.system_buy_price,
    sp.net_imbalance_volume,
    sp.price_derivation_code,
    mid.apx_price,
    mid.apx_volume,
    mid.n2ex_price,
    mid.n2ex_volume
from {{ ref('stg_system_price') }} as sp
left join mid
    on sp.settlement_date = mid.settlement_date
    and sp.settlement_period = mid.settlement_period
