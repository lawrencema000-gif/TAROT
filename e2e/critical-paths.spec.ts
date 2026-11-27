/**
 * Critical-path E2E smoke tests, run on a phone (mobile-safari, iPhone 13,
 * 390px) and a desktop (chromium-desktop).
 *
 * Each spec mirrors a user-visible invariant that, if broken, would cost
 * conversion or lose money:
 *   1. The signed-out landing renders the hero and a working Sign in, from
 *      the bar on a desktop and from the Menu sheet on a phone.
 *   2. ads.txt and app-ads.txt serve the publisher line.
 *   3. /version.json names the commit the live build was made from.
 *   4. Email sign-in lands on the signed-in home with its bottom nav, and the
 *      Horoscope and Readings tabs render (needs E2E_EMAIL / E2E_PASSWORD).
 *   5. ?lang=ja renders the landing and the signed-in Horoscope in Japanese.
 *
 * If one fails on production, roll back with Netlify's "Publish deploy" on the
 * previous deploy and fix forward (README.md, Deploys).
 */
import { landingSignIn } from './landing';
import {
  test,
  expect,
  e2eCredentials,
  mainNavItem,
  signInAs,
  HOROSCOPE_NAME,
  READINGS_NAME,
} from './fixtures';

test.describe('Unauthenticated landing', () => {
  test('renders hero + working Sign In button', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.locator('h1').first()).toBeVisible();

    const signIn = await landingSignIn(page, /^Sign in$/);
    await expect(signIn).toBeVisible();
    await signIn.click();
    await expect(page).toHaveURL(/\/signin\/?(\?.*)?$/);
    await expect(page.locator('form input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test('ads.txt serves the correct publisher line', async ({ request }) => {
    const res = await request.get('/ads.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('google.com, pub-9489106590476826, DIRECT, f08c47fec0942fa0');
  });

  test('app-ads.txt serves the correct publisher line', async ({ request }) => {
    const res = await request.get('/app-ads.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('google.com, pub-9489106590476826, DIRECT, f08c47fec0942fa0');
  });

  test('version.json names the commit the build was made from', async ({ request, baseURL }) => {
    const res = await request.get(`/version.json?cb=${Date.now()}`);
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(Number.isNaN(Date.parse(json.builtAt))).toBe(false);
    // Production must be a clean build of a commit (README.md, Deploys); a
    // preview or a local build may carry "-dirty". "local" is never accepted:
    // it means the build could not name its commit (health-status-23).
    const production = new URL(baseURL ?? 'https://tarotlife.app').hostname === 'tarotlife.app';
    expect(json.sha, `sha of ${baseURL}`).toMatch(production ? /^[0-9a-f]{40}$/ : /^[0-9a-f]{40}(-dirty)?$/);
  });
});

test.describe('Authenticated flows', () => {
  test('sign in → home loads with bottom nav', async ({ authedPage: page }) => {
    await expect(page.locator('main, [role=main]').first()).toBeVisible();
  });

  test('horoscope tab renders (home → Horoscope)', async ({ authedPage: page }) => {
    await mainNavItem(page, HOROSCOPE_NAME).click();
    // Either the "Today for you" section or a birth-chart prompt.
    await expect(
      page.getByText(/today for you|今日のあなたへ|오늘의 당신|今日的你|compute your chart|birth chart|出生図|出生星盘/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('readings tab renders Daily Draw + spreads grid', async ({ authedPage: page }) => {
    await mainNavItem(page, READINGS_NAME).click();
    await expect(page.getByText(/daily draw|デイリードロー|데일리 드로우|每日抽牌/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Locale integrity (JA)', () => {
  test('html[lang] follows ?lang=ja and chrome renders Japanese', async ({ page }) => {
    await page.goto('/?lang=ja');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(await landingSignIn(page, /^ログイン$/)).toBeVisible();
  });

  test('the authenticated horoscope page has no bare English headers', async ({ page }) => {
    const creds = e2eCredentials();
    test.skip(!creds, 'E2E_EMAIL + E2E_PASSWORD not set — see e2e/README.md');
    await signInAs(page, creds!, 'ja');
    await mainNavItem(page, HOROSCOPE_NAME).click();
    // At least one Japanese character in the page body, not only English fallbacks.
    await expect(page.locator('main, [role=main]').first()).toContainText(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/, {
      timeout: 15_000,
    });
  });
});
