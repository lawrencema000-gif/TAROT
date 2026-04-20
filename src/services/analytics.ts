import { contentInteractions } from '../dal';
import { appStorage } from '../lib/appStorage';

// ─── Google Analytics / Google Ads conversion bridge ──────────────
// Fires GA4 events via gtag() when available (web only — not in Capacitor).
// Google Ads imports these events as conversions automatically after they
// appear in GA4 and are marked as conversions in the Google Ads UI.

type GtagArgs = [string, string, Record<string, unknown>?];

declare global {
  interface Window {
    gtag?: (...args: GtagArgs) => void;
    dataLayer?: unknown[];
  }
}

/** Safe no-op when gtag isn't loaded (Capacitor, dev, or blocked).
 *
 *  Fires via two channels for maximum reliability:
 *    1. gtag('event', ...) — standard GA4 API
 *    2. dataLayer.push({event, ...}) — GTM-native format
 *  Dual-push ensures GA4 picks up the event even when called inside a
 *  React event handler's synchronous work (where gtag's internal
 *  batching can defer and sometimes drop the event).
 *
 *  Deferred via setTimeout(0) so it runs after React's synchronous
 *  render pass finishes — that's what was causing events to reach
 *  dataLayer but never leave the browser.
 */
function gtagEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  setTimeout(() => {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params);
      }
      const dl = window.dataLayer;
      if (Array.isArray(dl)) {
        dl.push({ event: name, ...params });
      }
    } catch {
      // Never let a tracking error break the app
    }
  }, 0);
}

export type AnalyticsEvent =
  | 'page_view'
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'onboarding_complete'
  | 'ritual_started'
  | 'ritual_completed'
  | 'tarot_draw'
  | 'tarot_saved'
  | 'spread_started'
  | 'spread_completed'
  | 'quiz_started'
  | 'quiz_completed'
  | 'journal_created'
  | 'paywall_viewed'
  | 'purchase_success'
  | 'restore_success'
  | 'horoscope_view'
  | 'horoscope_save'
  | 'compatibility_check'
  | 'search_performed'
  | 'share_completed'
  | 'streak_achieved'
  | 'onboarding_step_viewed'
  | 'onboarding_step_completed'
  | 'error_occurred';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
  userId?: string;
  timestamp?: string;
  sessionId?: string;
}

let sessionId: string | null = null;
let userId: string | null = null;
const eventQueue: AnalyticsPayload[] = [];
const MAX_QUEUE_SIZE = 500;
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let flushBackoffMs = 2000;
let consecutiveFailures = 0;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  return sessionId;
}

export function setAnalyticsUserId(id: string | null): void {
  userId = id;
}

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  const payload: AnalyticsPayload = {
    event,
    properties: {
      ...properties,
      url: window.location.pathname,
      referrer: document.referrer || undefined,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    },
    userId: userId || undefined,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
  };

  eventQueue.push(payload);

  // Cap queue size to prevent unbounded memory growth
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.splice(0, eventQueue.length - MAX_QUEUE_SIZE);
  }

  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }

  flushTimeout = setTimeout(flushEvents, flushBackoffMs);

  if (eventQueue.length >= 10) {
    flushEvents();
  }
}

async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue.length = 0;

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  try {
    if (userId) {
      const rows = eventsToSend
        .filter((e): e is AnalyticsPayload & { userId: string } => !!e.userId)
        .map(e => ({
          userId: e.userId,
          contentType: 'analytics',
          contentId: e.event,
          interactionType: 'event',
          metadata: {
            properties: e.properties,
            sessionId: e.sessionId,
          },
        }));
      if (rows.length > 0) {
        const res = await contentInteractions.insertMany(rows);
        if (!res.ok) {
          // Mirror prior behavior of throwing-to-catch so queue backs off
          throw new Error(res.error);
        }
      }
    }

    if (import.meta.env.DEV) {
      eventsToSend.forEach(e => {
        console.log(`[Analytics] ${e.event}`, e.properties);
      });
    }
    // Reset backoff on success
    consecutiveFailures = 0;
    flushBackoffMs = 2000;
  } catch (err) {
    console.warn('Failed to send analytics:', err);
    // Re-queue but respect max size
    const requeued = [...eventsToSend, ...eventQueue];
    eventQueue.length = 0;
    eventQueue.push(...requeued.slice(-MAX_QUEUE_SIZE));
    // Exponential backoff: 2s → 4s → 8s → 16s → max 30s
    consecutiveFailures++;
    flushBackoffMs = Math.min(2000 * Math.pow(2, consecutiveFailures), 30000);
  }
}

export function trackPageView(pageName: string, properties?: Record<string, unknown>): void {
  track('page_view', { pageName, ...properties });
}

export function trackSignUp(method: 'email' | 'google'): void {
  track('sign_up', { method });
  // GA4 recommended event — Google Ads can import as conversion
  gtagEvent('sign_up', { method });
}

export function trackSignIn(method: 'email' | 'google'): void {
  track('sign_in', { method });
}

export function trackOnboardingStepViewed(data: { step: number; stepName: string }): void {
  track('onboarding_step_viewed', data);
}

export function trackOnboardingStepCompleted(data: {
  step: number;
  stepName: string;
  durationMs: number;
}): void {
  track('onboarding_step_completed', data);
}

export function trackOnboardingComplete(data: { goals?: string[]; sign?: string; totalDurationMs: number }): void {
  track('onboarding_complete', data);
  // Signals a fully activated user — stronger conversion signal than sign_up
  gtagEvent('onboarding_complete', {
    total_duration_ms: data.totalDurationMs,
    has_sign: !!data.sign,
  });
}

export function trackRitualStarted(): void {
  track('ritual_started');
}

export function trackRitualCompleted(data: { cardsViewed: number; duration?: number }): void {
  track('ritual_completed', data);
}

export function trackTarotDraw(data: {
  cardId: number;
  cardName: string;
  reversed: boolean;
  context?: 'ritual' | 'spread' | 'single';
}): void {
  track('tarot_draw', data);
}

export function trackTarotSaved(data: { cardId: number; cardName: string }): void {
  track('tarot_saved', data);
}

export function trackSpreadStarted(data: { spreadType: string; cardCount: number }): void {
  track('spread_started', data);
}

export function trackSpreadCompleted(data: {
  spreadType: string;
  cardCount: number;
  duration?: number;
}): void {
  track('spread_completed', data);
  // Core engagement signal — ads optimized against "first_reading" converters
  // behave very differently from raw clicks. Mark as conversion in Google Ads.
  gtagEvent('first_reading', {
    spread_type: data.spreadType,
    card_count: data.cardCount,
  });
}

export function trackQuizStarted(data: { quizType: string; quizId?: string }): void {
  track('quiz_started', data);
}

export function trackQuizCompleted(data: {
  quizType: string;
  quizId?: string;
  result?: string;
  score?: number;
}): void {
  track('quiz_completed', data);
}

export function trackJournalCreated(data: { wordCount: number; hasTags: boolean; hasPrompt: boolean }): void {
  track('journal_created', data);
}

export function trackPaywallViewed(data: { source: string; feature?: string }): void {
  track('paywall_viewed', data);
}

export function trackPurchaseSuccess(data: {
  plan: 'monthly' | 'yearly';
  price?: number;
  currency?: string;
  transactionId?: string;
}): void {
  track('purchase_success', data);
  // GA4 'purchase' is the canonical revenue event. Google Ads imports it
  // for value-based bidding. Always pass value + currency so Ads can
  // calculate ROAS rather than just counting conversions.
  gtagEvent('purchase', {
    transaction_id: data.transactionId || `tx_${Date.now()}`,
    value: data.price ?? 0,
    currency: data.currency ?? 'USD',
    items: [{
      item_id: `arcana_${data.plan}`,
      item_name: `Arcana Premium ${data.plan}`,
      item_category: 'subscription',
      price: data.price ?? 0,
      quantity: 1,
    }],
  });
}

export function trackRestoreSuccess(): void {
  track('restore_success');
}

export function trackHoroscopeView(sign: string): void {
  track('horoscope_view', { sign });
}

export function trackHoroscopeSave(sign: string): void {
  track('horoscope_save', { sign });
}

export function trackCompatibilityCheck(sign1: string, sign2: string): void {
  track('compatibility_check', { sign1, sign2 });
}

export function trackSearch(query: string, resultCount: number): void {
  track('search_performed', { queryLength: query.length, resultCount });
}

export function trackShare(
  contentType: string,
  method: 'native' | 'copy' | 'download',
  success: boolean
): void {
  track('share_completed', { contentType, method, success });
}

export function trackStreak(streakCount: number): void {
  track('streak_achieved', { streakCount });
}

export function trackError(errorType: string, errorMessage: string, context?: string): void {
  track('error_occurred', {
    errorType,
    errorMessage: errorMessage.slice(0, 500),
    context,
  });
}

export function initAnalytics(): void {
  window.addEventListener('beforeunload', () => {
    flushEvents();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEvents();
    }
  });
}

export async function getAnalyticsConsent(): Promise<boolean> {
  // Check new key first, fall back to old key for existing users
  const consent = await appStorage.get('arcana_analytics_consent');
  if (consent !== null) return consent === 'true';
  return (await appStorage.get('stellara_analytics_consent')) === 'true';
}

export async function setAnalyticsConsent(consent: boolean): Promise<void> {
  await appStorage.set('arcana_analytics_consent', consent ? 'true' : 'false');
}

export function clearAnalyticsData(): void {
  sessionId = null;
  userId = null;
  eventQueue.length = 0;
}
