import type { EChartsOption } from 'echarts'
import { useMemo, useState } from 'react'
import { BatteryHowItWorks } from '@/components/BatteryHowItWorks'
import { useBatterySimulation } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme } from '@/lib/theme'

type PresetKey = '5kwh' | '10kwh' | '13.5kwh'
type HouseholdKey = 'low' | 'medium' | 'high' | 'electrified'
type StrategyKey = 'arbitrage' | 'self_consumption' | 'green'
type Tab = 'compare' | 'how'

/** Fixed strategy identity — colours are assigned to the entity, shared across themes
 *  like the fuel palette, and always paired with a visible label. */
const STRATEGIES: Record<
  StrategyKey,
  { label: string; color: string; blurb: string }
> = {
  arbitrage: {
    label: 'Arbitrage',
    color: '#d7a13f',
    blurb:
      'Buy cheap overnight, sell back at the evening peak. No household involved — the battery trades the import/export spread alone, so every kWh out earns only the export rate.',
  },
  self_consumption: {
    label: 'Self-consumption',
    color: '#14716b',
    blurb:
      'Charge cheap, then power the house through the evening peak instead of importing. Each shifted kWh is worth the full import rate — this is how home batteries actually pay back.',
  },
  green: {
    label: 'Green',
    color: '#5f9e78',
    blurb:
      'The same battery optimised for carbon instead of pence: charge when the grid is cleanest, displace it when it is dirtiest — and see what that choice costs.',
  },
}
const STRATEGY_KEYS = Object.keys(STRATEGIES) as StrategyKey[]

const PRESETS: { label: string; value: PresetKey }[] = [
  { label: '5 kWh', value: '5kwh' },
  { label: '10 kWh', value: '10kwh' },
  { label: '13.5 kWh', value: '13.5kwh' },
]

// Ofgem's July-2026 TDCV bands (low/medium/high) + an illustrative electrified home;
// the server scales the same typical daily shape to the chosen annual level.
const HOUSEHOLDS: { label: string; value: HouseholdKey }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Typical', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'EV / heat pump', value: 'electrified' },
]

const gbp = (v: number) =>
  `${v < 0 ? '−' : ''}£${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

/** "SP 35" → "17:00" (settlement periods count from 00:00 local). */
const spLabel = (sp: number) => {
  const mins = (sp - 1) * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${mins % 60 ? '30' : '00'}`
}

function Segmented<T extends string>({
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
          key={o.value}
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

export function BatteryLabPage() {
  const [tab, setTab] = useState<Tab>('compare')
  const [preset, setPreset] = useState<PresetKey>('10kwh')
  const [household, setHousehold] = useState<HouseholdKey>('medium')
  const [strategy, setStrategy] = useState<StrategyKey>('self_consumption')
  const { data, isLoading } = useBatterySimulation(preset, household)
  const chart = useChartTheme()

  const lpRuns = useMemo(() => {
    const runs = data?.runs.filter((r) => r.optimizer === 'lp') ?? []
    return new Map(runs.map((r) => [r.strategy as StrategyKey, r]))
  }, [data])

  // £/yr and kgCO₂/yr comparison bars (LP runs — the optimiser a smart battery would use).
  const savingsOption = useMemo<EChartsOption>(
    () => comparisonBars(lpRuns, 'saving_gbp_year', '£/yr', chart),
    [lpRuns, chart],
  )
  const carbonOption = useMemo<EChartsOption>(
    () => comparisonBars(lpRuns, 'carbon_saved_kg_year', 'kg CO₂/yr', chart),
    [lpRuns, chart],
  )

  // Typical-day dispatch: price panel above, energy panel below, one shared x-axis —
  // two aligned panels instead of a dual-axis chart.
  const dispatchOption = useMemo<EChartsOption>(() => {
    const run = lpRuns.get(strategy)
    const day = run?.typical_day ?? []
    const cat = day.map((b) => spLabel(b.settlement_period))
    const color = STRATEGIES[strategy].color
    return {
      legend: {
        top: 0,
        textStyle: { color: chart.slate, fontSize: 11 },
        itemWidth: 14,
        data: ['Import price', 'Export price', 'Charge', 'Discharge', 'Stored'],
      },
      tooltip: { trigger: 'axis' },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 52, right: 16, top: 34, height: '30%' },
        { left: 52, right: 16, top: '52%', bottom: 30 },
      ],
      xAxis: [
        {
          type: 'category',
          gridIndex: 0,
          data: cat,
          axisLabel: { show: false },
          axisLine: { lineStyle: { color: chart.line } },
          axisTick: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: cat,
          axisLabel: { color: chart.muted, interval: 7 },
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
          name: 'Export price',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: day.map((b) => b.export_p_kwh),
          lineStyle: { color: chart.muted, width: 1.5, type: 'dashed' },
          itemStyle: { color: chart.muted },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'Charge',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          stack: 'flow',
          data: day.map((b) => +b.charge_kwh.toFixed(2)),
          itemStyle: { color: chart.muted, borderRadius: [3, 3, 0, 0] },
          barCategoryGap: '20%',
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
  }, [lpRuns, strategy, chart])

  const savingsRef = useECharts(savingsOption)
  const carbonRef = useECharts(carbonOption)
  const dispatchRef = useECharts(dispatchOption)

  const windowLabel = data ? `${data.window_from} → ${data.window_to}` : ''

  return (
    <div>
      <header className="mb-5 max-w-2xl">
        <div className="font-mono text-[10px] tracking-[0.14em] text-teal uppercase">
          GB market · households
        </div>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink">Battery Lab</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          What would a home battery have earned on a real smart tariff? Every number here
          is backtested against actual half-hourly Agile rates and grid carbon intensity
          {windowLabel && <> ({windowLabel})</>} — no forecasts, just replayed history.
        </p>
      </header>

      {/* tabs */}
      <div role="tablist" aria-label="Battery Lab sections" className="mb-6 flex gap-1 border-b border-line">
        {(
          [
            { key: 'compare', label: 'Compare strategies' },
            { key: 'how', label: 'How it works' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm transition-colors ${
              tab === t.key
                ? 'border-teal font-semibold text-ink'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'how' ? (
        <BatteryHowItWorks preset={preset} />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Battery
              </span>
              <Segmented options={PRESETS} value={preset} onChange={setPreset} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
                Household
              </span>
              <Segmented options={HOUSEHOLDS} value={household} onChange={setHousehold} />
            </div>
            {data && (
              <span className="text-xs text-muted">
                {data.battery.power_kw} kW · 90% round-trip ·{' '}
                {gbp(data.battery.cost_gbp)} installed ·{' '}
                {data.household_kwh.toLocaleString()} kWh/yr home
              </span>
            )}
          </div>

          {isLoading && (
            <p className="mb-6 text-sm text-muted">Backtesting a year of half-hours…</p>
          )}

          {/* one card per strategy, LP-optimised */}
          <div className="grid gap-4 md:grid-cols-3">
            {STRATEGY_KEYS.map((key) => {
              const meta = STRATEGIES[key]
              const run = lpRuns.get(key)
              return (
                <section
                  key={key}
                  className="rounded-[10px] border border-line bg-paper p-5 shadow-sm"
                  style={{ borderTop: `3px solid ${meta.color}` }}
                >
                  <h2 className="font-display text-lg text-ink">{meta.label}</h2>
                  <p className="mt-1 min-h-[72px] text-xs leading-relaxed text-slate">
                    {meta.blurb}
                  </p>
                  <div className="mt-3 font-display text-3xl text-ink">
                    {run ? gbp(run.saving_gbp_year) : '—'}
                    <span className="ml-1 text-sm text-muted">/yr</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate">
                    {run ? (
                      <>
                        {run.payback_years != null
                          ? `payback ${run.payback_years} yrs`
                          : 'never pays back'}
                        {' · '}
                        {run.carbon_saved_kg_year.toLocaleString()} kg CO₂/yr
                      </>
                    ) : (
                      '…'
                    )}
                  </div>
                </section>
              )
            })}
          </div>

          {data && (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              For scale: this household — {data.household_kwh.toLocaleString()} kWh/yr,
              following the typical daily shape scaled to that level — pays about{' '}
              {gbp(data.baseline_cost_gbp_year)}/yr importing on Agile with no battery.
              Savings assume the smart (LP) optimiser; a simple charge-window timer earns
              less — the how-it-works tab shows by how much. Bigger households save more
              because the battery can offset more peak-time import; a real EV or heat-pump
              home also has a different <em>shape</em>, which this scaling doesn't capture.
            </p>
          )}

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
              <h2 className="font-display text-lg text-ink">Money saved per year</h2>
              <p className="mt-0.5 text-xs text-slate">
                vs the same household with no battery — negative means the strategy costs money
              </p>
              <div ref={savingsRef} className="mt-3 h-[240px] w-full" />
            </section>
            <section className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
              <h2 className="font-display text-lg text-ink">Carbon avoided per year</h2>
              <p className="mt-0.5 text-xs text-slate">
                grid gCO₂ displaced by discharging, net of what charging drew
              </p>
              <div ref={carbonRef} className="mt-3 h-[240px] w-full" />
            </section>
          </div>

          <section className="mt-4 rounded-[10px] border border-line bg-paper p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-ink">A typical day's dispatch</h2>
                <p className="mt-0.5 text-xs text-slate">
                  Average behaviour by half-hour across{' '}
                  {data ? `all ${data.days} simulated days` : 'the whole window'} — prices
                  above, battery flows and stored energy below
                </p>
              </div>
              <Segmented
                options={STRATEGY_KEYS.map((k) => ({
                  label: STRATEGIES[k].label,
                  value: k,
                }))}
                value={strategy}
                onChange={setStrategy}
              />
            </div>
            <div ref={dispatchRef} className="mt-3 h-[380px] w-full" />
            <p className="text-xs leading-relaxed text-muted">
              The pattern to look for: charging (grey, up) sits in the overnight price
              trough; discharging (coloured, down) lines up with the evening peak. The
              green strategy follows carbon instead, so its windows drift away from the
              price curve — that drift is what it costs.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

/** Horizontal category bars comparing the three strategies on one measure. */
function comparisonBars(
  lpRuns: Map<StrategyKey, { saving_gbp_year: number; carbon_saved_kg_year: number }>,
  field: 'saving_gbp_year' | 'carbon_saved_kg_year',
  unit: string,
  chart: { slate: string; muted: string; line: string },
): EChartsOption {
  const rows = STRATEGY_KEYS.map((k) => ({
    key: k,
    label: STRATEGIES[k].label,
    color: STRATEGIES[k].color,
    value: lpRuns.get(k)?.[field] ?? 0,
  }))
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => `${Number(v).toLocaleString()} ${unit}`,
    },
    grid: { left: 110, right: 56, top: 12, bottom: 24 },
    xAxis: {
      type: 'value',
      axisLabel: { color: chart.muted },
      splitLine: { lineStyle: { color: chart.line } },
    },
    yAxis: {
      type: 'category',
      data: rows.map((r) => r.label),
      inverse: true,
      axisLabel: { color: chart.slate },
      axisLine: { lineStyle: { color: chart.line } },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        barWidth: 22,
        data: rows.map((r) => ({
          value: +r.value.toFixed(0),
          itemStyle: { color: r.color, borderRadius: 3 },
        })),
        label: {
          show: true,
          position: 'right',
          color: chart.slate,
          fontSize: 11,
          formatter: ({ value }) => Number(value).toLocaleString(),
        },
      },
    ],
  }
}
