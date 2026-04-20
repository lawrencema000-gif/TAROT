import { defineConfig, devices } from '@playwright/test';

/**
 * E2E test runner. Points at the live production URL by default; can be
 * pointed at a Netlify preview via E2E_BASE_URL. Runs the critical-path
 * spec on every PR via .github/workflows/e2e.yml.
 *
 * Requires env vars E2E_EMAIL + E2E_PASSWORD for tests that exercise the
 * authenticated surface. On GitHub those come from repo secrets; locally
 * they come from a gitignored `.env.e2e` file (see e2e/README.md).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://tarotlife.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Short timeouts surface flaky selectors early.
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
