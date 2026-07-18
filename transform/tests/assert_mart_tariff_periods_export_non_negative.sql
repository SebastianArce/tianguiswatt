-- Fails if an export rate is negative: Outgoing pays out, never charges. (Import has no
-- such check — negative import rates are real Agile plunge pricing.)
select
    from_ts,
    export_p_kwh
from {{ ref('mart_tariff_periods') }}
where export_p_kwh < 0
