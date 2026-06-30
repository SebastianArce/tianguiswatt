{{ config(order_by=['from_ts']) }}

-- National carbon intensity per half-hour. intensity_gco2 prefers the measured actual,
-- falling back to the forecast for half-hours that have not settled yet.
select
    from_ts,
    to_ts,
    forecast_gco2,
    actual_gco2,
    coalesce(actual_gco2, forecast_gco2) as intensity_gco2,
    intensity_index
from {{ ref('stg_carbon_intensity_national') }}
