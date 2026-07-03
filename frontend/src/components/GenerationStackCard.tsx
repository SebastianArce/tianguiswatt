import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { useGenerationHistory } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { FUEL_GROUPS, fuelGroup } from '@/lib/theme'

const GRID_LINE = 'rgba(246,246,242,0.10)'
const AXIS_TEXT = '#8fa39d'

type HourBucket = { label: string; gw: Record<string, number> }

export function GenerationStackCard() {
  const { data } = useGenerationHistory(24)

  // Aggregate the 5-min points into per-hour average MW per fuel family (→ GW).
  const hours = useMemo<HourBucket[]>(() => {
    const byHour = new Map<string, { ts: Set<string>; sums: Record<string, number> }>()
    for (const p of data ?? []) {
      const key = p.measured_at.slice(0, 13) // YYYY-MM-DDTHH
      const group = fuelGroup(p.fuel_type)
      const e = byHour.get(key) ?? { ts: new Set<string>(), sums: {} }
      e.ts.add(p.measured_at)
      e.sums[group] = (e.sums[group] ?? 0) + p.generation_mw
      byHour.set(key, e)
    }
    return [...byHour.keys()].sort().map((key) => {
      const e = byHour.get(key)!
      const n = e.ts.size || 1
      const gw: Record<string, number> = {}
      for (const g of FUEL_GROUPS) gw[g.key] = (e.sums[g.key] ?? 0) / n / 1000
      return { label: `${key.slice(11, 13)}:00`, gw }
    })
  }, [data])

  // Only show families that actually appear in the window (e.g. no solar overnight).
  const present = useMemo(
    () => FUEL_GROUPS.filter((g) => hours.some((h) => (h.gw[g.key] ?? 0) > 0.05)),
    [hours],
  )

  const option = useMemo<EChartsOption>(() => {
    const series = FUEL_GROUPS.map((g) => ({
      name: g.key,
      type: 'bar' as const,
      stack: 'gen',
      data: hours.map((h) => +h.gw[g.key].toFixed(2)),
      itemStyle: { color: g.color },
    }))
    return {
      textStyle: { fontFamily: "'IBM Plex Sans', sans-serif", color: AXIS_TEXT },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => (v ? `${v} GW` : '—'),
      },
      grid: { left: 34, right: 12, top: 12, bottom: 24 },
      xAxis: {
        type: 'category',
        data: hours.map((h) => h.label),
        axisLabel: { color: AXIS_TEXT, interval: 3 },
        axisLine: { lineStyle: { color: GRID_LINE } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: AXIS_TEXT },
        splitLine: { lineStyle: { color: GRID_LINE } },
      },
      series,
    }
  }, [hours])

  const chartRef = useECharts(option)

  return (
    <section className="flex h-full flex-col rounded-[10px] border border-line bg-ink p-5 text-paper shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-lg text-paper">Generation mix</h2>
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase" style={{ color: AXIS_TEXT }}>
          24h · GW by technology
        </span>
      </div>
      <div ref={chartRef} className="min-h-[300px] w-full flex-1" />
      {hours.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {present.map((g) => (
            <span
              key={g.key}
              className="flex items-center gap-1 font-mono text-[11px]"
              style={{ color: '#b8c4c0' }}
            >
              <span className="h-2 w-2 rounded-sm" style={{ background: g.color }} />
              {g.key}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-center text-sm" style={{ color: AXIS_TEXT }}>
          Warming up — no generation history yet.
        </p>
      )}
    </section>
  )
}
