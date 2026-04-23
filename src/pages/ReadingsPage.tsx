import { lazy, Suspense, useState } from 'react';
import { Sun, Sparkles, Heart, BookOpen, Coins, Layers, Mountain, Cloud, Users, Home, Smile } from 'lucide-react';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import {
  TarotSection,
  HoroscopeSection,
  CompatibilitySection,
  LibrarySection,
} from '../components/readings';
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

type ReadingTab = 'tarot' | 'horoscope' | 'compatibility' | 'iching' | 'human-design' | 'bazi' | 'dream' | 'mood' | 'partner' | 'fengshui' | 'library';

export function ReadingsPage() {
  const { t } = useT('app');
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

  const handleShowPaywall = (feature: string) => {
    setPaywallFeature(feature);
    setShowPaywall(true);
  };

  const tabs = [
    { id: 'tarot' as const, labelKey: 'readings.tabs.tarot', icon: Sparkles },
    { id: 'horoscope' as const, labelKey: 'readings.tabs.horoscope', icon: Sun },
    { id: 'compatibility' as const, labelKey: 'readings.tabs.compatibility', icon: Heart },
    ...(ichingEnabled ? [{ id: 'iching' as const, labelKey: 'readings.tabs.iching', icon: Coins }] : []),
    ...(humanDesignEnabled ? [{ id: 'human-design' as const, labelKey: 'readings.tabs.humanDesign', icon: Layers }] : []),
    ...(baziEnabled ? [{ id: 'bazi' as const, labelKey: 'readings.tabs.bazi', icon: Mountain }] : []),
    ...(dreamEnabled ? [{ id: 'dream' as const, labelKey: 'readings.tabs.dream', icon: Cloud }] : []),
    ...(moodDiaryEnabled ? [{ id: 'mood' as const, labelKey: 'readings.tabs.mood', icon: Smile }] : []),
    ...(partnerCompatEnabled ? [{ id: 'partner' as const, labelKey: 'readings.tabs.partner', icon: Users }] : []),
    ...(fengShuiEnabled ? [{ id: 'fengshui' as const, labelKey: 'readings.tabs.fengshui', icon: Home }] : []),
    { id: 'library' as const, labelKey: 'readings.tabs.library', icon: BookOpen },
  ];

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
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all active:scale-95 flex-shrink-0 snap-start ${
                  activeTab === tab.id
                    ? 'bg-gold/20 text-gold border border-gold/30 shadow-lg shadow-gold/20'
                    : 'bg-mystic-800/50 text-mystic-300 border border-transparent hover:bg-mystic-800'
                }`}
              >
                <Icon className="w-4 h-4" />
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
