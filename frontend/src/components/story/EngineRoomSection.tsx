import { Link } from 'react-router-dom'
import { SectionShell } from '@/components/story/SectionShell'
import { useSnapshot } from '@/hooks/api'

const INSTRUMENTS = [
  {
    to: '/live',
    title: 'Live grid',
    desc: 'The control room: generation mix, interconnectors, frequency, balancing — refreshed with every settlement period.',
  },
  {
    to: '/battery',
    title: 'Battery Lab',
    desc: 'The full simulator behind the numbers above: three strategies, battery sizes, households, solar.',
  },
  {
    to: '/bid-stack',
    title: 'Bid stack',
    desc: 'The balancing-mechanism merit order, with the offers the system operator actually accepted.',
  },
  {
    to: '/trends',
    title: 'Trends',
    desc: 'How demand, generation, price and carbon typically behave, from a warehouse of half-hours.',
  },
  {
    to: '/explore',
    title: 'Explore',
    desc: 'Any core metric, any window, any granularity — aggregated server-side.',
  },
  {
    to: '/learn',
    title: 'Learn',
    desc: 'How a marginal-price market sets the price of every half-hour.',
  },
]

/** The closing section: everything above is a summary of instruments that are live. */
export function EngineRoomSection() {
  const { data } = useSnapshot()
  return (
    <SectionShell
      id="engine-room"
      eyebrow="The engine room"
      title="This page is a summary. The instruments are live."
      lede={
        <p>
          Every number above comes from a pipeline ingesting the GB grid every fifteen
          minutes — Elexon settlement data, NESO carbon intensity, Octopus tariff rates,
          Sheffield Solar's national PV estimate. These are the instruments it feeds.
        </p>
      }
    >
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INSTRUMENTS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="group rounded-[10px] border border-line bg-paper p-5 shadow-sm transition-colors hover:border-teal/50"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-display text-lg text-ink">{card.title}</span>
              {card.to === '/live' && data?.price ? (
                <span className="font-mono text-xs text-teal">
                  £{data.price.system_price.toFixed(0)}/MWh now
                </span>
              ) : (
                <span className="text-muted transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate">{card.desc}</p>
          </Link>
        ))}
      </div>
    </SectionShell>
  )
}
