/** GB interconnector fuel codes → the country + link they connect. */
const LINKS: Record<string, { country: string; link: string }> = {
  INTFR: { country: 'France', link: 'IFA' },
  INTIFA2: { country: 'France', link: 'IFA2' },
  INTELEC: { country: 'France', link: 'ElecLink' },
  INTNED: { country: 'Netherlands', link: 'BritNed' },
  INTNSL: { country: 'Norway', link: 'North Sea Link' },
  INTEW: { country: 'Ireland', link: 'East–West' },
  INTIRL: { country: 'Ireland', link: 'Moyle' },
  INTGRNL: { country: 'Ireland', link: 'Greenlink' },
  INTVKL: { country: 'Denmark', link: 'Viking Link' },
  INTNEM: { country: 'Belgium', link: 'Nemo Link' },
}

export type CountryFlow = { country: string; links: string[]; mw: number }

/** Aggregate the interconnector fuels in a generation list into per-country flows.
 *  Positive MW = importing into GB; negative = exporting. */
export function interconnectorFlows(
  generation: { fuel_type: string; generation_mw: number }[],
): CountryFlow[] {
  const byCountry = new Map<string, CountryFlow>()
  for (const g of generation) {
    const meta = LINKS[g.fuel_type.toUpperCase()]
    if (!meta) continue
    const entry = byCountry.get(meta.country) ?? {
      country: meta.country,
      links: [],
      mw: 0,
    }
    entry.links.push(meta.link)
    entry.mw += g.generation_mw
    byCountry.set(meta.country, entry)
  }
  return [...byCountry.values()].sort((a, b) => b.mw - a.mw)
}
