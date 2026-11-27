import { expect, type Locator, type Page } from '@playwright/test';

/**
 * The landing page's Sign in, wherever the viewport puts it.
 *
 * src/styles/landing.css shows the bar's Sign in (.lp-nav-signin) from 420px and
 * moves it into the Menu sheet below that (`@media (max-width: 419.98px)`). The
 * mobile-safari project is an iPhone 13 (390px), so a spec that looked for the
 * bar's button failed every night from 2026-10-20 (health-status-14).
 * src/test/golden/e2eLandingSelectors.test.ts fails when the stylesheet and
 * these constants disagree.
 */
export const SIGN_IN_BAR_MIN_WIDTH = 420;

/** landing:nav.menu in en, ja, ko, zh: the Menu button's aria-label and the sheet's title. */
export const MENU_NAME = /^(Menu|メニュー|메뉴|菜单)$/;

/** common:nav.signIn in en, ja, ko, zh. */
export const SIGN_IN_NAME = /^(Sign in|ログイン|로그인|登录)$/;

/**
 * Returns the landing's Sign in button for this viewport, ready to click.
 * From 420px: the button in the bar. Below: asserts the bar shows none (the
 * stylesheet's promise), opens the Menu sheet and returns the sheet's button.
 * It branches on width on purpose: a silent fallback would hide a missing button.
 */
export async function landingSignIn(page: Page, name: RegExp = SIGN_IN_NAME): Promise<Locator> {
  const width = page.viewportSize()?.width;
  if (width === undefined) throw new Error('landingSignIn needs a fixed viewport (set one in playwright.config.ts)');
  const bar = page.locator('nav.lp-nav');
  if (width >= SIGN_IN_BAR_MIN_WIDTH) return bar.getByRole('button', { name });
  await expect(bar.getByRole('button', { name })).toHaveCount(0);
  await bar.getByRole('button', { name: MENU_NAME }).click();
  const sheet = page.getByRole('dialog', { name: MENU_NAME });
  await expect(sheet).toBeVisible();
  return sheet.getByRole('button', { name });
}
