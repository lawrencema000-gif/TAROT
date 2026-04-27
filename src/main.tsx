import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { initAnalytics } from './services/analytics';
import { captureAttributionFromUrl } from './utils/attribution';
import { initWebVitals } from './utils/webVitals';
import './i18n/config'; // must load before any component that calls useT()
import './index.css';
import './styles/landing.css';
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
  const loadSentry = async () => {
    try {
      const Sentry = await import('@sentry/react');
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        release,
        integrations: [
          Sentry.browserTracingIntegration(),
          // Replay records the last few seconds of user interaction (DOM
          // mutations, clicks, network calls) when an error fires. Lets us
          // literally watch what the user did before the crash.
          // Sample rate 0 for happy-path sessions; 100% on error so every
          // error has a replay attached.
          Sentry.replayIntegration({
            maskAllText: false,
            maskAllInputs: true, // never record what users type into forms
            blockAllMedia: false,
          }),
        ],
        tracesSampleRate: 0.2,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        // Drop noisy errors that aren't actionable.
        ignoreErrors: [
          // Browser extensions / cross-origin junk.
          'ResizeObserver loop',
          'Network request failed',
          'Non-Error promise rejection captured',
          // AbortController on user navigation away.
          'AbortError',
        ],
      });
      // Flush pre-init errors.
      for (const { error, source } of preInitErrors) {
        Sentry.captureException(error, { tags: { source } });
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
