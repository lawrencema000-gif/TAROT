import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Stale-chunk recovery, shared by main.tsx's window listeners and every
 * lazily loaded screen.
 *
 * A deploy replaces the hashed chunks; a tab opened before it still asks for
 * the old names, and Netlify's SPA fallback answers with HTML. The browser
 * then reports one of the messages below. The page only needs to fetch the
 * new index, so it reloads once.
 *
 * The same messages also mean "the network is down": Chrome reports a fetch
 * that never reached a server as "Failed to fetch dynamically imported
 * module", word for word. Reloading then swaps the whole app — shell, tab
 * bar and whatever was on screen — for the browser's own offline page (p8
 * F44). So a reload happens only when it can land: the browser says it is
 * online AND the server answers a probe for the failed file (or, when the
 * message names no file, for /version.json). An answer of any kind proves
 * the reload will reach the new index; no answer means the failure stays in
 * the app, as the route's or the overlay's error card, with the shell intact.
 *
 * main.tsx's listeners never see the failures that matter most: React.lazy
 * catches the rejected import itself and hands it to the nearest error
 * boundary (an overlay with none takes the whole root down), so no
 * `unhandledrejection` fires. {@link lazyWithReload} catches it at the
 * import instead.
 *
 * The guard is a time window, not a once-per-tab flag: a reload that fails
 * again within the window is a real outage and must not loop, but a PWA left
 * open across two deploys a day apart should recover from both.
 */

const KEY = 'arcana_stale_chunk_reloaded';
const WINDOW_MS = 2 * 60 * 1000;
/** How long the reachability probe may take before the network counts as down. */
const PROBE_TIMEOUT_MS = 4000;

const STALE_CHUNK_RE =
  /not a valid JavaScript MIME type|Importing a module script failed|Failed to load module script|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i;

/** The server answered, with HTML where a script belonged: the chunk is gone. */
const SERVED_HTML_RE = /not a valid JavaScript MIME type/i;

export function isStaleChunkMessage(message: string): boolean {
  return STALE_CHUNK_RE.test(message);
}

function messageOf(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason) return String((reason as { message: unknown }).message);
  return String(reason ?? '');
}

/**
 * The file a failed-module message names, as an absolute same-origin URL,
 * or null. Chrome and Firefox append the module's URL; Vite's CSS preload
 * names a root-relative path; Safari names nothing. A URL on another origin
 * is not probed (its answer says nothing about this deploy).
 */
export function failedChunkUrl(message: string, origin: string = typeof location === 'undefined' ? 'http://localhost' : location.origin): string | null {
  const m = /(https?:\/\/[^\s'"<>()]+|\/[^\s'"<>()]+\.(?:m?js|css))/i.exec(message);
  if (!m) return null;
  try {
    const url = new URL(m[1], origin);
    return url.origin === origin ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * True when a reload can reach the server: the browser is online and a
 * probe for the failed file (else /version.json, which is never cached)
 * gets any HTTP answer. False when the probe cannot get through — offline,
 * a captive network that drops the request, or no answer in time.
 */
export async function canReachServer(reason: unknown, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const message = messageOf(reason);
  if (SERVED_HTML_RE.test(message)) return true;
  const probe = failedChunkUrl(message) ?? '/version.json';
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS) : null;
  try {
    await fetchImpl(probe, { cache: 'no-store', credentials: 'same-origin', signal: controller?.signal });
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Reload once for a stale chunk. Returns true when a reload has started;
 * false when one already ran inside the window (or storage is unusable, so a
 * loop could not be ruled out). Callers check {@link canReachServer} first.
 */
export function reloadForStaleChunk(reason: unknown, now: number = Date.now()): boolean {
  const message = messageOf(reason);
  try {
    const last = Number(sessionStorage.getItem(KEY)) || 0;
    if (now - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(now));
  } catch {
    return false;
  }
  console.warn('[stale-chunk] reloading after:', message);
  window.location.reload();
  return true;
}

let pending: Promise<boolean> | null = null;

/**
 * The one entry point: a failed-module error, from any listener or lazy
 * screen. Resolves true when a reload has started (the caller then waits
 * for it), false when the error should surface where it happened. Calls
 * that arrive while a probe is out share it, so a deploy that breaks a
 * screen and its preloads at once reloads once.
 */
export function recoverFromStaleChunk(reason: unknown, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!isStaleChunkMessage(messageOf(reason))) return Promise.resolve(false);
  if (pending) return pending;
  const run = canReachServer(reason, fetchImpl).then((reachable) => reachable && reloadForStaleChunk(reason));
  pending = run;
  void run.then((reloading) => {
    // A reload in progress keeps the answer; anything else lets the next
    // failure probe afresh.
    if (!reloading) pending = null;
  });
  return run;
}

/** Test seam: forget a shared probe. */
export function __resetStaleChunkProbe(): void {
  pending = null;
}

/**
 * `React.lazy` that reloads the page when the chunk is gone after a deploy.
 * While the reload is under way the import never settles, so the Suspense
 * fallback stays up rather than an error card flashing first. Any other
 * failure — the network is down, or a second stale failure inside the
 * window — still throws, into the nearest error boundary.
 */
export function lazyWithReload<T extends ComponentType<any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(async (err: unknown) => {
      if (await recoverFromStaleChunk(err)) {
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}
