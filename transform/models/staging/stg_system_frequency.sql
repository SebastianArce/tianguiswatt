-- Latest frequency reading per measurement time, resolving ReplacingMergeTree without FINAL.
select
    measured_at,
    argMax(frequency_hz, ingest_version) as frequency_hz
from {{ source('raw', 'system_frequency') }}
group by measured_at
