-- Latest carbon intensity per half-hour, resolving ReplacingMergeTree without FINAL.
select
    from_ts,
    argMax(to_ts, ingest_version) as to_ts,
    argMax(forecast_gco2, ingest_version) as forecast_gco2,
    argMax(actual_gco2, ingest_version) as actual_gco2,
    argMax(intensity_index, ingest_version) as intensity_index
from {{ source('raw', 'carbon_intensity_national') }}
group by from_ts
