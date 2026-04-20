import { test as base, expect, type Page } from '@playwright/test';

/**
 * Common fixtures for critical-path specs.
 *
 * Everything here is read-only against prod (or a preview deploy) so the
 * only thing we need is a real user account. We use the same credentials
 * as the language-audit scripts: E2E_EMAIL / E2E_PASSWORD.
 */

type Fixtures = {
  /** Page already signed in. Safe to use in tests that need the authed UI. */
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) {
      throw new Error(
        'E2E_EMAIL + E2E_PASSWORD env vars are required. Set them via GitHub secrets or .env.e2e for local runs.',
      );
    }
    await page.goto('/?lang=en');
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    // Signed-in landmark: the bottom nav with `Home` + `Readings` tabs.
    await expect(page.getByRole('tab', { name: /home/i })).toBeVisible({ timeout: 15_000 });
    await use(page);
  },
});

export { expect };
