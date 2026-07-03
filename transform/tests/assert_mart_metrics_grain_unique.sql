-- Fails if a (metric, granularity, bucket) appears more than once.
select
    metric,
    granularity,
    bucket,
    count() as n
from {{ ref('mart_metrics') }}
group by metric, granularity, bucket
having count() > 1
