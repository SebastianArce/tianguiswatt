import { LiveIndicator } from '@/components/LiveIndicator'
import { useSnapshot } from '@/hooks/api'

const fmt = (v: number | null | undefined, digits = 0) =>
  v == null ? '—' : v.toLocaleString(undefined, { maximumFractionDigits: digits })

function HeroStat({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="border-l-2 border-teal/60 pl-4">
      <div className="font-mono text-2xl text-hero-ink sm:text-3xl">
        {value}
        <span className="ml-1 text-sm text-hero-ink/60">{unit}</span>
      </div>
      <div className="mt-1 text-xs tracking-wide text-hero-ink/60">{label}</div>
    </div>
  )
}

/** The opening screen: the live grid, and the thesis the rest of the page argues. */
export function HeroSection() {
  const { data } = useSnapshot()
  return (
    <section className="bg-hero text-hero-ink">
      <div className="mx-auto flex min-h-[calc(100vh-4.5rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
            GB grid · live
          </span>
          <LiveIndicator />
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">
          The grid is balancing itself this exact half-hour. Your home could be helping.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-hero-ink/70">
          Below are the live numbers: a wholesale price, a carbon intensity, a national
          demand the system operator must meet second by second. This page argues — with
          a year of replayed market data, not forecasts — that the cheapest flexibility
          on that grid is sitting in people's homes, and that software turns it into a
          power station.
        </p>

        <div className="mt-10 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          <HeroStat
            value={fmt(data?.price?.system_price, 2)}
            unit="£/MWh"
            label="system price, this settlement period"
          />
          <HeroStat
            value={fmt(data?.carbon?.intensity_gco2)}
            unit="gCO₂/kWh"
            label="carbon intensity of a unit right now"
          />
          <HeroStat
            value={fmt(
              data?.supply_demand ? data.supply_demand.demand_mw / 1000 : null,
              1,
            )}
            unit="GW"
            label="national demand being met"
          />
        </div>

        <a
          href="#engine-room"
          className="mt-14 inline-flex items-center gap-2 text-sm text-hero-ink/60 transition-colors hover:text-hero-ink"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
          the argument, in six moves
        </a>
      </div>
    </section>
  )
}
