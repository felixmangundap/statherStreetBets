/**
 * Clerk test-mode auth helper.
 *
 * Requires:
 *   CLERK_SECRET_KEY=<your-clerk-secret-key>       (in .env.test.local)
 *   E2E_CLERK_USER_ID=<clerk-user-id-of-test-user> (in .env.test.local)
 *
 * The test Clerk instance must have "Allow testing tokens" enabled.
 * See: https://clerk.com/docs/testing/playwright
 */
import { setupClerkTestingToken } from '@clerk/testing/playwright'
import type { Page } from '@playwright/test'

export async function authenticate(page: Page) {
  await setupClerkTestingToken({ page })
}
