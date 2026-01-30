import { supabase } from '../lib/supabase';

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
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

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

  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }

  flushTimeout = setTimeout(flushEvents, 2000);

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
      await supabase.from('content_interactions').insert(
        eventsToSend.map(e => ({
          user_id: e.userId,
          content_type: 'analytics',
          content_id: e.event,
          interaction_type: 'event',
          metadata: {
            properties: e.properties,
            sessionId: e.sessionId,
          },
        }))
      );
    }

    if (import.meta.env.DEV) {
      eventsToSend.forEach(e => {
        console.log(`[Analytics] ${e.event}`, e.properties);
      });
    }
  } catch (err) {
    console.warn('Failed to send analytics:', err);
    eventQueue.unshift(...eventsToSend);
  }
}

export function trackPageView(pageName: string, properties?: Record<string, unknown>): void {
  track('page_view', { pageName, ...properties });
}

export function trackSignUp(method: 'email' | 'google'): void {
  track('sign_up', { method });
}

export function trackSignIn(method: 'email' | 'google'): void {
  track('sign_in', { method });
}

export function trackOnboardingComplete(data: { goals: string[]; sign: string }): void {
  track('onboarding_complete', data);
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
}): void {
  track('purchase_success', data);
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

export function getAnalyticsConsent(): boolean {
  return localStorage.getItem('stellara_analytics_consent') === 'true';
}

export function setAnalyticsConsent(consent: boolean): void {
  localStorage.setItem('stellara_analytics_consent', consent ? 'true' : 'false');
}

export function clearAnalyticsData(): void {
  sessionId = null;
  userId = null;
  eventQueue.length = 0;
}
