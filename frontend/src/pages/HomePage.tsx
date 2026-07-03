import { CarbonCard } from '@/components/CarbonCard'
import { GenerationMixCard } from '@/components/GenerationMixCard'
import { PricesCard } from '@/components/PricesCard'
import { StatTicker } from '@/components/StatTicker'
import { SupplyDemandCard } from '@/components/SupplyDemandCard'

export function HomePage() {
  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
            GB system · live
          </div>
          <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
            The grid, right now
          </h1>
        </div>
        <span className="flex items-center gap-2 font-mono text-[11px] text-wind">
          <span className="h-1.5 w-1.5 rounded-full bg-wind" /> live feed
        </span>
      </div>

      <StatTicker />

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GenerationMixCard />
        <SupplyDemandCard />
        <CarbonCard />
        <PricesCard />
      </div>
    </div>
  )
}
