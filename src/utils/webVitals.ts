import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';

// ─── Core Web Vitals → GA4 ──────────────────────────────────────────
// Captures the five standard CWV metrics (LCP, CLS, INP, FCP, TTFB)
// and emits each as a `web_vital` GA4 custom event so we can track
// regressions deploy-over-deploy (release = VITE_BUILD_SHA).
//
// Design constraints (obs-audit C3, SCALABILITY-PLAN Part 3):
//   - Never block the main thread or first contentful paint.
//   - On low-end connections (2g/3g), defer reporting via
//     requestIdleCallback so it doesn't steal CPU from render.
//   - If gtag is absent (DNT, ad-block, Capacitor), silently skip —
//     same contract the rest of analytics.ts follows.
//   - Send only the 5 standard metrics + release tag + delta. No PII.

type GtagArgs = [string, string, Record<string, unknown>?];

declare global {
  interface Window {
    gtag?: (...args: GtagArgs) => void;
    dataLayer?: unknown[];
  }
}

// NetworkInformation isn't in lib.dom yet. Keep a narrow local shape.
interface NetworkInformationLike {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
}

function getEffectiveType(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const conn = (
    navigator as Navigator & { connection?: NetworkInformationLike }
  ).connection;
  return conn?.effectiveType;
}

function isSlowConnection(): boolean {
  const et = getEffectiveType();
  return et === 'slow-2g' || et === '2g' || et === '3g';
}

/** Defer to idle on slow connections so reporting doesn't steal CPU. */
function scheduleReport(cb: () => void): void {
  if (typeof window === 'undefined') {
    cb();
    return;
  }
  if (isSlowConnection()) {
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout?: number }
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(cb, { timeout: 1000 });
      return;
    }
    // Fallback: tiny macrotask delay.
    setTimeout(cb, 0);
    return;
  }
  // Fast connections: still defer off the current render pass, same
  // pattern analytics.ts uses to avoid blocking React event handlers.
  setTimeout(cb, 0);
}

function roundValue(name: string, value: number): number {
  if (name === 'CLS') {
    return Math.round(value * 1000) / 1000; // 3 decimal places
  }
  // LCP / FCP / INP / TTFB are all milliseconds → integer.
  return Math.round(value);
}

function sendToGa4(params: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    // Respect the user's DNT / ad-block state: silently skip if
    // gtag never loaded (analytics.ts follows the same contract).
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'web_vital', params);
    }
    const dl = window.dataLayer;
    if (Array.isArray(dl)) {
      dl.push({ event: 'web_vital', ...params });
    }
  } catch {
    // Never let a telemetry error break the app.
  }
}

function handleMetric(metric: Metric): void {
  scheduleReport(() => {
    const value = roundValue(metric.name, metric.value);
    const delta = roundValue(metric.name, metric.delta);
    sendToGa4({
      metric_name: metric.name,
      value,
      rating: metric.rating,
      id: metric.id,
      navigation_type: metric.navigationType,
      delta,
      release: import.meta.env.VITE_BUILD_SHA ?? 'dev',
    });
  });
}

let initialized = false;

/**
 * Register Core Web Vitals listeners. Safe to call multiple times —
 * the underlying `web-vitals` callbacks are registered only once.
 * Call this AFTER `initAnalytics()` so the gtag queue is primed.
 */
export function initWebVitals(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  initialized = true;

  onLCP(handleMetric);
  onCLS(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Emit a custom timing as a `web_vital` event (e.g. sign-in duration
 * or horoscope fetch time). Uses the same rounding rules as CWV.
 */
export function reportCustomVital(name: string, value: number): void {
  scheduleReport(() => {
    sendToGa4({
      metric_name: name,
      value: roundValue(name, value),
      rating: 'custom',
      id: `custom_${name}_${Date.now()}`,
      navigation_type: 'custom',
      delta: roundValue(name, value),
      release: import.meta.env.VITE_BUILD_SHA ?? 'dev',
    });
  });
}
