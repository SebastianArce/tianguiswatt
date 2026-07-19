-- Fails if a solar capacity factor escapes [0, 1]: the national fleet can't generate
-- more than its installed capacity or negative power. NULL (no PV_Live row) is fine.
select
    from_ts,
    solar_cf
from {{ ref('mart_tariff_periods') }}
where solar_cf < 0 or solar_cf > 1
