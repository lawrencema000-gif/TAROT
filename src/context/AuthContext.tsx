import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile, Goal, TonePreference, ThemePreference } from '../types';
import { isAdmin as checkIsAdmin } from '../utils/admin';
import { isNative } from '../utils/platform';

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

  useEffect(() => {
    const hasOAuthParams = window.location.hash.includes('access_token') ||
                           window.location.hash.includes('error');

    if (hasOAuthParams) {
      console.log('[OAuth] Detected OAuth callback in URL');
      setIsProcessingOAuth(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] Initial session check:', session ? 'Session found' : 'No session');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
      setIsProcessingOAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change event:', event, session ? 'Session exists' : 'No session');

      if (event === 'SIGNED_IN') {
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

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

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
    setIsProcessingOAuth(true);

    const redirectUrl = isNative()
      ? undefined
      : `${window.location.origin}/`;

    console.log('[OAuth] Redirect URL:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: isNative(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('[OAuth] Error:', error);
      setIsProcessingOAuth(false);
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
