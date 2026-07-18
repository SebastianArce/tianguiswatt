-- Fails if the profile has more than one row per (month, day_type, settlement_period).
select
    month,
    day_type,
    settlement_period,
    count() as n
from {{ ref('mart_domestic_profile') }}
group by month, day_type, settlement_period
having count() > 1
