import { useState, useEffect, useLayoutEffect, useRef, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, matchRoutes } from 'react-router-dom';
import { lazyWithReload } from './components/layout/staleChunk';
import { isAuthPath, signInPathFor, authPathKeepingNext, rememberNextFrom, postAuthDestination, forgetNext } from './components/layout/authReturn';
import { releasePrerenderedHero } from './components/layout/prerenderedHero';
import { backgroundSrc } from './utils/imageUrl';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import i18n from './i18n/config';
import { useT } from './i18n/useT';
import { syncHreflangTags } from './i18n/hreflang';
import { AppProvider } from './context/AppContext';
import { useRitual } from './context/RitualContext';
import { syncDailyReminder, syncStreakNudge } from './services/localNotifications';
import { GlobalAchievementCelebration } from './components/achievements/GlobalAchievementCelebration';
import { FeatureFlagProvider, useFeatureFlag, useFeatureFlags } from './context/FeatureFlagContext';
import { useUI, isTabRoot } from './context/UIContext';
import { useGamification } from './context/GamificationContext';
import { usePostCheckout } from './hooks/usePostCheckout';
import { UpdateAvailableBanner } from './components/overlays/UpdateAvailableBanner';
import { DiagnosticsProvider, useDiagnostics } from './context/DiagnosticsContext';
import { BottomNav } from './components/layout/BottomNav';
import { Header } from './components/layout/Header';
import { WebAdSidebar } from './components/ads/WebAdSidebar';
import { DevicePreview } from './components/dev/DevicePreview';
import { ToastContainer, ListSkeleton, BrandMark, BrandWordmark, toast } from './components/ui';
import { SearchSheet, SavedSheet } from './components/overlays';
import { MissingSupabaseConfig } from './components/setup';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { CelestialBackground } from './components/home/CelestialBackground';

// Sentinel used to store "render the animated Celestial background"
// in profile.background_url. Lives here + in SettingsSheet; kept in
// sync by value equality. Any string that starts with `celestial://`
// is treated as an animated background.
const CELESTIAL_BG_URL = 'celestial://animated';

// Eager imports — critical path (shown on first load)
import { HomePage } from './pages/HomePage';
// Eager: the screen behind an unknown path must never itself depend on a
// chunk that a stale deploy might have removed.
import { NotFoundPage } from './pages/NotFoundPage';
// The sign-up, sign-in and recovery screens are each one visit per account
// (R8 §a3): a returning member never renders them, so they load on demand
// behind the boot fallback rather than riding in the main chunk.
const OnboardingPage = lazyWithReload(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const OAuthOnboardingPage = lazyWithReload(() => import('./pages/OAuthOnboardingPage').then(m => ({ default: m.OAuthOnboardingPage })));
const AuthPage = lazyWithReload(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const ResetPasswordPage = lazyWithReload(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
// Overlays that most sessions never open: mounted on first open (and kept,
// so the Sheet's exit still plays), fetched then.
const SettingsSheet = lazyWithReload(() => import('./components/overlays/SettingsSheet').then(m => ({ default: m.SettingsSheet })));
const DiagnosticsSheet = lazyWithReload(() => import('./components/diagnostics/DiagnosticsPanel').then(m => ({ default: m.DiagnosticsSheet })));
const TrialReminderModal = lazyWithReload(() => import('./components/premium/TrialReminderModal').then(m => ({ default: m.TrialReminderModal })));
// The marketing landing is a web-only cold-visitor screen; it and its
// stylesheet load only when a signed-out browser lands on /.
const LandingPage = lazyWithReload(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));

// Lazy imports — loaded on demand when user navigates
const ReadingsPage = lazyWithReload(() => import('./pages/ReadingsPage').then(m => ({ default: m.ReadingsPage })));
const PeoplePage = lazyWithReload(() => import('./pages/PeoplePage').then(m => ({ default: m.PeoplePage })));
const PersonDetailPage = lazyWithReload(() => import('./pages/PersonDetailPage').then(m => ({ default: m.PersonDetailPage })));
const PersonComparePage = lazyWithReload(() => import('./pages/PersonComparePage').then(m => ({ default: m.PersonComparePage })));
const ChartSuitePage = lazyWithReload(() => import('./pages/ChartSuitePage').then(m => ({ default: m.ChartSuitePage })));
const ZiweiPage = lazyWithReload(() => import('./pages/ZiweiPage').then(m => ({ default: m.ZiweiPage })));
const MansionsPage = lazyWithReload(() => import('./pages/MansionsPage').then(m => ({ default: m.MansionsPage })));
const AuspiciousDatesPage = lazyWithReload(() => import('./pages/AuspiciousDatesPage').then(m => ({ default: m.AuspiciousDatesPage })));
const WishingSkyPage = lazyWithReload(() => import('./pages/WishingSkyPage').then(m => ({ default: m.WishingSkyPage })));
const QuizzesPage = lazyWithReload(() => import('./pages/QuizzesPage').then(m => ({ default: m.QuizzesPage })));
const HoroscopePage = lazyWithReload(() => import('./pages/HoroscopePage').then(m => ({ default: m.HoroscopePage })));
const AchievementsPage = lazyWithReload(() => import('./pages/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const JournalPage = lazyWithReload(() => import('./pages/JournalPage').then(m => ({ default: m.JournalPage })));
const ProfilePage = lazyWithReload(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminPage = lazyWithReload(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));
const BlogPage = lazyWithReload(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const BlogPostPage = lazyWithReload(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const TarotMeaningsPage = lazyWithReload(() => import('./pages/TarotMeaningsPage').then(m => ({ default: m.TarotMeaningsPage })));
const TarotCardMeaningPage = lazyWithReload(() => import('./pages/TarotCardMeaningPage').then(m => ({ default: m.TarotCardMeaningPage })));
const IChingPage = lazyWithReload(() => import('./pages/IChingPage').then(m => ({ default: m.IChingPage })));
const MoodDiaryPage = lazyWithReload(() => import('./pages/MoodDiaryPage').then(m => ({ default: m.MoodDiaryPage })));
const CommunityPage = lazyWithReload(() => import('./pages/CommunityPage').then(m => ({ default: m.CommunityPage })));
const AiCompanionPage = lazyWithReload(() => import('./pages/AiCompanionPage').then(m => ({ default: m.AiCompanionPage })));
const AdvisorsPage = lazyWithReload(() => import('./pages/AdvisorsPage').then(m => ({ default: m.AdvisorsPage })));
const RunesPage = lazyWithReload(() => import('./pages/RunesPage').then(m => ({ default: m.RunesPage })));
const DicePage = lazyWithReload(() => import('./pages/DicePage').then(m => ({ default: m.DicePage })));
const CareerReportPage = lazyWithReload(() => import('./pages/CareerReportPage').then(m => ({ default: m.CareerReportPage })));
const YearAheadReportPage = lazyWithReload(() => import('./pages/YearAheadReportPage').then(m => ({ default: m.YearAheadReportPage })));
const NatalChartReportPage = lazyWithReload(() => import('./pages/NatalChartReportPage').then(m => ({ default: m.NatalChartReportPage })));
const CompatInvitePage = lazyWithReload(() => import('./pages/CompatInvitePage').then(m => ({ default: m.CompatInvitePage })));
const AdvisorBookingPage = lazyWithReload(() => import('./pages/AdvisorBookingPage').then(m => ({ default: m.AdvisorBookingPage })));
const AdvisorSessionPage = lazyWithReload(() => import('./pages/AdvisorSessionPage').then(m => ({ default: m.AdvisorSessionPage })));
const AdvisorDashboardPage = lazyWithReload(() => import('./pages/AdvisorDashboardPage').then(m => ({ default: m.AdvisorDashboardPage })));
const AdvisorVerifyPage = lazyWithReload(() => import('./pages/AdvisorVerifyPage').then(m => ({ default: m.AdvisorVerifyPage })));
const SandboxPage = lazyWithReload(() => import('./pages/SandboxPage').then(m => ({ default: m.SandboxPage })));
const QuickReadingPage = lazyWithReload(() => import('./pages/QuickReadingPage').then(m => ({ default: m.QuickReadingPage })));
const TarotCompanionPage = lazyWithReload(() => import('./pages/TarotCompanionPage').then(m => ({ default: m.TarotCompanionPage })));
const LiveRoomsPage = lazyWithReload(() => import('./pages/LiveRoomsPage').then(m => ({ default: m.LiveRoomsPage })));
const LiveRoomPage = lazyWithReload(() => import('./pages/LiveRoomPage').then(m => ({ default: m.LiveRoomPage })));
const PickACardPage = lazyWithReload(() => import('./pages/PickACardPage').then(m => ({ default: m.PickACardPage })));
const CelestialMapPage = lazyWithReload(() => import('./pages/CelestialMapPage').then(m => ({ default: m.CelestialMapPage })));
const SoulmateScorePage = lazyWithReload(() => import('./pages/SoulmateScorePage').then(m => ({ default: m.SoulmateScorePage })));
const LoveTreePage = lazyWithReload(() => import('./pages/LoveTreePage').then(m => ({ default: m.LoveTreePage })));
const MirrorPage = lazyWithReload(() => import('./pages/MirrorPage').then(m => ({ default: m.MirrorPage })));
const SharedReadingPage = lazyWithReload(() => import('./pages/SharedReadingPage').then(m => ({ default: m.SharedReadingPage })));
const SpreadsPage = lazyWithReload(() => import('./pages/SpreadsPage').then(m => ({ default: m.SpreadsPage })));
const SpreadDetailPage = lazyWithReload(() => import('./pages/SpreadDetailPage').then(m => ({ default: m.SpreadDetailPage })));
const AstrologyLearnPage = lazyWithReload(() => import('./pages/AstrologyLearnPage').then(m => ({ default: m.AstrologyLearnPage })));
const AstrologyEntryPage = lazyWithReload(() => import('./pages/AstrologyEntryPage').then(m => ({ default: m.AstrologyEntryPage })));
const SpreadBuilderPage = lazyWithReload(() => import('./pages/SpreadBuilderPage').then(m => ({ default: m.SpreadBuilderPage })));
const FoolsJourneyPage = lazyWithReload(() => import('./pages/FoolsJourneyPage').then(m => ({ default: m.FoolsJourneyPage })));
const NumerologyLearnPage = lazyWithReload(() => import('./pages/NumerologyLearnPage').then(m => ({ default: m.NumerologyLearnPage })));
const NumerologyEntryPage = lazyWithReload(() => import('./pages/NumerologyEntryPage').then(m => ({ default: m.NumerologyEntryPage })));
const GlossaryPage = lazyWithReload(() => import('./pages/GlossaryPage').then(m => ({ default: m.GlossaryPage })));
const GlossaryEntryPage = lazyWithReload(() => import('./pages/GlossaryEntryPage').then(m => ({ default: m.GlossaryEntryPage })));
const CrystalsPage = lazyWithReload(() => import('./pages/CrystalsPage').then(m => ({ default: m.CrystalsPage })));
const CrystalEntryPage = lazyWithReload(() => import('./pages/CrystalEntryPage').then(m => ({ default: m.CrystalEntryPage })));
const UnsubscribePage = lazyWithReload(() => import('./pages/UnsubscribePage').then(m => ({ default: m.UnsubscribePage })));
// The playing-card section (flag `cartomancy`): hub, reading, library, guide.
const CartomancyPage = lazyWithReload(() => import('./pages/CartomancyPage').then(m => ({ default: m.CartomancyPage })));
const CartomancyReadingPage = lazyWithReload(() => import('./pages/CartomancyReadingPage').then(m => ({ default: m.CartomancyReadingPage })));
const CartomancyCardsPage = lazyWithReload(() => import('./pages/CartomancyCardsPage').then(m => ({ default: m.CartomancyCardsPage })));
const CartomancyCardPage = lazyWithReload(() => import('./pages/CartomancyCardPage').then(m => ({ default: m.CartomancyCardPage })));
const CartomancyGuidePage = lazyWithReload(() => import('./pages/CartomancyGuidePage').then(m => ({ default: m.CartomancyGuidePage })));
const CartomancyLessonPage = lazyWithReload(() => import('./pages/CartomancyLessonPage').then(m => ({ default: m.CartomancyLessonPage })));
// Hidden /dev/redesign-showcase route — Phase 1 preview surface.
// Not in BottomNav, not in any in-app link. Reach via URL only. Lazy
// so it doesn't enter the main bundle.
const RedesignShowcasePage = lazyWithReload(() => import('./pages/RedesignShowcasePage').then(m => ({ default: m.RedesignShowcasePage })));
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

/** The boot screen, also the fallback while a lazily loaded entry screen arrives. */
function BootFallback({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center constellation-bg">
      <div className="text-center">
        <div className="loading-constellation mx-auto mb-4" />
        <p className="text-mystic-400">{message}</p>
        {children}
      </div>
    </div>
  );
}

/** Public paths of the playing-card section; the reading itself needs an account. */
function isPublicCartomancyPath(pathname: string): boolean {
  return pathname.startsWith('/cartomancy') && !pathname.startsWith('/cartomancy/reading');
}

/** Paths a signed-out visitor reads in the public shell (SEO content, shared links). */
function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith('/blog') ||
    pathname.startsWith('/tarot-meanings') ||
    pathname.startsWith('/reading/') ||
    // The spread builder saves to an account; everything else under /spreads
    // is the public catalogue (a signed-out /spreads/builder used to land on
    // the catalogue's :slug route as "Spread not found").
    (pathname.startsWith('/spreads') && !pathname.startsWith('/spreads/builder')) ||
    pathname.startsWith('/astrology') ||
    pathname.startsWith('/numerology') ||
    pathname.startsWith('/glossary') ||
    pathname.startsWith('/crystals') ||
    pathname.startsWith('/unsubscribe') ||
    pathname.startsWith('/dev/') ||
    isPublicCartomancyPath(pathname)
  );
}

/**
 * The signed-in table's answer to /signin and /signup: those are signed-out
 * screens, and the visitor standing on one has just signed in (password,
 * sign-up, or an OAuth return to /signin). Go where they were headed.
 */
function PostAuthRedirect() {
  const { search } = useLocation();
  const [to] = useState(() => postAuthDestination(search));
  useEffect(() => { forgetNext(); }, []);
  return <Navigate to={to} replace />;
}

/**
 * Around an overlay that loads on demand. A chunk that cannot load (after
 * lazyWithReload's one reload) closes the overlay with a toast instead of
 * taking down the whole app, which is what the outer boundary did.
 */
class OverlayBoundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[overlay] failed to load', error);
    toast(this.props.message, 'error');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

async function initializeNativeFeatures() {
  if (!isNative()) return;

  // Critical: status bar + splash (fast, visible immediately)
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#07070f' });
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


function DiagnosticsSync() {
  const { session, user } = useAuth();
  const { setSessionState, setAuthConfig } = useDiagnostics();

  useEffect(() => {
    setSessionState({
      hasSession: !!session,
      userId: user?.id,
    });
  }, [session, user, setSessionState]);

  // Hide the bottom navbar while the on-screen keyboard is up.
  // On Android, the soft keyboard slides up over the visual viewport;
  // the fixed-position navbar would otherwise sit between the form
  // and the keyboard, covering the input being typed into.
  //
  // We listen on `window.visualViewport.resize` because that's the
  // only event that fires when the keyboard slides in/out (a regular
  // window resize is NOT triggered by the keyboard on Capacitor).
  // When the visual viewport's height shrinks below the inner-window
  // height by more than ~100px, the keyboard is up — toggle the
  // class on body so the CSS rule in index.css hides the navbar.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const KEYBOARD_THRESHOLD = 150; // px below baseline before we say "keyboard"
    const update = () => {
      const keyboardOpen = window.innerHeight - vv.height > KEYBOARD_THRESHOLD;
      document.body.classList.toggle('keyboard-open', keyboardOpen);
    };
    vv.addEventListener('resize', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      document.body.classList.remove('keyboard-open');
    };
  }, []);

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
  // The advisor marketplace is unfinished and takes real money. Its routes were
  // registered unconditionally, so /advisors/verify — which uploads a
  // government ID — was reachable in production with the flag off. Gate the
  // whole surface on the flag. NOTE: this closes the reachable-by-URL path
  // only; the RPCs and edge functions still need their own server-side gate
  // before this marketplace is safe to enable. See docs/advisor-preflight-audit.md.
  const advisorsEnabled = useFeatureFlag('advisors');
  // SandboxPage's own header says it "ships as a preview behind the `sandbox`
  // flag (default OFF)". The flag exists and reads enabled=false in
  // production — but the route was never gated on it, so the preview has been
  // reachable by URL the whole time. Same shape as the advisors gap above.
  const sandboxEnabled = useFeatureFlag('sandbox');
  // ReadingsPage gates the I Ching TAB on this flag; the /iching route was
  // unconditional, so the screen was reachable by URL with the flag off.
  // Live rooms are at 0% and the page says "soon" throughout — same gap.
  const ichingEnabled = useFeatureFlag('iching');
  const liveRoomsEnabled = useFeatureFlag('live-rooms');
  // The playing-card section. The hub, the card meanings and the guide are
  // public (SEO); the reading is behind sign-in like every other reading.
  const cartomancyEnabled = useFeatureFlag('cartomancy');
  // A flag is unknown (= off) until the flags load, so a gated route decides
  // only once they have: before that it shows the route skeleton. Deciding on
  // the first render bounced every cold deep link to a gated page (a shared
  // /cartomancy link, a bookmarked /iching) to Home, or to the 404 page when
  // signed out.
  const { ready: flagsReady } = useFeatureFlags();
  const gated = (enabled: boolean, page: JSX.Element, fallback: JSX.Element) =>
    !flagsReady ? <ListSkeleton count={3} /> : enabled ? page : fallback;
  const { user, profile, loading, isAdmin, refreshProfile, isProcessingOAuth, cancelOAuth, passwordRecoveryMode } = useAuth();
  const { activeTab, setActiveTab, activeOverlay, openOverlay, closeOverlay } = useUI();
  // The settings sheet is fetched on its first open and stays mounted after
  // (the Sheet outlives `open` to play its exit).
  const [settingsMounted, setSettingsMounted] = useState(false);
  useEffect(() => {
    if (activeOverlay === 'settings') setSettingsMounted(true);
  }, [activeOverlay]);
  const location = useLocation();
  const navigate = useNavigate();
  const { levelUpEvent, dismissLevelUp, showRatePrompt, closeRatePrompt } = useGamification();
  const { ritualCompleted } = useRitual();
  const { openDiagnostics } = useDiagnostics();
  usePostCheckout();
  // Native only: the Capacitor shell has no /signin or /signup in its
  // address bar, so which entry screen shows is state. On the web it is the
  // URL alone (below), so Back, a bookmark and a shared link all agree.
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showOAuthCancel, setShowOAuthCancel] = useState(false);
  // Set when sign-up finishes without a session (a confirmation email is
  // pending): /signup then shows the sign-in form, not step one again.
  const [signupDone, setSignupDone] = useState(false);
  const web = !isNative();
  const path = location.pathname;
  const onboardingOpen = web ? path === '/signup' && !signupDone : showOnboarding;
  const authFormOpen = web ? path === '/signin' || (path === '/signup' && signupDone) : true;
  // A visitor who signs out stays on whatever member URL they were reading;
  // they go to `/`, not to a sign-in form that would bring the next person
  // back to the last one's page.
  const wasSignedIn = useRef(false);


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
      setShowOnboarding(false);
    } else if (location.pathname === '/signup') {
      setShowOnboarding(true);
    }
  }, [location.pathname]);

  // A `next` on an auth screen survives the trip through Google: the OAuth
  // return strips the query string (AuthContext) before the redirect reads it.
  useEffect(() => {
    if (!user && isAuthPath(location.pathname)) rememberNextFrom(location.search);
  }, [user, location.pathname, location.search]);

  useEffect(() => {
    if (user) wasSignedIn.current = true;
    else if (!loading && location.pathname === '/') wasSignedIn.current = false;
  }, [user, loading, location.pathname]);

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

  // Deep link routing for shared content URLs. Route to the ACTUAL target
  // (with its id/token) — previously the id was discarded and recipients
  // landed on a generic tab instead of the shared reading/card.
  useEffect(() => {
    if (!isNative()) return;
    const listener = CapApp.addListener('appUrlOpen', ({ url }) => {
      const route = parseDeepLink(url);
      if (!route || route.type === 'unknown') return;
      switch (route.type) {
        case 'reading':
          if (route.id) navigate(`/reading/${route.id}`);
          else setActiveTab('readings');
          break;
        case 'card':
          if (route.id) navigate(`/tarot-meanings/${route.id}`);
          else setActiveTab('readings');
          break;
        case 'horoscope':
          setActiveTab('horoscope');
          break;
      }
    });
    return () => { listener.then(l => l.remove()).catch(() => {}); };
  }, [setActiveTab, navigate]);

  // Android hardware back button: close overlay → back out of deep pages →
  // go home → exit app. Deep pages (/people/:id, /pick-a-card, /reports/*…)
  // resolve to activeTab='home', so without the isTabRoot check a single
  // back press from any of them exited the app outright.
  useEffect(() => {
    if (!isNative()) return;
    const listener = CapApp.addListener('backButton', () => {
      if (activeOverlay) {
        closeOverlay();
        return;
      }
      if (!isTabRoot(location.pathname)) {
        navigate(-1);
        return;
      }
      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }
      CapApp.exitApp();
    });
    return () => { listener.then(l => l.remove()).catch(() => {}); };
  }, [activeOverlay, closeOverlay, activeTab, setActiveTab, location.pathname, navigate]);

  // Daily reminder ⇄ profile state. Covers sign-in, onboarding opt-in, and
  // every Settings change, since all of them mutate the profile. The first
  // enabled sync on native prompts for permission (Android 13+ runtime).
  useEffect(() => {
    if (!profile) return;
    syncDailyReminder(!!profile.notificationsEnabled, profile.notificationTime);
  }, [profile?.notificationsEnabled, profile?.notificationTime, profile]);

  // Streak-keeper nudge: exists only while today's ritual is incomplete.
  // Cancelled the instant the ritual completes; never fires for finished days.
  useEffect(() => {
    if (!profile) return;
    syncStreakNudge(!!profile.notificationsEnabled, ritualCompleted);
  }, [profile?.notificationsEnabled, ritualCompleted, profile]);

  const handleOnboardingComplete = () => {
    appStorage.set(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
    // With a session this render is already the signed-in app (the profile
    // step, then the /signup redirect); without one, the sign-in form.
    setSignupDone(true);
  };

  const handleSwitchToSignIn = () => {
    appStorage.set(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
    if (web) navigate(authPathKeepingNext('/signin', location.search), { replace: true });
  };

  const handleSwitchToOnboarding = () => {
    setShowOnboarding(true);
    setSignupDone(false);
    if (web) navigate(authPathKeepingNext('/signup', location.search));
  };

  // The signed-in route table. One list, so the signed-out branch can tell a
  // member page (send to sign-in, then back here) from an unknown path (404).
  const memberRoutes: Array<{ path: string; element: JSX.Element }> = [
    { path: '/', element: <HomePage /> },
    { path: '/readings', element: <ReadingsPage /> },
    { path: '/quizzes', element: <QuizzesPage /> },
    { path: '/horoscope', element: <HoroscopePage /> },
    { path: '/achievements', element: <AchievementsPage /> },
    { path: '/journal', element: <JournalPage /> },
    { path: '/profile', element: <ProfilePage /> },
    { path: '/blog', element: <BlogPage /> },
    { path: '/blog/:slug', element: <BlogPostPage /> },
    { path: '/admin', element: <AdminPage /> },
    { path: '/iching', element: gated(ichingEnabled, <IChingPage />, <Navigate to="/" replace />) },
    { path: '/mood-diary', element: <MoodDiaryPage /> },
    // The learn library. These were only in the public table, so a member
    // following a footer link or "Back to glossary" bounced to Home.
    { path: '/tarot-meanings', element: <TarotMeaningsPage /> },
    { path: '/tarot-meanings/:slug', element: <TarotCardMeaningPage /> },
    { path: '/glossary', element: <GlossaryPage /> },
    { path: '/glossary/:slug', element: <GlossaryEntryPage /> },
    { path: '/numerology', element: <NumerologyLearnPage /> },
    { path: '/numerology/:slug', element: <NumerologyEntryPage /> },
    { path: '/crystals', element: <CrystalsPage /> },
    { path: '/crystals/:slug', element: <CrystalEntryPage /> },
    { path: '/community', element: <CommunityPage mode="normal" /> },
    { path: '/whispering-well', element: <CommunityPage mode="whispering-well" /> },
    { path: '/companion', element: <AiCompanionPage /> },
    { path: '/advisors', element: gated(advisorsEnabled, <AdvisorsPage />, <Navigate to="/" replace />) },
    { path: '/runes', element: <RunesPage /> },
    { path: '/dice', element: <DicePage /> },
    { path: '/reports/career', element: <CareerReportPage /> },
    { path: '/reports/year-ahead', element: <YearAheadReportPage /> },
    { path: '/reports/natal-chart', element: <NatalChartReportPage /> },
    { path: '/invite/:code', element: <CompatInvitePage /> },
    { path: '/advisors/:slug/book', element: gated(advisorsEnabled, <AdvisorBookingPage />, <Navigate to="/" replace />) },
    { path: '/advisors/session/:id', element: gated(advisorsEnabled, <AdvisorSessionPage />, <Navigate to="/" replace />) },
    { path: '/ai/quick', element: <QuickReadingPage /> },
    { path: '/ai/tarot', element: <TarotCompanionPage /> },
    { path: '/live-rooms', element: gated(liveRoomsEnabled, <LiveRoomsPage />, <Navigate to="/" replace />) },
    { path: '/live-rooms/:id', element: gated(liveRoomsEnabled, <LiveRoomPage />, <Navigate to="/" replace />) },
    { path: '/advisors/verify', element: gated(advisorsEnabled, <AdvisorVerifyPage />, <Navigate to="/" replace />) },
    { path: '/sandbox', element: gated(sandboxEnabled, <SandboxPage />, <Navigate to="/" replace />) },
    { path: '/advisors/dashboard', element: gated(advisorsEnabled, <AdvisorDashboardPage />, <Navigate to="/" replace />) },
    { path: '/pick-a-card', element: <PickACardPage /> },
    { path: '/celestial-map', element: <CelestialMapPage /> },
    { path: '/soulmate-score', element: <SoulmateScorePage /> },
    { path: '/love-tree', element: <LoveTreePage /> },
    { path: '/mirror', element: <MirrorPage /> },
    { path: '/people', element: <PeoplePage /> },
    { path: '/people/:id', element: <PersonDetailPage /> },
    { path: '/people/:id/compare', element: <PersonComparePage /> },
    { path: '/charts', element: <ChartSuitePage /> },
    { path: '/ziwei', element: <ZiweiPage /> },
    { path: '/mansions', element: <MansionsPage /> },
    { path: '/good-days', element: <AuspiciousDatesPage /> },
    { path: '/wishing-sky', element: <WishingSkyPage /> },
    { path: '/reading/:token', element: <SharedReadingPage /> },
    { path: '/spreads', element: <SpreadsPage /> },
    { path: '/spreads/:slug', element: <SpreadDetailPage /> },
    { path: '/astrology', element: <AstrologyLearnPage /> },
    { path: '/astrology/:slug', element: <AstrologyEntryPage /> },
    { path: '/spreads/builder', element: <SpreadBuilderPage /> },
    { path: '/journey', element: <FoolsJourneyPage /> },
    { path: '/unsubscribe', element: <UnsubscribePage /> },
    { path: '/cartomancy', element: gated(cartomancyEnabled, <CartomancyPage />, <Navigate to="/" replace />) },
    { path: '/cartomancy/reading', element: gated(cartomancyEnabled, <CartomancyReadingPage />, <Navigate to="/" replace />) },
    { path: '/cartomancy/cards', element: gated(cartomancyEnabled, <CartomancyCardsPage />, <Navigate to="/" replace />) },
    { path: '/cartomancy/cards/:slug', element: gated(cartomancyEnabled, <CartomancyCardPage />, <Navigate to="/" replace />) },
    { path: '/cartomancy/guide', element: gated(cartomancyEnabled, <CartomancyGuidePage />, <Navigate to="/" replace />) },
    { path: '/cartomancy/guide/:lesson', element: gated(cartomancyEnabled, <CartomancyLessonPage />, <Navigate to="/" replace />) },
    ...(isDev ? [{ path: '/dev/redesign-showcase', element: <RedesignShowcasePage /> }] : []),
    // Legacy: the Dice Oracle linked here before the AI hub moved under
    // /ai; an installed shortcut or a bookmark may still.
    { path: '/quick-reading', element: <Navigate to="/ai/quick" replace /> },
  ];
  const isMemberRoute = path !== '/' && !!matchRoutes(memberRoutes.map((r) => ({ path: r.path })), path);

  // The prerendered landing hero stays up while the app boots, and goes the
  // moment the app settles on anything other than the landing (LandingPage
  // releases it itself, in the frame it paints).
  const booting = loading || checkingOnboarding || isProcessingOAuth;
  const landingAhead = !user && web && path === '/';
  useLayoutEffect(() => {
    if (!booting && !landingAhead) releasePrerenderedHero();
  }, [booting, landingAhead]);

  if (booting) {
    return (
      <BootFallback
        message={isProcessingOAuth
          ? t('authBootstrap.completingSignIn', { defaultValue: 'Completing sign-in…' })
          : t('authBootstrap.loadingRitual', { defaultValue: 'Loading your daily ritual…' })}
      >
        {isProcessingOAuth && showOAuthCancel && (
          <div className="mt-6 space-y-2">
            <p className="text-mystic-500 text-meta">{t('authBootstrap.takingLonger', { defaultValue: 'Taking longer than expected?' })}</p>
            <button
              onClick={cancelOAuth}
              className="px-4 py-2 text-ui text-mystic-300 hover:text-mystic-100 underline underline-offset-2 transition-colors"
            >
              {t('authBootstrap.backToSignIn', { defaultValue: 'Back to sign in' })}
            </button>
          </div>
        )}
      </BootFallback>
    );
  }

  // Password-recovery gate — overrides every other route. Fires when
  // Supabase emits onAuthStateChange('PASSWORD_RECOVERY', ...) after a
  // user clicks an email reset link, OR when the user navigates
  // directly to /reset-password. Closes a UX + security gap where the
  // recovery email previously dropped users into a normal signed-in
  // session with no way to actually update their password.
  if (passwordRecoveryMode || location.pathname === '/reset-password') {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <div className="min-h-screen constellation-bg">
          <Suspense fallback={<BootFallback message={t('authBootstrap.loading', { defaultValue: 'Loading…' })} />}>
            <ResetPasswordPage />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  // Signed out on a member page (a "Start a reading" tap, a bookmark, an
  // invite link): sign in, then come back to it. After a sign-out the URL
  // still names the last member's page; that visitor goes to `/` instead.
  if (!user && isMemberRoute && !isPublicPath(path)) {
    return <Navigate to={wasSignedIn.current ? '/' : signInPathFor(`${path}${location.search}${location.hash}`)} replace />;
  }

  // Public content pages (SEO) — render before auth guard. A web path that is
  // neither public, a member page, `/` nor an auth screen is unknown, and gets
  // the public shell's 404 rather than the marketing landing at a wrong URL.
  const signedOutUnknown = web && path !== '/' && !isAuthPath(path) && !isMemberRoute;
  if (!user && (isPublicPath(path) || signedOutUnknown)) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <div className="min-h-screen constellation-bg">
          {/* Brand and Sign in share the first line; at phone width the
              section links take a line of their own beneath, so four items
              never push the page wider than the screen. */}
          <nav className="flex flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6 py-3 sm:py-4 max-w-5xl mx-auto">
            <a href="/" className="no-underline flex items-center gap-2 min-h-[44px]" aria-label={t('publicNav.home', { defaultValue: 'Arcana home' })}>
              <BrandMark size={22} className="text-gold" />
              <BrandWordmark size={20} sparkle={false} />
            </a>
            <div className="order-3 sm:order-2 w-full sm:w-auto sm:ml-auto flex items-center gap-5 sm:gap-4">
              <a href="/tarot-meanings" className="inline-flex items-center min-h-[44px] text-ui text-mystic-400 hover:text-mystic-200 no-underline transition-colors">{t('common:nav.cardMeanings', { defaultValue: 'Card meanings' })}</a>
              {cartomancyEnabled && (
                <a href="/cartomancy" className="inline-flex items-center min-h-[44px] text-ui text-mystic-400 hover:text-mystic-200 no-underline transition-colors">{t('common:nav.cartomancy', { defaultValue: 'Playing cards' })}</a>
              )}
              <a href="/blog" className="inline-flex items-center min-h-[44px] text-ui text-mystic-400 hover:text-mystic-200 no-underline transition-colors">{t('common:nav.blog', { defaultValue: 'Blog' })}</a>
            </div>
            <button onClick={() => navigate('/signin')} className="order-2 sm:order-3 px-5 py-2 min-h-[44px] text-ui font-medium text-mystic-200 hover:text-white border border-mystic-700/50 hover:border-mystic-500 rounded-control transition-all">
              {t('publicNav.signIn', { defaultValue: 'Sign in' })}
            </button>
          </nav>
          <main className="max-w-3xl lg:max-w-5xl mx-auto px-4 pb-16">
            <Suspense fallback={<ListSkeleton count={3} />}>
              <Routes>
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/tarot-meanings" element={<TarotMeaningsPage />} />
                <Route path="/tarot-meanings/:slug" element={<TarotCardMeaningPage />} />
                <Route path="/spreads" element={<SpreadsPage />} />
                <Route path="/spreads/:slug" element={<SpreadDetailPage />} />
                <Route path="/astrology" element={<AstrologyLearnPage />} />
                <Route path="/astrology/:slug" element={<AstrologyEntryPage />} />
                <Route path="/numerology" element={<NumerologyLearnPage />} />
                <Route path="/numerology/:slug" element={<NumerologyEntryPage />} />
                <Route path="/glossary" element={<GlossaryPage />} />
                <Route path="/glossary/:slug" element={<GlossaryEntryPage />} />
                <Route path="/crystals" element={<CrystalsPage />} />
                <Route path="/crystals/:slug" element={<CrystalEntryPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                <Route path="/reading/:token" element={<SharedReadingPage />} />
                <Route path="/cartomancy" element={gated(cartomancyEnabled, <CartomancyPage />, <NotFoundPage />)} />
                <Route path="/cartomancy/cards" element={gated(cartomancyEnabled, <CartomancyCardsPage />, <NotFoundPage />)} />
                <Route path="/cartomancy/cards/:slug" element={gated(cartomancyEnabled, <CartomancyCardPage />, <NotFoundPage />)} />
                <Route path="/cartomancy/guide" element={gated(cartomancyEnabled, <CartomancyGuidePage />, <NotFoundPage />)} />
                <Route path="/cartomancy/guide/:lesson" element={gated(cartomancyEnabled, <CartomancyLessonPage />, <NotFoundPage />)} />
                {isDev && <Route path="/dev/redesign-showcase" element={<RedesignShowcasePage />} />}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          {/* Flanking sidebar ads — desktop ≥1400px only, non-intrusive */}
          <WebAdSidebar side="left" />
          <WebAdSidebar side="right" />
          <footer className="border-t border-mystic-800/50 py-8 text-center">
            <a href="/" className="inline-flex items-center gap-1 min-h-[44px] text-ui text-gold hover:underline">
              <ChevronLeft className="w-4 h-4" aria-hidden />
              {t('publicNav.backToArcana', { defaultValue: 'Back to Arcana' })}
            </a>
          </footer>
        </div>
      </ErrorBoundary>
    );
  }

  if (onboardingOpen && !user) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <Suspense fallback={<BootFallback message={t('authBootstrap.loading', { defaultValue: 'Loading…' })} />}>
          <OnboardingPage
            onComplete={handleOnboardingComplete}
            onSwitchToSignIn={handleSwitchToSignIn}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (!user) {
    // Native (Android): always show auth form directly
    // Web: /signin shows it; `/` shows the marketing landing
    if (authFormOpen) {
      return (
        <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
          <Suspense fallback={<BootFallback message={t('authBootstrap.loading', { defaultValue: 'Loading…' })} />}>
            <AuthPage onSwitchToOnboarding={handleSwitchToOnboarding} />
          </Suspense>
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <Suspense fallback={<div className="min-h-screen bg-mystic-950" aria-busy="true" />}>
          <LandingPage
            onSignIn={() => navigate('/signin')}
            onGetStarted={() => navigate('/signup')}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (profile && !profile.onboardingComplete) {
    return (
      <ErrorBoundary onOpenDiagnostics={openDiagnostics}>
        <Suspense fallback={<BootFallback message={t('authBootstrap.loading', { defaultValue: 'Loading…' })} />}>
          <OAuthOnboardingPage onComplete={refreshProfile} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Profile still loading after auth — show loading state, not onboarding
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center constellation-bg">
        <div className="text-center">
          <div className="loading-constellation mx-auto mb-4" />
          <p className="text-mystic-400">{t('authBootstrap.loadingProfile', { defaultValue: 'Loading your profile…' })}</p>
        </div>
      </div>
    );
  }


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
              className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-ambient"
              style={{ backgroundImage: `url(${backgroundSrc(profile.background_url)})` }}
            />
            {/* One flat scrim: the painting is texture under the text, not a
                picture to look at. */}
            <div className="absolute inset-0 bg-mystic-950/85" />
          </div>
        ) : (
          <div className="fixed inset-0 z-0 opacity-60" />
        )}
        {/* Content column. Phone width up to `lg`, then a real desktop
            measure — tarotlife.app was rendering a 512px strip in the middle
            of a 1920px screen, which reads as a phone emulator rather than a
            web product. Native is unaffected: a Capacitor webview never
            clears 1024px on a phone, so the `lg:` rules simply never fire. */}
        <main className="relative z-10 max-w-lg lg:max-w-4xl mx-auto px-4 lg:px-8 pt-4 safe-top" aria-label={t('common.mainContent', { defaultValue: 'Main content' })}>
          <Header
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
                  {memberRoutes.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
                  {/* Signed-out screens. Standing on one signed in means the
                      sign-in, the sign-up or the OAuth return just finished. */}
                  <Route path="/signin" element={<PostAuthRedirect />} />
                  <Route path="/signup" element={<PostAuthRedirect />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
          </ErrorBoundary>
        </main>
        {/* The phone tab bar is hidden on desktop web — a full-bleed bar with
            five icons huddled in the middle is the loudest emulator tell left
            on the page. It stays at every width on native, because an Android
            tablet in landscape clears `lg` and would otherwise be left with no
            navigation at all.
            BottomNav is NOT hidden on desktop, deliberately. It is the app's
            only tab navigation — every route is driven by `activeTab`, and
            nothing else sets it — so hiding it at lg removed all navigation
            from the web product. The wider container ships now; the bar can
            move to the side or the top the day a desktop nav actually
            exists. */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} />

        <UpdateAvailableBanner />
        <GlobalAchievementCelebration />

        <SearchSheet
          open={activeOverlay === 'search'}
          onClose={closeOverlay}
        />
        <SavedSheet
          open={activeOverlay === 'saved'}
          onClose={closeOverlay}
        />
        {settingsMounted && (
          <OverlayBoundary message={t('shell.overlayFailed', { defaultValue: 'This panel could not open. Reload the app and try again.' })}>
            <Suspense fallback={null}>
              <SettingsSheet
                open={activeOverlay === 'settings'}
                onClose={closeOverlay}
              />
            </Suspense>
          </OverlayBoundary>
        )}
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
        <OverlayBoundary message={t('shell.overlayFailed', { defaultValue: 'This panel could not open. Reload the app and try again.' })}>
          <Suspense fallback={null}>
            <TrialReminderModal />
          </Suspense>
        </OverlayBoundary>
      </div>
    </ErrorBoundary>
  );
}

function GlobalDiagnosticsSheet() {
  const { t } = useT('app');
  const { isOpen, closeDiagnostics } = useDiagnostics();
  // Fetched on the first open and kept mounted after, like the settings sheet.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);
  if (!mounted) return null;
  // Mounted beside AppContent, under no boundary of its own: a chunk that
  // failed here used to unmount the whole root.
  return (
    <OverlayBoundary message={t('shell.overlayFailed', { defaultValue: 'This panel could not open. Reload the app and try again.' })}>
      <Suspense fallback={null}>
        <DiagnosticsSheet open={isOpen} onClose={closeDiagnostics} />
      </Suspense>
    </OverlayBoundary>
  );
}

function AppWithProviders() {
  return (
    // framer-motion's own default is `reducedMotion: "never"` — it ignores the
    // OS setting unless told otherwise. Without this wrapper every ungated
    // `motion.*` transform in the app played at full amplitude for a user who
    // had asked motion to stop, and the global CSS block in index.css cannot
    // reach any of it: framer writes transforms to inline style from its own
    // rAF driver, so there is no CSS animation or transition to collapse.
    //
    // "user" makes framer follow prefers-reduced-motion and snap positional
    // keys (x, y, scale, rotate, width, height...) to their end state, while
    // still allowing opacity and colour to cross-fade — which is the intent of
    // the setting, not "no feedback at all".
    <MotionConfig reducedMotion="user">
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
    </MotionConfig>
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
