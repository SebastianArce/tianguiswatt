import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useBidStack } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { chart } from '@/lib/theme'

const ACCEPTED_COLOUR = '#d7a13f' // amber

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-paper px-4 py-3">
      <div className="font-mono text-[9.5px] tracking-[0.1em] text-muted uppercase">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-xl leading-none text-ink">{value}</span>
        {unit && <span className="font-mono text-[11px] text-muted">{unit}</span>}
      </div>
    </div>
  )
}

export function ExplorePage() {
  const { data } = useBidStack()

  const { option, stats } = useMemo(() => {
    const entries = data?.entries ?? []
    const line: [number, number][] = []
    const acceptedPts: [number, number][] = []
    let cum = 0
    let acceptedMax = 0
    let acceptedMw = 0
    for (const e of entries) {
      line.push([cum, e.offer_price]) // segment start
      cum += e.volume_mw
      line.push([cum, e.offer_price]) // segment end (horizontal at this price)
      if (e.accepted) {
        acceptedPts.push([cum - e.volume_mw / 2, e.offer_price])
        acceptedMax = Math.max(acceptedMax, e.offer_price)
        acceptedMw += e.volume_mw
      }
    }
    const opt: EChartsOption = {
      tooltip: { trigger: 'axis' },
      grid: { left: 58, right: 20, top: 16, bottom: 44 },
      xAxis: {
        type: 'value',
        name: 'Cumulative offer volume (MW)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: '£/MWh',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        {
          name: 'Offer stack',
          type: 'line',
          data: line,
          showSymbol: false,
          lineStyle: { color: chart.teal, width: 1.5 },
          areaStyle: { color: 'rgba(20,113,107,0.08)' },
        },
        {
          name: 'Accepted',
          type: 'scatter',
          data: acceptedPts,
          symbolSize: 7,
          itemStyle: { color: ACCEPTED_COLOUR },
        },
      ],
    }
    return {
      option: opt,
      stats: { total: cum, units: entries.length, acceptedMax, acceptedMw },
    }
  }, [data])

  const chartRef = useECharts(option)

  return (
    <div>
      <header className="mb-5 max-w-2xl">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          Explore · Balancing mechanism
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          The balancing offer stack
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Every BM unit's cheapest offer to increase output, from real Elexon bid-offer data,
          stacked cheapest-first. Amber marks units NESO actually accepted — the last one sets
          what balancing costs.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-line bg-line sm:grid-cols-4">
        <Tile
          label="Settlement period"
          value={data?.settlement_period != null ? String(data.settlement_period) : '—'}
        />
        <Tile label="Units offering" value={String(stats.units)} />
        <Tile label="Offered volume" value={stats.total.toFixed(0)} unit="MW" />
        <Tile
          label="Marginal accepted"
          value={stats.acceptedMax ? `£${stats.acceptedMax.toFixed(0)}` : '—'}
          unit="/MWh"
        />
      </div>

      <div className="rounded-[10px] border border-line bg-paper p-5">
        <div className="mb-3 flex items-center gap-5">
          <span className="flex items-center gap-2 text-xs text-slate">
            <span className="h-0.5 w-4 bg-teal" /> Offer stack
          </span>
          <span className="flex items-center gap-2 text-xs text-slate">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: ACCEPTED_COLOUR }}
            />{' '}
            Accepted by NESO
          </span>
        </div>
        <div ref={chartRef} className="h-[420px] w-full" />
        {stats.units === 0 && (
          <p className="-mt-56 text-center text-sm text-muted">
            Warming up — waiting for the latest balancing-mechanism data.
          </p>
        )}
      </div>

      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted">
        This is the <strong className="text-slate">balancing mechanism</strong> (post-gate-closure
        system balancing), not the day-ahead wholesale market. Per-unit volume is the offer band
        (max − min offer level across its price pairs).
      </p>
    </div>
  )
}
