/**
 * A spread a visitor chose before they had an account.
 *
 * /spreads/:slug is a public page; its "Read this spread" used to send a
 * visitor without a session to /readings, which rendered the landing page,
 * and the spread was forgotten by the time they had signed up. Now the page
 * remembers the slug here and sends them to sign up; the first signed-in
 * screen that can start a reading (Home, or the Readings tab) takes it —
 * once — and opens the spread.
 *
 * localStorage, not sessionStorage: confirming an email address can open
 * the app in a new tab. The entry expires after a day so a visitor who
 * gave up is not ambushed by it a week later. Storage can be unavailable
 * (private mode, blocked site data); every access is guarded and the
 * fallback is simply that nothing is remembered.
 */
const KEY = 'arcana_pending_spread';
const TTL_MS = 24 * 60 * 60 * 1000;

export function rememberPendingSpread(slug: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ slug, at: Date.now() }));
  } catch {
    // Storage unavailable: the visitor starts from Home after signing up.
  }
}

/** The remembered slug, removed as it is read; null when there is none or it has expired. */
export function takePendingSpread(now: number = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as { slug?: unknown; at?: unknown };
    if (typeof parsed.slug !== 'string' || typeof parsed.at !== 'number') return null;
    return now - parsed.at <= TTL_MS ? parsed.slug : null;
  } catch {
    return null;
  }
}
