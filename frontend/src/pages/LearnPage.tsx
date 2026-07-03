import type { ReactNode } from 'react'

/** An inline glossary term: dotted underline + a native tooltip on hover. */
function Term({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span title={title} className="cursor-help border-b border-dotted border-teal">
      {children}
    </span>
  )
}

const MARKETS = [
  { name: 'Forward', desc: 'Years → days ahead. Hedging via futures.' },
  { name: 'Day-ahead', desc: '11:00 auction on the exchange for each hour of D+1.' },
  { name: 'Intraday', desc: 'Continuous trading up to ~1h before delivery.' },
  { name: 'Balancing', desc: 'Gate closure → real time. NESO balances the system.' },
]

const PLAYERS = [
  {
    name: 'NESO',
    desc: 'National Energy System Operator — dispatches and balances the grid second by second.',
  },
  {
    name: 'Ofgem',
    desc: 'The regulator — sets the rules, network price controls and the consumer price cap.',
  },
  {
    name: 'Elexon',
    desc: 'Administers the Balancing & Settlement Code — meters, reconciles and settles imbalance.',
  },
  {
    name: 'Generators & Suppliers',
    desc: 'Sell power into the market; suppliers buy wholesale and retail it to homes and firms.',
  },
]

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
      {children}
    </div>
  )
}

export function LearnPage() {
  return (
    <article className="max-w-3xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          The market, explained
        </div>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
          How the GB market sets a price
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate">
          Great Britain runs a marginal-price market. Here's how a wholesale price gets set
          every half hour — and who's in the room when it happens.
        </p>
      </header>

      {/* narrative + margin notes */}
      <section className="grid gap-8 md:grid-cols-[1fr_190px]">
        <div className="space-y-4">
          <p className="font-display text-lg leading-relaxed text-ink/90">
            Every half hour is a{' '}
            <Term title="A 30-minute period — the unit of time the market prices and settles against.">
              settlement period
            </Term>
            . The cheapest available generation is dispatched first; the most expensive unit
            needed to meet demand — the{' '}
            <Term title="The last generator dispatched to meet demand. Its bid sets the price for the whole market.">
              marginal unit
            </Term>{' '}
            — sets the price paid to <em>everyone</em>.
          </p>
          <p className="font-display text-lg leading-relaxed text-ink/90">
            Because gas plants usually sit at that margin, the wholesale price tracks gas and{' '}
            <Term title="UK Emissions Trading Scheme — generators buy allowances per tonne of CO₂, adding to the cost of fossil generation.">
              UK&nbsp;ETS carbon
            </Term>{' '}
            costs, even when most electricity that hour came from wind and nuclear.
          </p>
        </div>
        <aside className="space-y-4 pt-1">
          <div className="border-l-2 border-solar pl-3">
            <Eyebrow>Aside</Eyebrow>
            <p className="mt-1 text-xs leading-relaxed text-slate">
              Coal left the GB mix entirely in 2024 — the last plant, Ratcliffe-on-Soar,
              closed after 57 years.
            </p>
          </div>
          <div className="border-l-2 border-teal pl-3">
            <Eyebrow>Key term</Eyebrow>
            <p className="mt-1 text-xs leading-relaxed text-slate">
              <span className="font-semibold text-ink">SRMC</span> — short-run marginal cost,
              the fuel + carbon cost of one more MWh.
            </p>
          </div>
        </aside>
      </section>

      {/* markets in sequence */}
      <section className="mt-12">
        <Eyebrow>The markets, in sequence</Eyebrow>
        <div className="relative mt-5">
          <div className="absolute top-[5px] right-[10%] left-[10%] hidden h-px bg-gradient-to-r from-wind to-teal sm:block" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {MARKETS.map((m) => (
              <div key={m.name} className="relative">
                <div className="mb-3 h-3 w-3 rounded-full border-2 border-mist bg-teal" />
                <div className="text-sm font-semibold text-ink">{m.name}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* who's in the room */}
      <section className="mt-12">
        <Eyebrow>Who's in the room</Eyebrow>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PLAYERS.map((p) => (
            <div
              key={p.name}
              className="rounded-[10px] border border-line bg-paper p-4"
            >
              <div className="text-sm font-semibold text-ink">{p.name}</div>
              <div className="mt-1 text-xs leading-relaxed text-slate">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}
