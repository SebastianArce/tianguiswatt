/** Pure fleet math for the narrative page: one backtested home, multiplied.
 *  All identical-homes arithmetic — the stated simplification of the section. */

export const WIND_TURBINE_MW = 3.5 // typical onshore turbine nameplate
export const CCGT_UNIT_MW = 450 // one combined-cycle gas unit
export const MAX_HOMES = 250_000

/** Logarithmic slider mapping: t ∈ [0,1] ↔ homes ∈ [1, MAX_HOMES]. */
export const homesFromT = (t: number) =>
  Math.round(10 ** (t * Math.log10(MAX_HOMES)))
export const tFromHomes = (homes: number) =>
  Math.log10(Math.max(1, homes)) / Math.log10(MAX_HOMES)

/** Evening window: settlement periods 33–44 = 16:00–22:00 local. */
const EVENING = (sp: number) => sp >= 33 && sp <= 44

export interface DispatchBucketLike {
  settlement_period: number
  discharge_kwh: number
}

export interface RunLike {
  typical_day: DispatchBucketLike[]
  saving_gbp_year: number
  carbon_saved_kg_year: number
}

export interface FleetStats {
  peakKwPerHome: number
  fleetMw: number
  gwhShiftedYear: number
  tonnesCo2Year: number
  gbpYear: number
  turbinesEquiv: number
  ccgtFraction: number
  pctOfEveningPeak: number | null
}

export function fleetStats(
  run: RunLike,
  homes: number,
  eveningPeakMw: number | null,
): FleetStats {
  const day = run.typical_day
  // kWh per half-hour × 2 = average kW that half-hour; peak over the evening window
  const peakKwPerHome = Math.max(
    0,
    ...day.filter((b) => EVENING(b.settlement_period)).map((b) => b.discharge_kwh * 2),
  )
  const fleetMw = (homes * peakKwPerHome) / 1000
  const dischargeKwhDay = day.reduce((sum, b) => sum + b.discharge_kwh, 0)
  return {
    peakKwPerHome,
    fleetMw,
    gwhShiftedYear: (homes * dischargeKwhDay * 365) / 1e6,
    tonnesCo2Year: (homes * run.carbon_saved_kg_year) / 1000,
    gbpYear: homes * run.saving_gbp_year,
    turbinesEquiv: fleetMw / WIND_TURBINE_MW,
    ccgtFraction: fleetMw / CCGT_UNIT_MW,
    pctOfEveningPeak: eveningPeakMw ? (fleetMw / eveningPeakMw) * 100 : null,
  }
}

/** The fleet's average discharge per hour of day, in MW (for the demand-curve carve). */
export function fleetMwByHour(run: RunLike, homes: number): number[] {
  const bySp = new Map(run.typical_day.map((b) => [b.settlement_period, b.discharge_kwh]))
  return Array.from({ length: 24 }, (_, h) => {
    const a = bySp.get(h * 2 + 1) ?? 0
    const b = bySp.get(h * 2 + 2) ?? 0
    // two half-hours → average kW over the hour, × homes → MW
    return (homes * (a + b)) / 1000
  })
}

const nf = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 })

export const fmtHomes = (homes: number) => nf.format(homes)

export const fmtPower = (mw: number) => {
  if (mw < 1) return `${nf.format(mw * 1000)} kW`
  if (mw >= 1000) return `${nf.format(mw / 1000)} GW`
  return `${nf.format(mw)} MW`
}

export const fmtGbp = (gbp: number) => {
  if (gbp >= 1_000_000) return `£${nf.format(gbp / 1_000_000)}m`
  if (gbp >= 1_000) return `£${nf.format(gbp / 1_000)}k`
  return `£${nf.format(gbp)}`
}
