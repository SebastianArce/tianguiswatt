import { useSnapshot } from '@/hooks/api'

type Tile = { label: string; value: string; unit: string; accent?: string }

export function StatTicker() {
  const { data } = useSnapshot()
  const price = data?.price
  const sd = data?.supply_demand
  const carbon = data?.carbon
  const wind = data?.generation?.find((g) => g.fuel_type === 'WIND')?.share_pct
  const freq = data?.frequency_hz

  const dash = '—'
  const tiles: Tile[] = [
    {
      label: 'System price',
      value: price ? `£${price.system_price.toFixed(2)}` : dash,
      unit: '/MWh',
      accent: 'text-teal',
    },
    {
      label: 'Demand',
      value: sd ? (sd.demand_mw / 1000).toFixed(1) : dash,
      unit: 'GW',
    },
    {
      label: 'Frequency',
      value: freq != null ? freq.toFixed(2) : dash,
      unit: 'Hz',
    },
    {
      label: 'Carbon',
      value: carbon?.intensity_gco2?.toString() ?? dash,
      unit: 'gCO₂/kWh',
    },
    {
      label: 'Wind share',
      value: wind != null ? wind.toFixed(0) : dash,
      unit: '%',
      accent: 'text-wind',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-5">
      {tiles.map((t, i) => (
        <div
          key={t.label}
          className={`bg-paper px-4 py-3 ${i === 0 ? 'max-sm:col-span-2' : ''}`}
        >
          <div className="font-mono text-[9.5px] tracking-[0.1em] text-muted uppercase">
            {t.label}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`font-mono text-2xl leading-none ${t.accent ?? 'text-ink'}`}>
              {t.value}
            </span>
            <span className="font-mono text-[11px] text-muted">{t.unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
