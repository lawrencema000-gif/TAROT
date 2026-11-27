import { test as base, expect, type Locator, type Page } from '@playwright/test';

/**
 * Common fixtures for the critical-path specs.
 *
 * Everything here only reads production (or a preview deploy), apart from
 * signing in with the dedicated QA account in E2E_EMAIL / E2E_PASSWORD: repo
 * secrets in CI, environment variables locally (e2e/README.md). Without them
 * every signed-in spec skips, which is why the signed-in paths were never
 * checked in CI before these secrets existed (health-status-14).
 */

export type Credentials = { email: string; password: string };
export type Locale = 'en' | 'ja' | 'ko' | 'zh';

/** common:nav.* in en, ja, ko, zh: the bottom-nav items the specs use. */
export const HOME_NAME = /^(Home|ホーム|홈|首页)$/;
export const READINGS_NAME = /^(Readings|リーディング|리딩|解读)$/;
export const HOROSCOPE_NAME = /^(Horoscope|星占い|별자리 운세|星座运势)$/;

export function e2eCredentials(): Credentials | null {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  return email && password ? { email, password } : null;
}

/**
 * Makes `locale` this device's own choice before the app loads, as the
 * language picker does (src/i18n/config.ts setLocale). `?lang=en` alone is
 * not a choice (settleChoiceAtBoot): after sign-in the app follows the
 * account's saved language (AuthContext), which the ja spec itself sets to
 * Japanese. A choice is also saved to the account, which is harmless on the
 * dedicated QA account.
 */
export async function chooseLocale(page: Page, locale: Locale): Promise<void> {
  await page.addInitScript((l) => {
    try {
      localStorage.setItem('arcana_locale_choice', l);
      localStorage.setItem('arcana_locale', l);
    } catch {
      /* storage blocked: the ?lang= in the URL still applies */
    }
  }, locale);
}

/**
 * Fills and submits the /signin form. The form is found by its password field:
 * the Google and Apple buttons sit outside it, and getByLabel(/password/) would
 * also match the "Show password" toggle (a strict-mode error).
 */
export async function submitSignIn(page: Page, creds: Credentials): Promise<void> {
  const form = page.locator('form').filter({ has: page.locator('input[autocomplete="current-password"]') });
  await form.locator('input[type="email"]').fill(creds.email);
  await form.locator('input[autocomplete="current-password"]').fill(creds.password);
  await form.locator('button[type="submit"]').click();
}

/**
 * A bottom-nav item by its accessible name. The nav is found by its
 * data-main-nav attribute (index.css keys on it too). Its items are role=tab
 * today; WP-P4-12 turns the nav into a landmark of plain buttons or links, so
 * all three roles are accepted.
 */
export function mainNavItem(page: Page, name: RegExp): Locator {
  const nav = page.locator('nav[data-main-nav]');
  return nav.getByRole('tab', { name }).or(nav.getByRole('button', { name })).or(nav.getByRole('link', { name }));
}

/** Closes whatever dialog the app opened on arrival: an open sheet hides the bottom nav. */
export async function closeDialogs(page: Page): Promise<void> {
  const dialogs = page.getByRole('dialog');
  for (let i = 0; i < 3 && (await dialogs.count()) > 0; i++) {
    await page.keyboard.press('Escape');
    await expect(dialogs).toHaveCount(0, { timeout: 2_000 }).catch(() => undefined);
  }
}

/** Signs in on /signin in `locale` and waits for the signed-in home and its bottom nav. */
export async function signInAs(page: Page, creds: Credentials, locale: Locale): Promise<void> {
  await chooseLocale(page, locale);
  await page.goto(`/signin?lang=${locale}`);
  await submitSignIn(page, creds);
  await expect(mainNavItem(page, HOME_NAME).or(page.getByRole('dialog')).first()).toBeVisible({ timeout: 15_000 });
  await closeDialogs(page);
  await expect(mainNavItem(page, HOME_NAME)).toBeVisible({ timeout: 15_000 });
}

type Fixtures = {
  /** Page already signed in, in English. */
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use, testInfo) => {
    const creds = e2eCredentials();
    // Skip, not throw: red that means "no password here" trains people to
    // ignore red that means "the app is broken".
    testInfo.skip(!creds, 'E2E_EMAIL + E2E_PASSWORD not set — see e2e/README.md');
    await signInAs(page, creds!, 'en');
    await use(page);
  },
});

export { expect };
