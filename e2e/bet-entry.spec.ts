import { test, expect } from '@playwright/test'
import { authenticate } from './setup/auth'

test.use({ viewport: { width: 1280, height: 800 } })

test.beforeEach(async ({ page }) => {
  await authenticate(page)
})

test('add a match winner bet via desktop Dialog', async ({ page }) => {
  await page.goto('/schedule')
  await page.waitForLoadState('networkidle')

  // Open bet modal from first fixture card
  const addBetBtn = page.getByRole('button', { name: /add bet/i }).first()
  await expect(addBetBtn).toBeVisible()
  await addBetBtn.click()

  // Desktop: must render as Dialog, not Drawer
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Drawer should NOT be present at 1280px
  await expect(page.locator('[data-vaul-drawer]')).not.toBeVisible()

  // Fill in bet details
  await page.getByPlaceholder(/e\.g\. Brazil to win/i).fill('Brazil to win')
  await page.getByPlaceholder(/e\.g\. 2\.50/i).fill('2.50')
  await page.getByPlaceholder(/0\.00/).fill('25')

  await page.getByRole('button', { name: /add bet/i, exact: true }).last().click()

  // Dialog should close after submit
  await expect(dialog).not.toBeVisible({ timeout: 5000 })

  // Navigate to bets page and verify bet appeared
  await page.goto('/bets')
  await page.waitForLoadState('networkidle')

  const betRow = page.locator('[data-testid="bet-row"], .bet-card').filter({ hasText: 'Brazil to win' }).first()
  await expect(betRow).toBeVisible({ timeout: 8000 })

  // Check odds displayed
  await expect(betRow).toContainText('2.50')

  // Check pending status badge
  const badge = betRow.locator('text=Pending').or(betRow.locator('.text-amber-400'))
  await expect(badge.first()).toBeVisible()
})

test('proxy bet shows "Logged by" badge for attributed member', async ({ page }) => {
  await page.goto('/schedule')
  await page.waitForLoadState('networkidle')

  const addBetBtn = page.getByRole('button', { name: /add bet/i }).first()
  await expect(addBetBtn).toBeVisible()
  await addBetBtn.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Change "Placing for" to another member if dropdown is visible
  const placingForSelect = dialog.locator('select, [role="combobox"]').first()
  const selectVisible = await placingForSelect.isVisible()
  if (selectVisible) {
    await placingForSelect.click()
    // Pick the second option (another member, not current user)
    const options = page.locator('[role="option"]')
    const count = await options.count()
    if (count > 1) {
      await options.nth(1).click()
    } else {
      // Only one member in league — skip proxy assertion
      test.skip()
      return
    }
  } else {
    // Only one member — drawer has no "Placing for" dropdown
    test.skip()
    return
  }

  await page.getByPlaceholder(/e\.g\. Brazil to win/i).fill('Proxy Test Bet')
  await page.getByPlaceholder(/e\.g\. 2\.50/i).fill('1.80')
  await page.getByPlaceholder(/0\.00/).fill('10')

  await page.getByRole('button', { name: /add bet/i, exact: true }).last().click()
  await expect(dialog).not.toBeVisible({ timeout: 5000 })

  // The proxy bet should appear with "Logged by" badge
  await page.goto('/bets')
  await page.waitForLoadState('networkidle')

  const proxyBet = page.locator('text=Proxy Test Bet').first()
  await expect(proxyBet).toBeVisible({ timeout: 8000 })

  // "Logged by X" amber badge should be near the bet
  const proxyBadge = page.locator('.text-amber-400, [class*="amber"]').filter({ hasText: /logged by/i })
  await expect(proxyBadge.first()).toBeVisible()
})

test('accumulator combined odds computes correctly', async ({ page }) => {
  await page.goto('/schedule')
  await page.waitForLoadState('networkidle')

  const addBetBtn = page.getByRole('button', { name: /add bet/i }).first()
  await expect(addBetBtn).toBeVisible()
  await addBetBtn.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Select Accumulator / Parlay bet type
  const betTypeSelect = dialog.locator('[role="combobox"]').first()
  await betTypeSelect.click()
  await page.locator('[role="option"]').filter({ hasText: /accumulator/i }).click()

  // First leg is pre-populated — fill it in
  const legInputs = dialog.locator('input[type="number"], input[placeholder*="Odds"]')

  // Fill leg 1: odds 2.0
  await dialog.locator('input[placeholder*="description"], input[placeholder*="Match"]').nth(0).fill('Match 1')
  await dialog.locator('input[placeholder*="Selection"]').nth(0).fill('Team A')
  const oddsInputs = dialog.locator('input[placeholder*="Odds"], input[step="0.01"]').filter({ hasNot: page.locator('[placeholder*="0.00"]') })
  await oddsInputs.nth(0).fill('2.0')

  // Add Leg 2
  await dialog.getByRole('button', { name: /add leg/i }).click()
  await dialog.locator('input[placeholder*="description"], input[placeholder*="Match"]').nth(1).fill('Match 2')
  await dialog.locator('input[placeholder*="Selection"]').nth(1).fill('Team B')
  await oddsInputs.nth(1).fill('1.5')

  // Add Leg 3
  await dialog.getByRole('button', { name: /add leg/i }).click()
  await dialog.locator('input[placeholder*="description"], input[placeholder*="Match"]').nth(2).fill('Match 3')
  await dialog.locator('input[placeholder*="Selection"]').nth(2).fill('Team C')
  await oddsInputs.nth(2).fill('3.0')

  // Combined odds badge: 2.0 × 1.5 × 3.0 = 9.00
  const combinedBadge = dialog.locator('.text-emerald-400').filter({ hasText: /combined/i })
  await expect(combinedBadge).toBeVisible({ timeout: 3000 })
  await expect(combinedBadge).toContainText('9.00')
})
