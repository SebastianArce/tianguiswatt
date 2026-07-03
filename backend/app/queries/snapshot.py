"""Read the latest snapshot across domains from the dbt marts."""

from __future__ import annotations

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import Carbon, GenerationMixItem, Price, Snapshot, SupplyDemand


def fetch_snapshot(client: Client) -> Snapshot:
    """Latest generation mix, supply/demand, and carbon intensity."""
    gen_rows = query_rows(
        client,
        "SELECT measured_at, fuel_type, generation_mw, share_pct "
        "FROM mart_generation_by_fuel "
        "WHERE measured_at = (SELECT max(measured_at) FROM mart_generation_by_fuel) "
        "ORDER BY share_pct DESC",
    )
    generation = [
        GenerationMixItem(fuel_type=fuel, generation_mw=mw, share_pct=share)
        for _, fuel, mw, share in gen_rows
    ]
    measured_at = gen_rows[0][0] if gen_rows else None

    sd_rows = query_rows(
        client,
        "SELECT settlement_period, demand_mw, transmission_demand_mw, total_generation_mw "
        "FROM mart_supply_demand "
        "ORDER BY settlement_date DESC, settlement_period DESC LIMIT 1",
    )
    supply_demand = (
        SupplyDemand(
            settlement_period=sd_rows[0][0],
            demand_mw=sd_rows[0][1],
            transmission_demand_mw=sd_rows[0][2],
            total_generation_mw=sd_rows[0][3],
        )
        if sd_rows
        else None
    )

    carbon_rows = query_rows(
        client,
        "SELECT from_ts, intensity_gco2, intensity_index "
        "FROM mart_carbon ORDER BY from_ts DESC LIMIT 1",
    )
    carbon = (
        Carbon(
            from_ts=carbon_rows[0][0],
            intensity_gco2=carbon_rows[0][1],
            intensity_index=carbon_rows[0][2],
        )
        if carbon_rows
        else None
    )

    price_rows = query_rows(
        client,
        "SELECT settlement_period, system_sell_price, net_imbalance_volume, "
        "  apx_price, n2ex_price "
        "FROM mart_prices "
        "ORDER BY settlement_date DESC, settlement_period DESC LIMIT 1",
    )
    price = (
        Price(
            settlement_period=price_rows[0][0],
            system_price=price_rows[0][1],
            net_imbalance_volume=price_rows[0][2],
            apx_price=price_rows[0][3],
            n2ex_price=price_rows[0][4],
        )
        if price_rows
        else None
    )

    return Snapshot(
        measured_at=measured_at,
        generation=generation,
        supply_demand=supply_demand,
        carbon=carbon,
        price=price,
    )
