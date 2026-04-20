import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { initAnalytics } from './services/analytics';
import { captureAttributionFromUrl } from './utils/attribution';
import { initWebVitals } from './utils/webVitals';
import './i18n/config'; // must load before any component that calls useT()
import './index.css';
import './styles/landing.css';
import './styles/tarot-meanings.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  // VITE_BUILD_SHA is injected by the deploy workflow (see .github/workflows/deploy.yml).
  // Falls back to package.json version when running locally.
  const release = import.meta.env.VITE_BUILD_SHA
    ? `arcana@${import.meta.env.VITE_BUILD_SHA}`
    : `arcana@${import.meta.env.VITE_APP_VERSION || 'dev'}`;
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 0,
  });
}

initAnalytics();
// Must come AFTER initAnalytics() so the gtag queue is primed before
// web-vitals starts reporting. See obs-audit C3 / SCALABILITY-PLAN Part 3.
initWebVitals();
captureAttributionFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
