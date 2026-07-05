import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useSupplyDemandHistory } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme } from '@/lib/theme'
import { Card } from './Card'

export function SupplyDemandCard() {
  const { data } = useSupplyDemandHistory(12)
  const chart = useChartTheme()

  const option = useMemo<EChartsOption>(() => {
    const points = data ?? []
    return {
      color: [chart.ink, chart.teal],
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: chart.muted }, top: 0 },
      grid: { left: 52, right: 16, top: 32, bottom: 28 },
      xAxis: {
        type: 'time',
        axisLabel: { color: chart.muted, hideOverlap: true, formatter: '{HH}:{mm}' },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: 'MW',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        {
          name: 'Demand',
          type: 'line',
          showSymbol: false,
          data: points.map((p) => [p.period_start, p.demand_mw]),
        },
        {
          name: 'Generation',
          type: 'line',
          showSymbol: false,
          data: points.map((p) => [p.period_start, p.total_generation_mw]),
        },
      ],
    }
  }, [data, chart])
  const chartRef = useECharts(option)
  const latest = data?.at(-1)

  return (
    <Card title="Supply vs demand" subtitle="National demand vs total generation">
      <div ref={chartRef} className="h-64 w-full" />
      {latest && (
        <p className="mt-2 text-sm text-slate">
          Demand <span className="font-mono text-ink">{latest.demand_mw} MW</span> ·
          Generation{' '}
          <span className="font-mono text-ink">{latest.total_generation_mw} MW</span>
        </p>
      )}
    </Card>
  )
}
