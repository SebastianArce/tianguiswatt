{{ config(order_by=['from_ts']) }}

-- One row per half-hour of the household side of the market: the Agile import rate
-- (inc VAT — what a household pays), the Agile Outgoing export rate (export carries no
-- VAT), and the grid carbon intensity for the same half-hour. Restricted to half-hours
-- where both rates exist so the battery simulator always sees a complete decision row;
-- carbon is a left join because its ingested history is shorter than the tariff backfill.
with rates as (
    select
        valid_from as from_ts,
        anyIf(value_inc_vat, tariff_code not like '%OUTGOING%') as import_p_kwh,
        anyIf(value_exc_vat, tariff_code like '%OUTGOING%') as export_p_kwh
    from {{ ref('stg_tariff_rate') }}
    group by valid_from
    having countIf(tariff_code not like '%OUTGOING%') > 0
       and countIf(tariff_code like '%OUTGOING%') > 0
)

select
    rates.from_ts,
    rates.import_p_kwh,
    rates.export_p_kwh,
    -- ClickHouse left joins fill misses with 0, which would read as a perfectly green
    -- half-hour; the GB grid is never at 0 gCO2, so 0 safely means "no carbon data".
    nullIf(carbon.intensity_gco2, 0) as intensity_gco2
from rates
left join {{ ref('mart_carbon') }} as carbon
    on rates.from_ts = carbon.from_ts
