import { lazy, Suspense, useState, useEffect, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { CustomSpreadInput } from '../components/readings/TarotSection';
import { Sun, Heart, BookOpen, Coins, Layers, Mountain, Cloud, Users, Home, Smile, Hash, Dice6, Globe2 } from 'lucide-react';
import { TarotCardIcon } from '../components/ui/NavIcons';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import {
  TarotSection,
  HoroscopeSection,
  CompatibilitySection,
  LibrarySection,
} from '../components/readings';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { PageHeader, CardSkeleton, Tabs, Page } from '../components/ui';

// Lazy-load the eastern-systems pages — keeps ~40-60 KB of static data out
// of the main ReadingsPage bundle. Chunks only download when a user with
// the matching feature flag actually opens the tab.
const IChingSection = lazy(() => import('./IChingPage').then(m => ({ default: m.IChingPage })));
const HumanDesignSection = lazy(() => import('./HumanDesignPage').then(m => ({ default: m.HumanDesignPage })));
const BaziSection = lazy(() => import('./BaziPage').then(m => ({ default: m.BaziPage })));
const DreamInterpreterSection = lazy(() => import('./DreamInterpreterPage').then(m => ({ default: m.DreamInterpreterPage })));
const MoodDiarySection = lazy(() => import('./MoodDiaryPage').then(m => ({ default: m.MoodDiaryPage })));
const PartnerCompatSection = lazy(() => import('./PartnerCompatPage').then(m => ({ default: m.PartnerCompatPage })));
const FengShuiSection = lazy(() => import('./FengShuiPage').then(m => ({ default: m.FengShuiPage })));
const RunesSection = lazy(() => import('./RunesPage').then(m => ({ default: m.RunesPage })));
const DiceSection = lazy(() => import('./DicePage').then(m => ({ default: m.DicePage })));

type ReadingTab = 'tarot' | 'horoscope' | 'compatibility' | 'iching' | 'human-design' | 'bazi' | 'dream' | 'mood' | 'partner' | 'fengshui' | 'runes' | 'dice' | 'celestial' | 'library';

/** Lucide icons and the app's own SVG glyphs both satisfy this. */
type TabIcon = ComponentType<{ className?: string }>;

interface TabDef {
  id: ReadingTab;
  labelKey: string;
  icon: TabIcon;
  premium?: boolean;
}

export function ReadingsPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPremium = !!profile?.isPremium;
  const [activeTab, setActiveTab] = useState<ReadingTab>('tarot');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

  // A custom spread handed off from the builder via router state. Captured
  // once at mount (lazy initializer) and then the history state is cleared
  // so a tab switch or refresh doesn't re-launch the same custom reading.
  const [customSpread] = useState<CustomSpreadInput | undefined>(
    () => (location.state as { customSpread?: CustomSpreadInput } | null)?.customSpread,
  );
  useEffect(() => {
    if ((location.state as { customSpread?: CustomSpreadInput } | null)?.customSpread) {
      navigate('.', { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feature-flag gated — each defaults off in production. Flip per-user or
  // globally in Supabase `feature_flags` table to roll out.
  const ichingEnabled = useFeatureFlag('iching');
  const humanDesignEnabled = useFeatureFlag('human-design');
  const baziEnabled = useFeatureFlag('bazi');
  const dreamEnabled = useFeatureFlag('dream-interpreter');
  const moodDiaryEnabled = useFeatureFlag('mood-diary');
  const partnerCompatEnabled = useFeatureFlag('partner-compat');
  const fengShuiEnabled = useFeatureFlag('feng-shui');
  const runesEnabled = useFeatureFlag('runes');
  const diceEnabled = useFeatureFlag('dice');
  const celestialEnabled = useFeatureFlag('celestial-map');

  const handleShowPaywall = (feature: string) => {
    setPaywallFeature(feature);
    setShowPaywall(true);
  };

  // Premium-gated tabs stay visible to non-premium users so they can see
  // what's available to unlock. Tapping a locked tab surfaces the paywall
  // instead of silently ignoring. `premium: true` marks premium-only
  // features (real AI, real ephemeris, real synastry); free features
  // stay accessible for everyone the flag is enabled for.
  const tabs: TabDef[] = [
    { id: 'tarot', labelKey: 'readings.tabs.tarot', icon: TarotCardIcon },
    { id: 'horoscope', labelKey: 'readings.tabs.horoscope', icon: Sun },
    { id: 'compatibility', labelKey: 'readings.tabs.compatibility', icon: Heart },
    ...(ichingEnabled ? [{ id: 'iching' as const, labelKey: 'readings.tabs.iching', icon: Coins }] : []),
    ...(humanDesignEnabled ? [{ id: 'human-design' as const, labelKey: 'readings.tabs.humanDesign', icon: Layers, premium: true }] : []),
    ...(baziEnabled ? [{ id: 'bazi' as const, labelKey: 'readings.tabs.bazi', icon: Mountain, premium: true }] : []),
    ...(dreamEnabled ? [{ id: 'dream' as const, labelKey: 'readings.tabs.dream', icon: Cloud, premium: true }] : []),
    ...(moodDiaryEnabled ? [{ id: 'mood' as const, labelKey: 'readings.tabs.mood', icon: Smile }] : []),
    ...(partnerCompatEnabled ? [{ id: 'partner' as const, labelKey: 'readings.tabs.partner', icon: Users, premium: true }] : []),
    ...(fengShuiEnabled ? [{ id: 'fengshui' as const, labelKey: 'readings.tabs.fengshui', icon: Home }] : []),
    ...(runesEnabled ? [{ id: 'runes' as const, labelKey: 'readings.tabs.runes', icon: Hash }] : []),
    ...(diceEnabled ? [{ id: 'dice' as const, labelKey: 'readings.tabs.dice', icon: Dice6 }] : []),
    ...(celestialEnabled ? [{ id: 'celestial' as const, labelKey: 'readings.tabs.celestial', icon: Globe2 }] : []),
    { id: 'library', labelKey: 'readings.tabs.library', icon: BookOpen },
  ];

  const handleTabClick = (tab: (typeof tabs)[number]) => {
    if (tab.premium && !isPremium) {
      handleShowPaywall(t(tab.labelKey) as string);
      return;
    }
    if (tab.id === 'celestial') {
      // Celestial Map is a standalone surface with its own header, map
      // canvas, and paywall — navigate rather than render inline.
      navigate('/celestial-map');
      return;
    }
    setActiveTab(tab.id);
  };

  return (
    <Page spacing="md">
      <PageHeader title={t('readings.title')} divider />

      <Tabs<ReadingTab>
        items={tabs.map(tab => ({
          id: tab.id,
          label: t(tab.labelKey),
          icon: tab.icon,
          locked: !!tab.premium && !isPremium,
        }))}
        value={activeTab}
        onChange={(id) => {
          const tab = tabs.find(x => x.id === id);
          if (tab) handleTabClick(tab);
        }}
        aria-label={t('readings.title') as string}
        fill={false}
        idPrefix="readings"
      />

      {activeTab === 'tarot' && (
        <TarotSection onShowPaywall={handleShowPaywall} customSpread={customSpread} />
      )}

      {activeTab === 'horoscope' && (
        <HoroscopeSection onShowPaywall={handleShowPaywall} />
      )}

      {activeTab === 'compatibility' && (
        <CompatibilitySection onShowPaywall={handleShowPaywall} />
      )}

      {activeTab === 'iching' && ichingEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <IChingSection />
        </Suspense>
      )}

      {activeTab === 'human-design' && humanDesignEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <HumanDesignSection />
        </Suspense>
      )}

      {activeTab === 'bazi' && baziEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <BaziSection />
        </Suspense>
      )}

      {activeTab === 'dream' && dreamEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <DreamInterpreterSection />
        </Suspense>
      )}

      {activeTab === 'mood' && moodDiaryEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <MoodDiarySection />
        </Suspense>
      )}

      {activeTab === 'partner' && partnerCompatEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <PartnerCompatSection />
        </Suspense>
      )}

      {activeTab === 'fengshui' && fengShuiEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <FengShuiSection />
        </Suspense>
      )}

      {activeTab === 'runes' && runesEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <RunesSection />
        </Suspense>
      )}

      {activeTab === 'dice' && diceEnabled && (
        <Suspense fallback={<CardSkeleton />}>
          <DiceSection />
        </Suspense>
      )}

      {activeTab === 'library' && (
        <LibrarySection />
      )}

      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
      />
    </Page>
  );
}
