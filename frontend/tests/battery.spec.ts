import { test, expect } from '@playwright/test'

const BATTERY = {
  key: '10kwh',
  name: 'Medium (10 kWh)',
  capacity_kwh: 10,
  power_kw: 5,
  round_trip_efficiency: 0.9,
  cost_gbp: 5500,
}

const typicalDay = Array.from({ length: 48 }, (_, i) => ({
  settlement_period: i + 1,
  charge_kwh: i < 8 ? 2.0 : 0,
  discharge_kwh: i >= 35 && i < 40 ? 1.8 : 0,
  soc_kwh: i < 8 ? i : i < 35 ? 8 : Math.max(0, 8 - (i - 34) * 1.8),
  import_p_kwh: i < 12 ? 12 : i >= 34 && i < 40 ? 33 : 20,
  export_p_kwh: i < 12 ? 6 : 14,
  intensity_gco2: i < 12 ? 90 : 180,
}))

const run = (strategy: string, optimizer: string, saving: number, carbon: number) => ({
  strategy,
  optimizer,
  saving_gbp: saving,
  saving_gbp_year: saving,
  carbon_saved_kg_year: carbon,
  cycles: 300,
  payback_years: saving > 0 ? +(5500 / saving).toFixed(1) : null,
  typical_day: typicalDay,
  monthly: [{ month: '2026-06-01', saving_gbp: saving / 12, carbon_saved_kg: carbon / 12 }],
})

const SIMULATION = {
  battery: BATTERY,
  household_kwh: 2500,
  window_from: '2025-07-18',
  window_to: '2026-07-18',
  days: 365,
  periods: 17520,
  baseline_cost_gbp_year: 492,
  runs: [
    run('arbitrage', 'greedy', 148, 119),
    run('arbitrage', 'lp', 215, 143),
    run('self_consumption', 'greedy', 64, 13),
    run('self_consumption', 'lp', 319, 147),
    run('green', 'greedy', 28, 17),
    run('green', 'lp', -69, 285),
  ],
}

const CONTEXT = {
  window_from: '2025-07-18',
  window_to: '2026-07-18',
  days: 365,
  periods: 17520,
  tdcv_kwh: 2500,
  import_tariff: 'E-1R-AGILE-24-10-01-C',
  export_tariff: 'E-1R-AGILE-OUTGOING-19-05-13-C',
  region: 'London (C)',
  avg_import_p_kwh: 18.26,
  avg_export_p_kwh: 10.06,
  green_overlap_pct: 55.9,
  presets: [BATTERY],
  intraday: Array.from({ length: 48 }, (_, i) => ({
    settlement_period: i + 1,
    import_p10: 8,
    import_p25: 11,
    import_p50: i >= 34 && i < 40 ? 30 : 15,
    import_p75: 20,
    import_p90: 28,
    export_p50: 9,
    carbon_p50: i < 12 ? 90 : 170,
  })),
  demand_profile: Array.from({ length: 48 }, (_, i) => ({
    settlement_period: i + 1,
    avg_kwh: 0.14,
    winter_weekday_kwh: 0.2,
    summer_weekday_kwh: 0.1,
  })),
}

async function mockBatteryApi(page: import('@playwright/test').Page) {
  await page.route('**/api/battery/simulation*', (route) =>
    route.fulfill({ json: SIMULATION }),
  )
  await page.route('**/api/battery/context*', (route) =>
    route.fulfill({ json: CONTEXT }),
  )
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' }),
  )
}

test('battery lab compares strategies', async ({ page }) => {
  await mockBatteryApi(page)
  await page.goto('/battery')

  await expect(page.getByRole('heading', { name: 'Battery Lab' })).toBeVisible()

  // one card per strategy with its annualised saving
  await expect(page.getByRole('heading', { name: 'Arbitrage' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Self-consumption' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Green' })).toBeVisible()
  await expect(page.getByText('£319')).toBeVisible()
  await expect(page.getByText('−£69')).toBeVisible()
  await expect(page.getByText('never pays back')).toBeVisible()
  await expect(page.getByText(/payback 17\.2 yrs/)).toBeVisible()

  // context + chart sections
  await expect(page.getByText(/£492\/yr importing on Agile/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Money saved per year' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carbon avoided per year' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /a typical day's dispatch/i }),
  ).toBeVisible()

  // switching preset refetches with the new battery
  const request = page.waitForRequest(/battery=5kwh/)
  await page.getByRole('button', { name: '5 kWh', exact: true }).click()
  await request

  // switching household refetches with the new consumption band
  const householdRequest = page.waitForRequest(/household=electrified/)
  await page.getByRole('button', { name: 'EV / heat pump' }).click()
  await householdRequest

  // the how-it-works tab renders the explainer
  await page.getByRole('tab', { name: 'How it works' }).click()
  await expect(page.getByText('18.26p', { exact: true })).toBeVisible()
})

test('how-it-works tab explains the methodology', async ({ page }) => {
  await mockBatteryApi(page)
  await page.goto('/battery')
  await page.getByRole('tab', { name: 'How it works' }).click()

  // headline stats
  await expect(page.getByText('18.26p', { exact: true })).toBeVisible()
  await expect(page.getByText('10.06p', { exact: true })).toBeVisible()
  await expect(page.getByText('56%', { exact: true })).toBeVisible()
  await expect(page.getByText('2,500 kWh', { exact: true })).toBeVisible()
  await expect(page.getByText(/E-1R-AGILE-24-10-01-C/)).toBeVisible()
  // the sample size is stated explicitly
  await expect(page.getByText(/17,520 half-hours over 365 days/)).toBeVisible()

  // the four explainer sections
  await expect(
    page.getByRole('heading', { name: /the price a household can actually trade/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /the household being simulated/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /cheapest is not greenest/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /why the optimiser earns more/i }),
  ).toBeVisible()
})

test('nav reaches the battery lab', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: SIMULATION }))
  await page.goto('/battery')
  await expect(page.getByRole('link', { name: 'Battery Lab' })).toBeVisible()
})
