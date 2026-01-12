import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { DevicePreview } from './components/dev/DevicePreview';
import { ToastContainer } from './components/ui';
import { SearchSheet, SavedSheet, SettingsSheet } from './components/overlays';
import {
  HomePage,
  ReadingsPage,
  QuizzesPage,
  JournalPage,
  ProfilePage,
  OnboardingPage,
  OAuthOnboardingPage,
  AuthPage,
  AdminPage,
} from './pages';
import { isNative } from './utils/platform';
import { initializeBilling } from './services/billing';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

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
    await SplashScreen.hide();
  } catch {
    console.log('SplashScreen not available');
  }
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  home: { title: 'Today', subtitle: 'Your daily ritual awaits' },
  readings: { title: 'Readings', subtitle: 'Explore the cards' },
  quizzes: { title: 'Quizzes', subtitle: 'Discover yourself' },
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
  }, []);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!user && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
    setCheckingOnboarding(false);
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
    <div className="min-h-screen pb-24 relative">
      {profile?.background_url && (
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
            style={{ backgroundImage: `url(${profile.background_url})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-mystic-950/70 via-mystic-950/85 to-mystic-950/95" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>
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
