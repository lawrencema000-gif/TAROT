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
      // Named `chromium-mobile` until 2026-08-31, which was a lie with
      // consequences: devices['iPhone 13'] sets defaultBrowserType 'webkit',
      // so this project has always launched WebKit while CI installed only
      // Chromium. Every scheduled run since the suite landed failed at
      // browser launch, and the PR-triggered runs were all skipped — so
      // these critical paths have never once been checked.
      //
      // Keeping WebKit (the app is used on iPhones; that coverage is the
      // point) and installing it in CI, rather than downgrading the project
      // to Chromium to match a name that was simply wrong.
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
