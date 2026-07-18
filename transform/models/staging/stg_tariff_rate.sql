-- Latest rate per tariff per half-hour, resolving ReplacingMergeTree without FINAL.
select
    tariff_code,
    valid_from,
    argMax(valid_to, ingest_version) as valid_to,
    argMax(value_exc_vat, ingest_version) as value_exc_vat,
    argMax(value_inc_vat, ingest_version) as value_inc_vat
from {{ source('raw', 'tariff_rate') }}
group by tariff_code, valid_from
