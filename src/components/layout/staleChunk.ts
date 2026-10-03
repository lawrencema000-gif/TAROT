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

const STALE_CHUNK_RE =
  /not a valid JavaScript MIME type|Importing a module script failed|Failed to load module script|Failed to fetch dynamically imported module|error loading dynamically imported module|Unable to preload CSS/i;

export function isStaleChunkMessage(message: string): boolean {
  return STALE_CHUNK_RE.test(message);
}

function messageOf(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === 'object' && 'message' in reason) return String((reason as { message: unknown }).message);
  return String(reason ?? '');
}

/**
 * Reload once for a stale chunk. Returns true when a reload has started;
 * false when one already ran inside the window (or storage is unusable, so a
 * loop could not be ruled out).
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

/**
 * `React.lazy` that reloads the page when the chunk is gone after a deploy.
 * While the reload is under way the import never settles, so the Suspense
 * fallback stays up rather than an error card flashing first. Any other
 * failure (or a second stale failure inside the window) still throws, into
 * the nearest error boundary.
 */
export function lazyWithReload<T extends ComponentType<any>>( // eslint-disable-line @typescript-eslint/no-explicit-any
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch((err: unknown) => {
      if (isStaleChunkMessage(messageOf(err)) && reloadForStaleChunk(err)) {
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}
