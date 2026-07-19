"""Data types for the battery dispatch simulator."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from enum import StrEnum


class Strategy(StrEnum):
    """What the battery optimises and which flows it may use."""

    # Grid → battery → grid: buy at the import rate, sell at the export rate.
    ARBITRAGE = "arbitrage"
    # Serve the household first (worth the avoided import rate), export any surplus.
    SELF_CONSUMPTION = "self_consumption"
    # Self-consumption flows, but optimised for gCO₂ instead of pence.
    GREEN = "green"


class Optimizer(StrEnum):
    GREEDY = "greedy"
    LP = "lp"


@dataclass(frozen=True, slots=True)
class Battery:
    """A home battery.

    Round-trip losses are applied on the charge side: drawing 1 kWh through the meter
    stores `round_trip_efficiency` kWh; discharge is 1:1. The inverter power limit is
    shared across charge and discharge within a half-hour.
    """

    capacity_kwh: float
    power_kw: float
    round_trip_efficiency: float = 0.9

    @property
    def max_flow_kwh(self) -> float:
        """Max energy through the meter per half-hour settlement period."""
        return self.power_kw * 0.5


@dataclass(frozen=True, slots=True)
class Period:
    """One half-hour the battery can trade.

    Prices in p/kWh (import can be negative — Agile plunge pricing), carbon in
    gCO₂/kWh, household demand and solar generation in kWh (both 0 when absent).
    Solar serves the home behind the meter first — that split is physics, not a
    dispatch decision, so it lives here as the net/surplus properties.
    """

    from_ts: dt.datetime
    import_p_kwh: float
    export_p_kwh: float
    intensity_gco2: float | None = None
    demand_kwh: float = 0.0
    generation_kwh: float = 0.0

    @property
    def net_demand_kwh(self) -> float:
        """Demand left after the home consumed its own solar."""
        return max(self.demand_kwh - self.generation_kwh, 0.0)

    @property
    def surplus_kwh(self) -> float:
        """Solar left after the home consumed what it could."""
        return max(self.generation_kwh - self.demand_kwh, 0.0)


@dataclass(frozen=True, slots=True)
class Dispatch:
    """The battery's action in one period, and the state of charge after it."""

    period: Period
    charge_kwh: float  # drawn through the meter into the battery
    discharge_home_kwh: float  # discharged into household demand (avoided import)
    discharge_export_kwh: float  # discharged to the grid at the export rate
    soc_kwh: float
    charge_solar_kwh: float = 0.0  # solar surplus diverted into the battery

    @property
    def export_solar_kwh(self) -> float:
        """Surplus the battery didn't store, exported automatically."""
        return self.period.surplus_kwh - self.charge_solar_kwh

    @property
    def saving_p(self) -> float:
        """Pence saved vs the baseline: the same house (with its solar) but no battery.

        The baseline already earns export on all surplus, so storing surplus costs its
        forgone export revenue — that term is the whole solar adjustment; everything
        else cancels algebraically.
        """
        p = self.period
        return (
            self.discharge_home_kwh * p.import_p_kwh
            + self.discharge_export_kwh * p.export_p_kwh
            - self.charge_kwh * p.import_p_kwh
            - self.charge_solar_kwh * p.export_p_kwh
        )

    @property
    def carbon_saved_g(self) -> float:
        """Grid gCO₂ displaced vs the same no-battery baseline.

        Symmetric to the money identity: baseline surplus exports displace grid carbon
        at this period's intensity, so storing surplus forgoes that displacement now in
        exchange for displacement when discharged later.
        """
        g = self.period.intensity_gco2 or 0.0
        return (
            self.discharge_home_kwh
            + self.discharge_export_kwh
            - self.charge_kwh
            - self.charge_solar_kwh
        ) * g


@dataclass(frozen=True, slots=True)
class SimulationResult:
    """A full simulation run: one Dispatch per input period, chronological."""

    strategy: Strategy
    optimizer: Optimizer
    battery: Battery
    dispatch: list[Dispatch]

    @property
    def saving_gbp(self) -> float:
        return sum(d.saving_p for d in self.dispatch) / 100

    @property
    def carbon_saved_kg(self) -> float:
        return sum(d.carbon_saved_g for d in self.dispatch) / 1000

    @property
    def baseline_cost_gbp(self) -> float:
        """The household's net bill with its solar but no battery: imports what solar
        doesn't cover, exports the surplus. Can be negative for a large array on a
        low-use home. Reduces to the plain import bill when there is no solar."""
        return (
            sum(
                d.period.net_demand_kwh * d.period.import_p_kwh
                - d.period.surplus_kwh * d.period.export_p_kwh
                for d in self.dispatch
            )
            / 100
        )

    @property
    def cycles(self) -> float:
        """Equivalent full cycles: total energy discharged over usable capacity."""
        discharged = sum(
            d.discharge_home_kwh + d.discharge_export_kwh for d in self.dispatch
        )
        return (
            discharged / self.battery.capacity_kwh if self.battery.capacity_kwh else 0
        )
