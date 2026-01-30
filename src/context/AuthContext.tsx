import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Goal, TonePreference, ThemePreference } from '../types';
import { isAdmin as checkIsAdmin } from '../utils/admin';
import { isNative } from '../utils/platform';
import { App } from '@capacitor/app';
import { toast } from '../components/ui/Toast';

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
  is_guest: boolean;
  streak: number;
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
    isGuest: db.is_guest || false,
    streak: db.streak,
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
  if (profile.isGuest !== undefined) db.is_guest = profile.isGuest;
  if (profile.streak !== undefined) db.streak = profile.streak;
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
        console.warn('[OAuth] Timeout - resetting processing state');
        setIsProcessingOAuth(false);
      }, 30000);
    }
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

  const handleOAuthCallback = useCallback(async (url: string) => {
    if (!url) return false;

    const hasCode = url.includes('code=');
    const hasAccessToken = url.includes('access_token=');
    const hasError = url.includes('error=');

    if (!hasCode && !hasAccessToken && !hasError) return false;

    console.log('[OAuth] Processing callback URL:', url.substring(0, 100) + '...');
    setOAuthProcessing(true);

    try {
      if (hasError) {
        const urlObj = new URL(url);
        const error = urlObj.searchParams.get('error') || new URLSearchParams(urlObj.hash.substring(1)).get('error');
        const errorDesc = urlObj.searchParams.get('error_description') || new URLSearchParams(urlObj.hash.substring(1)).get('error_description');
        console.error('[OAuth] Error in callback:', error, errorDesc);

        let userMessage = errorDesc || 'Sign in failed';
        if (error === 'invalid_flow_state' || errorDesc?.includes('flow state')) {
          userMessage = 'Sign in session expired. Please try again.';
          try {
            localStorage.removeItem('supabase.auth.token');
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
              if (key.startsWith('sb-') && key.includes('-auth-token')) {
                localStorage.removeItem(key);
              }
            });
          } catch {
            console.warn('[OAuth] Could not clear stale auth state');
          }
        }

        toast(userMessage, 'error');
        setOAuthProcessing(false);
        return true;
      }

      if (hasCode) {
        console.log('[OAuth] Exchanging code for session (PKCE flow)');

        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session?.user) {
          console.log('[OAuth] Session already exists, skipping code exchange');
          setSession(existingSession.session);
          setUser(existingSession.session.user);
          fetchProfile(existingSession.session.user.id);
          setOAuthProcessing(false);
          return true;
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(url);

        if (error) {
          console.error('[OAuth] Code exchange failed:', error.message);

          if (error.message.includes('code verifier') || error.message.includes('already used') || error.message.includes('flow state')) {
            const { data: retrySession } = await supabase.auth.getSession();
            if (retrySession?.session?.user) {
              console.log('[OAuth] Code already exchanged, using existing session');
              setSession(retrySession.session);
              setUser(retrySession.session.user);
              fetchProfile(retrySession.session.user.id);
              setOAuthProcessing(false);
              return true;
            }

            toast('Sign in session expired. Please try again.', 'error');
          } else {
            toast(error.message || 'Could not complete sign-in', 'error');
          }
          setOAuthProcessing(false);
          return true;
        }

        if (data?.session?.user) {
          console.log('[OAuth] Session established successfully');
          setSession(data.session);
          setUser(data.session.user);
          fetchProfile(data.session.user.id);
        }
        setOAuthProcessing(false);
        return true;
      }

      if (hasAccessToken) {
        console.log('[OAuth] Processing implicit flow tokens');
        const hashParams = new URLSearchParams(new URL(url).hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('[OAuth] Session set failed:', error);
            toast(error.message || 'Could not complete sign-in', 'error');
          }
        }
        setOAuthProcessing(false);
        return true;
      }
    } catch (e) {
      console.error('[OAuth] Callback processing error:', e);
      toast('Sign in failed. Please try again.', 'error');
      setOAuthProcessing(false);
    }

    return false;
  }, [fetchProfile, setOAuthProcessing]);

  useEffect(() => {
    let appUrlListener: { remove: () => void } | null = null;
    let mounted = true;

    const setupAppUrlListener = () => {
      if (isNative()) {
        appUrlListener = App.addListener('appUrlOpen', async ({ url }) => {
          console.log('[OAuth] App URL opened:', url);
          if (mounted) {
            await handleOAuthCallback(url);
          }
        });
      }
    };

    const init = async () => {
      setupAppUrlListener();

      try {
        if (isNative()) {
          const launch = await App.getLaunchUrl();
          console.log('[Auth] Launch URL:', launch?.url || 'None');
          if (launch?.url) {
            const handled = await handleOAuthCallback(launch.url);
            if (handled) {
              if (mounted) setLoading(false);
              return;
            }
          }
        } else {
          const currentUrl = window.location.href;
          if (currentUrl.includes('code=') || currentUrl.includes('access_token=') || currentUrl.includes('error=')) {
            console.log('[Auth] Processing web OAuth callback');
            const handled = await handleOAuthCallback(currentUrl);
            if (handled) {
              window.history.replaceState({}, '', window.location.pathname);
              if (mounted) setLoading(false);
              return;
            }
          }
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[Auth] Session error:', error);
        }
        console.log('[Auth] Initial session:', session ? 'Found' : 'None');
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          clearOAuthTimeout();
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event, session ? 'Session exists' : 'No session');

      if (!mounted) return;

      if (event === 'SIGNED_IN') {
        clearOAuthTimeout();
        setIsProcessingOAuth(false);
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
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
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    console.log('[OAuth] Initiating Google sign-in');
    setOAuthProcessing(true);

    const redirectUrl = isNative()
      ? 'com.arcana.app://auth'
      : window.location.origin;

    console.log('[OAuth] Redirect URL:', redirectUrl, 'isNative:', isNative());

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error('[OAuth] Error:', error);
      setOAuthProcessing(false);
    }

    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const dbUpdates = mapProfileToDb(updates);
    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }

    return { error: error ? new Error(error.message) : null };
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
