import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './utils/polyfills'; // must load before any code that may call Array.at / String.at
import App from './App.tsx';

// Stale-chunk recovery. When a new deploy replaces hashed JS chunks,
// any browser still showing the previous index.html will reference
// chunk hashes that no longer exist on the CDN. Netlify's SPA fallback
// serves index.html for those missing URLs; the browser then tries to
// execute HTML as JS and emits one of:
//   - "'text/html' is not a valid JavaScript MIME type"
//   - "Failed to load module script"
//   - "Importing a module script failed"
// All of these mean the same thing: the page is on an obsolete bundle
// and just needs to refetch index.html. We force one hard reload (guarded
// by sessionStorage so we never reload-loop if the new index.html also
// fails for some reason).
{
  const onStaleChunk = (msg: string) => {
    if (sessionStorage.getItem('arcana_stale_chunk_reloaded')) return;
    sessionStorage.setItem('arcana_stale_chunk_reloaded', String(Date.now()));
    console.warn('[stale-chunk] reloading after:', msg);
    window.location.reload();
  };
  window.addEventListener('error', (e) => {
    const msg = String(e.message || '');
    if (
      msg.includes('not a valid JavaScript MIME type') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Failed to load module script')
    ) {
      onStaleChunk(msg);
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason;
    const msg = reason instanceof Error ? reason.message : String(reason ?? '');
    if (
      msg.includes('not a valid JavaScript MIME type') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Failed to fetch dynamically imported module')
    ) {
      onStaleChunk(msg);
    }
  });
}
import { initAnalytics } from './services/analytics';
import { captureAttributionFromUrl } from './utils/attribution';
import { initWebVitals } from './utils/webVitals';
import i18n, { i18nReady } from './i18n/config'; // must load before any component that calls useT()
import './index.css';
import { applyPersistedReadingScale } from './utils/readingScale';

// Before the first render: a reader who chose a larger text size must not
// see a flash of the default size on every launch.
applyPersistedReadingScale();
import './styles/tarot-meanings.css';

// Sentry is a ~150 KB gzipped dependency that DOESN'T need to be in the
// critical path — it's only needed when an error happens. Dynamic-import it
// after the main app has painted so the first paint is ~150 KB lighter.
if (import.meta.env.VITE_SENTRY_DSN) {
  const release = import.meta.env.VITE_BUILD_SHA
    ? `arcana@${import.meta.env.VITE_BUILD_SHA}`
    : `arcana@${import.meta.env.VITE_APP_VERSION || 'dev'}`;

  // Queue up any pre-init errors so they land in Sentry once it's loaded.
  const preInitErrors: Array<{ error: Error; source: string }> = [];
  const origOnError = window.onerror;
  const origOnUnhandled = window.onunhandledrejection;
  window.onerror = (msg, src, line, col, err) => {
    if (err) preInitErrors.push({ error: err, source: 'window.onerror' });
    return origOnError?.apply(window, [msg, src, line, col, err]) ?? false;
  };
  window.onunhandledrejection = (ev) => {
    const err = ev.reason instanceof Error ? ev.reason : new Error(String(ev.reason));
    preInitErrors.push({ error: err, source: 'unhandledrejection' });
    return origOnUnhandled?.apply(window, [ev]);
  };

  // Load Sentry after 2.5s of idle time (or immediately if an error fires).
  //
  // We use @sentry/capacitor on top of @sentry/react. On web, this is
  // identical to using @sentry/react directly. On Android + iOS, it
  // ALSO bridges native crashes (JVM RuntimeExceptions, Swift fatalErrors,
  // out-of-memory kills, ANRs) up to the Sentry dashboard via the
  // bundled Sentry Android / Cocoa SDK. JS-only Sentry can't see those —
  // when the JS bridge dies, errors are lost.
  //
  // Required: SENTRY_DSN env var (already configured). Native upload
  // requires Capacitor sync to bring in the native modules — happens
  // automatically on `npx cap sync android` / `cap sync ios`.
  const loadSentry = async () => {
    try {
      // Destructured, not `const Sentry = await import(…)`: Rollup only
      // tree-shakes a dynamic import whose used members it can see, and a
      // namespace it cannot follow keeps every export of @sentry/react in
      // vendor-sentry — Replay included, which is the reason it is dropped
      // above. (AuthContext.tsx and telemetry.ts still take the namespace
      // in a `.then((Sentry) => …)` callback; until they destructure too,
      // the chunk keeps the full surface.)
      const { init: initCapacitor } = await import('@sentry/capacitor');
      const { init: initReact, captureException } = await import('@sentry/react');
      initCapacitor(
        {
          dsn: import.meta.env.VITE_SENTRY_DSN,
          environment: import.meta.env.MODE,
          release,
          // No Session Replay. `replayIntegration` (the rrweb recorder,
          // ~100 KB gz of the 150 KB vendor-sentry chunk, 102 KB of it
          // reported unused on every page) buffered DOM mutations for every
          // visitor so that the 0.x% who hit an error could have a replay
          // attached. Not referencing it lets Rollup drop @sentry-internal/
          // replay from the build entirely; a static `integrations: [...]`
          // behind a runtime flag would keep it in the chunk. Errors keep
          // their stack, breadcrumbs, tags and the pre-init queue below. To
          // bring replays back, load them on demand with
          // `Sentry.lazyLoadIntegration('replayIntegration')` after the
          // first captured event (and allow browser.sentry-cdn.com in the
          // CSP script-src) rather than re-adding the static import.
          integrations: [],
          tracesSampleRate: 0.2,
          // Drop noisy errors that aren't actionable.
          ignoreErrors: [
            // Browser extensions / cross-origin junk.
            'ResizeObserver loop',
            'Network request failed',
            'Non-Error promise rejection captured',
            // AbortController on user navigation away.
            'AbortError',
            // Stale-chunk reloads — handled inline at the top of main.tsx
            // and force a one-shot page refresh. Sentry capturing these
            // adds noise without action.
            'not a valid JavaScript MIME type',
            'Importing a module script failed',
            'Failed to load module script',
            'Failed to fetch dynamically imported module',
            // Sentry's own onIframeLoad reaching into a cross-origin
            // ad/analytics iframe — instrumentation noise, never caused
            // by app code.
            "Failed to read a named property 'Element' from 'Window'",
            'Blocked a frame with origin',
          ],
        },
        // The 2nd arg is the inner @sentry/react init function — Capacitor
        // wrapper passes through after setting up the native bridge.
        initReact,
      );
      // Flush pre-init errors.
      for (const { error, source } of preInitErrors) {
        captureException(error, { tags: { source } });
      }
      preInitErrors.length = 0;
      window.onerror = origOnError;
      window.onunhandledrejection = origOnUnhandled;
    } catch {
      /* Sentry load failed — local onerror handlers keep us sane */
    }
  };

  if ('requestIdleCallback' in window) {
    (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(loadSentry, { timeout: 2500 });
  } else {
    setTimeout(loadSentry, 2500);
  }
}

initAnalytics();
// Must come AFTER initAnalytics() so the gtag queue is primed before
// web-vitals starts reporting.
initWebVitals();
captureAttributionFromUrl();

const mount = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

// English is bundled, so i18next finished initialising while config.ts
// evaluated and the first render happens right here, as before. Any other
// locale fetches its own bundles (UI strings + the tarot corpus) as lazy
// chunks first, so the first paint is already in that language instead of
// flashing English. `i18nReady` never rejects: a bundle that fails to load
// leaves the app in English rather than on a blank screen.
if (i18n.isInitialized) {
  mount();
} else {
  // Mount in the chosen language when its bundles arrive, and in English
  // after a bounded wait if they do not: a blank screen is worse than a
  // flash of the fallback.
  void Promise.race([i18nReady, new Promise<void>((r) => setTimeout(r, 2500))]).then(mount);
}

// Request App Tracking Transparency permission on iOS 14.5+.
//
// Apple requires this prompt before any IDFA-using framework can
// access the device tracking identifier (AdMob personalized ads,
// RevenueCat audiences, Sentry session replay fingerprinting).
//
// Guideline: show the prompt AFTER first paint (so the user sees
// the app's UI behind the dialog and understands it's our request),
// but BEFORE AdMob.initialize() actually runs.
//
// On Android / Web this resolves to 'unsupported' immediately —
// see src/utils/att.ts for the dynamic-import + no-op fallback.
const initATT = () => {
  void import('./utils/att').then((m) => m.requestATTPermission());
};
if ('requestIdleCallback' in window) {
  (window as unknown as {
    requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
  }).requestIdleCallback(initATT, { timeout: 1500 });
} else {
  setTimeout(initATT, 1500);
}
