import { test, expect } from '@playwright/test'
import { authenticate } from './setup/auth'

test.use({ viewport: { width: 1280, height: 800 } })

test.beforeEach(async ({ page }) => {
  await authenticate(page)
  await page.goto('/leaderboard')
  await page.waitForLoadState('networkidle')
  // Wait for table data to load (SWR fetch completes)
  await page.waitForSelector('table tbody tr', { timeout: 10_000 }).catch(() => {
    // Empty leaderboard — tests will skip data assertions
  })
})

test('default sort is Net P&L descending', async ({ page }) => {
  const rows = page.locator('table tbody tr')
  const count = await rows.count()
  if (count < 2) {
    test.skip() // Not enough data to verify ordering
    return
  }

  // Extract Net P&L values from the 3rd column (rank, player, net pnl, roi, win%, bets)
  const pnlValues: number[] = []
  for (let i = 0; i < count; i++) {
    const cellText = await rows.nth(i).locator('td').nth(2).innerText()
    const num = parseFloat(cellText.replace(/[^-\d.]/g, ''))
    if (!isNaN(num)) pnlValues.push(num)
  }

  // Values should be in descending order
  for (let i = 1; i < pnlValues.length; i++) {
    expect(pnlValues[i]).toBeLessThanOrEqual(pnlValues[i - 1])
  }
})

test('clicking ROI % header sorts by ROI ascending', async ({ page }) => {
  const roiHeader = page.getByRole('button', { name: /roi/i })
  await expect(roiHeader).toBeVisible()

  // First click: sort ROI ascending (default sort is netPnl, so first ROI click → asc)
  await roiHeader.click()
  await page.waitForTimeout(300)

  const rows = page.locator('table tbody tr')
  const count = await rows.count()
  if (count < 2) {
    test.skip()
    return
  }

  // ROI col is index 3 (rank=0, player=1, netpnl=2, roi=3)
  const roiValues: number[] = []
  for (let i = 0; i < count; i++) {
    const cellText = await rows.nth(i).locator('td').nth(3).innerText()
    const num = parseFloat(cellText.replace(/[^-\d.]/g, ''))
    if (!isNaN(num)) roiValues.push(num)
  }

  // Should be ascending after first click
  for (let i = 1; i < roiValues.length; i++) {
    expect(roiValues[i]).toBeGreaterThanOrEqual(roiValues[i - 1])
  }
})

test('clicking ROI % header twice sorts by ROI descending', async ({ page }) => {
  const roiHeader = page.getByRole('button', { name: /roi/i })
  await expect(roiHeader).toBeVisible()

  // Click once (ascending)
  await roiHeader.click()
  await page.waitForTimeout(200)

  // Click again (descending)
  await roiHeader.click()
  await page.waitForTimeout(300)

  const rows = page.locator('table tbody tr')
  const count = await rows.count()
  if (count < 2) {
    test.skip()
    return
  }

  const roiValues: number[] = []
  for (let i = 0; i < count; i++) {
    const cellText = await rows.nth(i).locator('td').nth(3).innerText()
    const num = parseFloat(cellText.replace(/[^-\d.]/g, ''))
    if (!isNaN(num)) roiValues.push(num)
  }

  // Should be descending after second click
  for (let i = 1; i < roiValues.length; i++) {
    expect(roiValues[i]).toBeLessThanOrEqual(roiValues[i - 1])
  }
})

test('rank and player columns stay sticky on horizontal scroll (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/leaderboard')
  await page.waitForLoadState('networkidle')

  // Scroll the table container horizontally
  const tableWrapper = page.locator('.overflow-x-auto')
  await expect(tableWrapper.first()).toBeVisible()

  await tableWrapper.first().evaluate((el) => {
    el.scrollLeft = 500
  })
  await page.waitForTimeout(200)

  // Rank column header should still be in view (sticky)
  const rankTh = page.locator('th').first()
  const rankBox = await rankTh.boundingBox()
  expect(rankBox).not.toBeNull()
  expect(rankBox!.x).toBeGreaterThanOrEqual(0) // still visible (not scrolled away)
})
