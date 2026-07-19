"""Aggregates for the narrative front page: the wholesale-vs-retail wedge and what
the balancing market pays for peak flexibility.

Cached per data stamp like the battery queries, but degradation differs: while the
warehouse warms up this returns a partial Story (constants intact, series empty) —
the front page must always render.
"""

from __future__ import annotations

import datetime as dt

from clickhouse_connect.driver.client import Client

from app.queries.util import query_rows
from app.schemas import FeeComponent, MonthlyPriceRow, PeakFlex, Story

# Ofgem price cap, electricity single-rate unit average (direct debit, England,
# Scotland and Wales), 1 Jul – 30 Sep 2026. Update quarterly.
PRICE_CAP_P_KWH = 26.11
PRICE_CAP_LABEL = "Ofgem price cap · Jul–Sep 2026"

# What a capped unit rate pays for — approximate shares of the Jul–Sep 2026 cap
# (Ofgem: wholesale ≈ 45% of a typical bill; remainder per Ofgem's published
# network / policy / operating-and-margin / VAT decomposition, rounded).
FEE_STACK = [
    FeeComponent(name="Wholesale energy", share_pct=45),
    FeeComponent(name="Networks", share_pct=20),
    FeeComponent(name="Policy costs", share_pct=11),
    FeeComponent(name="Operating costs & margin", share_pct=19),
    FeeComponent(name="VAT", share_pct=5),
]

PEAK_FLEX_WINDOW_DAYS = 30

# Monthly buckets on the local clock, windowed to the tariff history so the wedge
# compares like months with like.
_WHOLESALE_SQL = """
SELECT
    toStartOfMonth(measured_at, 'Europe/London') AS month,
    avg(system_sell_price),
    avgOrNull(apx_price)
FROM mart_prices
WHERE measured_at >= {start:DateTime} AND measured_at <= {end:DateTime}
GROUP BY month
ORDER BY month
"""

_AGILE_SQL = """
SELECT
    toStartOfMonth(from_ts, 'Europe/London') AS month,
    avg(import_p_kwh)
FROM mart_tariff_periods
GROUP BY month
ORDER BY month
"""

# Per-settlement-period marginal accepted offer: the most expensive flexibility the
# system operator actually paid for in that half-hour. Offers at £9,999+ are Elexon's
# defensive-pricing convention ("never take this pair") and the mart's accepted flag
# marks the whole unit, so sentinels must be excluded or they masquerade as marginal.
_MARGINAL_OFFERS_SQL = """
SELECT max(offer)
FROM mart_bid_stack
WHERE is_offer AND accepted AND offer > 0 AND offer < 9999
    AND settlement_date >= (SELECT max(settlement_date) FROM mart_bid_stack)
        - {days:UInt16}
GROUP BY settlement_date, settlement_period
"""

_cache: dict[tuple, Story] = {}


def _stamp(client: Client) -> tuple:
    tariff = query_rows(client, "SELECT maxOrNull(from_ts) FROM mart_tariff_periods")
    prices = query_rows(client, "SELECT maxOrNull(measured_at) FROM mart_prices")
    stack = query_rows(client, "SELECT maxOrNull(settlement_date) FROM mart_bid_stack")
    return (
        tariff[0][0] if tariff else None,
        prices[0][0] if prices else None,
        stack[0][0] if stack else None,
    )


def _quantile(sorted_values: list[float], fraction: float) -> float:
    return sorted_values[round(fraction * (len(sorted_values) - 1))]


def fetch_story(client: Client) -> Story:
    key = ("story", _stamp(client))
    if (cached := _cache.get(key)) is not None:
        return cached

    window = query_rows(
        client, "SELECT minOrNull(from_ts), maxOrNull(from_ts) FROM mart_tariff_periods"
    )
    window_from, window_to = window[0] if window else (None, None)

    monthly: dict[dt.date, MonthlyPriceRow] = {}
    if window_from is not None:
        for month, system, apx in query_rows(
            client, _WHOLESALE_SQL, {"start": window_from, "end": window_to}
        ):
            monthly[month] = MonthlyPriceRow(
                month=month,
                system_gbp_mwh=round(system, 2),
                apx_gbp_mwh=round(apx, 2) if apx is not None else None,
                agile_import_p_kwh=None,
            )
        for month, agile in query_rows(client, _AGILE_SQL):
            existing = monthly.get(month)
            if existing is not None:
                monthly[month] = existing.model_copy(
                    update={"agile_import_p_kwh": round(agile, 2)}
                )
            else:
                monthly[month] = MonthlyPriceRow(
                    month=month,
                    system_gbp_mwh=None,
                    apx_gbp_mwh=None,
                    agile_import_p_kwh=round(agile, 2),
                )

    avg_agile = query_rows(
        client, "SELECT avgOrNull(import_p_kwh) FROM mart_tariff_periods"
    )

    marginals = sorted(
        row[0]
        for row in query_rows(
            client, _MARGINAL_OFFERS_SQL, {"days": PEAK_FLEX_WINDOW_DAYS}
        )
    )
    avg_system = query_rows(
        client,
        "SELECT avgOrNull(system_sell_price) FROM mart_prices "
        "WHERE measured_at >= (SELECT max(measured_at) FROM mart_prices) "
        "    - INTERVAL {days:UInt16} DAY",
        {"days": PEAK_FLEX_WINDOW_DAYS},
    )
    actions = query_rows(
        client,
        "SELECT count() FROM mart_accepted_actions "
        "WHERE acceptance_time >= "
        "    (SELECT max(acceptance_time) FROM mart_accepted_actions) - INTERVAL 7 DAY",
    )

    story = Story(
        window_from=window_from.date() if window_from else None,
        window_to=window_to.date() if window_to else None,
        monthly=[monthly[m] for m in sorted(monthly)],
        avg_agile_import_p_kwh=(
            round(avg_agile[0][0], 2) if avg_agile and avg_agile[0][0] else None
        ),
        price_cap_p_kwh=PRICE_CAP_P_KWH,
        price_cap_label=PRICE_CAP_LABEL,
        fee_stack=FEE_STACK,
        peak_flex=PeakFlex(
            window_days=PEAK_FLEX_WINDOW_DAYS,
            max_accepted_offer_gbp_mwh=marginals[-1] if marginals else None,
            p90_accepted_offer_gbp_mwh=(
                round(_quantile(marginals, 0.9), 2) if marginals else None
            ),
            median_accepted_offer_gbp_mwh=(
                round(_quantile(marginals, 0.5), 2) if marginals else None
            ),
            avg_system_gbp_mwh=(
                round(avg_system[0][0], 2) if avg_system and avg_system[0][0] else None
            ),
            accepted_actions_7d=actions[0][0] if actions else 0,
        ),
    )
    if len(_cache) > 8:
        _cache.clear()
    _cache[key] = story
    return story
