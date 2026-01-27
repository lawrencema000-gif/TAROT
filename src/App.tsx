import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { DevicePreview } from './components/dev/DevicePreview';
import { ToastContainer } from './components/ui';
import { SearchSheet, SavedSheet, SettingsSheet } from './components/overlays';
import { MissingSupabaseConfig } from './components/setup';
import {
  HomePage,
  ReadingsPage,
  QuizzesPage,
  AchievementsPage,
  JournalPage,
  ProfilePage,
  OnboardingPage,
  OAuthOnboardingPage,
  AuthPage,
  AdminPage,
} from './pages';
import { isNative } from './utils/platform';
import { initializeBilling, getBillingService } from './services/billing';
import { adsService } from './services/ads';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';

const ONBOARDING_KEY = 'arcana_onboarding_complete';
const isDev = import.meta.env.DEV;

async function initializeNativeFeatures() {
  if (!isNative()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
  } catch {
    console.log('StatusBar not available');
  }

  try {
    await initializeBilling();
  } catch {
    console.log('Billing initialization skipped');
  }

  try {
    await adsService.initialize();
  } catch {
    console.log('Ads initialization skipped');
  }

  try {
    await SplashScreen.hide();
  } catch {
    console.log('SplashScreen not available');
  }
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  home: { title: 'Today', subtitle: 'Your daily ritual awaits' },
  readings: { title: 'Readings', subtitle: 'Explore the cards' },
  quizzes: { title: 'Quizzes', subtitle: 'Discover yourself' },
  achievements: { title: 'Achievements', subtitle: 'Track your progress' },
  journal: { title: 'Journal', subtitle: 'Reflect and grow' },
  profile: { title: 'Profile' },
  admin: { title: 'Admin', subtitle: 'Manage uploads' },
};

function AppContent() {
  const { user, profile, loading, isAdmin, refreshProfile, isProcessingOAuth } = useAuth();
  const { activeTab, setActiveTab, activeOverlay, openOverlay, closeOverlay } = useApp();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    initializeNativeFeatures();

    if (isNative()) {
      const handleAppUrlOpen = CapacitorApp.addListener('appUrlOpen', async (data) => {
        console.log('[OAuth] App URL opened:', data.url);

        try {
          const url = new URL(data.url);

          if (url.pathname === '//auth' || url.host === 'auth') {
            console.log('[OAuth] Processing OAuth callback...');

            const hashFragment = url.hash.substring(1);
            const params = new URLSearchParams(hashFragment);

            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const error = params.get('error');
            const errorDescription = params.get('error_description');

            if (error) {
              console.error('[OAuth] Error in callback:', error, errorDescription);
              return;
            }

            if (accessToken && refreshToken) {
              console.log('[OAuth] Setting session from tokens...');
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                console.error('[OAuth] Session error:', sessionError);
              } else {
                console.log('[OAuth] Session set successfully!');
              }
            }
          }
        } catch (err) {
          console.error('[OAuth] Error processing URL:', err);
        }
      });

      return () => {
        handleAppUrlOpen.remove();
      };
    }
  }, []);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!user && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
    setCheckingOnboarding(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      adsService.setUserId(user.id);
      const billingService = getBillingService();
      billingService.setUserId(user.id);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleSwitchToSignIn = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  if (loading || checkingOnboarding || isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center constellation-bg">
        <div className="text-center">
          <div className="loading-constellation mx-auto mb-4" />
          <p className="text-mystic-400">
            {isProcessingOAuth ? 'Completing sign in...' : 'Loading your daily ritual...'}
          </p>
        </div>
      </div>
    );
  }

  if (showOnboarding && !user) {
    return (
      <OnboardingPage
        onComplete={handleOnboardingComplete}
        onSwitchToSignIn={handleSwitchToSignIn}
      />
    );
  }

  if (!user) {
    return <AuthPage onSwitchToOnboarding={() => setShowOnboarding(true)} />;
  }

  if (!profile?.onboardingComplete) {
    return <OAuthOnboardingPage onComplete={refreshProfile} />;
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'readings':
        return <ReadingsPage />;
      case 'quizzes':
        return <QuizzesPage />;
      case 'achievements':
        return <AchievementsPage />;
      case 'journal':
        return <JournalPage />;
      case 'profile':
        return <ProfilePage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <HomePage />;
    }
  };

  const currentPage = pageTitles[activeTab] || pageTitles.home;

  return (
    <div className="min-h-screen pb-24 relative constellation-bg">
      {profile?.background_url ? (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transition-opacity duration-700"
            style={{ backgroundImage: `url(${profile.background_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-mystic-950/70 via-mystic-950/85 to-mystic-950/95" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>
      ) : (
        <div className="fixed inset-0 z-0 opacity-60" />
      )}
      <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 safe-top">
        <Header
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          onSearchClick={() => openOverlay('search')}
          onSavedClick={() => openOverlay('saved')}
          onSettingsClick={() => openOverlay('settings')}
        />
        {renderPage()}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />

      <SearchSheet
        open={activeOverlay === 'search'}
        onClose={closeOverlay}
      />
      <SavedSheet
        open={activeOverlay === 'saved'}
        onClose={closeOverlay}
      />
      <SettingsSheet
        open={activeOverlay === 'settings'}
        onClose={closeOverlay}
      />
    </div>
  );
}

function AppWithProviders() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
        <ToastContainer />
      </AppProvider>
    </AuthProvider>
  );
}

function App() {
  if (!isSupabaseConfigured) {
    return <MissingSupabaseConfig />;
  }

  if (isDev) {
    return (
      <DevicePreview>
        <AppWithProviders />
      </DevicePreview>
    );
  }

  return <AppWithProviders />;
}

export default App;
