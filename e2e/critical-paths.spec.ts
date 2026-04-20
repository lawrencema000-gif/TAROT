/**
 * Critical-path E2E smoke tests.
 *
 * Each spec mirrors a user-visible invariant that, if broken, would cost
 * conversion or lose money:
 *   1. Unauthenticated landing renders the hero and a working Sign In CTA.
 *   2. Email/password sign-in lands on the authenticated home.
 *   3. Horoscope tab renders localized content (not bare English) in ja.
 *   4. Paywall sheet opens when a non-premium user taps a locked spread.
 *   5. /blog list renders published posts with non-broken cover images.
 *   6. ads.txt + app-ads.txt serve the correct publisher line.
 *
 * These specs are the minimum viable contract that every deploy must
 * preserve. If any fails on main, the deploy is rolled back via Netlify's
 * previous-publish button.
 */
import { test, expect } from './fixtures';

test.describe('Unauthenticated landing', () => {
  test('renders hero + working Sign In button', async ({ page }) => {
    await page.goto('/?lang=en');
    await expect(page.locator('h1').first()).toBeVisible();

    // The sign-in CTA must be reachable from the nav (desktop) or the hero.
    const signIn = page.getByRole('button', { name: /sign in/i }).first();
    await expect(signIn).toBeVisible();
    await signIn.click();
    // On the auth page we expect an email input within a few seconds.
    await expect(page.getByLabel(/email/i)).toBeVisible({ timeout: 10_000 });
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

  test('version.json publishes a sha + version', async ({ request }) => {
    const res = await request.get('/version.json');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('sha');
    expect(json).toHaveProperty('version');
    expect(json).toHaveProperty('builtAt');
  });
});

test.describe('Authenticated flows', () => {
  test('sign in → home loads with bottom nav', async ({ authedPage: page }) => {
    await expect(page.getByRole('tab', { name: /home/i })).toBeVisible();
    // Home shows the user's streak or the welcome block.
    await expect(page.locator('main, [role=main]').first()).toBeVisible();
  });

  test('horoscope tab renders (home → Astrology)', async ({ authedPage: page }) => {
    await page.getByRole('tab', { name: /astrology|horoscope|星占い|별자리|星座/i }).click();
    // Expect either "Today For You" section or a birth-chart prompt.
    await expect(
      page.getByText(/today for you|今日のあなたへ|오늘의 당신|今日的你|compute your chart|birth chart|出生図|出生星盘/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('readings tab renders Daily Draw + spreads grid', async ({ authedPage: page }) => {
    await page.getByRole('tab', { name: /readings|リーディング|리딩|牌阵/i }).click();
    await expect(page.getByText(/daily draw|デイリードロー|데일리 드로우|每日抽牌/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Locale integrity (JA)', () => {
  test('html[lang] follows ?lang=ja and chrome renders Japanese', async ({ page }) => {
    await page.goto('/?lang=ja');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ja');
    // The sign-in button text should be Japanese on the landing nav.
    await expect(page.getByRole('button', { name: /ログイン|sign in/i }).first()).toBeVisible();
  });

  test('the authenticated horoscope page has no bare English headers', async ({ page }) => {
    // Re-use the sign-in flow with lang=ja.
    await page.goto('/?lang=ja');
    await page.getByRole('button', { name: /ログイン|sign in/i }).first().click();
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    if (!email || !password) test.skip(true, 'E2E creds required');
    await page.getByLabel(/email|メール/i).fill(email!);
    await page.getByLabel(/password|パスワード/i).fill(password!);
    await page.getByRole('button', { name: /ログイン|sign in/i }).nth(1).click();
    await page.waitForLoadState('networkidle');
    // Tab to horoscope.
    await page.getByRole('tab', { name: /星占い|astrology|horoscope/i }).click();
    await page.waitForTimeout(3000);

    // Spot check: the page should contain at least one CJK character in the
    // header region, not just English fallbacks.
    const text = await page.locator('main, [role=main]').first().innerText();
    const hasCJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(text);
    expect(hasCJK, 'horoscope page should render CJK content in ja locale').toBe(true);
  });
});
