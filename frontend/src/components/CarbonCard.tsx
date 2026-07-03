import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useSnapshot } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { chart } from '@/lib/theme'
import { Card } from './Card'

export function CarbonCard() {
  const { data } = useSnapshot()
  const carbon = data?.carbon
  const value = carbon?.intensity_gco2 ?? 0

  const option = useMemo<EChartsOption>(
    () => ({
      series: [
        {
          type: 'gauge',
          min: 0,
          max: 500,
          progress: { show: true, width: 12, itemStyle: { color: chart.teal } },
          pointer: { itemStyle: { color: chart.ink } },
          axisLine: { lineStyle: { width: 12, color: [[1, chart.line]] } },
          axisTick: { lineStyle: { color: chart.muted } },
          splitLine: { lineStyle: { color: chart.muted } },
          axisLabel: { color: chart.muted, distance: 14, fontSize: 10 },
          detail: {
            formatter: '{value}',
            color: chart.ink,
            fontSize: 24,
            fontFamily: chart.mono,
          },
          data: [{ value }],
        },
      ],
    }),
    [value],
  )
  const chartRef = useECharts(option)

  return (
    <Card title="Carbon intensity" subtitle="Grams of CO₂ per kWh, national">
      <div ref={chartRef} className="h-64 w-full" />
      {carbon && (
        <p className="mt-2 text-sm text-slate">
          <span className="font-mono text-ink">{carbon.intensity_gco2}</span> gCO₂/kWh ·{' '}
          {carbon.intensity_index}
        </p>
      )}
    </Card>
  )
}
