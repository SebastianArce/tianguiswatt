import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { SectionShell } from '@/components/story/SectionShell'
import { useProfile } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme, type ChartPalette } from '@/lib/theme'

const PRICE = '#d7a13f'
const CARBON = '#5f74a8'

type Intraday = { hour: number; p10: number; p25: number; p50: number; p75: number; p90: number }

/** The TrendsPage percentile-band pattern: p10–p90 outer, p25–p75 inner, p50 line. */
function bandOption(
  intraday: Intraday[],
  color: string,
  unit: string,
  chart: ChartPalette,
): EChartsOption {
  const cat = intraday.map((b) => String(b.hour).padStart(2, '0'))
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const ps = params as unknown as { dataIndex: number }[]
        const b = intraday[ps[0]?.dataIndex]
        if (!b) return ''
        return `${String(b.hour).padStart(2, '0')}:00<br/>median <b>${b.p50.toFixed(1)}</b> ${unit}<br/>p10–p90 ${b.p10.toFixed(1)}–${b.p90.toFixed(1)}`
      },
    },
    grid: { left: 48, right: 12, top: 14, bottom: 26 },
    xAxis: {
      type: 'category',
      data: cat,
      axisLabel: { color: chart.muted, interval: 5 },
      axisLine: { lineStyle: { color: chart.line } },
    },
    yAxis: {
      type: 'value',
      name: unit,
      nameTextStyle: { color: chart.muted },
      axisLabel: { color: chart.muted },
      splitLine: { lineStyle: { color: chart.line } },
      scale: true,
    },
    series: [
      { type: 'line', stack: 'outer', data: intraday.map((b) => +b.p10.toFixed(1)), lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
      { type: 'line', stack: 'outer', data: intraday.map((b) => +(b.p90 - b.p10).toFixed(1)), lineStyle: { opacity: 0 }, areaStyle: { color, opacity: 0.1 }, symbol: 'none', silent: true },
      { type: 'line', stack: 'inner', data: intraday.map((b) => +b.p25.toFixed(1)), lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
      { type: 'line', stack: 'inner', data: intraday.map((b) => +(b.p75 - b.p25).toFixed(1)), lineStyle: { opacity: 0 }, areaStyle: { color, opacity: 0.18 }, symbol: 'none', silent: true },
      {
        type: 'line',
        data: intraday.map((b) => +b.p50.toFixed(1)),
        lineStyle: { color, width: 2 },
        symbol: 'none',
        smooth: true,
      },
    ],
  }
}

function BandChart({
  metric,
  color,
  unit,
  title,
  caption,
}: {
  metric: 'price' | 'carbon'
  color: string
  unit: string
  title: string
  caption: string
}) {
  const { data } = useProfile(metric, 90)
  const chart = useChartTheme()
  const option = useMemo(
    () => bandOption(data?.intraday ?? [], color, unit, chart),
    [data, color, unit, chart],
  )
  const ref = useECharts(option)
  return (
    <div className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <div ref={ref} className="mt-3 h-[260px] w-full" />
      <p className="mt-2 text-xs leading-relaxed text-muted">{caption}</p>
    </div>
  )
}

/** Section 2: the daily shape of price and carbon — structure, not noise. */
export function HalfHoursSection() {
  return (
    <SectionShell
      id="half-hours"
      eyebrow="Move one · The market"
      title="Electricity has a different price every thirty minutes."
      lede={
        <p>
          Every day the wholesale price and the grid's carbon intensity trace the same
          shape: a cheap, clean overnight trough and an expensive, dirty evening peak.
          The bands below are ninety days of real half-hours. The shape is not weather
          noise — it is the structure of a marginal-price market meeting a daily
          rhythm of demand.
        </p>
      }
    >
      {(inView) => (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {inView ? (
            <>
              <BandChart
                metric="price"
                color={PRICE}
                unit="£/MWh"
                title="Wholesale price, by hour of day"
                caption="Median with the p10–p90 and p25–p75 spread over the last 90 days."
              />
              <BandChart
                metric="carbon"
                color={CARBON}
                unit="gCO₂/kWh"
                title="Carbon intensity, by hour of day"
                caption="The same shape in carbon: the marginal evening unit is usually gas."
              />
            </>
          ) : (
            <>
              <div className="h-[360px] rounded-[10px] border border-line bg-paper" />
              <div className="h-[360px] rounded-[10px] border border-line bg-paper" />
            </>
          )}
        </div>
      )}
    </SectionShell>
  )
}
