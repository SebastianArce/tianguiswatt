import { test, expect } from '@playwright/test'

const SNAPSHOT = {
  measured_at: '2026-06-30T20:00:00',
  generation: [
    { fuel_type: 'CCGT', generation_mw: 16228, share_pct: 57.35 },
    { fuel_type: 'WIND', generation_mw: 2060, share_pct: 7.28 },
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

async function mockApi(page: import('@playwright/test').Page) {
  await page.route('**/api/snapshot', (route) => route.fulfill({ json: SNAPSHOT }))
  await page.route('**/api/supply-demand*', (route) =>
    route.fulfill({ json: SUPPLY_DEMAND }),
  )
  await page.route('**/api/prices*', (route) => route.fulfill({ json: PRICES }))
  await page.route('**/api/bid-stack', (route) => route.fulfill({ json: BID_STACK }))
  await page.route('**/api/events', (route) =>
    route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': ok\n\n' }),
  )
}

test('home renders live data from the API', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await expect(page.getByText('TianguisWatt')).toBeVisible()
  await expect(page.getByRole('heading', { name: /the grid, right now/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Generation mix' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Supply vs demand' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Carbon intensity' })).toBeVisible()

  // data-derived text (rendered outside the ECharts canvas so it is assertable)
  await expect(page.getByText(/CCGT/)).toBeVisible()
  await expect(page.getByText(/very high/)).toBeVisible()
  await expect(page.getByText(/27367 MW/)).toBeVisible()

  // control-room ticker + prices (folded-in #52)
  await expect(page.getByText('System price')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wholesale price' })).toBeVisible()
})

test('nav switches between pages', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')

  await page.getByRole('link', { name: 'Explore' }).click()
  await expect(page).toHaveURL(/\/explore$/)
  await expect(
    page.getByRole('heading', { name: /balancing offer stack/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Learn' }).click()
  await expect(page).toHaveURL(/\/learn$/)
  await expect(
    page.getByRole('heading', { name: /how the gb market sets a price/i }),
  ).toBeVisible()
})
