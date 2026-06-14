import { test, expect } from '@playwright/test'
import { authenticate } from './setup/auth'

test.use({ viewport: { width: 375, height: 812 } })

test.beforeEach(async ({ page }) => {
  await authenticate(page)
})

test('bet modal opens as bottom sheet Drawer on mobile (375px)', async ({ page }) => {
  await page.goto('/schedule')
  await page.waitForLoadState('networkidle')

  const addBetBtn = page.getByRole('button', { name: /add bet/i }).first()
  await expect(addBetBtn).toBeVisible()
  await addBetBtn.click()

  // Mobile: Drawer (bottom sheet) must appear, not Dialog
  const drawer = page.locator('[data-vaul-drawer], [vaul-drawer]')
  await expect(drawer).toBeVisible({ timeout: 3000 })

  // Dialog must NOT be visible at 375px
  await expect(page.getByRole('dialog')).not.toBeVisible()

  // Drawer should animate from the bottom
  const drawerContent = page.locator('[data-vaul-drawer-content], [class*="DrawerContent"]')
  await expect(drawerContent.first()).toBeVisible()
})

test('bottom nav is visible at 375px, sidebar is hidden', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // Bottom nav: the nav element with 4 tabs (Dashboard, Schedule, Bets, Leaderboard)
  const bottomNav = page.locator('nav').filter({ hasText: /dashboard.*schedule|schedule.*bets/i }).first()
  await expect(bottomNav).toBeVisible()

  // Sidebar should be hidden at mobile width (has "hidden lg:flex" class)
  const sidebar = page.locator('aside, [data-testid="sidebar"]')
  const sidebarCount = await sidebar.count()
  if (sidebarCount > 0) {
    // Sidebar exists in DOM but should not be visible at 375px
    await expect(sidebar.first()).not.toBeVisible()
  }
})

test('sidebar is visible at desktop width, bottom nav is hidden', async ({ page }) => {
  // Override viewport for this specific test
  await page.setViewportSize({ width: 1280, height: 800 })

  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')

  // Sidebar should be visible on desktop
  const sidebar = page.locator('aside, [data-testid="sidebar"]')
  await expect(sidebar.first()).toBeVisible()

  // Bottom nav should NOT be visible on desktop (has "lg:hidden" class)
  const bottomNav = page.locator('[data-testid="bottom-nav"], nav.fixed')
  const navCount = await bottomNav.count()
  if (navCount > 0) {
    await expect(bottomNav.first()).not.toBeVisible()
  }
})
