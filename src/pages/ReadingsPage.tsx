import { lazy, Suspense, useState } from 'react';
import { Sun, Sparkles, Heart, BookOpen, Coins } from 'lucide-react';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import {
  TarotSection,
  HoroscopeSection,
  CompatibilitySection,
  LibrarySection,
} from '../components/readings';
import { useT } from '../i18n/useT';
import { useFeatureFlag } from '../context/FeatureFlagContext';

// Lazy-load the I-Ching page — keeps the ~40 KB hexagram data out of the
// main ReadingsPage bundle and only downloads it when the user opens the
// tab. Safe fallback ensures users without the flag see nothing new.
const IChingSection = lazy(() => import('./IChingPage').then(m => ({ default: m.IChingPage })));

type ReadingTab = 'tarot' | 'horoscope' | 'compatibility' | 'iching' | 'library';

export function ReadingsPage() {
  const { t } = useT('app');
  const [activeTab, setActiveTab] = useState<ReadingTab>('tarot');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

  // Feature-flag gated — defaults off in production. Flip the flag per-user
  // or globally in Supabase `feature_flags` table to roll out.
  const ichingEnabled = useFeatureFlag('iching');

  const handleShowPaywall = (feature: string) => {
    setPaywallFeature(feature);
    setShowPaywall(true);
  };

  const tabs = [
    { id: 'tarot' as const, labelKey: 'readings.tabs.tarot', icon: Sparkles },
    { id: 'horoscope' as const, labelKey: 'readings.tabs.horoscope', icon: Sun },
    { id: 'compatibility' as const, labelKey: 'readings.tabs.compatibility', icon: Heart },
    ...(ichingEnabled ? [{ id: 'iching' as const, labelKey: 'readings.tabs.iching', icon: Coins }] : []),
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
