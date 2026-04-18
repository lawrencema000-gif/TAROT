import { useState, useEffect } from 'react';
import { Lock, Sun, Moon, Star, Sparkles, Crown, Circle, TrendingUp, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { PaywallSheet } from '../components/premium';
import { useNatalChart } from '../hooks/useAstrology';
import { HoroscopeOnboarding, TodayForYou, BirthChart, Forecast, Explore } from '../components/horoscope';
import { preloadInterpModules } from '../data/preloadInterpModules';
import { useT } from '../i18n/useT';
import type { HoroscopeSubTab } from '../types/astrology';

const TABS: { id: HoroscopeSubTab; labelKey: string; icon: typeof Sun; premiumOnly?: boolean }[] = [
  { id: 'today', labelKey: 'horoscope.tabs.today', icon: Sun },
  { id: 'chart', labelKey: 'horoscope.tabs.chart', icon: Circle },
  { id: 'forecast', labelKey: 'horoscope.tabs.forecast', icon: TrendingUp },
  { id: 'explore', labelKey: 'horoscope.tabs.explore', icon: Compass, premiumOnly: true },
];

export function HoroscopePage() {
  const { profile, refreshProfile } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const isPremium = profile?.isPremium || false;

  if (!isPremium) {
    return <NonPremiumView onShowPaywall={() => setShowPaywall(true)} showPaywall={showPaywall} onClosePaywall={() => setShowPaywall(false)} />;
  }

  return <PremiumHoroscopeHub refreshProfile={refreshProfile} />;
}

function NonPremiumView({ onShowPaywall, showPaywall, onClosePaywall }: { onShowPaywall: () => void; showPaywall: boolean; onClosePaywall: () => void }) {
  const { t } = useT('app');
  return (
    <>
      <div className="space-y-6">
        <div className="text-center space-y-4 pt-4">
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-amber-500/10 to-gold/5 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sun className="w-14 h-14 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.5)]" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-white">{t('horoscope.yourPersonalHoroscope')}</h1>
          <p className="text-mystic-300 max-w-md mx-auto text-sm">
            {t('horoscope.unlockIntro')}
          </p>
        </div>

        <Card className="bg-gradient-to-br from-gold/5 to-amber-500/5 border-gold/20 overflow-hidden relative">
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-gold/20 rounded-full">
              <Crown className="w-3 h-3 text-gold" />
              <span className="text-xs font-medium text-gold">{t('horoscope.premiumLocked')}</span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-3">{t('horoscope.whatUnlocks')}</h3>
            <div className="space-y-3">
              <FeatureItem icon={Sun} title={t('horoscope.features.dailyForecast.title')} description={t('horoscope.features.dailyForecast.desc')} />
              <FeatureItem icon={Star} title={t('horoscope.features.fullChart.title')} description={t('horoscope.features.fullChart.desc')} />
              <FeatureItem icon={Moon} title={t('horoscope.features.transits.title')} description={t('horoscope.features.transits.desc')} />
              <FeatureItem icon={Sparkles} title={t('horoscope.features.forecasts.title')} description={t('horoscope.features.forecasts.desc')} />
            </div>
          </div>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/0 via-gold/10 to-gold/0 blur-xl" />
          <Button
            onClick={onShowPaywall}
            className="w-full relative bg-gradient-to-r from-gold to-amber-600 hover:from-gold/90 hover:to-amber-600/90 text-mystic-900 font-semibold py-4 text-lg shadow-lg shadow-gold/25"
          >
            <Crown className="w-5 h-5 mr-2" />
            {t('horoscope.unlockPremium')}
          </Button>
        </div>

        <p className="text-center text-xs text-mystic-500">
          {t('horoscope.joinThousands')}
        </p>
      </div>

      <PaywallSheet open={showPaywall} onClose={onClosePaywall} feature="Horoscope Hub" />
    </>
  );
}

function PremiumHoroscopeHub({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { t } = useT('app');
  const { chart, loading: chartLoading, computeChart, fetchChart } = useNatalChart();
  const [activeTab, setActiveTab] = useState<HoroscopeSubTab>('today');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const { profile } = useAuth();

  // Start loading interpretation data modules immediately
  useEffect(() => { preloadInterpModules(); }, []);

  useEffect(() => {
    if (!chartLoading && !chart) {
      setNeedsOnboarding(true);
    }
  }, [chart, chartLoading]);

  const handleOnboardingComplete = async () => {
    setNeedsOnboarding(false);
    await fetchChart();
    refreshProfile();
  };

  // Only block for onboarding (no chart at all) — not for loading
  if (needsOnboarding && !chartLoading) {
    return <HoroscopeOnboarding onComplete={handleOnboardingComplete} computeChart={computeChart} />;
  }

  const handleTabChange = (tab: HoroscopeSubTab) => {
    const tabDef = TABS.find((t) => t.id === tab);
    if (tabDef?.premiumOnly && !profile?.isPremium) return;
    setActiveTab(tab);
  };

  return (
    <div>
      <nav className="flex gap-1 mb-2" role="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLocked = tab.premiumOnly && !profile?.isPremium;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3
                rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer
                ${isActive
                  ? 'bg-gold/15 text-gold border border-gold/25'
                  : 'text-mystic-400 hover:text-mystic-200 border border-transparent'
                }
              `}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {t(tab.labelKey)}
            </button>
          );
        })}
      </nav>

      {activeTab === 'today' && <TodayForYou />}
      {activeTab === 'chart' && <BirthChart />}
      {activeTab === 'forecast' && <Forecast />}
      {activeTab === 'explore' && <Explore />}
    </div>
  );
}

function FeatureItem({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-white text-sm mb-0.5">{title}</h4>
        <p className="text-xs text-mystic-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
