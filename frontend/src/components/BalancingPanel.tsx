import { useSnapshot } from '@/hooks/api'

export function BalancingPanel() {
  const { data } = useSnapshot()
  const niv = data?.price?.net_imbalance_volume
  const short = niv != null && niv >= 0

  return (
    <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
        Balancing mechanism
      </h2>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink">Net imbalance (NIV)</span>
        <span className="font-mono text-sm whitespace-nowrap text-ink">
          {niv != null
            ? `${niv >= 0 ? '+' : '−'}${Math.abs(niv).toFixed(0)} MWh ${short ? 'short' : 'long'}`
            : '—'}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate">Gate closure</span>
        <span className="font-mono text-xs text-muted">1h before delivery</span>
      </div>
    </section>
  )
}
