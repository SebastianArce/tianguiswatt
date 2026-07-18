-- Fails if the profile loses the recognisable domestic shape: the evening peak
-- (17:00–20:00, SP 35–40) must exceed the overnight trough (02:00–05:00, SP 5–10)
-- in every month and day type.
select
    month,
    day_type,
    avgIf(demand_kwh, settlement_period between 35 and 40) as evening_kwh,
    avgIf(demand_kwh, settlement_period between 5 and 10) as overnight_kwh
from {{ ref('mart_domestic_profile') }}
group by month, day_type
having evening_kwh <= overnight_kwh
