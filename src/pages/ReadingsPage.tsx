import { lazy, Suspense, useState } from 'react';
import { Sun, Sparkles, Heart, BookOpen, Coins, Layers, Mountain, Cloud, Users, Home, Smile, Hash, Dice6, Lock } from 'lucide-react';
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

type ReadingTab = 'tarot' | 'horoscope' | 'compatibility' | 'iching' | 'human-design' | 'bazi' | 'dream' | 'mood' | 'partner' | 'fengshui' | 'runes' | 'dice' | 'library';

export function ReadingsPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const isPremium = !!profile?.isPremium;
  const [activeTab, setActiveTab] = useState<ReadingTab>('tarot');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

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

  const handleShowPaywall = (feature: string) => {
    setPaywallFeature(feature);
    setShowPaywall(true);
  };

  // Premium-gated tabs stay visible to non-premium users so they can see
  // what's available to unlock. Tapping a locked tab surfaces the paywall
  // instead of silently ignoring. `premium: true` marks premium-only
  // features (real AI, real ephemeris, real synastry); free features
  // stay accessible for everyone the flag is enabled for.
  const tabs: {
    id: ReadingTab;
    labelKey: string;
    icon: typeof Sparkles;
    premium?: boolean;
  }[] = [
    { id: 'tarot', labelKey: 'readings.tabs.tarot', icon: Sparkles },
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
    { id: 'library', labelKey: 'readings.tabs.library', icon: BookOpen },
  ];

  const handleTabClick = (tab: (typeof tabs)[number]) => {
    if (tab.premium && !isPremium) {
      handleShowPaywall(t(tab.labelKey) as string);
      return;
    }
    setActiveTab(tab.id);
  };

  return (
    <div className="space-y-6 pb-32">
      <h1 className="font-display text-2xl text-mystic-100">{t('readings.title')}</h1>

      <div className="relative -mx-4">
        <div
          className="flex gap-2 overflow-x-auto pb-2 px-4 snap-x snap-mandatory scroll-smooth"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isLocked = tab.premium && !isPremium;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all active:scale-95 flex-shrink-0 snap-start relative ${
                  isActive
                    ? 'bg-gold/20 text-gold border border-gold/30 shadow-lg shadow-gold/20'
                    : isLocked
                      ? 'bg-mystic-800/30 text-mystic-400 border border-gold/15 hover:border-gold/30'
                      : 'bg-mystic-800/50 text-mystic-300 border border-transparent hover:bg-mystic-800'
                }`}
              >
                {isLocked ? <Lock className="w-4 h-4 text-gold/70" /> : <Icon className="w-4 h-4" />}
                {t(tab.labelKey)}
              </button>
            );
          })}
          <div className="w-4 flex-shrink-0" aria-hidden="true" />
        </div>
        <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-mystic-950 via-mystic-950/80 to-transparent pointer-events-none" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2 pointer-events-none">
          <div className="w-1 h-8 bg-gradient-to-b from-transparent via-gold/40 to-transparent rounded-full animate-pulse" />
        </div>
      </div>

      {activeTab === 'tarot' && (
        <TarotSection onShowPaywall={handleShowPaywall} />
      )}

      {activeTab === 'horoscope' && (
        <HoroscopeSection onShowPaywall={handleShowPaywall} />
      )}

      {activeTab === 'compatibility' && (
        <CompatibilitySection onShowPaywall={handleShowPaywall} />
      )}

      {activeTab === 'iching' && ichingEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <IChingSection />
        </Suspense>
      )}

      {activeTab === 'human-design' && humanDesignEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <HumanDesignSection />
        </Suspense>
      )}

      {activeTab === 'bazi' && baziEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <BaziSection />
        </Suspense>
      )}

      {activeTab === 'dream' && dreamEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <DreamInterpreterSection />
        </Suspense>
      )}

      {activeTab === 'mood' && moodDiaryEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <MoodDiarySection />
        </Suspense>
      )}

      {activeTab === 'partner' && partnerCompatEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <PartnerCompatSection />
        </Suspense>
      )}

      {activeTab === 'fengshui' && fengShuiEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <FengShuiSection />
        </Suspense>
      )}

      {activeTab === 'runes' && runesEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
          <RunesSection />
        </Suspense>
      )}

      {activeTab === 'dice' && diceEnabled && (
        <Suspense fallback={<div className="py-12 text-center text-mystic-500">Loading…</div>}>
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
    </div>
  );
}
