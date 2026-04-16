import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { initAnalytics } from './services/analytics';
import './index.css';
import './styles/landing.css';
import './styles/tarot-meanings.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `arcana@1.1.0`,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 0,
  });
}

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
