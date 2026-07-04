import type { EChartsOption } from 'echarts'
import { useMemo, useState } from 'react'
import { LiveIndicator } from '@/components/LiveIndicator'
import { useProfile } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { chart } from '@/lib/theme'

type Metric = 'demand' | 'generation' | 'carbon' | 'price'

const METRICS: Record<Metric, { label: string; unit: string; color: string }> = {
  demand: { label: 'Demand', unit: 'MW', color: '#14716b' },
  generation: { label: 'Generation', unit: 'MW', color: '#3f8d84' },
  carbon: { label: 'Carbon', unit: 'gCO₂/kWh', color: '#5f74a8' },
  price: { label: 'Price', unit: '£/MWh', color: '#d7a13f' },
}
const WINDOWS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 })

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-line bg-paper p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
            value === o.value ? 'bg-ink text-paper' : 'text-slate hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TrendsPage() {
  const [metric, setMetric] = useState<Metric>('demand')
  const [days, setDays] = useState(30)
  const { data } = useProfile(metric, days)
  const meta = METRICS[metric]
  // Intraday percentile bands (p10–p90 outer + p25–p75 inner) with a median line.
  const bandsOption = useMemo<EChartsOption>(() => {
    const intraday = data?.intraday ?? []
    const cat = intraday.map((b) => String(b.hour).padStart(2, '0'))
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const ps = params as unknown as { dataIndex: number }[]
          const b = intraday[ps[0]?.dataIndex]
          if (!b) return ''
          return `${String(b.hour).padStart(2, '0')}:00<br/>median <b>${fmt(b.p50)}</b> ${meta.unit}<br/>p10–p90 ${fmt(b.p10)}–${fmt(b.p90)}`
        },
      },
      grid: { left: 58, right: 16, top: 12, bottom: 28 },
      xAxis: {
        type: 'category',
        data: cat,
        axisLabel: { color: chart.muted, interval: 3 },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: meta.unit,
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
        scale: true,
      },
      series: [
        // outer band: p10 (invisible base) + (p90 − p10) filled
        {
          type: 'line',
          stack: 'outer',
          data: intraday.map((b) => +b.p10.toFixed(1)),
          lineStyle: { opacity: 0 },
          symbol: 'none',
          silent: true,
        },
        {
          type: 'line',
          stack: 'outer',
          data: intraday.map((b) => +(b.p90 - b.p10).toFixed(1)),
          lineStyle: { opacity: 0 },
          areaStyle: { color: meta.color, opacity: 0.1 },
          symbol: 'none',
          silent: true,
        },
        // inner band: p25 (invisible base) + (p75 − p25) filled
        {
          type: 'line',
          stack: 'inner',
          data: intraday.map((b) => +b.p25.toFixed(1)),
          lineStyle: { opacity: 0 },
          symbol: 'none',
          silent: true,
        },
        {
          type: 'line',
          stack: 'inner',
          data: intraday.map((b) => +(b.p75 - b.p25).toFixed(1)),
          lineStyle: { opacity: 0 },
          areaStyle: { color: meta.color, opacity: 0.18 },
          symbol: 'none',
          silent: true,
        },
        // median
        {
          type: 'line',
          data: intraday.map((b) => +b.p50.toFixed(1)),
          lineStyle: { color: meta.color, width: 2 },
          symbol: 'none',
          smooth: true,
        },
      ],
    }
  }, [data, meta])

  // Weekday × hour heatmap of the median value.
  const heatOption = useMemo<EChartsOption>(() => {
    const weekly = data?.weekly ?? []
    const vals = weekly.map((c) => c.median)
    return {
      tooltip: {
        position: 'top',
        formatter: (p) => {
          const d = (p as unknown as { data: [number, number, number] }).data
          return `${WEEKDAYS[d[1]]} ${String(d[0]).padStart(2, '0')}:00<br/>median <b>${fmt(d[2])}</b> ${meta.unit}`
        },
      },
      grid: { left: 42, right: 12, top: 8, bottom: 52 },
      xAxis: {
        type: 'category',
        data: HOURS,
        splitArea: { show: true },
        axisLabel: { color: chart.muted, interval: 3 },
      },
      yAxis: {
        type: 'category',
        data: WEEKDAYS,
        splitArea: { show: true },
        axisLabel: { color: chart.muted },
      },
      visualMap: {
        min: vals.length ? Math.min(...vals) : 0,
        max: vals.length ? Math.max(...vals) : 1,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 4,
        itemWidth: 12,
        itemHeight: 90,
        inRange: { color: ['#eef3f1', '#7fb0a9', '#14716b'] },
        textStyle: { color: chart.muted, fontSize: 10 },
      },
      series: [
        {
          type: 'heatmap',
          data: weekly.map((c) => [c.hour, c.weekday - 1, +c.median.toFixed(1)]),
          itemStyle: { borderColor: chart.line, borderWidth: 0.5 },
        },
      ],
    }
  }, [data, meta])

  const bandsRef = useECharts(bandsOption)
  const heatRef = useECharts(heatOption)
  const empty = (data?.intraday?.length ?? 0) === 0

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <header className="max-w-2xl">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          GB market · analysis
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">Market trends</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          How {meta.label.toLowerCase()} typically behaves — across the day and across the week —
          aggregated in ClickHouse from the last {days} days.
        </p>
        </header>
        <LiveIndicator />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Segmented
          options={(Object.keys(METRICS) as Metric[]).map((m) => ({
            label: METRICS[m].label,
            value: m,
          }))}
          value={metric}
          onChange={setMetric}
        />
        <Segmented options={WINDOWS} value={days} onChange={setDays} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
          <h2 className="font-display text-lg text-ink">A typical day</h2>
          <p className="mt-0.5 text-xs text-slate">
            Median with the p10–p90 and p25–p75 spread, by hour
          </p>
          <div ref={bandsRef} className="mt-3 h-[280px] w-full sm:h-[320px]" />
          {empty && (
            <p className="-mt-40 text-center text-sm text-muted">
              Not enough history yet.
            </p>
          )}
        </section>

        <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
          <h2 className="font-display text-lg text-ink">By day &amp; hour</h2>
          <p className="mt-0.5 text-xs text-slate">Median for each weekday and hour</p>
          <div ref={heatRef} className="mt-3 h-[280px] w-full sm:h-[320px]" />
        </section>
      </div>
    </div>
  )
}
