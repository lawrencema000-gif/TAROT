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
  authedPage: async ({ page }, use, testInfo) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    // Skip, not throw. The locale spec already skips on missing credentials,
    // so a developer without an .env.e2e saw six red failures and two honest
    // skips for the same cause — and red that means "you have no password"
    // trains people to ignore red that means "the app is broken". CI has the
    // secrets, so nothing is quietly lost there.
    testInfo.skip(
      !email || !password,
      'E2E_EMAIL + E2E_PASSWORD not set — see e2e/README.md for .env.e2e',
    );
    await page.goto('/?lang=en');
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await page.getByLabel(/email/i).fill(email!);
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    // Signed-in landmark: the bottom nav with `Home` + `Readings` tabs.
    await expect(page.getByRole('tab', { name: /home/i })).toBeVisible({ timeout: 15_000 });
    await use(page);
  },
});

export { expect };
