import { useTheme } from '@/hooks/useTheme'

const FONT = "'IBM Plex Sans', system-ui, sans-serif"
const MONO = "'IBM Plex Mono', monospace"

/** Chart-only palette. ECharts can't read CSS variables, so the neutral colours are
 *  duplicated here per theme (keep the light values in sync with the `@theme` block and
 *  the dark values with the `.dark` rule in src/index.css). Brand/fuel colours below are
 *  shared across themes. */
export type ChartPalette = {
  ink: string
  teal: string
  slate: string
  muted: string
  line: string
  font: string
  mono: string
  /** low-opacity area fill under a line series */
  areaFill: string
  /** heatmap visualMap ramp: low → mid → high */
  heatRamp: [string, string, string]
}

const CHART_PALETTES: Record<'light' | 'dark', ChartPalette> = {
  light: {
    ink: '#17211f',
    teal: '#14716b',
    slate: '#54615b',
    muted: '#8a938f',
    line: 'rgba(20,30,28,0.12)',
    font: FONT,
    mono: MONO,
    areaFill: 'rgba(20,113,107,0.08)',
    heatRamp: ['#eef3f1', '#7fb0a9', '#14716b'],
  },
  dark: {
    ink: '#e9ede9',
    teal: '#4a9d94',
    slate: '#a7b0ab',
    muted: '#8a938f',
    line: 'rgba(233,241,236,0.12)',
    font: FONT,
    mono: MONO,
    areaFill: 'rgba(74,157,148,0.18)',
    heatRamp: ['#16302c', '#2f7d74', '#5fd0c4'],
  },
}

/** Chart palette for the active theme. Returns a new object identity on toggle, so charts
 *  that list it in their option `useMemo` deps rebuild and re-apply. */
export function useChartTheme(): ChartPalette {
  return CHART_PALETTES[useTheme().theme]
}

const INTERCONNECT = '#5f9e78'

/** Per-fuel colours keyed by the API's FUELINST fuel codes. */
const FUEL_COLORS: Record<string, string> = {
  WIND: '#3f8d84',
  SOLAR: '#d7a13f',
  NUCLEAR: '#5f74a8',
  CCGT: '#8b909a',
  OCGT: '#6f747c',
  OIL: '#4a4f55',
  COAL: '#333a40',
  BIOMASS: '#9a7d5e',
  NPSHYD: '#5987a6',
  PS: '#5987a6',
  OTHER: '#a7afab',
}

/** Colour for a fuel code; interconnectors (INT*) share one colour, unknown → grey. */
export function fuelColor(code: string | undefined): string {
  if (!code) return '#a7afab'
  const c = code.toUpperCase()
  if (c.startsWith('INT')) return INTERCONNECT
  return FUEL_COLORS[c] ?? '#a7afab'
}

/** Display fuel families for the 24h generation stack, in bottom-to-top stacking order. */
export const FUEL_GROUPS = [
  { key: 'Nuclear', color: '#5f74a8' },
  { key: 'Gas', color: '#8b909a' },
  { key: 'Biomass', color: '#9a7d5e' },
  { key: 'Hydro', color: '#5987a6' },
  { key: 'Imports', color: INTERCONNECT },
  { key: 'Wind', color: '#3f8d84' },
  { key: 'Solar', color: '#d7a13f' },
  { key: 'Other', color: '#6f747c' },
] as const

/** Map a raw FUELINST fuel code to its display family. */
export function fuelGroup(code: string): string {
  const c = code.toUpperCase()
  if (c.startsWith('INT')) return 'Imports'
  if (c === 'CCGT' || c === 'OCGT') return 'Gas'
  if (c === 'NPSHYD' || c === 'PS') return 'Hydro'
  if (c === 'WIND') return 'Wind'
  if (c === 'SOLAR') return 'Solar'
  if (c === 'NUCLEAR') return 'Nuclear'
  if (c === 'BIOMASS') return 'Biomass'
  return 'Other' // COAL, OIL, OTHER, …
}
