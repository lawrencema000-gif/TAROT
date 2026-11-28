/**
 * social-ai-01 (blocker): the report sheet works on phones.
 *
 * On every phone width the old report dialog's last row was drawn under the
 * bottom nav: a tap on Report or Cancel opened the Readings or Quizzes tab
 * and nothing was sent. The report is now the shared Sheet on <body>, which
 * hides the nav while it is up. This spec taps through it at 390×844, 360×740
 * and 412×915 and hit-tests Report and Cancel with elementFromPoint.
 *
 * It writes nothing to the community: the feed and the reports are route
 * mocks (one synthetic post and one synthetic whisper; the report POST is
 * recorded and answered 201 here). Signing in is real, so it needs a QA
 * account (arcana-qa-p7-<tag>@example.com) in E2E_EMAIL and E2E_PASSWORD.
 * The one thing it changes is that account's language, which the app copies
 * from the device's choice; the last test leaves it English.
 *
 * It signs in through /signin with its own helper rather than e2e/fixtures.ts:
 * that fixture clicks the landing bar's Sign in button, which is hidden below
 * 420 px until WP-F-01 lands.
 *
 * Phone layouts run in the mobile-safari project (WebKit, touch, isMobile):
 *   E2E_BASE_URL=http://localhost:<port> npx playwright test e2e/community-report.spec.ts --project=mobile-safari --workers=1
 */
import { test, expect, type Locator, type Page, type Route } from '@playwright/test';

const POST_ID = '7f1c2a9e-0e2b-4c1d-9a3f-2b6d8e4c1a01';
const WHISPER_ID = '7f1c2a9e-0e2b-4c1d-9a3f-2b6d8e4c1a02';
const NO_CREDENTIALS = 'E2E_EMAIL + E2E_PASSWORD not set — see e2e/README.md';

/** One row as community_feed_posts returns it (mapPost, src/dal/community.ts). */
function feedRow(whisper: boolean) {
  const at = new Date(Date.now() - 5 * 60_000).toISOString();
  return {
    id: whisper ? WHISPER_ID : POST_ID,
    topic: whisper ? 'whispering-well' : 'general',
    content: 'E2E synthetic post — nothing is stored',
    is_anonymous: whisper,
    reaction_count: 0,
    comment_count: 0,
    is_hidden: false,
    moderation_status: 'allowed',
    created_at: at,
    updated_at: at,
    author_id: whisper ? null : '00000000-0000-4000-8000-0000000000e2',
    is_mine: false,
    author_display_name: whisper ? null : 'E2E Star',
    author_avatar_seed: null,
  };
}

/** The app reads Supabase cross-origin: a fulfilled response needs the CORS headers. */
function cors(route: Route): Record<string, string> {
  return {
    'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };
}

async function preflight(route: Route): Promise<boolean> {
  if (route.request().method() !== 'OPTIONS') return false;
  await route.fulfill({ status: 204, headers: cors(route) });
  return true;
}

/** Route mocks that keep the community tables out of it. Returns the report rows POSTed. */
async function mockCommunity(page: Page): Promise<unknown[]> {
  const reports: unknown[] = [];
  await page.route(/\/rest\/v1\/community_feed_posts(\?|$)/, async (route) => {
    if (await preflight(route)) return;
    const whisper = route.request().url().includes('topic=eq.whispering-well');
    await route.fulfill({ status: 200, headers: cors(route), contentType: 'application/json', body: JSON.stringify([feedRow(whisper)]) });
  });
  await page.route(/\/rest\/v1\/community_reactions(\?|$)/, async (route) => {
    if (await preflight(route)) return;
    await route.fulfill({ status: 200, headers: cors(route), contentType: 'application/json', body: '[]' });
  });
  await page.route(/\/rest\/v1\/community_reports(\?|$)/, async (route) => {
    if (await preflight(route)) return;
    if (route.request().method() === 'POST') reports.push(route.request().postDataJSON());
    // supabase-js inserts with return=minimal: 201 and no body.
    await route.fulfill({ status: 201, headers: cors(route), body: '' });
  });
  return reports;
}

/** The inserted row of a recorded POST (PostgREST takes an object or an array). */
function insertedRow(body: unknown): Record<string, unknown> {
  return (Array.isArray(body) ? body[0] : body) as Record<string, unknown>;
}

/**
 * Make English this device's choice before the app boots, the way the language
 * picker stores it (setLocale, src/i18n/config.ts). The account takes a device's
 * choice when the profile loads (AuthContext). `?lang=en` alone chooses nothing,
 * so a device would follow the QA account's language instead: Korean, after the
 * whisper test below.
 */
async function chooseEnglishBeforeBoot(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('arcana_locale_choice', 'en');
      localStorage.setItem('arcana_locale', 'en');
    } catch {
      /* storage blocked: nothing is chosen */
    }
  });
}

/** `?lang=ko` is a choice by itself (a link naming ja, ko or zh chooses it); English needs chooseEnglishBeforeBoot. */
async function signIn(page: Page, lng: 'en' | 'ko') {
  if (lng === 'en') await chooseEnglishBeforeBoot(page);
  await page.goto(`/signin?lang=${lng}`);
  await page.locator('form input[type="email"]').fill(process.env.E2E_EMAIL!);
  await page.locator('form input[autocomplete="current-password"]').fill(process.env.E2E_PASSWORD!);
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator('nav[data-main-nav]')).toBeVisible({ timeout: 20_000 });
}

/** ⋮ → Report on the one synthetic post, until the sheet has finished sliding in. */
async function openReportSheet(page: Page, labels: { options: string; report: string; title: string }): Promise<Locator> {
  await page.getByRole('button', { name: labels.options, exact: true }).tap();
  await page.getByRole('menuitem', { name: labels.report, exact: true }).tap();
  const dialog = page.getByRole('dialog', { name: labels.title });
  await expect(dialog).toBeVisible();
  // `pointer-events-none` lifts when the entrance starts; then wait out its transitions.
  await expect(dialog).not.toHaveClass(/pointer-events-none/);
  await dialog.evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => undefined));
  return dialog;
}

/** On screen, and the topmost thing at its centre: a tap there reaches it, not the nav. */
async function expectTappable(page: Page, button: Locator) {
  const box = await button.boundingBox();
  expect(box, 'the button has a box').not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
  const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  const hit = await button.evaluate((el, { x, y }) => {
    const top = document.elementFromPoint(x, y);
    return { inside: !!top && (top === el || el.contains(top)), what: top ? `<${top.tagName.toLowerCase()} class="${top.getAttribute('class') ?? ''}">` : 'nothing' };
  }, centre);
  expect(hit.inside, `elementFromPoint(${centre.x}, ${centre.y}) is ${hit.what}`).toBe(true);
}

const EN = { options: 'Options', report: 'Report', title: 'Report post' };

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
  { width: 412, height: 915 },
]) {
  test.describe(`report a post at ${viewport.width}×${viewport.height}`, () => {
    test.skip(({ isMobile }) => !isMobile, 'phone layouts run in the mobile-safari project');
    test.use({ viewport });

    test('Report and Cancel are tappable; Report files one report and the card says Reported', async ({ page }) => {
      test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, NO_CREDENTIALS);
      const reports = await mockCommunity(page);
      await signIn(page, 'en');
      await page.goto('/community?lang=en');
      const nav = page.locator('nav[data-main-nav]');

      const dialog = await openReportSheet(page, EN);
      await dialog.getByRole('radio', { name: 'Spam' }).tap();
      await expect(dialog.getByRole('radio', { name: 'Spam' })).toHaveAttribute('aria-checked', 'true');
      await expect(nav).toBeHidden();

      const report = dialog.getByRole('button', { name: 'Report', exact: true });
      const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
      await expectTappable(page, report);
      await expectTappable(page, cancel);

      await report.tap();
      await expect.poll(() => reports.length).toBe(1);
      expect(insertedRow(reports[0])).toMatchObject({ post_id: POST_ID, reason: 'spam' });
      await expect(dialog).toBeHidden();
      expect(new URL(page.url()).pathname).toBe('/community');
      await expect(page.getByText('Reported', { exact: true })).toBeVisible();
      await expect(page.getByText('Report submitted. Thank you.')).toBeVisible();
      await expect(nav).toBeVisible();
      expect(reports).toHaveLength(1);
    });

    test('Cancel closes the sheet and sends nothing', async ({ page }) => {
      test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, NO_CREDENTIALS);
      const reports = await mockCommunity(page);
      await signIn(page, 'en');
      await page.goto('/community?lang=en');
      const url = page.url();

      const dialog = await openReportSheet(page, EN);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap();
      await expect(dialog).toBeHidden();
      expect(page.url()).toBe(url);
      await expect(page.locator('nav[data-main-nav]')).toBeVisible();
      expect(reports).toHaveLength(0);
    });
  });
}

// Last in the file: `?lang=ko` is this device's choice and is copied to the QA
// account's profile (AuthContext), so the test ends by choosing English again and
// loading once more, which copies English back. (`?lang=en` alone would not: it
// chooses nothing, and the device would follow the account's Korean.)
test.describe('report a whisper in Korean at 390×844', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone layouts run in the mobile-safari project');
  test.use({ viewport: { width: 390, height: 844 } });

  test('게시물 신고 → 스팸 → 신고하기 files one report on the whisper', async ({ page }) => {
    test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, NO_CREDENTIALS);
    const reports = await mockCommunity(page);
    await signIn(page, 'ko');
    try {
      await page.goto('/whispering-well?lang=ko');
      const dialog = await openReportSheet(page, { options: '옵션', report: '신고', title: '게시물 신고' });
      await dialog.getByRole('radio', { name: '스팸' }).tap();
      await expect(page.locator('nav[data-main-nav]')).toBeHidden();

      const report = dialog.getByRole('button', { name: '신고하기', exact: true });
      await expectTappable(page, report);
      await expectTappable(page, dialog.getByRole('button', { name: '취소', exact: true }));
      await report.tap();
      await expect.poll(() => reports.length).toBe(1);
      expect(insertedRow(reports[0])).toMatchObject({ post_id: WHISPER_ID, reason: 'spam' });
      await expect(dialog).toBeHidden();
      expect(new URL(page.url()).pathname).toBe('/whispering-well');
      await expect(page.getByText('신고됨', { exact: true })).toBeVisible();
    } finally {
      // Hand the QA profile its English back: choose English on this device (as
      // the picker stores it), then load once, and the profile write follows.
      const restored = page
        .waitForResponse((r) => /\/rest\/v1\/profiles(\?|$)/.test(r.url()) && r.request().method() === 'PATCH', { timeout: 15_000 })
        .catch(() => null);
      await page.evaluate(() => {
        localStorage.setItem('arcana_locale_choice', 'en');
        localStorage.setItem('arcana_locale', 'en');
      });
      await page.goto('/community');
      // Soft: a failure above stays the one reported.
      await expect.soft(page.locator('nav[data-main-nav]')).toBeVisible({ timeout: 20_000 });
      await expect.soft(page.getByRole('button', { name: 'Options', exact: true })).toBeVisible();
      await restored;
    }
  });
});
