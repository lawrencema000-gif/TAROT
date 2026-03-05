import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { useUI } from './context/UIContext';
import { useGamification } from './context/GamificationContext';
import { DiagnosticsProvider, useDiagnostics } from './context/DiagnosticsContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { BannerAd } from './components/ads';
import { DevicePreview } from './components/dev/DevicePreview';
import { ToastContainer, ListSkeleton } from './components/ui';
import { SearchSheet, SavedSheet, SettingsSheet } from './components/overlays';
import { MissingSupabaseConfig } from './components/setup';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { DiagnosticsSheet } from './components/diagnostics';

// Eager imports — critical path (shown on first load)
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OAuthOnboardingPage } from './pages/OAuthOnboardingPage';
import { AuthPage } from './pages/AuthPage';

// Lazy imports — loaded on demand when user navigates
const ReadingsPage = lazy(() => import('./pages/ReadingsPage').then(m => ({ default: m.ReadingsPage })));
const QuizzesPage = lazy(() => import('./pages/QuizzesPage').then(m => ({ default: m.QuizzesPage })));
const HoroscopePage = lazy(() => import('./pages/HoroscopePage').then(m => ({ default: m.HoroscopePage })));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const JournalPage = lazy(() => import('./pages/JournalPage').then(m => ({ default: m.JournalPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
import { isNative } from './utils/platform';
import { parseDeepLink } from './services/deepLink';
import { App as CapApp } from '@capacitor/app';
import { initializeBilling, getBillingService } from './services/billing';
import { adsService } from './services/ads';
import { isSupabaseConfigured } from './lib/supabase';
import { LevelUpCelebration } from './components/celebration/LevelUpCelebration';
import { RateAppSheet } from './components/feedback';
import { initializeUserAchievements } from './services/achievements';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { loadPersistedLogs } from './utils/telemetry';
import { appStorage } from './lib/appStorage';

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
  horoscope: { title: 'Horoscope', subtitle: 'Your cosmic blueprint' },
  achievements: { title: 'Achievements', subtitle: 'Track your progress' },
  journal: { title: 'Journal', subtitle: 'Reflect and grow' },
  profile: { title: 'Profile' },
  admin: { title: 'Admin', subtitle: 'Manage uploads' },
};

function DiagnosticsSync() {
  const { session, user } = useAuth();
  const { setSessionState, setAuthConfig } = useDiagnostics();

  useEffect(() => {
    setSessionState({
      hasSession: !!session,
      userId: user?.id,
    });
  }, [session, user, setSessionState]);

  useEffect(() => {
    setAuthConfig({
      flowType: 'pkce',
      detectSessionInUrl: !isNative(),
      redirectTo: isNative() ? 'com.arcana.app://auth' : window.location.origin,
    });
  }, [setAuthConfig]);

  return null;
}

function AppContent() {
  const { user, profile, loading, isAdmin, refreshProfile, isProcessingOAuth, cancelOAuth } = useAuth();
  const { activeTab, setActiveTab, activeOverlay, openOverlay, closeOverlay } = useUI();
  const { levelUpEvent, dismissLevelUp, showRatePrompt, closeRatePrompt } = useGamification();
  const { openDiagnostics } = useDiagnostics();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOAuthCancel, setShowOAuthCancel] = useState(false);

  const BANNER_TABS = useMemo(() => new Set(['readings', 'journal', 'achievements', 'profile', 'horoscope']), []);
  const showBanner = useMemo(
    () => BANNER_TABS.has(activeTab) && !activeOverlay,
    [BANNER_TABS, activeTab, activeOverlay]
  );

  useEffect(() => {
    initializeNativeFeatures();
    loadPersistedLogs();
  }, []);

  useEffect(() => {
    appStorage.get(ONBOARDING_KEY).then((val) => {
      if (!user && !val) {
        setShowOnboarding(true);
      }
      setCheckingOnboarding(false);
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      adsService.setUserId(user.id);
      const billingService = getBillingService();
      billingService.setUserId(user.id);
      initializeUserAchievements(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (profile?.onboardingComplete) {
      adsService.showAppOpenAdOnColdStart(
        profile?.isPremium || false,
        profile?.isAdFree || false
      );
    }
  }, [profile?.onboardingComplete, profile?.isPremium, profile?.isAdFree]);

  useEffect(() => {
    if (isProcessingOAuth) {
      setShowOAuthCancel(false);
      const timer = setTimeout(() => setShowOAuthCancel(true), 10000);
      return () => clearTimeout(timer);
    }
    setShowOAuthCancel(false);
  }, [isProcessingOAuth]);

  // Deep link routing for shared content URLs
  useEffect(() => {
    if (!isNative()) return;
    const listener = CapApp.addListener('appUrlOpen', ({ url }) => {
      const route = parseDeepLink(url);
      if (!route || route.type === 'unknown') return;
      switch (route.type) {
        case 'reading':
          setActiveTab('readings');
          break;
        case 'card':
          setActiveTab('readings');
          break;
        case 'horoscope':
          setActiveTab('horoscope');
          break;
      }
    });
    return () => { listener.then(l => l.remove()); };
  }, [setActiveTab]);

  const handleOnboardingComplete = () => {
    appStorage.set(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleSwitchToSignIn = () => {
    appStorage.set(ONBOARDING_KEY, 'true');
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
          {isProcessingOAuth && showOAuthCancel && (
            <div className="mt-6 space-y-2">
              <p className="text-mystic-500 text-sm">Taking longer than expected?</p>
              <button
                onClick={cancelOAuth}
                className="px-4 py-2 text-sm text-mystic-300 hover:text-mystic-100 underline underline-offset-2 transition-colors"
              >
                Cancel and try again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showOnboarding && !user) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <OnboardingPage
          onComplete={handleOnboardingComplete}
          onSwitchToSignIn={handleSwitchToSignIn}
        />
      </ErrorBoundary>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <AuthPage onSwitchToOnboarding={() => setShowOnboarding(true)} />
      </ErrorBoundary>
    );
  }

  if (!profile?.onboardingComplete) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <OAuthOnboardingPage onComplete={refreshProfile} />
      </ErrorBoundary>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'readings':
        return <ReadingsPage />;
      case 'quizzes':
        return <QuizzesPage />;
      case 'horoscope':
        return <HoroscopePage />;
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
    <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
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
        <BannerAd
          visible={showBanner}
          isPremium={profile?.isPremium || false}
          isAdFree={profile?.isAdFree || false}
        />
        <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 safe-top" aria-label={currentPage.title}>
          <Header
            title={currentPage.title}
            subtitle={currentPage.subtitle}
            onSearchClick={() => openOverlay('search')}
            onSavedClick={() => openOverlay('saved')}
            onSettingsClick={() => openOverlay('settings')}
          />
          <Suspense fallback={<ListSkeleton count={3} />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
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
        {levelUpEvent && (
          <LevelUpCelebration
            open={!!levelUpEvent}
            onClose={dismissLevelUp}
            newLevel={levelUpEvent.newLevel}
            seekerRank={levelUpEvent.seekerRank}
            xpEarned={levelUpEvent.xpEarned}
          />
        )}
        {user && (
          <RateAppSheet
            open={showRatePrompt}
            onClose={closeRatePrompt}
            userId={user.id}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

function GlobalDiagnosticsSheet() {
  const { isOpen, closeDiagnostics } = useDiagnostics();
  return <DiagnosticsSheet open={isOpen} onClose={closeDiagnostics} />;
}

function AppWithProviders() {
  return (
    <DiagnosticsProvider>
      <AuthProvider>
        <AppProvider>
          <DiagnosticsSync />
          <AppContent />
          <GlobalDiagnosticsSheet />
          <ToastContainer />
        </AppProvider>
      </AuthProvider>
    </DiagnosticsProvider>
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
