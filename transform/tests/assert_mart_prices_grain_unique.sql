-- Fails if the mart has more than one row per (settlement_date, settlement_period).
select
    settlement_date,
    settlement_period,
    count() as n
from {{ ref('mart_prices') }}
group by settlement_date, settlement_period
having count() > 1
