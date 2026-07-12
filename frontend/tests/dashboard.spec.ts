import { test, expect } from '@playwright/test'

const SNAPSHOT = {
  measured_at: '2026-06-30T20:00:00',
  generation: [
    { fuel_type: 'CCGT', generation_mw: 16228, share_pct: 57.35 },
    { fuel_type: 'WIND', generation_mw: 2060, share_pct: 7.28 },
    { fuel_type: 'INTFR', generation_mw: 2000, share_pct: 7.07 },
  ],
  supply_demand: {
    settlement_period: 42,
    demand_mw: 27367,
    transmission_demand_mw: 31408,
    total_generation_mw: 28297,
  },
  carbon: {
    from_ts: '2026-06-30T19:00:00',
    intensity_gco2: 246,
    intensity_index: 'very high',
  },
  price: {
    settlement_period: 42,
    system_price: 95.0,
    net_imbalance_volume: -16,
    apx_price: 101.14,
    n2ex_price: 0,
  },
  frequency_hz: 49.97,
}

const PRICES = [
  {
    period_start: '2026-06-30T20:00:00',
    settlement_period: 41,
    system_price: 92,
    net_imbalance_volume: -10,
    apx_price: 100,
    n2ex_price: 0,
  },
  {
    period_start: '2026-06-30T20:30:00',
    settlement_period: 42,
    system_price: 95,
    net_imbalance_volume: -16,
    apx_price: 101.14,
    n2ex_price: 0,
  },
]

const SUPPLY_DEMAND = [
  {
    period_start: '2026-06-30T19:30:00',
    settlement_period: 40,
    demand_mw: 27000,
    transmission_demand_mw: 31000,
    total_generation_mw: 27800,
  },
  {
    period_start: '2026-06-30T20:00:00',
    settlement_period: 41,
    demand_mw: 27367,
    transmission_demand_mw: 31408,
    total_generation_mw: 28297,
  },
]

const BID_STACK = {
  settlement_period: 42,
  entries: [
    { national_grid_bm_unit: 'AAA-1', offer_price: 60, volume_mw: 10, accepted: true },
    { national_grid_bm_unit: 'BBB-1', offer_price: 100, volume_mw: 20, accepted: false },
  ],
}

const TIMESERIES = [
  { bucket: '2026-06-30T18:00:00', value: 22000 },
  { bucket: '2026-06-30T19:00:00', value: 21000 },
  { bucket: '2026-06-30T20:00:00', value: 20000 },
]

const GENERATION = [
  { measured_at: '2026-06-30T19:30:00', fuel_type: 'CCGT', generation_mw: 16000, share_pct: 57 },
  { measured_at: '2026-06-30T19:30:00', fuel_type: 'WIND', generation_mw: 2000, share_pct: 7 },
  { measured_at: '2026-06-30T20:00:00', fuel_type: 'CCGT', generation_mw: 16228, share_pct: 57 },
  { measured_at: '2026-06-30T20:00:00', fuel_type: 'WIND', generation_mw: 2060, share_pct: 7 },
]

const ACCEPTED = [
  {
    national_grid_bm_unit: 'PEMB-1',
    bm_unit: 'T_PEMB-1',
    unit_name: 'Pembroke Unit 1',
    fuel_type: 'CCGT',
    acceptance_time: '2026-06-30T20:05:00',
    level_from: 0,
    level_to: 180,
    so_flag: false,
  },
  {
    national_grid_bm_unit: 'MINETY-1',
    bm_unit: 'T_MINETY-1',
    unit_name: null,
    fuel_type: null,
    acceptance_time: '2026-06-30T20:00:00',
    level_from: 90,
    level_to: -45,
    so_flag: true,
  },
]

const PROFILE = {
  metric: 'demand',
  days: 30,
  intraday: Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    p10: 15000 + h * 100,
    p25: 16000 + h * 100,
    p50: 18000 + h * 120,
    p75: 20000 + h * 100,
    p90: 22000 + h * 100,
  })),
  weekly: Array.from({ length: 7 }, (_, wd) =>
    Array.from({ length: 24 }, (_, h) => ({
      weekday: wd + 1,
      hour: h,
      median: 18000 + h * 120,
    })),
  ).flat(),
}

async function mockApi(page: import('@playwright/test').Page) {
  await page.route('**/api/snapshot', (route) => route.fulfill({ json: SNAPSHOT }))
  await page.route('**/api/supply-demand*', (route) =>
    route.fulfill({ json: SUPPLY_DEMAND }),
  )
  await page.route('**/api/prices*', (route) => route.fulfill({ json: PRICES }))
  await page.route('**/api/bid-stack', (route) => route.fulfill({ json: BID_STACK }))
  await page.route('**/api/generation*', (route) => route.fulfill({ json: GENERATION }))
  await page.route('**/api/accepted-actions*', (route) =>
    route.fulfill({ json: ACCEPTED }),
  )
  await page.route('**/api/timeseries*', (route) => route.fulfill({ json: TIMESERIES }))
  await page.route('**/api/profile*', (route) => route.fulfill({ json: PROFILE }))
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' }),
  )
}

test('home renders live data from the API', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await expect(page.getByText('TianguisWatt')).toBeVisible()
  await expect(page.getByRole('heading', { name: /the state of the grid/i })).toBeVisible()
  await expect(page.getByText(/updated/)).toBeVisible() // data-freshness badge
  await expect(page.getByRole('heading', { name: 'Generation mix' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Supply vs demand' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carbon intensity' })).toBeVisible()

  // control-room right rail
  await expect(
    page.getByRole('heading', { name: 'Interconnector flows' }),
  ).toBeVisible()
  await expect(page.getByText('France')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Balancing mechanism' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Actions accepted' })).toBeVisible()
  await expect(page.getByText('Pembroke Unit 1')).toBeVisible() // registry name
  await expect(page.getByText('MINETY-1')).toBeVisible() // fallback to raw id

  // data-derived text (rendered outside the ECharts canvas so it is assertable)
  await expect(page.getByText(/very high/)).toBeVisible()
  await expect(page.getByText(/27367 MW/)).toBeVisible()

  // control-room ticker + prices (folded-in #52)
  await expect(page.getByText('System price')).toBeVisible()
  await expect(page.getByText('Frequency')).toBeVisible()
  await expect(page.getByText('49.97')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wholesale price' })).toBeVisible()
})

test('header links to the GitHub repo', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  const link = page.getByRole('link', { name: 'View source on GitHub' })
  await expect(link).toHaveAttribute('href', 'https://github.com/SebastianArce/tianguiswatt')
  await expect(link).toHaveAttribute('target', '_blank')
})

test('nav switches between pages', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await page.getByRole('link', { name: 'Explore' }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(
    page.getByRole('heading', { name: /explore the data/i }),
  ).toBeVisible()
  await expect(page.getByText(/updated/)).toBeVisible() // freshness indicator

  await page.getByRole('link', { name: 'Bid stack' }).click()
  await expect(page).toHaveURL(/\/bid-stack$/)
  await expect(
    page.getByRole('heading', { name: /balancing offer stack/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Trends' }).click()
  await expect(page).toHaveURL(/\/trends$/)
  await expect(
    page.getByRole('heading', { name: /market trends/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /a typical day/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Learn' }).click()
  await expect(page).toHaveURL(/\/learn$/)
  await expect(
    page.getByRole('heading', { name: /how the gb market sets a price/i }),
  ).toBeVisible()
})

test('mobile menu opens and navigates', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/')

  // desktop nav is hidden at this width; navigate via the hamburger drawer
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('link', { name: 'Trends' }).click()
  await expect(page).toHaveURL(/\/trends$/)
  await expect(
    page.getByRole('heading', { name: /market trends/i }),
  ).toBeVisible()
})

test('no horizontal overflow on mobile', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 320, height: 800 })
  for (const path of ['/', '/explore', '/bid-stack', '/trends', '/learn']) {
    await page.goto(path)
    await page.waitForTimeout(250)
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    )
    expect(overflows, `horizontal overflow at ${path}`).toBe(false)
  }
})

test('shows a connection banner when the live data fails', async ({ page }) => {
  await mockApi(page)
  // override the snapshot to fail (last matching route wins)
  await page.route('**/api/snapshot', (route) =>
    route.fulfill({ status: 500, json: { detail: 'boom' } }),
  )
  await page.goto('/')
  await expect(page.getByText(/can't reach the live data/i)).toBeVisible({
    timeout: 10_000,
  })
})

test('dark mode toggles, persists across reload, and charts survive', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  const html = page.locator('html')
  await expect(html).not.toHaveClass(/dark/)

  // turn dark on
  await page.getByRole('button', { name: /switch to dark mode/i }).click()
  await expect(html).toHaveClass(/dark/)
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')

  // a charted page still renders its canvas after re-theming
  await page.getByRole('link', { name: 'Explore' }).click()
  await expect(page.locator('canvas').first()).toBeVisible()

  // the choice persists across a reload (no flash back to light)
  await page.reload()
  await expect(html).toHaveClass(/dark/)

  // turn it back off
  await page.getByRole('button', { name: /switch to light mode/i }).click()
  await expect(html).not.toHaveClass(/dark/)
  expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light')
})
