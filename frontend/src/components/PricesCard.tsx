import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { usePricesHistory, useSnapshot } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { chart } from '@/lib/theme'
import { Card } from './Card'

export function PricesCard() {
  const { data: snap } = useSnapshot()
  const { data: history } = usePricesHistory(12)
  const price = snap?.price

  const option = useMemo<EChartsOption>(() => {
    const points = history ?? []
    return {
      color: [chart.teal, chart.muted],
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: chart.muted }, top: 0 },
      grid: { left: 48, right: 16, top: 32, bottom: 28 },
      xAxis: {
        type: 'time',
        axisLabel: { color: chart.muted, hideOverlap: true, formatter: '{HH}:{mm}' },
        axisLine: { lineStyle: { color: chart.line } },
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
          name: 'System',
          type: 'line',
          showSymbol: false,
          data: points.map((p) => [p.period_start, p.system_price]),
        },
        {
          name: 'APX (day-ahead)',
          type: 'line',
          showSymbol: false,
          data: points.map((p) => [p.period_start, p.apx_price]),
        },
      ],
    }
  }, [history])
  const chartRef = useECharts(option)

  return (
    <Card title="Wholesale price" subtitle="System (imbalance) price vs APX day-ahead, £/MWh">
      <div ref={chartRef} className="h-64 w-full" />
      {price && (
        <p className="mt-2 text-sm text-slate">
          System <span className="font-mono text-ink">£{price.system_price.toFixed(2)}</span>{' '}
          · Net imbalance{' '}
          <span className="font-mono text-ink">
            {price.net_imbalance_volume.toFixed(0)} MWh
          </span>
        </p>
      )}
    </Card>
  )
}
