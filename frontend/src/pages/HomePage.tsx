import { CarbonCard } from '@/components/CarbonCard'
import { GenerationMixCard } from '@/components/GenerationMixCard'
import { SupplyDemandCard } from '@/components/SupplyDemandCard'

export function HomePage() {
  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          Live · GB system
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          The grid, right now
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate">
          A live view of GB generation, demand and carbon intensity — updating
          automatically as new data arrives.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GenerationMixCard />
        <SupplyDemandCard />
        <CarbonCard />
      </div>
    </div>
  )
}
