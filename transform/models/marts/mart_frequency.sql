{{ config(order_by=['measured_at']) }}

-- GB system-frequency time series; the dashboard reads the most recent value.
select
    measured_at,
    frequency_hz
from {{ ref('stg_system_frequency') }}
