import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Goal, TonePreference, ThemePreference } from '../types';
import { isAdmin as checkIsAdmin } from '../utils/admin';
import { isNative, isAndroid, isIOS, getPlatform } from '../utils/platform';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
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
  refreshProfile: () => Promise<void>;
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
  timezone: string;
  goals: Goal[];
  tone_preference: TonePreference;
  notification_time: string;
  notifications_enabled: boolean;
  onboarding_complete: boolean;
  is_premium: boolean;
  is_ad_free: boolean;
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
    timezone: db.timezone,
    goals: db.goals || [],
    tonePreference: db.tone_preference || 'gentle',
    notificationTime: db.notification_time || '09:00',
    notificationsEnabled: db.notifications_enabled ?? true,
    onboardingComplete: db.onboarding_complete,
    isPremium: db.is_premium,
    isAdFree: db.is_ad_free ?? false,
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

function mapProfileToDb(profile: Partial<UserProfile>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (profile.displayName !== undefined) db.display_name = profile.displayName;
  if (profile.birthDate !== undefined) db.birth_date = profile.birthDate;
  if (profile.birthTime !== undefined) db.birth_time = profile.birthTime;
  if (profile.birthPlace !== undefined) db.birth_place = profile.birthPlace;
  if (profile.timezone !== undefined) db.timezone = profile.timezone;
  if (profile.goals !== undefined) db.goals = profile.goals;
  if (profile.tonePreference !== undefined) db.tone_preference = profile.tonePreference;
  if (profile.notificationTime !== undefined) db.notification_time = profile.notificationTime;
  if (profile.notificationsEnabled !== undefined) db.notifications_enabled = profile.notificationsEnabled;
  if (profile.onboardingComplete !== undefined) db.onboarding_complete = profile.onboardingComplete;
  if (profile.isPremium !== undefined) db.is_premium = profile.isPremium;
  if (profile.streak !== undefined) db.streak = profile.streak;
  if (profile.lastRitualDate !== undefined) db.last_ritual_date = profile.lastRitualDate;
  if (profile.mbtiType !== undefined) db.mbti_type = profile.mbtiType;
  if (profile.loveLanguage !== undefined) db.love_language = profile.loveLanguage;
  if (profile.theme !== undefined) db.theme = profile.theme;
  if (profile.card_back_url !== undefined) db.card_back_url = profile.card_back_url;
  if (profile.background_url !== undefined) db.background_url = profile.background_url;
  if (profile.subscribedToNewsletter !== undefined) db.subscribed_to_newsletter = profile.subscribedToNewsletter;
  return db;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  const oauthTimeoutRef = React.useRef<number | null>(null);
  const isProcessingCallbackRef = React.useRef(false);
  const lastProcessedUrlRef = React.useRef<string | null>(null);

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

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(mapDbToProfile(data as DbProfile));
    }
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

        let userMessage = errorDesc || 'Sign in failed';
        if (errorCode === 'access_denied') {
          userMessage = 'Sign in was cancelled';
        } else if (errorCode === 'invalid_flow_state' || errorDesc?.includes('flow state')) {
          userMessage = 'Sign in session expired. Please try again.';
        } else if (errorDesc?.includes('provider')) {
          userMessage = 'Google sign-in is not configured. Please use email/password.';
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
            toast('Sign in session expired. Please try again.', 'error', createDiagnosticsAction());
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
      toast('Sign in failed. Please try again.', 'error', createDiagnosticsAction());
      isProcessingCallbackRef.current = false;
      setOAuthProcessing(false);
      setCorrelationId(null);
      endSpan(callbackSpan, 'failure');
    }

    return false;
  }, [fetchProfile, setOAuthProcessing, getSessionWithRetry]);

  useEffect(() => {
    let appUrlListener: { remove: () => void } | null = null;
    let mounted = true;
    let launchUrlHandled = false;

    const setupAppUrlListener = () => {
      if (isNative()) {
        appUrlListener = App.addListener('appUrlOpen', async ({ url }) => {
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
          }
          await handleOAuthCallback(url);
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
            const handled = await handleOAuthCallback(launch.url);
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
            logInfo('auth.init.webCallback', 'Processing web OAuth callback');
            generateCorrelationId('oauth');
            const handled = await handleOAuthCallback(currentUrl);
            if (handled) {
              window.history.replaceState({}, '', window.location.pathname);
              if (mounted) setLoading(false);
              endSpan(initSpan, 'success', { handledWebCallback: true });
              return;
            }
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
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      appUrlListener?.remove();
      clearOAuthTimeout();
    };
  }, [fetchProfile, handleOAuthCallback, clearOAuthTimeout]);

  const signUp = async (email: string, password: string) => {
    const correlationId = generateCorrelationId('signup');
    const span = startSpan('auth.signUp', { correlationId });

    logInfo('auth.signUp.start', 'Starting email sign up');

    const { error } = await supabase.auth.signUp({ email, password });

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

    const redirectUrl = isNative()
      ? 'com.arcana.app://auth'
      : window.location.origin + window.location.pathname;

    logInfo('auth.google.config', 'OAuth configuration', {
      redirectUrl,
      flowType: 'pkce',
      skipBrowserRedirect: isNative(),
    });

    try {
      if (isNative()) {
        const generateUrlSpan = startSpan('auth.google.generateUrl');

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

        if (error) {
          const normalized = normalizeSupabaseError(error);
          logError('auth.google.urlGenerationFailed', 'Error generating OAuth URL', {
            errorCode: normalized.code,
            errorMessage: normalized.message,
          });
          setOAuthProcessing(false);
          setCorrelationId(null);
          endSpan(generateUrlSpan, 'failure');
          endSpan(initiateSpan, 'failure');
          return { error: new Error(normalized.message) };
        }

        endSpan(generateUrlSpan, 'success', { hasUrl: !!data?.url });

        if (data?.url) {
          logInfo('auth.google.urlGenerated', 'OAuth URL generated', {
            urlLength: data.url.length,
          });

          const openBrowserSpan = startSpan('auth.google.openBrowser');

          try {
            if (isIOS()) {
              await Browser.open({
                url: data.url,
                presentationStyle: 'popover',
              });
            } else {
              await Browser.open({ url: data.url });
            }
            logInfo('auth.google.browserOpened', 'Browser opened successfully');
            endSpan(openBrowserSpan, 'success');
          } catch (browserErr) {
            captureException('auth.google.browserFailed', browserErr);
            setOAuthProcessing(false);
            setCorrelationId(null);
            endSpan(openBrowserSpan, 'failure');
            endSpan(initiateSpan, 'failure');
            return { error: new Error('Failed to open sign-in browser') };
          }
        } else {
          logError('auth.google.noUrl', 'No URL returned from Supabase');
          setOAuthProcessing(false);
          setCorrelationId(null);
          endSpan(initiateSpan, 'failure', { reason: 'no_url' });
          return { error: new Error('Failed to generate sign-in URL') };
        }
      } else {
        const webOAuthSpan = startSpan('auth.google.webOAuth');

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

    await supabase.auth.signOut();
    setProfile(null);

    const { getBillingService } = await import('../services/billing');
    const billingService = getBillingService();
    await billingService.logOut();

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

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isAdmin = checkIsAdmin(user);

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
