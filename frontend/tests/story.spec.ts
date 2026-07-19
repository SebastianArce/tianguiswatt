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

async function mockStoryApi(page: import('@playwright/test').Page) {
  await page.route('**/api/snapshot', (route) => route.fulfill({ json: SNAPSHOT }))
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

test('the nav leads with the story', async ({ page }) => {
  await mockStoryApi(page)
  await page.goto('/live')
  await page.getByRole('navigation').getByRole('link', { name: 'Story' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(
    page.getByRole('heading', { name: /your home could be helping/i }),
  ).toBeVisible()
})
