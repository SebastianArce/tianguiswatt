import type { EChartsOption } from 'echarts'
import { useMemo, useState } from 'react'
import { AssumptionsNote } from '@/components/story/AssumptionsNote'
import { SectionShell } from '@/components/story/SectionShell'
import { useBatterySimulation, useProfile } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import {
  CCGT_UNIT_MW,
  MAX_HOMES,
  WIND_TURBINE_MW,
  fleetMwByHour,
  fleetStats,
  fmtGbp,
  fmtHomes,
  fmtPower,
  homesFromT,
  tFromHomes,
} from '@/lib/fleet'
import { useChartTheme } from '@/lib/theme'

const ANCHORS = [
  { homes: 1, label: '1 home' },
  { homes: 100, label: 'a street' },
  { homes: 10_000, label: 'a town' },
  { homes: MAX_HOMES, label: 'a small city' },
]

function FleetChart({
  demandByHour,
  fleetByHour,
}: {
  demandByHour: number[]
  fleetByHour: number[]
}) {
  const chart = useChartTheme()
  const option = useMemo<EChartsOption>(() => {
    const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
    const demandGw = demandByHour.map((mw) => +(mw / 1000).toFixed(2))
    const carvedGw = demandByHour.map(
      (mw, h) => +((mw - (fleetByHour[h] ?? 0)) / 1000).toFixed(2),
    )
    const bandGw = demandGw.map((d, h) => +(d - carvedGw[h]).toFixed(3))
    return {
      legend: {
        top: 0,
        textStyle: { color: chart.slate, fontSize: 11 },
        data: ['National demand (typical day)', 'With the fleet discharging'],
      },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (v) => `${Number(v).toFixed(2)} GW`,
      },
      grid: { left: 48, right: 12, top: 30, bottom: 26 },
      xAxis: {
        type: 'category',
        data: hours,
        axisLabel: { color: chart.muted, interval: 5 },
        axisLine: { lineStyle: { color: chart.line } },
      },
      yAxis: {
        type: 'value',
        name: 'GW',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
        scale: true,
      },
      series: [
        {
          name: 'National demand (typical day)',
          type: 'line',
          data: demandGw,
          lineStyle: { color: chart.ink, width: 2 },
          itemStyle: { color: chart.ink },
          symbol: 'none',
          smooth: true,
        },
        {
          name: 'With the fleet discharging',
          type: 'line',
          data: carvedGw,
          lineStyle: { color: chart.teal, width: 2, type: 'dashed' },
          itemStyle: { color: chart.teal },
          symbol: 'none',
          smooth: true,
        },
        // the carved band: invisible base at the carved line + the difference filled
        {
          type: 'line',
          stack: 'carve',
          data: carvedGw,
          lineStyle: { opacity: 0 },
          symbol: 'none',
          silent: true,
        },
        {
          type: 'line',
          stack: 'carve',
          data: bandGw,
          lineStyle: { opacity: 0 },
          areaStyle: { color: chart.teal, opacity: 0.18 },
          symbol: 'none',
          silent: true,
        },
      ],
    }
  }, [demandByHour, fleetByHour, chart])
  const ref = useECharts(option)
  return <div ref={ref} className="h-[300px] w-full" />
}

/** Section 5: the multiplication — one home N times over, against real demand. */
export function FleetSection() {
  const [t, setT] = useState(tFromHomes(10_000))
  const homes = homesFromT(t)
  // the fleet is the default backtested home: 10 kWh battery, typical household
  const { data } = useBatterySimulation('10kwh', 'medium', 'none')
  const { data: demandProfile } = useProfile('demand', 30)

  const run = useMemo(
    () =>
      data?.runs.find(
        (r) => r.strategy === 'self_consumption' && r.optimizer === 'lp',
      ) ?? null,
    [data],
  )
  const demandByHour = useMemo(
    () => (demandProfile?.intraday ?? []).map((b) => b.p50),
    [demandProfile],
  )
  const eveningPeakMw = demandByHour.length ? Math.max(...demandByHour) : null
  const stats = run ? fleetStats(run, homes, eveningPeakMw) : null
  const fleetHourly = useMemo(
    () => (run ? fleetMwByHour(run, homes) : []),
    [run, homes],
  )

  return (
    <SectionShell
      id="fleet"
      eyebrow="Move four · The multiplication"
      title="One battery is a gadget. A quarter of a million is a power station."
      tone="raised"
      lede={
        <p>
          Slide. The same backtested home — a 10 kWh battery in a typical household —
          multiplied, and drawn against the real national demand curve. Every megawatt
          the fleet discharges at the evening peak is a megawatt some power station
          does not have to generate; what turns the gadgets into a power station is the
          software dispatching them together.
        </p>
      }
    >
      {(inView) => (
        <div className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-display text-2xl text-ink">
              {fmtHomes(homes)} <span className="text-base text-slate">orchestrated homes</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={t}
            onChange={(e) => setT(Number(e.target.value))}
            aria-label="Number of homes in the fleet"
            className="mt-3 h-11 w-full accent-[#14716b]"
          />
          <div className="relative mb-8 h-5 font-mono text-[10px] text-muted">
            {ANCHORS.map((a) => (
              <span
                key={a.homes}
                className="absolute -translate-x-1/2 whitespace-nowrap first:translate-x-0 last:-translate-x-full"
                style={{ left: `${tFromHomes(a.homes) * 100}%` }}
              >
                {a.label}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[10px] border border-line bg-paper p-4">
              <div className="font-display text-3xl text-ink">
                {stats ? fmtPower(stats.fleetMw) : '—'}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate">
                dispatchable at the evening peak
                {stats && stats.ccgtFraction >= 0.05 && (
                  <>
                    {' '}
                    · ≈{' '}
                    {stats.ccgtFraction >= 1
                      ? `${stats.ccgtFraction.toFixed(1)}×`
                      : `${Math.round(stats.ccgtFraction * 100)}% of`}{' '}
                    a {CCGT_UNIT_MW} MW gas unit
                  </>
                )}
                {stats && stats.ccgtFraction < 0.05 && stats.turbinesEquiv >= 0.5 && (
                  <> · ≈ {Math.round(stats.turbinesEquiv)} wind turbines ({WIND_TURBINE_MW} MW each)</>
                )}
              </div>
            </div>
            <div className="rounded-[10px] border border-line bg-paper p-4">
              <div className="font-display text-3xl text-ink">
                {stats ? stats.gwhShiftedYear.toLocaleString(undefined, { maximumSignificantDigits: 3 }) : '—'}
                <span className="ml-1 text-sm text-muted">GWh/yr</span>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate">
                moved out of expensive, dirty half-hours
              </div>
            </div>
            <div className="rounded-[10px] border border-line bg-paper p-4">
              <div className="font-display text-3xl text-ink">
                {stats ? stats.tonnesCo2Year.toLocaleString(undefined, { maximumSignificantDigits: 3 }) : '—'}
                <span className="ml-1 text-sm text-muted">tCO₂/yr</span>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate">
                grid carbon displaced by the fleet
              </div>
            </div>
            <div className="rounded-[10px] border border-line bg-paper p-4">
              <div className="font-display text-3xl text-ink">
                {stats ? fmtGbp(stats.gbpYear) : '—'}
                <span className="ml-1 text-sm text-muted">/yr</span>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate">
                earned by the fleet's owners, at today's tariffs
              </div>
            </div>
          </div>

          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <div className="rounded-[10px] border border-line bg-paper p-5 shadow-sm">
              <h3 className="font-display text-lg text-ink">
                The evening peak, shaved by the fleet
              </h3>
              {inView && demandByHour.length ? (
                <FleetChart demandByHour={demandByHour} fleetByHour={fleetHourly} />
              ) : (
                <div className="h-[300px]" />
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Median national demand by hour (last 30 days) and the same curve with
                the fleet's typical-day discharge subtracted
                {stats?.pctOfEveningPeak != null && stats.pctOfEveningPeak >= 0.1 && (
                  <> — currently {stats.pctOfEveningPeak.toFixed(1)}% of the peak</>
                )}
                . The sliver is the point: the grid's stress, and its premium prices,
                live in the top few percent of this curve — exactly where the fleet
                bites. The next section shows what those percent cost.
              </p>
            </div>
            <AssumptionsNote />
          </div>
        </div>
      )}
    </SectionShell>
  )
}
