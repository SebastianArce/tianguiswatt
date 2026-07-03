import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useSnapshot } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { chart, fuelColor } from '@/lib/theme'
import { Card } from './Card'

export function GenerationMixCard() {
  const { data } = useSnapshot()

  const option = useMemo<EChartsOption>(() => {
    const mix = data?.generation ?? []
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} MW ({d}%)' },
      series: [
        {
          type: 'pie',
          radius: ['45%', '72%'],
          label: { color: chart.slate },
          data: mix.map((g) => ({
            name: g.fuel_type,
            value: g.generation_mw,
            itemStyle: { color: fuelColor(g.fuel_type) },
          })),
        },
      ],
    }
  }, [data])
  const chartRef = useECharts(option)
  const top = data?.generation?.[0]

  return (
    <Card title="Generation mix" subtitle="Share of GB generation by fuel, right now">
      <div ref={chartRef} className="h-64 w-full" />
      {top && (
        <p className="mt-2 text-sm text-slate">
          Leading fuel:{' '}
          <span className="font-mono font-medium text-ink">{top.fuel_type}</span>{' '}
          <span className="font-mono text-ink">{top.share_pct}%</span>
        </p>
      )}
    </Card>
  )
}
