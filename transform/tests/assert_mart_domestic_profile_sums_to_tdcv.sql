-- Fails if the scaled profile's implied annual consumption drifts from the TDCV by
-- more than 0.5% (same 365-day, 5/7-weekday calendar weighting as the mart).
select sum(
    demand_kwh
    * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
    * multiIf(day_type = 'weekday', 5 / 7, 1 / 7)
) as annual_kwh
from {{ ref('mart_domestic_profile') }}
having abs(annual_kwh - {{ var('tdcv_kwh') }}) > {{ var('tdcv_kwh') }} * 0.005
