{{ config(order_by=['month', 'day_type', 'settlement_period']) }}

-- A typical GB household's expected consumption (kWh) per half-hour, by calendar month
-- and day type. Shape: Elexon Profile Class 1 (see the seed's docs). Level: rescaled so
-- a full year sums to Ofgem's TDCV for a medium household (`tdcv_kwh` var) — the 1997
-- kW magnitudes are stale but the settlement shape is the industry standard.
-- Months approximate the BSC seasons; day-type weights assume 5/7 weekday, 1/7 each
-- Saturday/Sunday over a 365-day year.
with months as (
    select
        arrayJoin(range(1, 13)) as month,
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] as days_in_month,
        multiIf(
            month in (11, 12, 1, 2), 'winter',
            month in (3, 4), 'spring',
            month in (5, 6), 'summer',
            month in (7, 8), 'high_summer',
            'autumn'
        ) as season
),

profile as (
    select
        season,
        day_type,
        settlement_period,
        demand_kw
    from {{ ref('elexon_class1_profile') }}
),

-- Annual kWh implied by the raw 1997 shape under the same calendar weighting; the
-- ratio TDCV/implied is the single scale factor applied to every half-hour.
implied as (
    select sum(
        profile.demand_kw * 0.5
        * months.days_in_month
        * multiIf(profile.day_type = 'weekday', 5 / 7, 1 / 7)
    ) as annual_kwh
    from profile
    inner join months on profile.season = months.season
)

select
    months.month,
    -- explicit alias: ClickHouse would otherwise name the column literally
    -- "months.season" (month resolves to its arrayJoin alias, season does not)
    months.season as season,
    profile.day_type,
    profile.settlement_period,
    round(
        profile.demand_kw * 0.5 * {{ var('tdcv_kwh') }} / implied.annual_kwh, 6
    ) as demand_kwh
from profile
inner join months on profile.season = months.season
cross join implied
