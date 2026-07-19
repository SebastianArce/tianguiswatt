import { test, expect } from '@playwright/test'

const SNAPSHOT = {
  measured_at: '2026-06-30T20:00:00',
  generation: [{ fuel_type: 'WIND', generation_mw: 12000, share_pct: 40 }],
  supply_demand: {
    settlement_period: 42,
    demand_mw: 31408,
    transmission_demand_mw: 32000,
    total_generation_mw: 31000,
  },
  carbon: { from_ts: '2026-06-30T19:00:00', intensity_gco2: 146, intensity_index: 'moderate' },
  price: {
    settlement_period: 42,
    system_price: 95.5,
    net_imbalance_volume: -16,
    apx_price: 101.14,
    n2ex_price: 0,
  },
  frequency_hz: 49.97,
}

const PROFILE = {
  metric: 'price',
  days: 90,
  intraday: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    p10: 40 + h,
    p25: 55 + h,
    p50: 70 + h * 2,
    p75: 95 + h,
    p90: 120 + h,
  })),
  weekly: [],
}

const STORY = {
  window_from: '2025-07-01',
  window_to: '2026-07-19',
  monthly: Array.from({ length: 12 }, (_, i) => ({
    month: `${i < 6 ? 2025 : 2026}-${String((i % 12) + (i < 6 ? 7 : -5)).padStart(2, '0')}-01`,
    system_gbp_mwh: 70 + i,
    apx_gbp_mwh: 72 + i,
    agile_import_p_kwh: 17 + i * 0.2,
  })),
  avg_agile_import_p_kwh: 18.26,
  price_cap_p_kwh: 26.11,
  price_cap_label: 'Ofgem price cap · Jul–Sep 2026',
  fee_stack: [
    { name: 'Wholesale energy', share_pct: 45 },
    { name: 'Networks', share_pct: 20 },
    { name: 'Policy costs', share_pct: 11 },
    { name: 'Operating costs & margin', share_pct: 19 },
    { name: 'VAT', share_pct: 5 },
  ],
  peak_flex: {
    window_days: 30,
    max_accepted_offer_gbp_mwh: 999,
    p90_accepted_offer_gbp_mwh: 999,
    median_accepted_offer_gbp_mwh: 150.56,
    avg_system_gbp_mwh: 50.71,
    accepted_actions_7d: 233,
  },
}

const typicalDay = Array.from({ length: 48 }, (_, i) => ({
  settlement_period: i + 1,
  solar_kwh: 0,
  charge_solar_kwh: 0,
  charge_kwh: i >= 4 && i < 10 ? 1.5 : 0,
  discharge_kwh: i >= 34 && i < 42 ? 1.0 : 0,
  soc_kwh: i < 4 ? 0 : i < 34 ? 8 : Math.max(0, 8 - (i - 33)),
  import_p_kwh: i < 12 ? 12 : i >= 34 && i < 40 ? 33 : 20,
  export_p_kwh: 10,
  intensity_gco2: 150,
}))

const simRun = (optimizer: string, saving: number) => ({
  strategy: 'self_consumption',
  optimizer,
  saving_gbp: saving,
  saving_gbp_year: saving,
  carbon_saved_kg_year: 147,
  cycles: 300,
  payback_years: +(5500 / saving).toFixed(1),
  typical_day: typicalDay,
  monthly: [],
})

const SIMULATION = {
  battery: { key: '10kwh', name: 'Medium (10 kWh)', capacity_kwh: 10, power_kw: 5, round_trip_efficiency: 0.9, cost_gbp: 5500 },
  household_kwh: 2500,
  solar_kwp: 0,
  solar_generation_kwh_year: 0,
  window_from: '2025-07-19',
  window_to: '2026-07-19',
  days: 366,
  periods: 17521,
  baseline_cost_gbp_year: 492,
  runs: [
    simRun('greedy', 64),
    simRun('lp', 319),
    { ...simRun('greedy', 148), strategy: 'arbitrage' },
    { ...simRun('lp', 215), strategy: 'arbitrage' },
    { ...simRun('greedy', 28), strategy: 'green' },
    { ...simRun('lp', -69), strategy: 'green' },
  ],
}

const DEMAND_PROFILE = {
  metric: 'demand',
  days: 30,
  weekly: [],
  intraday: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    p10: 24000,
    p25: 26000,
    p50: 28000 + (h >= 17 && h <= 20 ? 8000 : 0),
    p75: 34000,
    p90: 38000,
  })),
}

const BID_STACK = {
  settlement_period: 42,
  entries: [
    { national_grid_bm_unit: 'AAA-1', offer_price: 60, volume_mw: 200, accepted: true },
    { national_grid_bm_unit: 'BBB-1', offer_price: 150, volume_mw: 150, accepted: true },
    { national_grid_bm_unit: 'CCC-1', offer_price: 999, volume_mw: 100, accepted: false },
    { national_grid_bm_unit: 'DDD-1', offer_price: 99999, volume_mw: 50, accepted: false },
  ],
}

async function mockStoryApi(page: import('@playwright/test').Page) {
  await page.route('**/api/bid-stack', (route) => route.fulfill({ json: BID_STACK }))
  await page.route('**/api/snapshot', (route) => route.fulfill({ json: SNAPSHOT }))
  await page.route('**/api/profile*', (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get('metric') === 'demand'
          ? DEMAND_PROFILE
          : PROFILE,
    }),
  )
  await page.route('**/api/battery/simulation*', (route) =>
    route.fulfill({ json: SIMULATION }),
  )
  await page.route('**/api/story', (route) => route.fulfill({ json: STORY }))
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' }),
  )
}

test('the story hero renders the live grid and the thesis', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /balancing itself this exact half-hour/i }),
  ).toBeVisible()
  // the three live stats, from the snapshot mock
  await expect(page.getByText('95.5')).toBeVisible()
  await expect(page.getByText('146')).toBeVisible()
  await expect(page.getByText('31.4')).toBeVisible() // demand in GW
  await expect(page.getByText(/the argument, in six moves/i)).toBeVisible()
})

test('the engine room links into the instruments', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: /the instruments are live/i }),
  ).toBeVisible()
  // the live-grid card carries the current price and navigates to the control room
  await expect(page.getByText('£96/MWh now')).toBeVisible()
  await page.getByRole('link', { name: /live grid.*control room/is }).click()
  await expect(page).toHaveURL(/\/live$/)
  await expect(
    page.getByRole('heading', { name: /the state of the grid/i }),
  ).toBeVisible()
})

test('the middle sections reveal and chart on scroll', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/')

  await page.getByRole('heading', { name: /different price every thirty minutes/i }).scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('heading', { name: /wholesale price, by hour of day/i }),
  ).toBeVisible()
  await expect(page.locator('#half-hours canvas').first()).toBeVisible()

  await page.getByRole('heading', { name: /flattens the whole thing/i }).scrollIntoViewIfNeeded()
  await expect(page.locator('#wedge canvas').first()).toBeVisible()
  // the fee strip states its shares
  await expect(page.getByText('Wholesale energy')).toBeVisible()
  await expect(page.getByText('45%')).toBeVisible()
  await expect(page.getByText(/26\.11p\/kWh/)).toBeVisible()
})

test('one home and the fleet respond to their controls', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/')

  await page.getByRole('heading', { name: /the shape becomes income/i }).scrollIntoViewIfNeeded()
  await expect(page.getByText('£319')).toBeVisible()
  await expect(page.getByText(/worth £255\/yr/)).toBeVisible() // lp − greedy
  await page.getByRole('button', { name: 'Simple timer' }).click()
  await expect(page.getByText('£64')).toBeVisible()

  await page.getByRole('heading', { name: /quarter of a million is a power station/i }).scrollIntoViewIfNeeded()
  // default 10,000 homes: 1 kWh/hh evening discharge → 2 kW/home → 20 MW
  await expect(page.getByText('10,000')).toBeVisible()
  await expect(page.getByText('20 MW')).toBeVisible()
  // slide to the top: 250,000 homes → 500 MW → ≈ 1.1× a gas unit
  await page.getByRole('slider', { name: /number of homes/i }).fill('1')
  await expect(page.getByText('250,000')).toBeVisible()
  await expect(page.getByText('500 MW')).toBeVisible()
  await expect(page.getByText(/1\.1× a 450 MW gas unit/)).toBeVisible()
  await expect(page.getByText(/identical homes/i)).toBeVisible()
})

test('the grid-pays section states what flexibility earns', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/')
  await expect(page).toHaveTitle(/power station hiding/i)

  await page
    .getByRole('heading', { name: /already pays for exactly this/i })
    .scrollIntoViewIfNeeded()
  await expect(page.getByText('£999')).toBeVisible() // max accepted, 30 days
  await expect(page.getByText(/£151/)).toBeVisible() // median vs £51 wholesale
  await expect(page.getByText('233')).toBeVisible() // actions in 7 days
  await expect(page.locator('#grid-pays canvas')).toBeVisible()
})

test('the nav leads with the story', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/live')
  await page.getByRole('navigation').getByRole('link', { name: 'Story' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { name: /your home could be helping/i }),
  ).toBeVisible()
})
