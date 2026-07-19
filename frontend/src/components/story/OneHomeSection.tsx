import type { EChartsOption } from 'echarts'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Segmented } from '@/components/Segmented'
import { SectionShell } from '@/components/story/SectionShell'
import { useBatterySimulation } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import {
  HOUSEHOLDS,
  PRESETS,
  SOLAR_OPTIONS,
  STRATEGIES,
  gbp,
  spLabel,
  type HouseholdKey,
  type PresetKey,
  type SolarKey,
} from '@/lib/battery'
import { useChartTheme } from '@/lib/theme'

type Optimizer = 'greedy' | 'lp'

const OPTIMIZERS: { label: string; value: Optimizer }[] = [
  { label: 'Simple timer', value: 'greedy' },
  { label: 'Orchestrated', value: 'lp' },
]

function Kpi({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-paper p-4">
      <div className="font-display text-3xl text-ink">
        {value}
        {unit && <span className="ml-1 text-sm text-muted">{unit}</span>}
      </div>
      <div className="mt-1 text-xs leading-relaxed text-slate">{label}</div>
    </div>
  )
}

function DispatchChart({
  day,
  color,
}: {
  day: {
    settlement_period: number
    import_p_kwh: number
    charge_kwh: number
    charge_solar_kwh: number
    discharge_kwh: number
    soc_kwh: number
  }[]
  color: string
}) {
  const chart = useChartTheme()
  const option = useMemo<EChartsOption>(() => {
    const cat = day.map((b) => spLabel(b.settlement_period))
    return {
      legend: {
        top: 0,
        textStyle: { color: chart.slate, fontSize: 11 },
        itemWidth: 14,
        data: ['Import price', 'Charge', 'Discharge', 'Stored'],
      },
      tooltip: { trigger: 'axis' },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 46, right: 12, top: 30, height: '26%' },
        { left: 46, right: 12, top: '50%', bottom: 24 },
      ],
      xAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: cat,
          axisLabel: { show: false },
          axisTick: { show: false },
          axisLine: { lineStyle: { color: chart.line } },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: cat,
          axisLabel: { color: chart.muted, interval: 11 },
          axisLine: { lineStyle: { color: chart.line } },
        },
      ],
      yAxis: [
        {
          type: 'value',
          gridIndex: 0,
          name: 'p/kWh',
          nameTextStyle: { color: chart.muted },
          axisLabel: { color: chart.muted },
          splitLine: { lineStyle: { color: chart.line } },
          scale: true,
        },
        {
          type: 'value',
          gridIndex: 1,
          name: 'kWh',
          nameTextStyle: { color: chart.muted },
          axisLabel: { color: chart.muted },
          splitLine: { lineStyle: { color: chart.line } },
        },
      ],
      series: [
        {
          name: 'Import price',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: day.map((b) => b.import_p_kwh),
          lineStyle: { color: '#d7a13f', width: 2 },
          itemStyle: { color: '#d7a13f' },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'Charge',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          stack: 'flow',
          data: day.map((b) => +(b.charge_kwh + b.charge_solar_kwh).toFixed(2)),
          itemStyle: { color: chart.muted, borderRadius: [3, 3, 0, 0] },
        },
        {
          name: 'Discharge',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          stack: 'flow',
          data: day.map((b) => +(-b.discharge_kwh).toFixed(2)),
          itemStyle: { color, borderRadius: [0, 0, 3, 3] },
        },
        {
          name: 'Stored',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: day.map((b) => b.soc_kwh),
          lineStyle: { color: chart.ink, width: 1.5 },
          itemStyle: { color: chart.ink },
          areaStyle: { color: chart.areaFill },
          symbol: 'none',
        },
      ],
    }
  }, [day, color, chart])
  const ref = useECharts(option)
  return <div ref={ref} className="h-[300px] w-full" />
}

/** Section 4: one configured home against a year of real prices. */
export function OneHomeSection() {
  const [preset, setPreset] = useState<PresetKey>('10kwh')
  const [household, setHousehold] = useState<HouseholdKey>('medium')
  const [solar, setSolar] = useState<SolarKey>('none')
  const [optimizer, setOptimizer] = useState<Optimizer>('lp')
  const { data } = useBatterySimulation(preset, household, solar)

  const runs = useMemo(() => {
    const all = data?.runs.filter((r) => r.strategy === 'self_consumption') ?? []
    return {
      greedy: all.find((r) => r.optimizer === 'greedy'),
      lp: all.find((r) => r.optimizer === 'lp'),
    }
  }, [data])
  const run = runs[optimizer]
  const orchestrationDelta =
    runs.lp && runs.greedy ? runs.lp.saving_gbp_year - runs.greedy.saving_gbp_year : null

  return (
    <SectionShell
      id="one-home"
      eyebrow="Move three · One home"
      title="Give one home a battery and the shape becomes income."
      lede={
        <p>
          Pick a battery, a household, a roof. Every number below is a replay of a full
          year of real Agile rates and real grid carbon — the battery serves the home
          through expensive half-hours and refills through cheap ones. Then flip the
          switch that matters: the same hardware on its built-in timer, or dispatched
          by software that has seen tomorrow's prices.
        </p>
      }
    >
      {(inView) => (
        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Battery
              </span>
              <Segmented options={PRESETS} value={preset} onChange={setPreset} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Household
              </span>
              <Segmented options={HOUSEHOLDS} value={household} onChange={setHousehold} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Solar
              </span>
              <Segmented options={SOLAR_OPTIONS} value={solar} onChange={setSolar} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Dispatch
              </span>
              <Segmented options={OPTIMIZERS} value={optimizer} onChange={setOptimizer} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Kpi
              value={run ? gbp(run.saving_gbp_year) : '—'}
              unit="/yr"
              label="what the battery adds, on top of any solar"
            />
            <Kpi
              value={
                run ? (run.payback_years != null ? String(run.payback_years) : 'never') : '—'
              }
              unit={run?.payback_years != null ? 'years' : undefined}
              label="payback on the installed hardware"
            />
            <Kpi
              value={run ? run.carbon_saved_kg_year.toLocaleString() : '—'}
              unit="kg CO₂/yr"
              label="grid carbon displaced"
            />
          </div>

          {orchestrationDelta != null && (
            <p className="mt-3 text-sm leading-relaxed text-slate">
              The switch is worth{' '}
              <span className="font-semibold text-ink">
                {gbp(orchestrationDelta)}/yr
              </span>{' '}
              of that — same battery, same prices, better decisions. Orchestration is
              the product.
            </p>
          )}

          <div className="mt-6 rounded-[10px] border border-line bg-paper p-5 shadow-sm">
            <h3 className="font-display text-lg text-ink">
              A typical day, {optimizer === 'lp' ? 'orchestrated' : 'on the timer'}
            </h3>
            {inView && run ? (
              <DispatchChart day={run.typical_day} color={STRATEGIES.self_consumption.color} />
            ) : (
              <div className="h-[300px]" />
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Average behaviour by half-hour across the whole backtest: charging (grey,
              up) hunts the overnight trough, discharging (teal, down) covers the
              evening peak. The full lab — all three strategies, every assumption —
              lives at <Link to="/battery" className="text-teal underline underline-offset-2">Battery Lab</Link>.
            </p>
          </div>
        </div>
      )}
    </SectionShell>
  )
}
