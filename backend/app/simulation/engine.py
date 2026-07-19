"""Battery dispatch optimisation over half-hourly tariff periods.

Both optimisers share the same physical model (see `Battery`), and both exploit the
same market fact: Agile publishes all of tomorrow's rates at ~16:00 today, so within a
day dispatch is a deterministic optimisation, not a forecasting problem.

- `greedy` is the timer that real home batteries ship with: pick the day's cheapest
  half-hours to charge and dearest to discharge, pairing them only while the spread
  beats the round-trip loss. Feasible by construction, deliberately naive: it never
  carries charge across days, and in self-consumption modes it never exports.
- `lp` solves each day as a linear program over the state-of-charge dynamics, with a
  rolling two-day horizon (commit today, look at tomorrow) so it can carry charge
  overnight when tomorrow looks better. It handles what greedy fumbles: multi-cycle
  days, marginal cycles vs efficiency loss, and the charge/discharge/export split.

The green strategy runs the same machinery with gCO₂/kWh as the objective (plus a tiny
price tie-break so equally-green half-hours prefer the cheaper one).

Solar (behind the meter) enters as a per-period surplus the battery may store instead
of exporting. Against the "same house with solar, no battery" baseline, storing
surplus costs exactly its forgone export value — money or carbon — so the solar-charge
cost vector is the existing discharge-export value vector in every strategy. With no
generation everything reduces to the plain formulation.
"""

from __future__ import annotations

from functools import lru_cache
from itertools import groupby
from math import ceil

import numpy as np
from scipy import sparse
from scipy.optimize import linprog

from app.simulation.models import (
    Battery,
    Dispatch,
    Optimizer,
    Period,
    SimulationResult,
    Strategy,
)

# Keeps the carbon objective dominant (intensity deltas are ≥ 1 g) while breaking ties
# on price (tens of pence).
_GREEN_PRICE_TIEBREAK = 1e-3

_EPS = 1e-9


def simulate(
    periods: list[Period],
    battery: Battery,
    strategy: Strategy,
    optimizer: Optimizer,
) -> SimulationResult:
    """Dispatch the battery over `periods` (chronological), one day at a time."""
    if strategy is Strategy.GREEN and any(p.intensity_gco2 is None for p in periods):
        raise ValueError("green strategy needs intensity_gco2 on every period")

    ordered = sorted(periods, key=lambda p: p.from_ts)
    days = [list(g) for _, g in groupby(ordered, key=lambda p: p.from_ts.date())]

    dispatch: list[Dispatch] = []
    soc = 0.0
    for i, day in enumerate(days):
        if optimizer is Optimizer.LP:
            lookahead = days[i + 1] if i + 1 < len(days) else []
            day_dispatch = _lp_day(day, lookahead, battery, strategy, soc)
        else:
            day_dispatch = _greedy_day(day, battery, strategy, soc)
        dispatch.extend(day_dispatch)
        soc = day_dispatch[-1].soc_kwh
    return SimulationResult(
        strategy=strategy, optimizer=optimizer, battery=battery, dispatch=dispatch
    )


def _charge_weights(day: list[Period], strategy: Strategy) -> list[float]:
    """Cost per kWh drawn to charge: pence, or gCO₂ for the green objective."""
    if strategy is Strategy.GREEN:
        return [
            (p.intensity_gco2 or 0.0) + _GREEN_PRICE_TIEBREAK * p.import_p_kwh
            for p in day
        ]
    return [p.import_p_kwh for p in day]


def _discharge_weights(
    day: list[Period], strategy: Strategy
) -> tuple[list[float], list[float]]:
    """Value per kWh discharged (to home, to export)."""
    if strategy is Strategy.GREEN:
        home = [
            (p.intensity_gco2 or 0.0) + _GREEN_PRICE_TIEBREAK * p.import_p_kwh
            for p in day
        ]
        export = [
            (p.intensity_gco2 or 0.0) + _GREEN_PRICE_TIEBREAK * p.export_p_kwh
            for p in day
        ]
        return home, export
    return [p.import_p_kwh for p in day], [p.export_p_kwh for p in day]


# ---------------------------------------------------------------------------- greedy


def _greedy_day(
    day: list[Period], battery: Battery, strategy: Strategy, soc0: float
) -> list[Dispatch]:
    e = battery.max_flow_kwh
    eta = battery.round_trip_efficiency
    charge_w = _charge_weights(day, strategy)
    home_w, export_w = _discharge_weights(day, strategy)
    # In pure arbitrage a discharged kWh earns the export rate; otherwise it offsets
    # household import.
    discharge_w = export_w if strategy is Strategy.ARBITRAGE else home_w

    n_pairs = ceil(battery.capacity_kwh / e) if e else 0
    cheapest = sorted(range(len(day)), key=lambda t: charge_w[t])[:n_pairs]
    dearest = sorted(range(len(day)), key=lambda t: -discharge_w[t])[:n_pairs]
    # Keep the k-th pair only while its spread survives the round-trip loss.
    kept = 0
    for c_t, d_t in zip(cheapest, dearest):
        if discharge_w[d_t] * eta > charge_w[c_t]:
            kept += 1
        else:
            break
    charge_set = set(cheapest[:kept])
    discharge_set = set(dearest[:kept])

    dispatch: list[Dispatch] = []
    soc = min(soc0, battery.capacity_kwh)
    for t, p in enumerate(day):
        charge = solar_charge = home = export = 0.0
        # Store surplus first, unconditionally — the store-first behaviour real
        # batteries ship with. Greedy never weighs export-now against discharge-later;
        # that gap (largest on sunny days) is exactly what the LP comparison shows.
        if p.surplus_kwh > _EPS and soc < battery.capacity_kwh:
            solar_charge = min(p.surplus_kwh, e, (battery.capacity_kwh - soc) / eta)
            soc += solar_charge * eta
        budget = e - solar_charge
        if t in charge_set and soc < battery.capacity_kwh and budget > _EPS:
            charge = min(budget, (battery.capacity_kwh - soc) / eta)
            soc += charge * eta
            budget -= charge
        if t in discharge_set and budget > _EPS and soc > _EPS:
            if strategy is Strategy.ARBITRAGE:
                export = min(budget, soc)
                soc -= export
            else:
                home = min(budget, soc, p.net_demand_kwh)
                soc -= home
        dispatch.append(
            Dispatch(
                period=p,
                charge_kwh=charge,
                charge_solar_kwh=solar_charge,
                discharge_home_kwh=home,
                discharge_export_kwh=export,
                soc_kwh=soc,
            )
        )
    return dispatch


# -------------------------------------------------------------------------------- lp


@lru_cache(maxsize=8)
def _constraint_matrices(t_periods: int, eta: float):
    """Sparse constraints for a horizon of `t_periods`.

    Variables are [charge, solar_charge, home, export, soc] × T. Equality rows encode
    the SoC dynamics `soc_t − soc_{t−1} − η·(charge_t + solar_t) + home_t + export_t
    = 0` (banded, so the LP stays sparse instead of the dense cumulative-sum
    formulation); inequality rows encode the shared inverter budget `charge + solar +
    home + export ≤ e`. Capacity becomes a plain variable bound on soc; solar
    availability is purely a bound on the solar block.
    """
    identity = sparse.identity(t_periods, format="csr")
    soc_step = sparse.diags_array(
        [1.0, -1.0], offsets=[0, -1], shape=(t_periods, t_periods)
    )
    a_eq = sparse.hstack(
        [-eta * identity, -eta * identity, identity, identity, soc_step], format="csr"
    )
    a_ub = sparse.hstack(
        [
            identity,
            identity,
            identity,
            identity,
            sparse.csr_matrix((t_periods, t_periods)),
        ],
        format="csr",
    )
    return a_eq, a_ub


def _lp_day(
    day: list[Period],
    lookahead: list[Period],
    battery: Battery,
    strategy: Strategy,
    soc0: float,
) -> list[Dispatch]:
    horizon = day + lookahead
    t_periods = len(horizon)
    e = battery.max_flow_kwh
    eta = battery.round_trip_efficiency
    soc0 = min(soc0, battery.capacity_kwh)

    charge_w = np.array(_charge_weights(horizon, strategy))
    home_w, export_w = (np.array(w) for w in _discharge_weights(horizon, strategy))
    # linprog minimises; savings = home·w_home + export·w_export − charge·w_charge
    # − solar_charge·w_export (storing surplus forgoes its export value — the same
    # vector that prices discharge-export, in money and in carbon alike).
    # SoC variables carry no cost.
    objective = np.concatenate(
        [charge_w, export_w, -home_w, -export_w, np.zeros(t_periods)]
    )

    home_cap = [
        0.0 if strategy is Strategy.ARBITRAGE else min(e, p.net_demand_kwh)
        for p in horizon
    ]
    bounds = (
        [(0.0, e)] * t_periods
        + [(0.0, min(e, p.surplus_kwh)) for p in horizon]
        + [(0.0, cap) for cap in home_cap]
        + [(0.0, e)] * t_periods
        + [(0.0, battery.capacity_kwh)] * t_periods
    )
    a_eq, a_ub = _constraint_matrices(t_periods, eta)
    b_eq = np.zeros(t_periods)
    b_eq[0] = soc0  # soc_0 − η·charge_0 + home_0 + export_0 = soc0
    result = linprog(
        objective,
        A_ub=a_ub,
        b_ub=np.full(t_periods, e),
        A_eq=a_eq,
        b_eq=b_eq,
        bounds=bounds,
        method="highs",
    )
    if result.status != 0:
        raise RuntimeError(f"battery dispatch LP failed: {result.message}")

    x = np.where(np.abs(result.x) < _EPS, 0.0, result.x)
    charge, solar, home, export, soc = (
        x[:t_periods],
        x[t_periods : 2 * t_periods],
        x[2 * t_periods : 3 * t_periods],
        x[3 * t_periods : 4 * t_periods],
        x[4 * t_periods :],
    )

    return [
        Dispatch(
            period=p,
            charge_kwh=float(charge[t]),
            charge_solar_kwh=float(solar[t]),
            discharge_home_kwh=float(home[t]),
            discharge_export_kwh=float(export[t]),
            soc_kwh=float(max(soc[t], 0.0)),
        )
        for t, p in enumerate(day)  # commit today only; tomorrow re-solves with carry
    ]
