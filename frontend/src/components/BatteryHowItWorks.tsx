import type { EChartsOption } from 'echarts'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { useBatteryContext, useBatterySimulation } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme } from '@/lib/theme'

const PRICE = '#d7a13f'
const CARBON = '#5f74a8'
const SUN = '#e2c044'
const WINTER = '#5f74a8'
const SUMMER = '#d7a13f'
const LP = '#14716b'

const STRATEGY_LABELS: Record<string, string> = {
  arbitrage: 'Arbitrage',
  self_consumption: 'Self-consumption',
  green: 'Green',
}

/** "SP 35" → "17:00" (settlement periods count from 00:00 local). */
const spLabel = (sp: number) => {
  const mins = (sp - 1) * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${mins % 60 ? '30' : '00'}`
}

function Term({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span title={title} className="cursor-help border-b border-dotted border-teal">
      {children}
    </span>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-paper p-4">
      {value === '—' ? (
        <div className="h-8 w-20 animate-pulse rounded bg-mist" />
      ) : (
        <div className="font-display text-2xl text-ink">{value}</div>
      )}
      <div className="mt-1 text-xs leading-relaxed text-slate">{label}</div>
    </div>
  )
}

function ChartSection({
  title,
  caption,
  chartRef,
  height = 'h-[280px]',
  children,
}: {
  title: string
  caption: string
  chartRef: React.RefObject<HTMLDivElement | null>
  height?: string
  children: ReactNode
}) {
  return (
    <section className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate">{children}</div>
      </div>
      <div className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
        <div ref={chartRef} className={`${height} w-full`} />
        <p className="mt-2 text-xs leading-relaxed text-muted">{caption}</p>
      </div>
    </section>
  )
}

export function BatteryHowItWorks({
  preset,
}: {
  preset: '5kwh' | '10kwh' | '13.5kwh'
}) {
  const { data: ctx } = useBatteryContext()
  const { data: sim } = useBatterySimulation(preset)
  const chart = useChartTheme()

  const cat = useMemo(
    () => (ctx?.intraday ?? []).map((b) => spLabel(b.settlement_period)),
    [ctx],
  )

  // The intraday import-price distribution — the shape every strategy exploits — with
  // the median export rate underneath it (the spread pure arbitrage lives on).
  const priceOption = useMemo<EChartsOption>(() => {
    const rows = ctx?.intraday ?? []
    return {
      legend: {
        top: 0,
        textStyle: { color: chart.slate, fontSize: 11 },
        data: ['Import (median)', 'Export (median)'],
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const ps = params as unknown as { dataIndex: number }[]
          const b = rows[ps[0]?.dataIndex]
          if (!b) return ''
          return `${spLabel(b.settlement_period)}<br/>import <b>${b.import_p50}</b> p/kWh (p10–p90 ${b.import_p10}–${b.import_p90})<br/>export <b>${b.export_p50}</b> p/kWh`
        },
      },
      grid: { left: 44, right: 16, top: 30, bottom: 28 },
      xAxis: {
        type: 'category',
        data: cat,
        axisLabel: { color: chart.muted, interval: 7 },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: 'p/kWh',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        // p10–p90 and p25–p75 bands (stacked invisible base + fill)
        { type: 'line', stack: 'outer', data: rows.map((b) => b.import_p10), lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
        { type: 'line', stack: 'outer', data: rows.map((b) => +(b.import_p90 - b.import_p10).toFixed(2)), lineStyle: { opacity: 0 }, areaStyle: { color: PRICE, opacity: 0.1 }, symbol: 'none', silent: true },
        { type: 'line', stack: 'inner', data: rows.map((b) => b.import_p25), lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
        { type: 'line', stack: 'inner', data: rows.map((b) => +(b.import_p75 - b.import_p25).toFixed(2)), lineStyle: { opacity: 0 }, areaStyle: { color: PRICE, opacity: 0.18 }, symbol: 'none', silent: true },
        {
          name: 'Import (median)',
          type: 'line',
          data: rows.map((b) => b.import_p50),
          lineStyle: { color: PRICE, width: 2 },
          itemStyle: { color: PRICE },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'Export (median)',
          type: 'line',
          data: rows.map((b) => b.export_p50),
          lineStyle: { color: chart.muted, width: 1.5, type: 'dashed' },
          itemStyle: { color: chart.muted },
          symbol: 'none',
          smooth: true,
        },
      ],
    }
  }, [ctx, cat, chart])

  // The synthetic household: winter vs summer weekday shape, plus the all-year average.
  const demandOption = useMemo<EChartsOption>(() => {
    const rows = ctx?.demand_profile ?? []
    return {
      legend: {
        top: 0,
        textStyle: { color: chart.slate, fontSize: 11 },
        data: ['Winter weekday', 'High-summer weekday', 'All-year average'],
      },
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${v} kWh` },
      grid: { left: 48, right: 16, top: 30, bottom: 28 },
      xAxis: {
        type: 'category',
        data: rows.map((b) => spLabel(b.settlement_period)),
        axisLabel: { color: chart.muted, interval: 7 },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: 'kWh',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        {
          name: 'Winter weekday',
          type: 'line',
          data: rows.map((b) => b.winter_weekday_kwh),
          lineStyle: { color: WINTER, width: 2 },
          itemStyle: { color: WINTER },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'High-summer weekday',
          type: 'line',
          data: rows.map((b) => b.summer_weekday_kwh),
          lineStyle: { color: SUMMER, width: 2 },
          itemStyle: { color: SUMMER },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'All-year average',
          type: 'line',
          data: rows.map((b) => b.avg_kwh),
          lineStyle: { color: chart.ink, width: 1.5, type: 'dashed' },
          itemStyle: { color: chart.ink },
          symbol: 'none',
          smooth: true,
        },
      ],
    }
  }, [ctx, chart])

  // The sun the simulator sees: median national capacity factor by half-hour.
  const solarOption = useMemo<EChartsOption>(() => {
    const rows = ctx?.intraday ?? []
    return {
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => `${(Number(v) * 100).toFixed(1)}% of capacity`,
      },
      grid: { left: 48, right: 16, top: 16, bottom: 28 },
      xAxis: {
        type: 'category',
        data: cat,
        axisLabel: { color: chart.muted, interval: 7 },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: 'capacity factor',
        nameTextStyle: { color: chart.muted },
        axisLabel: {
          color: chart.muted,
          formatter: (v: number) => `${Math.round(v * 100)}%`,
        },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        {
          name: 'Solar capacity factor (median)',
          type: 'line',
          data: rows.map((b) => b.solar_cf_p50),
          lineStyle: { color: SUN, width: 2 },
          itemStyle: { color: SUN },
          areaStyle: { color: SUN, opacity: 0.15 },
          symbol: 'none',
          smooth: true,
        },
      ],
    }
  }, [ctx, cat, chart])

  // Price vs carbon medians — two aligned panels, one shared clock.
  const divergenceOption = useMemo<EChartsOption>(() => {
    const rows = ctx?.intraday ?? []
    return {
      tooltip: { trigger: 'axis' },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      grid: [
        { left: 48, right: 16, top: 24, height: '32%' },
        { left: 48, right: 16, top: '56%', bottom: 28 },
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: cat, axisLabel: { show: false }, axisTick: { show: false }, axisLine: { lineStyle: { color: chart.line } } },
        { type: 'category', gridIndex: 1, data: cat, axisLabel: { color: chart.muted, interval: 7 }, axisLine: { lineStyle: { color: chart.line } } },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, name: 'p/kWh', nameTextStyle: { color: chart.muted }, axisLabel: { color: chart.muted }, splitLine: { lineStyle: { color: chart.line } }, scale: true },
        { type: 'value', gridIndex: 1, name: 'gCO₂/kWh', nameTextStyle: { color: chart.muted }, axisLabel: { color: chart.muted }, splitLine: { lineStyle: { color: chart.line } }, scale: true },
      ],
      series: [
        {
          name: 'Import price (median)',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: rows.map((b) => b.import_p50),
          lineStyle: { color: PRICE, width: 2 },
          itemStyle: { color: PRICE },
          areaStyle: { color: PRICE, opacity: 0.08 },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'Carbon intensity (median)',
          type: 'line',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: rows.map((b) => b.carbon_p50),
          lineStyle: { color: CARBON, width: 2 },
          itemStyle: { color: CARBON },
          areaStyle: { color: CARBON, opacity: 0.08 },
          symbol: 'none',
          smooth: true,
        },
      ],
    }
  }, [ctx, cat, chart])

  // Greedy timer vs LP optimiser, per strategy — why optimisation exists.
  const optimiserOption = useMemo<EChartsOption>(() => {
    const runs = sim?.runs ?? []
    const strategies = ['arbitrage', 'self_consumption', 'green']
    const value = (s: string, o: string) =>
      runs.find((r) => r.strategy === s && r.optimizer === o)?.saving_gbp_year ?? 0
    return {
      legend: { top: 0, textStyle: { color: chart.slate, fontSize: 11 } },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        valueFormatter: (v) => `£${Number(v).toLocaleString()}/yr`,
      },
      grid: { left: 48, right: 16, top: 30, bottom: 28 },
      xAxis: {
        type: 'category',
        data: strategies.map((s) => STRATEGY_LABELS[s]),
        axisLabel: { color: chart.slate },
        axisLine: { lineStyle: { color: chart.line } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '£/yr',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        {
          name: 'Simple timer (greedy)',
          type: 'bar',
          barWidth: 20,
          data: strategies.map((s) => +value(s, 'greedy').toFixed(0)),
          itemStyle: { color: chart.muted, borderRadius: 3 },
          label: { show: true, position: 'top', color: chart.slate, fontSize: 11 },
        },
        {
          name: 'Optimiser (LP)',
          type: 'bar',
          barWidth: 20,
          data: strategies.map((s) => +value(s, 'lp').toFixed(0)),
          itemStyle: { color: LP, borderRadius: 3 },
          label: { show: true, position: 'top', color: chart.slate, fontSize: 11 },
        },
      ],
    }
  }, [sim, chart])

  const priceRef = useECharts(priceOption)
  const demandRef = useECharts(demandOption)
  const solarRef = useECharts(solarOption)
  const divergenceRef = useECharts(divergenceOption)
  const optimiserRef = useECharts(optimiserOption)

  // The chart containers must exist on first render (useECharts initialises on
  // mount), so there is no early return while the data loads — text falls back.
  const sample = ctx
    ? `${ctx.periods.toLocaleString()} half-hours over ${ctx.days} days`
    : ''
  const avgImport = ctx ? `${ctx.avg_import_p_kwh}p` : '—'
  const avgExport = ctx ? `${ctx.avg_export_p_kwh}p` : '—'
  const overlap =
    ctx?.green_overlap_pct != null ? `${Math.round(ctx.green_overlap_pct)}%` : '—'

  return (
    <div className="max-w-5xl">
      {/* the headline facts everything below explains */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          value={avgImport}
          label="average Agile import rate over the window — what the household pays per kWh"
        />
        <Stat
          value={avgExport}
          label="average export rate — what a kWh sent back to the grid earns"
        />
        <Stat
          value={overlap}
          label="of the day's 8 cheapest half-hours are also among its 8 greenest"
        />
        <Stat
          value={ctx ? `${ctx.tdcv_kwh.toLocaleString()} kWh` : '—'}
          label="the simulated household's annual consumption — Ofgem's typical medium household"
        />
        <Stat
          value={
            ctx?.avg_solar_cf != null ? `${(ctx.avg_solar_cf * 100).toFixed(1)}%` : '—'
          }
          label="average GB solar capacity factor — the fleet's output as a share of its installed capacity"
        />
      </div>
      {ctx && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Everything on this page is computed from <b>{sample}</b> ({ctx.window_from} →{' '}
          {ctx.window_to}) · tariffs {ctx.import_tariff} (import) and {ctx.export_tariff}{' '}
          (export) · region {ctx.region}. Half-hours are{' '}
          <Term title="The 30-minute periods the GB market prices and settles against, numbered 1–48 from midnight local time.">
            settlement periods
          </Term>{' '}
          on the local clock.
        </p>
      )}

      <ChartSection
        title="The price a household can actually trade"
        caption={`Median import rate with its p10–p90 and p25–p75 spread, and the median export rate, by half-hour — each point summarises ${ctx?.days ?? '…'} observed days. The gap between the solid and dashed lines, minus the battery's ~10% round-trip loss, is all pure arbitrage can earn.`}
        chartRef={priceRef}
      >
        <p>
          Most households never see a half-hourly price: on a standard tariff the unit
          rate changes quarterly with the Ofgem cap, and the supplier absorbs the
          volatility. Smart-meter{' '}
          <Term title="Time-of-use — a tariff whose unit rate varies by time of day.">
            time-of-use
          </Term>{' '}
          tariffs pass it through: Octopus Agile takes the day-ahead auction price and
          publishes all 48 of tomorrow's rates around 16:00 today, capped at 100p/kWh.
        </p>
        <p>
          Two things follow. Dispatch is a <em>known-price</em> optimisation — no
          forecasting, which is why the simulator can replay history exactly. And the
          daily shape is reliable: a cheap overnight trough, and a 4–7pm peak stiffened
          by an explicit peak-time uplift in the tariff formula.
        </p>
      </ChartSection>

      <ChartSection
        title="The household being simulated"
        caption="Expected consumption per half-hour: Elexon's domestic settlement profile (Profile Class 1), rescaled so a year totals Ofgem's 2,500 kWh typical value. A statistical profile, not measured smart-meter data — the one input here that is not from the backtest window."
        chartRef={demandRef}
      >
        <p>
          The simulated home follows the half-hourly shape Elexon used to settle every
          non-half-hourly-metered household for decades — the industry's definition of
          "typical". Its evening peak lands exactly on the price peak.
        </p>
        <p>
          That collision is why self-consumption beats arbitrage: a kWh discharged into
          your own evening demand avoids the full import rate (~{avgImport} on
          average, far more at the peak), while an exported kWh earns only ~{avgExport}.
          Same battery, same electricity —
          different counterparty.
        </p>
      </ChartSection>

      <ChartSection
        title="The sun the simulator sees"
        caption="Median GB solar capacity factor by half-hour: national fleet output ÷ installed capacity, from Sheffield Solar's PV_Live. The simulated array generates this fraction of its kWp each half-hour."
        chartRef={solarRef}
        height="h-[240px]"
      >
        <p>
          The solar option doesn't model your roof — it scales the <em>whole GB
          fleet's</em> actual output (PV_Live's estimate, divided by installed
          capacity) to a domestic array. Real weather over the real backtest window,
          which matters: sunny half-hours are also cheap half-hours, and a typical
          year's shape without that correlation would flatter the battery.
        </p>
        <p>
          Two honest caveats. The national fleet includes optimally-tilted solar
          farms, so this slightly flatters a typical roof. And with solar switched on
          the baseline changes: it becomes the same house <em>with the panels but no
          battery</em> — savings measure only what the battery adds, and storing
          surplus costs its forgone export revenue.
        </p>
      </ChartSection>

      <ChartSection
        title="Cheapest is not greenest"
        caption={`Median import price (top) and grid carbon intensity (bottom) by half-hour across ${ctx?.days ?? '…'} days, on one shared clock. Aligned troughs mean the two objectives agree; where they part is what the green strategy pays for.`}
        chartRef={divergenceRef}
        height="h-[340px]"
      >
        <p>
          Price and carbon are correlated — windy nights are cheap <em>and</em> clean —
          but they are not the same signal. Evening peaks are pricey and gas-heavy;
          sunny middays can be green without being especially cheap; interconnector
          imports can make cheap hours dirtier than they look.
        </p>
        <p>
          Over this window, only {overlap} of the day's eight cheapest half-hours were
          also among its eight greenest. The
          green strategy charges on the carbon signal regardless of price — the compare
          tab shows precisely what that costs and what it saves.
        </p>
      </ChartSection>

      <ChartSection
        title="Why the optimiser earns more"
        caption={`Annualised savings per strategy: the cheapest-window timer versus the linear-programming optimiser, on identical data and hardware — every bar is a full dispatch simulation over the same ${sim ? sim.periods.toLocaleString() : '…'} half-hours.`}
        chartRef={optimiserRef}
        height="h-[260px]"
      >
        <p>
          The grey bars are what a battery's built-in timer achieves: pick the cheapest
          half-hours, charge; pick the dearest, discharge. The teal bars solve each day
          as a{' '}
          <Term title="A linear program over the battery's state of charge: maximise savings subject to capacity, inverter power, and round-trip efficiency.">
            linear program
          </Term>{' '}
          over the battery's state of charge.
        </p>
        <p>
          The gap comes from the cases the timer can't reason about: days with two price
          valleys worth two cycles, marginal cycles that don't survive the ~10%
          round-trip loss, holding charge overnight when tomorrow looks better, and
          splitting each discharged kWh between the house and the grid. Same data, same
          battery — the difference is purely better decisions.
        </p>
      </ChartSection>
    </div>
  )
}
