import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Goal, TonePreference, ThemePreference } from '../types';
import { isAdmin as checkIsAdmin, verifyAdminStatus } from '../utils/admin';
import { isNative, getPlatform } from '../utils/platform';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { toast } from '../components/ui/Toast';
import {
  generateCorrelationId,
  setCorrelationId,
  startSpan,
  endSpan,
  logInfo,
  logWarn,
  logError,
  captureException,
  sanitizeUrl,
  createDiagnosticsAction,
} from '../utils/telemetry';
import {
  normalizeSupabaseError,
  analyzeCallbackUrl,
  detectOAuthIssues,
} from '../utils/authErrors';
import { migrateGuestData } from '../services/storage';
import { getLocale } from '../i18n/config';
import i18n from 'i18next';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isProcessingOAuth: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<UserProfile | null>;
  /**
   * Flip the in-memory profile.isPremium to true immediately, before the
   * server-side webhook has propagated. Use after RevenueCat/Stripe
   * confirms a purchase locally — UI updates instantly while
   * pollProfileUntilPremium() corrects the DB-side state in the
   * background.
   */
  optimisticallyMarkPremium: () => void;
  /**
   * Poll the profiles table every `intervalMs` until is_premium === true
   * OR `timeoutMs` elapses. Returns true if confirmed, false on timeout.
   * Intended to be called AFTER optimisticallyMarkPremium so the user
   * never sees a non-premium UI state during the wait.
   */
  pollProfileUntilPremium: (timeoutMs?: number, intervalMs?: number) => Promise<boolean>;
  cancelOAuth: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface DbProfile {
  id: string;
  email: string;
  display_name: string;
  birth_date: string;
  birth_time?: string;
  birth_place?: string;
  birth_lat?: number;
  birth_lon?: number;
  timezone: string;
  goals: Goal[];
  tone_preference: TonePreference;
  notification_time: string;
  notifications_enabled: boolean;
  onboarding_complete: boolean;
  is_premium: boolean;
  is_ad_free: boolean;
  locale?: 'en' | 'ja' | 'ko' | 'zh';
  streak: number;
  last_ritual_date?: string;
  mbti_type?: string;
  love_language?: string;
  level: number;
  xp?: number;
  seeker_rank?: string;
  total_readings: number;
  total_journal_entries: number;
  avatar_seed?: string;
  theme: ThemePreference;
  card_back_url?: string;
  background_url?: string;
  subscribed_to_newsletter: boolean;
  created_at: string;
}

function mapDbToProfile(db: DbProfile): UserProfile {
  return {
    id: db.id,
    email: db.email,
    displayName: db.display_name,
    birthDate: db.birth_date,
    birthTime: db.birth_time,
    birthPlace: db.birth_place,
    birthLat: db.birth_lat,
    birthLon: db.birth_lon,
    timezone: db.timezone,
    goals: db.goals || [],
    tonePreference: db.tone_preference || 'gentle',
    notificationTime: db.notification_time || '09:00',
    notificationsEnabled: db.notifications_enabled ?? true,
    onboardingComplete: db.onboarding_complete,
    isPremium: db.is_premium,
    isAdFree: db.is_ad_free ?? false,
    locale: db.locale,
    streak: db.streak,
    lastRitualDate: db.last_ritual_date,
    mbtiType: db.mbti_type,
    loveLanguage: db.love_language,
    level: db.level || 1,
    xp: db.xp || 0,
    seekerRank: db.seeker_rank || 'Novice Seeker',
    totalReadings: db.total_readings || 0,
    totalJournalEntries: db.total_journal_entries || 0,
    avatarSeed: db.avatar_seed,
    theme: db.theme || 'dark',
    card_back_url: db.card_back_url,
    background_url: db.background_url,
    subscribedToNewsletter: db.subscribed_to_newsletter ?? true,
    createdAt: db.created_at,
  };
}

// Strict allowlist of fields the client is permitted to write.
// Server-managed fields (is_premium, is_ad_free, level,
// total_readings, total_journal_entries) are excluded here AND
// protected by a DB trigger as defense-in-depth.
// streak and lastRitualDate are client-writable (updated on ritual completion).
const PROFILE_WRITABLE_FIELDS: Record<string, string> = {
  displayName: 'display_name',
  birthDate: 'birth_date',
  birthTime: 'birth_time',
  birthPlace: 'birth_place',
  birthLat: 'birth_lat',
  birthLon: 'birth_lon',
  timezone: 'timezone',
  goals: 'goals',
  tonePreference: 'tone_preference',
  notificationTime: 'notification_time',
  notificationsEnabled: 'notifications_enabled',
  onboardingComplete: 'onboarding_complete',
  mbtiType: 'mbti_type',
  loveLanguage: 'love_language',
  theme: 'theme',
  card_back_url: 'card_back_url',
  background_url: 'background_url',
  subscribedToNewsletter: 'subscribed_to_newsletter',
  streak: 'streak',
  lastRitualDate: 'last_ritual_date',
  locale: 'locale',
};

function mapProfileToDb(profile: Partial<UserProfile>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  for (const [key, col] of Object.entries(PROFILE_WRITABLE_FIELDS)) {
    const val = (profile as Record<string, unknown>)[key];
    if (val !== undefined) db[col] = val;
  }
  return db;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);

  const oauthTimeoutRef = React.useRef<number | null>(null);
  const isProcessingCallbackRef = React.useRef(false);
  const lastProcessedUrlRef = React.useRef<string | null>(null);
  const mountedRef = React.useRef(true);

  const clearOAuthTimeout = useCallback(() => {
    if (oauthTimeoutRef.current) {
      window.clearTimeout(oauthTimeoutRef.current);
      oauthTimeoutRef.current = null;
    }
  }, []);

  const setOAuthProcessing = useCallback((processing: boolean) => {
    clearOAuthTimeout();
    setIsProcessingOAuth(processing);
    if (processing) {
      oauthTimeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;
        logWarn('auth.oauth.timeout', 'OAuth flow timed out after 120s');
        isProcessingCallbackRef.current = false;
        setIsProcessingOAuth(false);
        setCorrelationId(null);
      }, 120000);
    }
  }, [clearOAuthTimeout]);

  const cancelOAuth = useCallback(() => {
    logInfo('auth.oauth.cancelled', 'User cancelled OAuth flow');
    clearOAuthTimeout();
    isProcessingCallbackRef.current = false;
    setIsProcessingOAuth(false);
    setCorrelationId(null);
  }, [clearOAuthTimeout]);

  const fetchProfileInFlight = useRef<string | null>(null);
  // Tracks the currently-signed-in user id so fetchProfile() can skip
  // state writes if the user signed out (or switched accounts) while the
  // profile query was in flight. Set in the onAuthStateChange listener.
  const activeUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    // Deduplicate: skip if already fetching for this user
    if (fetchProfileInFlight.current === userId) return;
    fetchProfileInFlight.current = userId;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Stale-write guard: if the user logged out, switched accounts, or the
    // provider unmounted while the query was in flight, do not write state.
    // Without this, a fetched profile for User A can land after SIGNED_OUT
    // and leave `profile` populated while `user` is null — the inconsistent
    // render crashes consumers that read `profile.X` under a `user &&` guard.
    if (!mountedRef.current || activeUserIdRef.current !== userId) {
      fetchProfileInFlight.current = null;
      return;
    }

    if (error) {
      logError('auth.fetchProfile.failed', 'Failed to fetch profile', {
        errorCode: error.code,
        errorMessage: error.message,
      });
      toast(i18n.t('auth.profileLoadFailed', { ns: 'common' }), 'error');
      fetchProfileInFlight.current = null;
      return;
    }

    if (data) {
      const profile = mapDbToProfile(data as DbProfile);
      setProfile(profile);

      // Sync locale between profile and client i18n state.
      // Client wins: the locale the user just picked on this device is always
      // authoritative over a stale `profile.locale` from a prior session or
      // another device. We only fall BACK to profile.locale when this device
      // has no saved choice yet (first install, empty localStorage).
      try {
        const { getLocale, setLocale, normalizeLocale, LOCALE_STORAGE_KEY } = await import('../i18n/config');
        const profileLocale = normalizeLocale(profile.locale ?? null);
        const clientLocale = getLocale();
        const hasExplicitClientChoice = (() => {
          try { return !!localStorage.getItem(LOCALE_STORAGE_KEY); } catch { return false; }
        })();

        if (hasExplicitClientChoice) {
          // Push client → server so other devices pick it up on next sign-in.
          if (profileLocale !== clientLocale) {
            await supabase.from('profiles').update({ locale: clientLocale }).eq('id', userId);
          }
        } else if (profileLocale && profileLocale !== clientLocale) {
          // No local choice yet — adopt the profile's saved preference.
          await setLocale(profileLocale);
        }
      } catch (e) {
        console.warn('[Auth] Locale sync failed:', e);
      }

      // Update streak on app open
      const today = new Date().toISOString().split('T')[0];
      const lastDate = profile.lastRitualDate;
      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const newStreak = lastDate === yesterdayStr ? (profile.streak || 0) + 1 : 1;

        await supabase
          .from('profiles')
          .update({ streak: newStreak, last_ritual_date: today })
          .eq('id', userId);

        // Re-check stale-write guard: streak update is a second await hop,
        // so the user may have signed out between the read and the write.
        if (!mountedRef.current || activeUserIdRef.current !== userId) {
          fetchProfileInFlight.current = null;
          return;
        }

        setProfile(prev => prev ? { ...prev, streak: newStreak, lastRitualDate: today } : prev);

        // Check birthday achievement
        if (profile.birthDate) {
          const birthParts = profile.birthDate.split('-');
          const todayParts = today.split('-');
          if (birthParts[1] === todayParts[1] && birthParts[2] === todayParts[2]) {
            import('../services/achievements').then(({ checkAchievementProgress }) => {
              checkAchievementProgress(userId, 'birthday_login');
            });
          }
        }
      }
    }

    fetchProfileInFlight.current = null;
  }, []);

  const getSessionWithRetry = useCallback(async (retries = 4, delayMs = 400): Promise<Session | null> => {
    for (let i = 0; i < retries; i++) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) return data.session;
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    return null;
  }, []);

  const extractCodeFromUrl = (url: string): string | null => {
    try {
      const u = new URL(url);
      return u.searchParams.get('code') || new URLSearchParams(u.hash.slice(1)).get('code');
    } catch {
      const match = url.match(/[?&#]code=([^&]+)/);
      return match ? match[1] : null;
    }
  };

  const normalizeOAuthCallbackUrl = (raw: string): string => {
    try {
      const u = new URL(raw);
      if (!u.searchParams.get('code') && u.hash) {
        const hp = new URLSearchParams(u.hash.slice(1));
        const code = hp.get('code');
        if (code) {
          u.searchParams.set('code', code);
          hp.delete('code');
          const rest = hp.toString();
          u.hash = rest ? `#${rest}` : '';
        }
      }
      return u.toString();
    } catch {
      return raw;
    }
  };

  const handleOAuthCallback = useCallback(async (rawUrl: string) => {
    const callbackSpan = startSpan('auth.callback.receive', {
      platform: getPlatform(),
      urlLength: rawUrl?.length || 0,
    });

    const url = normalizeOAuthCallbackUrl((rawUrl || '').trim());
    if (!url) {
      endSpan(callbackSpan, 'failure', { reason: 'empty_url' });
      return false;
    }

    const urlAnalysis = analyzeCallbackUrl(url);
    const hasCode = urlAnalysis.hasCode;
    const hasAccessToken = urlAnalysis.hasAccessToken;
    const hasError = urlAnalysis.hasError;

    logInfo('auth.callback.analyze', 'Analyzing callback URL', {
      ...urlAnalysis,
      sanitizedUrl: sanitizeUrl(url),
    });

    const issues = detectOAuthIssues(url);
    if (issues.length > 0) {
      issues.forEach(issue => logWarn('auth.callback.issue', issue));
    }

    if (!hasCode && !hasAccessToken && !hasError) {
      endSpan(callbackSpan, 'failure', { reason: 'no_oauth_params' });
      return false;
    }

    const code = extractCodeFromUrl(url);
    const dedupKey = code || url;

    if (hasCode && !code) {
      logError('auth.callback.codeExtractionFailed', 'URL indicates code present but extraction failed', {
        urlLength: url.length,
        codeLocation: urlAnalysis.codeLocation,
      });
    }

    if (isProcessingCallbackRef.current) {
      logInfo('auth.callback.duplicate', 'Duplicate callback ignored (already processing)');
      endSpan(callbackSpan, 'success', { reason: 'duplicate_ignored' });
      return true;
    }

    if (lastProcessedUrlRef.current === dedupKey) {
      logInfo('auth.callback.duplicate', 'Duplicate callback ignored (already processed this URL)');
      endSpan(callbackSpan, 'success', { reason: 'duplicate_url' });
      return true;
    }

    isProcessingCallbackRef.current = true;
    lastProcessedUrlRef.current = dedupKey;
    setOAuthProcessing(true);

    logInfo('auth.callback.process', 'Processing OAuth callback', {
      hasCode,
      hasAccessToken,
      hasError,
      codeLocation: urlAnalysis.codeLocation,
      scheme: urlAnalysis.scheme,
      host: urlAnalysis.host,
    });

    try {
      if (hasError) {
        const errorSpan = startSpan('auth.callback.handleError');
        const errorCode = urlAnalysis.errorCode;
        const errorDesc = urlAnalysis.errorDescription;

        logError('auth.callback.oauthError', 'OAuth error in callback', {
          errorCode,
          errorDescription: errorDesc,
        });

        const existingSession = await getSessionWithRetry(4, 300);
        if (existingSession?.user) {
          logInfo('auth.callback.sessionRecovered', 'Session exists despite error - using it');
          setSession(existingSession);
          setUser(existingSession.user);
          fetchProfile(existingSession.user.id);
          isProcessingCallbackRef.current = false;
          setOAuthProcessing(false);
          setCorrelationId(null);
          endSpan(errorSpan, 'success', { recovered: true });
          endSpan(callbackSpan, 'success');
          return true;
        }

        let userMessage = errorDesc || i18n.t('auth.signInFailed', { ns: 'common' });
        if (errorCode === 'access_denied') {
          userMessage = i18n.t('auth.signInCancelled', { ns: 'common' });
        } else if (errorCode === 'invalid_flow_state' || errorDesc?.includes('flow state')) {
          userMessage = i18n.t('auth.signInSessionExpired', { ns: 'common' });
        } else if (errorDesc?.includes('provider')) {
          userMessage = i18n.t('auth.googleNotConfigured', { ns: 'common' });
        }

        toast(userMessage, 'error', createDiagnosticsAction());
        isProcessingCallbackRef.current = false;
        setOAuthProcessing(false);
        setCorrelationId(null);
        endSpan(errorSpan, 'failure', { errorCode, userMessage });
        endSpan(callbackSpan, 'failure');
        return true;
      }

      if (hasCode && code) {
        const exchangeSpan = startSpan('auth.callback.exchangeCode', {
          codePresent: true,
          codeLocation: urlAnalysis.codeLocation,
        });

        const checkSessionSpan = startSpan('auth.callback.checkExistingSession');
        const existingSession = await getSessionWithRetry(4, 300);
        if (existingSession?.user) {
          logInfo('auth.callback.sessionExists', 'Session already exists, skipping exchange');
          setSession(existingSession);
          setUser(existingSession.user);
          fetchProfile(existingSession.user.id);
          isProcessingCallbackRef.current = false;
          setOAuthProcessing(false);
          setCorrelationId(null);
          endSpan(checkSessionSpan, 'success', { sessionFound: true });
          endSpan(exchangeSpan, 'success', { skipped: true });
          endSpan(callbackSpan, 'success');
          return true;
        }
        endSpan(checkSessionSpan, 'success', { sessionFound: false });

        logInfo('auth.callback.exchange', 'Exchanging code for session (PKCE flow)');

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          const normalized = normalizeSupabaseError(error);
          logError('auth.callback.exchangeFailed', 'Code exchange failed', {
            errorCode: normalized.code,
            errorMessage: normalized.message,
            likelyCause: normalized.likelyCause,
            isRetryable: normalized.isRetryable,
          });

          const isFlowStateError =
            error.message.includes('code verifier') ||
            error.message.includes('already used') ||
            error.message.includes('flow state') ||
            error.message.includes('invalid_flow_state');

          if (isFlowStateError) {
            const retrySpan = startSpan('auth.callback.retrySession');
            const retrySession = await getSessionWithRetry(5, 400);
            if (retrySession?.user) {
              logInfo('auth.callback.sessionRecovered', 'Session found after flow-state error');
              setSession(retrySession);
              setUser(retrySession.user);
              fetchProfile(retrySession.user.id);
              isProcessingCallbackRef.current = false;
              setOAuthProcessing(false);
              setCorrelationId(null);
              endSpan(retrySpan, 'success');
              endSpan(exchangeSpan, 'success', { recovered: true });
              endSpan(callbackSpan, 'success');
              return true;
            }
            endSpan(retrySpan, 'failure');
            toast(i18n.t('auth.sessionExpired', { ns: 'common' }), 'error', createDiagnosticsAction());
          } else {
            toast(normalized.message || 'Could not complete sign-in', 'error', createDiagnosticsAction());
          }
          isProcessingCallbackRef.current = false;
          setOAuthProcessing(false);
          setCorrelationId(null);
          endSpan(exchangeSpan, 'failure', { errorCode: normalized.code });
          endSpan(callbackSpan, 'failure');
          return true;
        }

        if (data?.session?.user) {
          logInfo('auth.callback.success', 'Session established successfully', {
            userId: data.session.user.id.substring(0, 8) + '...',
          });
          setSession(data.session);
          setUser(data.session.user);
          fetchProfile(data.session.user.id);
        }
        isProcessingCallbackRef.current = false;
        setOAuthProcessing(false);
        setCorrelationId(null);
        endSpan(exchangeSpan, 'success');
        endSpan(callbackSpan, 'success');
        return true;
      }

      if (hasAccessToken) {
        const implicitSpan = startSpan('auth.callback.implicitFlow');
        logInfo('auth.callback.implicitFlow', 'Processing implicit flow tokens');

        const hashParams = new URLSearchParams(new URL(url).hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            const normalized = normalizeSupabaseError(error);
            logError('auth.callback.setSessionFailed', 'Session set failed', {
              errorCode: normalized.code,
            });
            toast(normalized.message || 'Could not complete sign-in', 'error', createDiagnosticsAction());
            endSpan(implicitSpan, 'failure');
          } else {
            endSpan(implicitSpan, 'success');
          }
        }
        isProcessingCallbackRef.current = false;
        setOAuthProcessing(false);
        setCorrelationId(null);
        endSpan(callbackSpan, 'success');
        return true;
      }
    } catch (e) {
      captureException('auth.callback.unexpectedError', e, {
        sanitizedUrl: sanitizeUrl(url),
      });
      toast(i18n.t('auth.signInFailed', { ns: 'common' }), 'error', createDiagnosticsAction());
      isProcessingCallbackRef.current = false;
      setOAuthProcessing(false);
      setCorrelationId(null);
      endSpan(callbackSpan, 'failure');
    }

    return false;
  }, [fetchProfile, setOAuthProcessing, getSessionWithRetry]);

  // Stable ref for handleOAuthCallback so the listener effect doesn't churn
  const handleOAuthCallbackRef = React.useRef(handleOAuthCallback);
  useEffect(() => {
    handleOAuthCallbackRef.current = handleOAuthCallback;
  });

  useEffect(() => {
    let appUrlListener: { remove: () => void } | null = null;
    let mounted = true;
    let launchUrlHandled = false;

    const setupAppUrlListener = async () => {
      if (isNative()) {
        appUrlListener = await App.addListener('appUrlOpen', async ({ url }) => {
          logInfo('auth.deepLink.received', 'App URL opened', {
            sanitizedUrl: sanitizeUrl(url),
            platform: getPlatform(),
          });
          if (!mounted) return;

          if (launchUrlHandled && lastProcessedUrlRef.current) {
            const code = extractCodeFromUrl(url);
            const dedupKey = code || url;
            if (dedupKey === lastProcessedUrlRef.current) {
              logInfo('auth.deepLink.duplicate', 'appUrlOpen ignored - same as launch URL');
              return;
            }
          }

          try {
            await Browser.close();
          } catch {
            /* empty */
          }
          await handleOAuthCallbackRef.current(url);
        });
      }
    };

    const init = async () => {
      const initSpan = startSpan('auth.init', { platform: getPlatform() });

      try {
        if (isNative()) {
          const launch = await App.getLaunchUrl();
          logInfo('auth.init.launchUrl', 'Launch URL check', {
            hasLaunchUrl: !!launch?.url,
            sanitizedUrl: launch?.url ? sanitizeUrl(launch.url) : undefined,
          });

          if (launch?.url) {
            generateCorrelationId('oauth');
            const handled = await handleOAuthCallbackRef.current(launch.url);
            launchUrlHandled = handled;
            setupAppUrlListener();
            if (handled) {
              if (mounted) setLoading(false);
              endSpan(initSpan, 'success', { handledLaunchUrl: true });
              return;
            }
          } else {
            setupAppUrlListener();
          }
        } else {
          const currentUrl = window.location.href;
          if (currentUrl.includes('code=') || currentUrl.includes('access_token=') || currentUrl.includes('error=')) {
            logInfo('auth.init.webCallback', 'Web OAuth callback detected');
            generateCorrelationId('oauth');
            setOAuthProcessing(true);

            const code = extractCodeFromUrl(currentUrl);
            // Clean up URL immediately — we've captured the code
            window.history.replaceState({}, '', window.location.pathname);

            if (code) {
              logInfo('auth.init.exchangeCode', 'Exchanging PKCE code for session');
              const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeError) {
                logError('auth.init.exchangeCodeError', 'Code exchange failed', {
                  error: exchangeError.message,
                });
                toast(i18n.t('auth.signInFailedWith', { ns: 'common', error: exchangeError.message }), 'error');
              } else if (data?.session?.user) {
                logInfo('auth.init.exchangeSuccess', 'Session established from code exchange');
                if (mounted) {
                  setSession(data.session);
                  setUser(data.session.user);
                  fetchProfile(data.session.user.id);
                  setOAuthProcessing(false);
                  setLoading(false);
                  endSpan(initSpan, 'success', { handledWebCallback: true });
                  return; // Session established, skip getSession below
                }
              }
            }
            setOAuthProcessing(false);
          }
        }

        const sessionSpan = startSpan('auth.init.getSession');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logError('auth.init.sessionError', 'Failed to get initial session', {
            error: error.message,
          });
          endSpan(sessionSpan, 'failure');
        } else {
          endSpan(sessionSpan, 'success', { hasSession: !!session });
        }

        logInfo('auth.init.session', 'Initial session check', {
          hasSession: !!session,
        });

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        }
        endSpan(initSpan, 'success');
      } finally {
        if (mounted) {
          setLoading(false);
          clearOAuthTimeout();
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logInfo('auth.stateChange', 'Auth state changed', {
        event,
        hasSession: !!session,
      });

      if (!mounted) return;

      if (event === 'SIGNED_IN') {
        clearOAuthTimeout();
        isProcessingCallbackRef.current = false;
        setIsProcessingOAuth(false);
        setCorrelationId(null);
        // Clean up OAuth params from URL bar after successful sign-in
        if (!isNative() && (window.location.search.includes('code=') || window.location.hash.includes('access_token'))) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }

      // Update the stale-write guard BEFORE setting state, so any
      // setProfile() racing inside an in-flight fetchProfile() sees the
      // new activeUserIdRef and bails out cleanly.
      activeUserIdRef.current = session?.user?.id ?? null;

      setSession(session);
      setUser(session?.user ?? null);

      // Tag every Sentry event with the active user. Lets us see in the
      // dashboard which user(s) hit an error, attribute crash spikes to
      // specific accounts, and find affected sessions for replay. We
      // include only id + email — never names or PII beyond what's
      // already in the profile.
      import('@sentry/react').then((Sentry) => {
        if (session?.user) {
          Sentry.setUser({ id: session.user.id, email: session.user.email });
        } else {
          Sentry.setUser(null);
        }
      }).catch(() => undefined);

      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
          if (event === 'SIGNED_IN') {
            migrateGuestData(session.user.id).catch((e) => {
              console.warn('[Auth] Guest data migration failed:', e);
            });
          }
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      mountedRef.current = false;
      subscription.unsubscribe();
      appUrlListener?.remove();
      clearOAuthTimeout();
    };
  }, [fetchProfile, clearOAuthTimeout]);

  const signUp = async (email: string, password: string) => {
    const correlationId = generateCorrelationId('signup');
    const span = startSpan('auth.signUp', { correlationId });

    logInfo('auth.signUp.start', 'Starting email sign up');

    // Propagate the user's active locale through email confirmation:
    //   - emailRedirectTo carries ?lang=xx so the post-confirm landing page boots in the right language
    //   - options.data.locale lives in auth.users.raw_user_meta_data so Supabase template helpers + downstream services can localize
    const locale = getLocale();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const emailRedirectTo = origin ? `${origin}/?lang=${locale}` : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { locale },
      },
    });

    if (error) {
      const normalized = normalizeSupabaseError(error);
      logError('auth.signUp.failed', 'Sign up failed', {
        errorCode: normalized.code,
      });
      endSpan(span, 'failure', { errorCode: normalized.code });
      setCorrelationId(null);
      return { error: new Error(normalized.message) };
    }

    logInfo('auth.signUp.success', 'Sign up successful');
    endSpan(span, 'success');
    setCorrelationId(null);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const correlationId = generateCorrelationId('signin');
    const span = startSpan('auth.signIn', { correlationId });

    logInfo('auth.signIn.start', 'Starting email sign in');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const normalized = normalizeSupabaseError(error);
      logError('auth.signIn.failed', 'Sign in failed', {
        errorCode: normalized.code,
      });
      endSpan(span, 'failure', { errorCode: normalized.code });
      setCorrelationId(null);
      return { error: new Error(normalized.message) };
    }

    logInfo('auth.signIn.success', 'Sign in successful');
    endSpan(span, 'success');
    setCorrelationId(null);
    return { error: null };
  };

  const signInWithGoogle = async () => {
    const correlationId = generateCorrelationId('oauth');
    const initiateSpan = startSpan('auth.google.initiate', {
      correlationId,
      platform: getPlatform(),
    });

    logInfo('auth.google.start', 'Initiating Google sign-in', {
      platform: getPlatform(),
      isNative: isNative(),
    });

    setOAuthProcessing(true);
    lastProcessedUrlRef.current = null;

    try {
      if (isNative()) {
        // Native: use Google's native SDK for account picker (no browser redirect)
        const nativeSpan = startSpan('auth.google.nativeSignIn');

        try {
          // Initialize and sign out to clear any cached account (forces fresh picker)
          try {
            await GoogleAuth.initialize();
            await GoogleAuth.signOut();
          } catch {
            // Re-initialize after signOut failure to ensure clean state
            await GoogleAuth.initialize();
          }
          const googleUser = await GoogleAuth.signIn();

          logInfo('auth.google.nativeSuccess', 'Native Google sign-in succeeded', {
            hasIdToken: !!googleUser.authentication.idToken,
            email: googleUser.email,
          });

          endSpan(nativeSpan, 'success');

          // Exchange Google ID token with Supabase
          const exchangeSpan = startSpan('auth.google.exchangeIdToken');

          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: googleUser.authentication.idToken,
            access_token: googleUser.authentication.accessToken,
          });

          if (error) {
            const normalized = normalizeSupabaseError(error);
            logError('auth.google.idTokenExchangeFailed', 'Supabase ID token exchange failed', {
              errorCode: normalized.code,
              errorMessage: normalized.message,
            });
            setOAuthProcessing(false);
            setCorrelationId(null);
            endSpan(exchangeSpan, 'failure');
            endSpan(initiateSpan, 'failure');
            return { error: new Error(normalized.message) };
          }

          logInfo('auth.google.idTokenExchangeSuccess', 'Supabase session created', {
            hasSession: !!data.session,
            userId: data.user?.id,
          });
          endSpan(exchangeSpan, 'success');

        } catch (nativeErr) {
          const errMsg = nativeErr instanceof Error ? nativeErr.message : String(nativeErr);

          // User cancelled the sign-in
          if (errMsg.includes('canceled') || errMsg.includes('cancelled') || errMsg.includes('12501')) {
            logInfo('auth.google.nativeCancelled', 'User cancelled native Google sign-in');
            setOAuthProcessing(false);
            setCorrelationId(null);
            endSpan(nativeSpan, 'failure');
            endSpan(initiateSpan, 'failure');
            return { error: null };
          }

          // Native sign-in failed — fall back to browser OAuth
          logWarn('auth.google.nativeFallback', 'Native sign-in failed, falling back to browser OAuth', {
            error: errMsg,
          });
          endSpan(nativeSpan, 'failure', { fallback: true });

          const redirectUrl = 'com.arcana.app://auth';
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true,
            },
          });

          if (error) {
            const normalized = normalizeSupabaseError(error);
            setOAuthProcessing(false);
            setCorrelationId(null);
            endSpan(initiateSpan, 'failure');
            return { error: new Error(normalized.message) };
          }

          if (data?.url) {
            await Browser.open({ url: data.url });
          } else {
            setOAuthProcessing(false);
            setCorrelationId(null);
            endSpan(initiateSpan, 'failure');
            return { error: new Error('Failed to generate sign-in URL') };
          }
        }
      } else {
        // Web: standard OAuth redirect flow
        const webOAuthSpan = startSpan('auth.google.webOAuth');
        const localeParam = `?lang=${getLocale()}`;
        const redirectUrl = window.location.origin + window.location.pathname + localeParam;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: false,
          },
        });

        if (error) {
          const normalized = normalizeSupabaseError(error);
          logError('auth.google.webOAuthFailed', 'Web OAuth failed', {
            errorCode: normalized.code,
          });
          setOAuthProcessing(false);
          setCorrelationId(null);
          endSpan(webOAuthSpan, 'failure');
          endSpan(initiateSpan, 'failure');
          return { error: new Error(normalized.message) };
        }

        endSpan(webOAuthSpan, 'success');
      }

      endSpan(initiateSpan, 'success');
      return { error: null };
    } catch (err) {
      captureException('auth.google.unexpectedError', err);
      setOAuthProcessing(false);
      setCorrelationId(null);
      endSpan(initiateSpan, 'failure');
      return { error: err instanceof Error ? err : new Error('Failed to initiate sign-in') };
    }
  };

  const signOut = async () => {
    const span = startSpan('auth.signOut');
    logInfo('auth.signOut.start', 'Signing out');

    // 0. Flip the stale-write guard IMMEDIATELY so any in-flight
    //    fetchProfile() call for this user bails before touching state.
    activeUserIdRef.current = null;

    try {
      // 1. Clear persisted Supabase session FIRST so even if native
      //    plugins crash the app, re-opening lands on the sign-in screen.
      await supabase.auth.signOut();
    } catch (e) {
      logError('auth.signOut.supabase', 'Supabase sign out error', { error: e });
    }

    // 2. Clear UI state immediately
    setSession(null);
    setUser(null);
    setProfile(null);

    // 3. Sign out of native Google SDK (isolated — if this crashes,
    //    the session is already cleared above)
    if (isNative()) {
      try { await GoogleAuth.signOut(); } catch { /* ignore */ }
    }

    // 4. Sign out of RevenueCat
    try {
      const { getBillingService } = await import('../services/billing');
      const billingService = getBillingService();
      await billingService.logOut();
    } catch (e) {
      logError('auth.signOut.billing', 'Billing sign out error', { error: e });
    }

    // 5. Reset ads service state (prevent stale user ID crashes)
    try {
      const { adsService } = await import('../services/ads');
      adsService.setUserId(null);
    } catch { /* ignore */ }

    // 6. Purge per-user caches and counters so next sign-in starts clean.
    //    Device-level preferences (onboarding, locale, anon_id, attribution)
    //    are preserved by clearUserCache's allowlist-by-omission.
    try {
      const { clearUserCache } = await import('../services/offline');
      await clearUserCache();
    } catch (e) {
      logError('auth.signOut.clearCache', 'Cache clear failed', { error: e });
    }

    logInfo('auth.signOut.complete', 'Sign out complete');
    endSpan(span, 'success');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const dbUpdates = mapProfileToDb(updates);

    const upsertData = {
      id: user.id,
      email: user.email,
      ...dbUpdates,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(upsertData, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      logError('auth.updateProfile.failed', 'Profile update failed', {
        errorCode: error.code,
        errorMessage: error.message,
      });
      return { error: new Error(error.message) };
    }

    if (!data) {
      logError('auth.updateProfile.noData', 'Profile upsert returned no data');
      return { error: new Error('Failed to save profile - no data returned') };
    }

    setProfile(mapDbToProfile(data as DbProfile));
    return { error: null };
  };

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!user) return null;
    await fetchProfile(user.id);
    // After fetchProfile, the in-component state is updated. Read it
    // back from the DB once more to return the freshest value to the
    // caller (used by pollProfileUntilPremium).
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    return mapDbToProfile(data as DbProfile);
  };

  /**
   * Optimistic UI flip: immediately mark the user as premium client-side
   * so paywall + gates respect the new entitlement BEFORE the webhook
   * has propagated to profiles.is_premium. Use right after a successful
   * RevenueCat/Stripe purchase confirms locally — the server state will
   * catch up via webhook within ~5 seconds.
   *
   * If the webhook never lands (network split, Stripe outage), the
   * pollProfileUntilPremium loop ultimately decides whether to keep
   * the optimistic flag or revert. Until then, the user gets immediate
   * access — far better than seeing 'success' then a still-locked UI.
   */
  const optimisticallyMarkPremium = useCallback(() => {
    setProfile((current) => {
      if (!current) return current;
      if (current.isPremium) return current;
      return { ...current, isPremium: true };
    });
  }, []);

  /**
   * Poll the profiles table until is_premium === true OR timeout. Used
   * after a purchase to confirm the server-side webhook has caught up.
   * Returns true on confirm, false on timeout.
   *
   * Reads directly from supabase rather than via fetchProfile() to
   * avoid re-firing the locale-sync side effects on every poll iteration.
   */
  const pollProfileUntilPremium = useCallback(
    async (timeoutMs = 30_000, intervalMs = 2_000): Promise<boolean> => {
      if (!user) return false;
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data?.is_premium === true) {
          // Server caught up. Refresh state once so the rest of the
          // profile is in sync (in case other fields changed too).
          await fetchProfile(user.id);
          return true;
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return false;
    },
    [user, fetchProfile],
  );

  // Verify admin status from the database whenever user changes
  useEffect(() => {
    if (user) {
      // Optimistic: use email check for immediate UI rendering
      setIsAdminVerified(checkIsAdmin(user));
      // Then verify against the user_roles table via RPC
      verifyAdminStatus().then((verified) => {
        setIsAdminVerified(verified);
      }).catch(() => {
        // RPC failed — keep the local check result
      });
    } else {
      setIsAdminVerified(false);
    }
  }, [user]);

  // Keep Sentry's user context in sync with the auth session.
  // Setting user id + email lets "how many users affected?" and "reach out to
  // them" work on Sentry events. Clearing on sign-out prevents leakage across
  // accounts on shared devices.
  useEffect(() => {
    import('@sentry/react').then((Sentry) => {
      if (user) {
        Sentry.setUser({
          id: user.id,
          email: user.email ?? undefined,
        });
      } else {
        Sentry.setUser(null);
      }
    }).catch(() => { /* Sentry not initialized / offline */ });
  }, [user]);

  // Native session-resume reconcile: if RevenueCat says the user is
  // premium (active entitlement on device) but profiles.is_premium is
  // false in the DB, the webhook hasn't propagated yet — likely the user
  // killed the app right after purchase. Flip the local flag immediately
  // and poll the DB until it catches up. RC's customerInfo is signed +
  // verified by Google Play, so trusting it is safe (web users go through
  // the Stripe usePostCheckout polling path instead).
  useEffect(() => {
    if (!isNative()) return;
    if (!user || !profile) return;
    if (profile.isPremium) return;

    let cancelled = false;
    (async () => {
      try {
        const { getBillingService } = await import('../services/billing');
        const rcIsPremium = await getBillingService().isPremium();
        if (cancelled) return;
        if (rcIsPremium) {
          optimisticallyMarkPremium();
          // Background poll — corrects DB if webhook is delayed.
          pollProfileUntilPremium(60_000, 2_000).catch(() => undefined);
        }
      } catch {
        // RC unavailable / not initialised — stay on DB-only state.
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, profile?.isPremium, optimisticallyMarkPremium, pollProfileUntilPremium]);

  const isAdmin = isAdminVerified;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isAdmin,
      isProcessingOAuth,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      refreshProfile,
      optimisticallyMarkPremium,
      pollProfileUntilPremium,
      cancelOAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
