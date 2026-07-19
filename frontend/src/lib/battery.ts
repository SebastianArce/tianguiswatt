/** Shared Battery Lab vocabulary: option sets, strategy identity, and formatters —
 *  used by the lab page and the narrative front page's configurator. */

export type PresetKey = '5kwh' | '10kwh' | '13.5kwh'
export type HouseholdKey = 'low' | 'medium' | 'high' | 'electrified'
export type SolarKey = 'none' | '3.5kwp' | '5kwp'
export type StrategyKey = 'arbitrage' | 'self_consumption' | 'green'

/** Fixed strategy identity — colours are assigned to the entity, shared across themes
 *  like the fuel palette, and always paired with a visible label. */
export const STRATEGIES: Record<
  StrategyKey,
  { label: string; color: string; blurb: string }
> = {
  arbitrage: {
    label: 'Arbitrage',
    color: '#d7a13f',
    blurb:
      'Buy cheap overnight, sell back at the evening peak. No household involved — the battery trades the import/export spread alone, so every kWh out earns only the export rate.',
  },
  self_consumption: {
    label: 'Self-consumption',
    color: '#14716b',
    blurb:
      'Charge cheap, then power the house through the evening peak instead of importing. Each shifted kWh is worth the full import rate — this is how home batteries actually pay back.',
  },
  green: {
    label: 'Green',
    color: '#5f9e78',
    blurb:
      'The same battery optimised for carbon instead of pence: charge when the grid is cleanest, displace it when it is dirtiest — and see what that choice costs.',
  },
}
export const STRATEGY_KEYS = Object.keys(STRATEGIES) as StrategyKey[]

export const PRESETS: { label: string; value: PresetKey }[] = [
  { label: '5 kWh', value: '5kwh' },
  { label: '10 kWh', value: '10kwh' },
  { label: '13.5 kWh', value: '13.5kwh' },
]

// Ofgem's July-2026 TDCV bands (low/medium/high) + an illustrative electrified home;
// the server scales the same typical daily shape to the chosen annual level.
export const HOUSEHOLDS: { label: string; value: HouseholdKey }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Typical', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'EV / heat pump', value: 'electrified' },
]

export const SOLAR_OPTIONS: { label: string; value: SolarKey }[] = [
  { label: 'None', value: 'none' },
  { label: '3.5 kWp', value: '3.5kwp' },
  { label: '5 kWp', value: '5kwp' },
]

// Sunlight hue for generation series — deliberately distinct from the #d7a13f price gold.
export const SUN = '#e2c044'

export const gbp = (v: number) =>
  `${v < 0 ? '−' : ''}£${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

/** "SP 35" → "17:00" (settlement periods count from 00:00 local). */
export const spLabel = (sp: number) => {
  const mins = (sp - 1) * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${mins % 60 ? '30' : '00'}`
}
