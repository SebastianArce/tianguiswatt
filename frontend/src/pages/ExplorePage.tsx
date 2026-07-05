import type { EChartsOption } from 'echarts'
import { useMemo, useState } from 'react'
import { LiveIndicator } from '@/components/LiveIndicator'
import { useTimeseries } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme } from '@/lib/theme'

type Metric = 'demand' | 'generation' | 'carbon' | 'price'
type Granularity = 'sp' | 'hour' | 'day'

const METRICS: Record<Metric, { label: string; unit: string; color: string }> = {
  demand: { label: 'Demand', unit: 'MW', color: '#14716b' },
  generation: { label: 'Generation', unit: 'MW', color: '#3f8d84' },
  carbon: { label: 'Carbon', unit: 'gCO₂/kWh', color: '#5f74a8' },
  price: { label: 'Price', unit: '£/MWh', color: '#d7a13f' },
}
const WINDOWS = [
  { label: '6h', value: 6 },
  { label: '24h', value: 24 },
  { label: '7d', value: 168 },
  { label: '30d', value: 720 },
]
const GRANS: { label: string; value: Granularity }[] = [
  { label: 'Per-SP', value: 'sp' },
  { label: 'Hourly', value: 'hour' },
  { label: 'Daily', value: 'day' },
]

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

export function ExplorePage() {
  const [metric, setMetric] = useState<Metric>('demand')
  const [hours, setHours] = useState(24)
  const [granularity, setGranularity] = useState<Granularity>('hour')
  const { data, isLoading } = useTimeseries(metric, granularity, hours)
  const meta = METRICS[metric]
  const chart = useChartTheme()

  const option = useMemo<EChartsOption>(() => {
    const points = (data ?? []).map((p) => [p.bucket, p.value] as [string, number])
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 62, right: 20, top: 16, bottom: 30 },
      xAxis: {
        type: 'time',
        axisLabel: { color: chart.muted, hideOverlap: true },
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
        {
          type: 'line',
          data: points,
          showSymbol: false,
          smooth: granularity !== 'sp',
          lineStyle: { color: meta.color, width: 1.5 },
          areaStyle: { color: meta.color, opacity: 0.08 },
        },
      ],
    }
  }, [data, meta.color, meta.unit, granularity, chart])

  const chartRef = useECharts(option)
  const empty = !isLoading && (data?.length ?? 0) === 0

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-4">
        <header className="max-w-2xl">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          GB market · time series
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">
          Explore the data
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          Any core metric over your chosen window, aggregated server-side in ClickHouse. Switch
          granularity to trade detail for reach — half-hourly out to daily over a month.
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
        <Segmented options={WINDOWS} value={hours} onChange={setHours} />
        <Segmented options={GRANS} value={granularity} onChange={setGranularity} />
      </div>

      <div className="rounded-[10px] border border-line bg-paper p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-display text-lg text-ink">{meta.label}</h2>
          <span className="font-mono text-xs text-muted">{meta.unit}</span>
        </div>
        <div ref={chartRef} className="h-[320px] w-full sm:h-[440px]" />
        {empty && (
          <p className="-mt-56 text-center text-sm text-muted">No data in this window yet.</p>
        )}
      </div>
    </div>
  )
}
