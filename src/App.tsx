import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import i18n from './i18n/config';
import { useT } from './i18n/useT';
import { syncHreflangTags } from './i18n/hreflang';
import { AppProvider } from './context/AppContext';
import { FeatureFlagProvider } from './context/FeatureFlagContext';
import { useUI } from './context/UIContext';
import { useGamification } from './context/GamificationContext';
import { usePostCheckout } from './hooks/usePostCheckout';
import { UpdateAvailableBanner } from './components/overlays/UpdateAvailableBanner';
import { DiagnosticsProvider, useDiagnostics } from './context/DiagnosticsContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { WebAdSidebar } from './components/ads/WebAdSidebar';
import { DevicePreview } from './components/dev/DevicePreview';
import { ToastContainer, ListSkeleton } from './components/ui';
import { SearchSheet, SavedSheet, SettingsSheet } from './components/overlays';
import { MissingSupabaseConfig } from './components/setup';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { DiagnosticsSheet } from './components/diagnostics';
import { CelestialBackground } from './components/home/CelestialBackground';

// Sentinel used to store "render the animated Celestial background"
// in profile.background_url. Lives here + in SettingsSheet; kept in
// sync by value equality. Any string that starts with `celestial://`
// is treated as an animated background.
const CELESTIAL_BG_URL = 'celestial://animated';

// Eager imports — critical path (shown on first load)
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { OAuthOnboardingPage } from './pages/OAuthOnboardingPage';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';

// Lazy imports — loaded on demand when user navigates
const ReadingsPage = lazy(() => import('./pages/ReadingsPage').then(m => ({ default: m.ReadingsPage })));
const QuizzesPage = lazy(() => import('./pages/QuizzesPage').then(m => ({ default: m.QuizzesPage })));
const HoroscopePage = lazy(() => import('./pages/HoroscopePage').then(m => ({ default: m.HoroscopePage })));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const JournalPage = lazy(() => import('./pages/JournalPage').then(m => ({ default: m.JournalPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const TarotMeaningsPage = lazy(() => import('./pages/TarotMeaningsPage').then(m => ({ default: m.TarotMeaningsPage })));
const TarotCardMeaningPage = lazy(() => import('./pages/TarotCardMeaningPage').then(m => ({ default: m.TarotCardMeaningPage })));
const IChingPage = lazy(() => import('./pages/IChingPage').then(m => ({ default: m.IChingPage })));
const CommunityPage = lazy(() => import('./pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const AiCompanionPage = lazy(() => import('./pages/AiCompanionPage').then(m => ({ default: m.AiCompanionPage })));
const AdvisorsPage = lazy(() => import('./pages/AdvisorsPage').then(m => ({ default: m.AdvisorsPage })));
const RunesPage = lazy(() => import('./pages/RunesPage').then(m => ({ default: m.RunesPage })));
const DicePage = lazy(() => import('./pages/DicePage').then(m => ({ default: m.DicePage })));
const CareerReportPage = lazy(() => import('./pages/CareerReportPage').then(m => ({ default: m.CareerReportPage })));
const YearAheadReportPage = lazy(() => import('./pages/YearAheadReportPage').then(m => ({ default: m.YearAheadReportPage })));
const NatalChartReportPage = lazy(() => import('./pages/NatalChartReportPage').then(m => ({ default: m.NatalChartReportPage })));
const CompatInvitePage = lazy(() => import('./pages/CompatInvitePage').then(m => ({ default: m.CompatInvitePage })));
const AdvisorBookingPage = lazy(() => import('./pages/AdvisorBookingPage').then(m => ({ default: m.AdvisorBookingPage })));
const AdvisorSessionPage = lazy(() => import('./pages/AdvisorSessionPage').then(m => ({ default: m.AdvisorSessionPage })));
const AdvisorDashboardPage = lazy(() => import('./pages/AdvisorDashboardPage').then(m => ({ default: m.AdvisorDashboardPage })));
const AdvisorVerifyPage = lazy(() => import('./pages/AdvisorVerifyPage').then(m => ({ default: m.AdvisorVerifyPage })));
const SandboxPage = lazy(() => import('./pages/SandboxPage').then(m => ({ default: m.SandboxPage })));
const QuickReadingPage = lazy(() => import('./pages/QuickReadingPage').then(m => ({ default: m.QuickReadingPage })));
const TarotCompanionPage = lazy(() => import('./pages/TarotCompanionPage').then(m => ({ default: m.TarotCompanionPage })));
const LiveRoomsPage = lazy(() => import('./pages/LiveRoomsPage').then(m => ({ default: m.LiveRoomsPage })));
const LiveRoomPage = lazy(() => import('./pages/LiveRoomPage').then(m => ({ default: m.LiveRoomPage })));
const PickACardPage = lazy(() => import('./pages/PickACardPage').then(m => ({ default: m.PickACardPage })));
const SoulmateScorePage = lazy(() => import('./pages/SoulmateScorePage').then(m => ({ default: m.SoulmateScorePage })));
const LoveTreePage = lazy(() => import('./pages/LoveTreePage').then(m => ({ default: m.LoveTreePage })));
const MirrorPage = lazy(() => import('./pages/MirrorPage').then(m => ({ default: m.MirrorPage })));
const SharedReadingPage = lazy(() => import('./pages/SharedReadingPage').then(m => ({ default: m.SharedReadingPage })));
const SpreadsPage = lazy(() => import('./pages/SpreadsPage').then(m => ({ default: m.SpreadsPage })));
const SpreadDetailPage = lazy(() => import('./pages/SpreadDetailPage').then(m => ({ default: m.SpreadDetailPage })));
import { isNative } from './utils/platform';
import { parseDeepLink } from './services/deepLink';
import { App as CapApp } from '@capacitor/app';
import { initializeBilling, getBillingService } from './services/billing';
import { adsService } from './services/ads';
import { isSupabaseConfigured } from './lib/supabase';
import { LevelUpCelebration } from './components/celebration/LevelUpCelebration';
import { RateAppSheet } from './components/feedback';
import { TrialReminderModal } from './components/premium';
import { initializeUserAchievements } from './services/achievements';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { loadPersistedLogs } from './utils/telemetry';
import { appStorage } from './lib/appStorage';

const ONBOARDING_KEY = 'arcana_onboarding_complete';
const isDev = import.meta.env.DEV;

async function initializeNativeFeatures() {
  if (!isNative()) return;

  // Critical: status bar + splash (fast, visible immediately)
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a0a0f' });
  } catch {
    console.log('StatusBar not available');
  }

  try {
    await SplashScreen.hide();
  } catch {
    console.log('SplashScreen not available');
  }

  // Non-critical: billing init (deferred, don't block UI)
  // Ads are initialized later after user is authenticated (see user effect)
  initializeBilling().catch(() => console.log('Billing initialization skipped'));
}

const PAGE_TITLE_KEYS = ['home', 'readings', 'quizzes', 'horoscope', 'achievements', 'journal', 'profile', 'blog', 'admin'] as const;

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
  const { t } = useT('app');
  const { user, profile, loading, isAdmin, refreshProfile, isProcessingOAuth, cancelOAuth } = useAuth();
  const { activeTab, setActiveTab, activeOverlay, openOverlay, closeOverlay } = useUI();
  const location = useLocation();
  const navigate = useNavigate();
  const { levelUpEvent, dismissLevelUp, showRatePrompt, closeRatePrompt } = useGamification();
  const { openDiagnostics } = useDiagnostics();
  usePostCheckout();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOAuthCancel, setShowOAuthCancel] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);


  useEffect(() => {
    initializeNativeFeatures();
    loadPersistedLogs();
  }, []);

  // Keep hreflang <link> and og:locale <meta> tags on <head> in sync with
  // the active route and locale. Search engines need hreflang per page;
  // social crawlers need og:locale to match the active language.
  useEffect(() => {
    syncHreflangTags(location.pathname);
    const handler = () => syncHreflangTags(location.pathname);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, [location.pathname]);

  // Map dedicated /signin and /signup URLs to the existing auth state so
  // they're separately indexable by Google. Labyrinthos delegates both to
  // Shopify (single noindex page) — this is an uncontested branded-search
  // lane: "arcana login", "arcana sign up", "tarotlife login", etc.
  useEffect(() => {
    if (location.pathname === '/signin') {
      setShowAuthForm(true);
      setShowOnboarding(false);
    } else if (location.pathname === '/signup') {
      setShowOnboarding(true);
      setShowAuthForm(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Web: cold visitors land on the marketing LandingPage (social proof,
    // free demo, FAQ) so ad traffic can evaluate the app before committing.
    // Onboarding only fires after they click "Get Started" on LandingPage.
    // Native (Android) keeps the direct-to-onboarding behaviour — the Play
    // Store listing is the marketing layer there.
    appStorage.get(ONBOARDING_KEY).then((val) => {
      if (!user && !val && isNative()) {
        setShowOnboarding(true);
      }
      setCheckingOnboarding(false);
    }).catch(() => {
      setCheckingOnboarding(false);
    });
  }, [user]);

  useEffect(() => {
    if (user) {
      // Initialize ads, then show app open ad once ready
      adsService.initialize(user.id).then(() => {
        adsService.setUserId(user.id);
      }).catch(() => console.log('Ads initialization skipped'));
      const billingService = getBillingService();
      billingService.setUserId(user.id);
      initializeUserAchievements(user.id);
    } else {
      // Cleanup when user signs out — prevent stale state crashes
      adsService.setUserId(null);
    }
  }, [user]);

  // App open ad — run once after profile loads on cold start
  const appOpenAdShown = useRef(false);
  useEffect(() => {
    if (profile?.onboardingComplete && !appOpenAdShown.current) {
      appOpenAdShown.current = true;
      // Small delay to ensure AdMob SDK is initialized
      const timer = setTimeout(() => {
        adsService.showAppOpenAdOnColdStart(
          profile?.isPremium || false,
          profile?.isAdFree || false
        );
      }, 1500);
      return () => clearTimeout(timer);
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
    return () => { listener.then(l => l.remove()).catch(() => {}); };
  }, [setActiveTab]);

  // Android hardware back button: close overlay → go home → exit app
  useEffect(() => {
    if (!isNative()) return;
    const listener = CapApp.addListener('backButton', () => {
      if (activeOverlay) {
        closeOverlay();
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }
      CapApp.exitApp();
    });
    return () => { listener.then(l => l.remove()).catch(() => {}); };
  }, [activeOverlay, closeOverlay, activeTab, setActiveTab]);

  const handleOnboardingComplete = () => {
    appStorage.set(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleSwitchToSignIn = () => {
    appStorage.set(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
    setShowAuthForm(true);
    if (!isNative()) navigate('/signin', { replace: true });
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

  // Public content pages (SEO) — render before auth guard
  if (!user && (location.pathname.startsWith('/blog') || location.pathname.startsWith('/tarot-meanings') || location.pathname.startsWith('/reading/') || location.pathname.startsWith('/spreads') || location.pathname.startsWith('/astrology'))) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <div className="min-h-screen constellation-bg">
          <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
            <a href="/" className="font-display text-xl text-mystic-100 no-underline">☽ Arcana</a>
            <div className="flex items-center gap-4">
              <a href="/tarot-meanings" className="text-sm text-mystic-400 hover:text-mystic-200 no-underline transition-colors">Card Meanings</a>
              <a href="/blog" className="text-sm text-mystic-400 hover:text-mystic-200 no-underline transition-colors">Blog</a>
              <button onClick={() => navigate('/signin')} className="px-5 py-2 text-sm font-medium text-mystic-200 hover:text-white border border-mystic-700/50 hover:border-mystic-500 rounded-xl transition-all">
                Sign In
              </button>
            </div>
          </nav>
          <main className="max-w-3xl mx-auto px-4 pb-16">
            <Suspense fallback={<ListSkeleton count={3} />}>
              <Routes>
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/tarot-meanings" element={<TarotMeaningsPage />} />
                <Route path="/tarot-meanings/:slug" element={<TarotCardMeaningPage />} />
                <Route path="/spreads" element={<SpreadsPage />} />
                <Route path="/spreads/:slug" element={<SpreadDetailPage />} />
                <Route path="/reading/:token" element={<SharedReadingPage />} />
              </Routes>
            </Suspense>
          </main>
          {/* Flanking sidebar ads — desktop ≥1400px only, non-intrusive */}
          <WebAdSidebar side="left" />
          <WebAdSidebar side="right" />
          <footer className="border-t border-mystic-800/50 py-8 text-center">
            <a href="/" className="text-sm text-gold hover:underline">← Back to Arcana</a>
          </footer>
        </div>
      </ErrorBoundary>
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
    // Native (Android): always show auth form directly
    // Web: show marketing landing page, with option to switch to auth form
    if (isNative() || showAuthForm) {
      return (
        <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
          <AuthPage onSwitchToOnboarding={() => {
            setShowOnboarding(true);
            if (!isNative()) navigate('/signup');
          }} />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <LandingPage
          onSignIn={() => { setShowAuthForm(true); navigate('/signin'); }}
          onGetStarted={() => { setShowOnboarding(true); navigate('/signup'); }}
        />
      </ErrorBoundary>
    );
  }

  if (profile && !profile.onboardingComplete) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <OAuthOnboardingPage onComplete={refreshProfile} />
      </ErrorBoundary>
    );
  }

  // Profile still loading after auth — show loading state, not onboarding
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center constellation-bg">
        <div className="text-center">
          <div className="loading-constellation mx-auto mb-4" />
          <p className="text-mystic-400">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const tabKey = (PAGE_TITLE_KEYS as readonly string[]).includes(activeTab) ? activeTab : 'home';
  const currentPage = {
    title: t(`pageTitles.${tabKey}.title`),
    subtitle: t(`pageTitles.${tabKey}.subtitle`, { defaultValue: '' }) || undefined,
  };

  return (
    <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
      <div className="min-h-screen pb-nav relative constellation-bg">
        {profile?.background_url === CELESTIAL_BG_URL ? (
          /* Animated starfield background — same visual as the
             pre-login landing page, selectable via Settings. */
          <CelestialBackground />
        ) : profile?.background_url ? (
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
        <main className="relative z-10 max-w-lg mx-auto px-4 pt-4 safe-top" aria-label={currentPage.title}>
          <Header
            title={currentPage.title}
            subtitle={currentPage.subtitle}
            onSearchClick={() => openOverlay('search')}
            onSavedClick={() => openOverlay('saved')}
            onSettingsClick={() => openOverlay('settings')}
          />
          {/* Inner ErrorBoundary — a crash in a single route shows a
              contained error card instead of tearing down the entire app
              shell. Reset on location change so navigating away recovers. */}
          <ErrorBoundary
            key={location.pathname}
            onOpenDiagnostics={openDiagnostics}
          >
          <Suspense fallback={<ListSkeleton count={3} />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Routes location={location}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/readings" element={<ReadingsPage />} />
                  <Route path="/quizzes" element={<QuizzesPage />} />
                  <Route path="/horoscope" element={<HoroscopePage />} />
                  <Route path="/achievements" element={<AchievementsPage />} />
                  <Route path="/journal" element={<JournalPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/blog/:slug" element={<BlogPostPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/iching" element={<IChingPage />} />
                  <Route path="/community" element={<CommunityPage mode="normal" />} />
                  <Route path="/whispering-well" element={<CommunityPage mode="whispering-well" />} />
                  <Route path="/companion" element={<AiCompanionPage />} />
                  <Route path="/advisors" element={<AdvisorsPage />} />
                  <Route path="/runes" element={<RunesPage />} />
                  <Route path="/dice" element={<DicePage />} />
                  <Route path="/reports/career" element={<CareerReportPage />} />
                  <Route path="/reports/year-ahead" element={<YearAheadReportPage />} />
                  <Route path="/reports/natal-chart" element={<NatalChartReportPage />} />
                  <Route path="/invite/:code" element={<CompatInvitePage />} />
                  <Route path="/advisors/:slug/book" element={<AdvisorBookingPage />} />
                  <Route path="/advisors/session/:id" element={<AdvisorSessionPage />} />
                  <Route path="/ai/quick" element={<QuickReadingPage />} />
                  <Route path="/ai/tarot" element={<TarotCompanionPage />} />
                  <Route path="/live-rooms" element={<LiveRoomsPage />} />
                  <Route path="/live-rooms/:id" element={<LiveRoomPage />} />
                  <Route path="/advisors/verify" element={<AdvisorVerifyPage />} />
                  <Route path="/sandbox" element={<SandboxPage />} />
                  <Route path="/advisors/dashboard" element={<AdvisorDashboardPage />} />
                  <Route path="/pick-a-card" element={<PickACardPage />} />
                  <Route path="/soulmate-score" element={<SoulmateScorePage />} />
                  <Route path="/love-tree" element={<LoveTreePage />} />
                  <Route path="/mirror" element={<MirrorPage />} />
                  <Route path="/reading/:token" element={<SharedReadingPage />} />
                  <Route path="/spreads" element={<SpreadsPage />} />
                  <Route path="/spreads/:slug" element={<SpreadDetailPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
          </ErrorBoundary>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />

        <UpdateAvailableBanner />

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
        <TrialReminderModal />
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
    <BrowserRouter>
      <DiagnosticsProvider>
        <AuthProvider>
          <FeatureFlagProvider>
            <AppProvider>
              <DiagnosticsSync />
              <AppContent />
              <GlobalDiagnosticsSheet />
              <ToastContainer />
            </AppProvider>
          </FeatureFlagProvider>
        </AuthProvider>
      </DiagnosticsProvider>
    </BrowserRouter>
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
