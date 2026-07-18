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
  window_from: '2025-07-18',
  window_to: '2026-07-18',
  days: 365,
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

test('battery lab compares strategies', async ({ page }) => {
  await page.route('**/api/battery/simulation*', (route) =>
    route.fulfill({ json: SIMULATION }),
  )
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' }),
  )
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

  // the how-it-works tab exists (content lands in a follow-up)
  await page.getByRole('tab', { name: 'How it works' }).click()
  await expect(page.getByText(/methodology deep-dive/i)).toBeVisible()
})

test('nav reaches the battery lab', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ json: SIMULATION }))
  await page.goto('/battery')
  await expect(page.getByRole('link', { name: 'Battery Lab' })).toBeVisible()
})
