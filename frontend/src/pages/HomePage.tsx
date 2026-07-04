import { AcceptedActions } from '@/components/AcceptedActions'
import { BalancingPanel } from '@/components/BalancingPanel'
import { CarbonCard } from '@/components/CarbonCard'
import { GenerationStackCard } from '@/components/GenerationStackCard'
import { InterconnectorFlows } from '@/components/InterconnectorFlows'
import { LiveIndicator } from '@/components/LiveIndicator'
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
            The state of the grid
          </h1>
        </div>
        <LiveIndicator />
      </div>

      <StatTicker />

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GenerationStackCard />
        </div>
        <div className="flex flex-col gap-4">
          <InterconnectorFlows />
          <BalancingPanel />
          <AcceptedActions />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SupplyDemandCard />
        <CarbonCard />
        <PricesCard />
      </div>
    </div>
  )
}
