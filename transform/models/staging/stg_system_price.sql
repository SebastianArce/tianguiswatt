-- Latest system (imbalance) price per settlement period, resolving ReplacingMergeTree
-- without FINAL.
select
    settlement_date,
    settlement_period,
    argMax(measured_at, ingest_version) as measured_at,
    argMax(system_sell_price, ingest_version) as system_sell_price,
    argMax(system_buy_price, ingest_version) as system_buy_price,
    argMax(net_imbalance_volume, ingest_version) as net_imbalance_volume,
    argMax(price_derivation_code, ingest_version) as price_derivation_code
from {{ source('raw', 'system_price') }}
group by settlement_date, settlement_period
