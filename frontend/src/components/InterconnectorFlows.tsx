import { useSnapshot } from '@/hooks/api'
import { interconnectorFlows } from '@/lib/interconnectors'

const IMPORT = '#3f8d84'
const EXPORT = '#b4562f'

export function InterconnectorFlows() {
  const { data } = useSnapshot()
  const flows = interconnectorFlows(data?.generation ?? [])

  return (
    <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
        Interconnector flows
      </h2>
      <ul className="mt-3 space-y-2">
        {flows.length === 0 && <li className="text-xs text-muted">No data yet.</li>}
        {flows.map((f) => {
          const importing = f.mw >= 0
          const gw = Math.abs(f.mw) / 1000
          return (
            <li
              key={f.country}
              className="flex items-baseline justify-between gap-3"
            >
              <span className="text-sm text-ink">
                {f.country}
                <span className="ml-1.5 text-[11px] text-muted">
                  {f.links.join(' + ')}
                </span>
              </span>
              <span
                className="font-mono text-sm whitespace-nowrap"
                style={{ color: importing ? IMPORT : EXPORT }}
              >
                {importing ? '▸ +' : '◂ −'}
                {gw.toFixed(1)} GW
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
