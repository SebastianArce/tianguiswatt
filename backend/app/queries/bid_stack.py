"""Read the balancing-mechanism offer stack for the latest settlement period."""

from __future__ import annotations

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import BidStack, BidStackEntry


def fetch_bid_stack(client: Client) -> BidStack:
    """The latest period's offers, aggregated to one per BM unit, cheapest first.

    Per unit: offer_price = cheapest offer; volume_mw = the offerable band (max offer
    level − min offer level across its pairs). Units with no offer band are dropped.
    """
    period_rows = query_rows(
        client,
        "SELECT settlement_date, settlement_period FROM mart_bid_stack "
        "ORDER BY settlement_date DESC, settlement_period DESC LIMIT 1",
    )
    if not period_rows:
        return BidStack(settlement_period=None, entries=[])
    sdate, speriod = period_rows[0]

    rows = query_rows(
        client,
        "SELECT national_grid_bm_unit, min(offer) AS offer_price, "
        "  max(level_to) - min(level_from) AS volume_mw, max(accepted) AS accepted "
        "FROM mart_bid_stack "
        "WHERE is_offer AND offer > 0 "
        "  AND settlement_date = {d:Date} AND settlement_period = {p:UInt8} "
        "GROUP BY national_grid_bm_unit "
        "HAVING volume_mw > 0 "
        "ORDER BY offer_price",
        {"d": sdate, "p": speriod},
    )
    entries = [
        BidStackEntry(
            national_grid_bm_unit=u,
            offer_price=price,
            volume_mw=vol,
            accepted=bool(acc),
        )
        for u, price, vol, acc in rows
    ]
    return BidStack(settlement_period=speriod, entries=entries)
