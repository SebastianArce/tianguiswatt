import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { SectionShell } from '@/components/story/SectionShell'
import { useStory } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme } from '@/lib/theme'

const AGILE = '#d7a13f'

// Neutral ramp for the fee strip; wholesale wears the brand teal to tie it back to
// the wholesale line in the chart above.
const FEE_COLORS = ['#14716b', '#8b909a', '#a7afab', '#6f747c', '#c5cac7']

function WedgeChart() {
  const { data } = useStory()
  const chart = useChartTheme()
  const option = useMemo<EChartsOption>(() => {
    const rows = data?.monthly ?? []
    const cat = rows.map((m) =>
      new Date(m.month).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    )
    return {
      legend: {
        top: 0,
        textStyle: { color: chart.slate, fontSize: 11 },
        data: ['Wholesale', 'Agile retail'],
      },
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(1)}p/kWh` },
      grid: { left: 44, right: 16, top: 30, bottom: 26 },
      xAxis: {
        type: 'category',
        data: cat,
        axisLabel: { color: chart.muted, interval: 1 },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: 'p/kWh',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
        // keep the price-cap markLine on-canvas even when the series sit below it
        max: (extent: { max: number }) =>
          Math.ceil(Math.max(extent.max, (data?.price_cap_p_kwh ?? 0) * 1.1)),
      },
      series: [
        {
          name: 'Wholesale',
          type: 'line',
          data: rows.map((m) => {
            const gbp = m.apx_gbp_mwh ?? m.system_gbp_mwh
            return gbp == null ? null : +(gbp / 10).toFixed(2)
          }),
          lineStyle: { color: chart.muted, width: 2 },
          itemStyle: { color: chart.muted },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'Agile retail',
          type: 'line',
          data: rows.map((m) => m.agile_import_p_kwh),
          lineStyle: { color: AGILE, width: 2 },
          itemStyle: { color: AGILE },
          symbol: 'none',
          smooth: true,
          markLine: data
            ? {
                silent: true,
                symbol: 'none',
                lineStyle: { color: chart.ink, type: 'dashed', width: 1 },
                label: {
                  color: chart.slate,
                  fontSize: 10,
                  formatter: data.price_cap_label,
                  position: 'insideEndTop',
                },
                data: [{ yAxis: data.price_cap_p_kwh }],
              }
            : undefined,
        },
      ],
    }
  }, [data, chart])
  const ref = useECharts(option)
  return <div ref={ref} className="h-[300px] w-full" />
}

/** The fee strip: what a capped unit rate actually buys, as a proportional bar. */
function FeeStrip() {
  const { data } = useStory()
  const stack = data?.fee_stack ?? []
  if (!stack.length) return null
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-md">
        {stack.map((fee, i) => (
          <div
            key={fee.name}
            style={{ width: `${fee.share_pct}%`, backgroundColor: FEE_COLORS[i] }}
            title={`${fee.name} · ${fee.share_pct}%`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {stack.map((fee, i) => (
          <span key={fee.name} className="inline-flex items-center gap-1.5 text-xs text-slate">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: FEE_COLORS[i] }}
            />
            {fee.name} <span className="font-mono text-muted">{fee.share_pct}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Section 3: the retail wedge — flat tariffs hide the half-hourly signal. */
export function WedgeSection() {
  const { data } = useStory()
  return (
    <SectionShell
      id="wedge"
      eyebrow="Move two · The bill"
      title="Your tariff flattens the whole thing into one number."
      tone="raised"
      lede={
        <p>
          Most households pay a flat unit rate near the price cap, whatever the
          half-hour costs — the volatility above never reaches them. A pass-through
          tariff like Agile keeps the shape. The gap between the wholesale line and
          what homes actually pay is networks, policy, margin and VAT — and inside
          that gap is the room a battery has to work with.
        </p>
      }
    >
      {(inView) => (
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
            <h3 className="font-display text-lg text-ink">
              Wholesale vs what a home pays, month by month
            </h3>
            {inView ? <WedgeChart /> : <div className="h-[300px]" />}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Monthly averages over the backtest window: the APX day-ahead reference
              (falling back to the system price) against the real Agile import rate,
              with the current price cap for scale.
            </p>
          </div>
          <div className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
            <h3 className="font-display text-lg text-ink">What a capped unit rate buys</h3>
            <p className="mt-1 mb-4 text-xs leading-relaxed text-slate">
              Approximate shares of the{' '}
              {data?.price_cap_label ?? 'current price cap'} (
              {data ? `${data.price_cap_p_kwh}p/kWh` : '—'}), per Ofgem's published
              breakdown.
            </p>
            <FeeStrip />
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Only the wholesale slice varies half-hour by half-hour — which is exactly
              the slice a battery can play.
            </p>
          </div>
        </div>
      )}
    </SectionShell>
  )
}
