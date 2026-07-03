{{ config(order_by=['metric', 'granularity', 'bucket']) }}

-- Long-format time-series rollup powering the /trends explorer: each core metric at three
-- granularities (per-SP, hourly, daily). Hourly/daily are averages over the bucket. Kept in
-- one table so the API is a single (metric, granularity, window) query.
{% set period_start = "toDateTime(settlement_date) + (settlement_period - 1) * 1800" %}
{% set metrics = [
    ("demand", "mart_supply_demand", "demand_mw", period_start),
    ("generation", "mart_supply_demand", "total_generation_mw", period_start),
    ("carbon", "mart_carbon", "intensity_gco2", "from_ts"),
    ("price", "mart_prices", "system_sell_price", period_start),
] %}

{% for name, mart, value, bucket in metrics %}
select '{{ name }}' as metric, 'sp' as granularity,
    {{ bucket }} as bucket, toFloat64({{ value }}) as value
from {{ ref(mart) }}
where {{ value }} is not null
union all
select '{{ name }}', 'hour', toStartOfHour({{ bucket }}), avg(toFloat64({{ value }}))
from {{ ref(mart) }}
where {{ value }} is not null
group by toStartOfHour({{ bucket }})
union all
select '{{ name }}', 'day', toStartOfDay({{ bucket }}), avg(toFloat64({{ value }}))
from {{ ref(mart) }}
where {{ value }} is not null
group by toStartOfDay({{ bucket }})
{% if not loop.last %}union all{% endif %}
{% endfor %}
