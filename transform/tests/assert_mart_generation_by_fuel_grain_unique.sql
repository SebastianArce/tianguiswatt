-- Fails if the mart has more than one row per (measured_at, fuel_type).
select
    measured_at,
    fuel_type,
    count() as n
from {{ ref('mart_generation_by_fuel') }}
group by measured_at, fuel_type
having count() > 1
