import type { EChartsOption } from 'echarts'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SectionShell } from '@/components/story/SectionShell'
import { useBidStack, useStory } from '@/hooks/api'
import { useECharts } from '@/hooks/useECharts'
import { useChartTheme } from '@/lib/theme'

const ACCEPTED = '#d7a13f'

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

function LadderChart() {
  const { data } = useBidStack()
  const { data: story } = useStory()
  const chart = useChartTheme()
  const option = useMemo<EChartsOption>(() => {
    // Defensive placeholder offers (£9,999+, "never take this pair") excluded, matching
    // the peak-flex stats; they would flatten the real ladder to a line at zero.
    const entries = (data?.entries ?? []).filter(
      (e) => e.offer_price >= 10 && e.offer_price < 9999, // log-axis floor + defensive cap
    )
    const line: [number, number][] = []
    const acceptedPts: [number, number][] = []
    let cum = 0
    for (const e of entries) {
      line.push([cum, e.offer_price])
      cum += e.volume_mw
      line.push([cum, e.offer_price])
      if (e.accepted) acceptedPts.push([cum - e.volume_mw / 2, e.offer_price])
    }
    const avgWholesale = story?.peak_flex?.avg_system_gbp_mwh ?? null
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 52, right: 20, top: 16, bottom: 42 },
      xAxis: {
        type: 'value',
        name: 'Cumulative offer volume (MW)',
        nameLocation: 'middle',
        nameGap: 26,
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      // Log scale: real offers span £50 → £9,998, so a linear axis collapses the
      // ladder's body into the baseline and shows only the scarcity spike.
      yAxis: {
        type: 'log',
        min: 10,
        name: '£/MWh (log)',
        nameTextStyle: { color: chart.muted },
        axisLabel: { color: chart.muted },
        splitLine: { lineStyle: { color: chart.line } },
      },
      series: [
        {
          name: 'Offer ladder',
          type: 'line',
          data: line,
          showSymbol: false,
          lineStyle: { color: chart.teal, width: 1.5 },
          areaStyle: { color: chart.areaFill },
          markLine:
            avgWholesale != null
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { color: chart.ink, type: 'dashed', width: 1 },
                  label: {
                    color: chart.slate,
                    fontSize: 10,
                    formatter: `average wholesale · £${avgWholesale.toFixed(0)}/MWh`,
                    position: 'insideEndTop',
                  },
                  data: [{ yAxis: avgWholesale }],
                }
              : undefined,
        },
        {
          name: 'Accepted',
          type: 'scatter',
          data: acceptedPts,
          symbolSize: 7,
          itemStyle: { color: ACCEPTED },
        },
      ],
    }
  }, [data, story, chart])
  const ref = useECharts(option)
  return <div ref={ref} className="h-[300px] w-full" />
}

/** Section 6: the balancing market already prices peak flexibility — handsomely. */
export function WhyGridPaysSection() {
  const { data } = useStory()
  const flex = data?.peak_flex
  const fmt = (v: number | null | undefined) =>
    v == null ? '—' : `£${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  return (
    <SectionShell
      id="grid-pays"
      eyebrow="Move five · The buyer"
      title="The system operator already pays for exactly this, every day."
      lede={
        <p>
          When the grid runs short, NESO walks up a ladder of offers from generators
          and batteries and accepts the cheapest flexibility available — at the peak,
          that flexibility gets expensive. A fleet that can shave the evening peak
          competes directly with the top of this ladder. How the ladder sets every
          half-hour's price is its own story —{' '}
          <Link to="/learn" className="text-teal underline underline-offset-2">
            the mechanics live here
          </Link>
          .
        </p>
      }
    >
      {(inView) => (
        <div className="mt-10">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              value={fmt(flex?.max_accepted_offer_gbp_mwh)}
              unit="/MWh"
              label={`the dearest flexibility accepted in the last ${flex?.window_days ?? 30} days`}
            />
            <Kpi
              value={fmt(flex?.median_accepted_offer_gbp_mwh)}
              unit="/MWh"
              label={`typical marginal accepted offer — against ${fmt(flex?.avg_system_gbp_mwh)} average wholesale`}
            />
            <Kpi
              value={flex ? flex.accepted_actions_7d.toLocaleString() : '—'}
              label="balancing actions accepted in the last 7 days"
            />
          </div>

          <div className="mt-6 rounded-[10px] border border-line bg-paper p-5 shadow-sm">
            <h3 className="font-display text-lg text-ink">
              The current offer ladder, and what got taken
            </h3>
            {inView ? <LadderChart /> : <div className="h-[300px]" />}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              This settlement period's balancing-mechanism offers, cheapest first on a
              logarithmic price axis; gold dots are offers the system operator
              accepted. Defensive placeholder offers (£9,999+) excluded. Everything above the dashed wholesale line is
              the premium the grid pays for flexibility at the moment it needs it —
              the revenue a virtual power plant is built to capture.
            </p>
          </div>
        </div>
      )}
    </SectionShell>
  )
}
