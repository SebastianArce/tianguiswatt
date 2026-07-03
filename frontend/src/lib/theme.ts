/** Design tokens shared with src/index.css, for use where Tailwind classes can't reach
 *  (ECharts options). Keep in sync with the `@theme` block. */
export const chart = {
  ink: '#17211f',
  teal: '#14716b',
  slate: '#54615b',
  muted: '#8a938f',
  line: 'rgba(20,30,28,0.12)',
  font: "'IBM Plex Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', monospace",
} as const

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
