/**
 * Where a visitor goes once they are signed in.
 *
 * /signin and /signup are screens of the signed-out app only. The signed-in
 * route table used to fall through to `<Navigate to="/">` for them, so the
 * app never had to leave those URLs itself; when the catch-all became the
 * 404 page, every email sign-in, every sign-up and every OAuth return that
 * started on /signin rendered "Page not found". Now the signed-in table maps
 * both paths to a redirect, and this module decides where to: the `next`
 * the visitor was sent to /signin with (a member route opened while signed
 * out — /cartomancy/reading, /journal, an invite), else Home.
 *
 * `next` rides in the URL, and is also kept in sessionStorage for the trip
 * through Google: the OAuth return comes back to /signin with a `code`, and
 * AuthContext strips the whole query string while it exchanges it.
 */

const STORE_KEY = 'arcana_auth_next';
/** A remembered destination older than this is a different visit. */
const STORE_TTL_MS = 30 * 60 * 1000;

/** The two signed-out entry screens. */
export const AUTH_PATHS: readonly string[] = ['/signin', '/signup'];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.includes(pathname);
}

/**
 * `raw` as a same-origin in-app path (`/x?y#z`), or null. Anything that
 * could leave the site (`//evil.com`, `https://…`, `/\evil.com`), carries
 * control characters, or would loop back into the auth screens is refused.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(raw)) return null;
  let url: URL;
  try {
    url = new URL(raw, 'https://arcana.invalid');
  } catch {
    return null;
  }
  if (url.origin !== 'https://arcana.invalid') return null;
  if (isAuthPath(url.pathname) || url.pathname === '/reset-password') return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** The sign-in URL that comes back to `next` afterwards. */
export function signInPathFor(next: string): string {
  const safe = safeNextPath(next);
  return safe && safe !== '/' ? `/signin?next=${encodeURIComponent(safe)}` : '/signin';
}

/** `/signin` or `/signup`, keeping the `next` of the current search string. */
export function authPathKeepingNext(path: '/signin' | '/signup', search: string): string {
  const next = safeNextPath(new URLSearchParams(search).get('next'));
  return next && next !== '/' ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/** Remember the `next` of an auth screen's URL for the OAuth round trip. */
export function rememberNextFrom(search: string, now: number = Date.now()): void {
  const next = safeNextPath(new URLSearchParams(search).get('next'));
  if (!next) return;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ next, at: now }));
  } catch {
    /* storage blocked: the URL still carries it for the email paths */
  }
}

function storedNext(now: number): string | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { next?: unknown; at?: unknown };
    if (typeof parsed.at !== 'number' || now - parsed.at > STORE_TTL_MS) return null;
    return safeNextPath(typeof parsed.next === 'string' ? parsed.next : null);
  } catch {
    return null;
  }
}

/**
 * Where a signed-in visitor standing on /signin or /signup belongs. Pure
 * (reads, never clears), so a StrictMode double render agrees with itself;
 * call {@link forgetNext} once the redirect has happened.
 */
export function postAuthDestination(search: string, now: number = Date.now()): string {
  return safeNextPath(new URLSearchParams(search).get('next')) ?? storedNext(now) ?? '/';
}

export function forgetNext(): void {
  try {
    sessionStorage.removeItem(STORE_KEY);
  } catch {
    /* nothing to forget */
  }
}
