import { useState, useEffect } from 'react';
import { Lock, Sun, Circle, TrendingUp, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNatalChart } from '../hooks/useAstrology';
import { HoroscopeOnboarding, TodayForYou, BirthChart, Forecast, Explore } from '../components/horoscope';
import { preloadInterpModules } from '../data/preloadInterpModules';
import { useT } from '../i18n/useT';
import type { HoroscopeSubTab } from '../types/astrology';

// 2026-04-24 — landing page markets "free daily horoscope", but the page
// used to gate the entire hub behind premium. Now the `today` tab is free
// for everyone (shows their sun-sign daily forecast) and `chart`,
// `forecast`, `explore` stay premium-only. The existing `handleTabChange`
// already respects `premiumOnly` per tab.
const TABS: { id: HoroscopeSubTab; labelKey: string; icon: typeof Sun; premiumOnly?: boolean }[] = [
  { id: 'today', labelKey: 'horoscope.tabs.today', icon: Sun },
  { id: 'chart', labelKey: 'horoscope.tabs.chart', icon: Circle, premiumOnly: true },
  { id: 'forecast', labelKey: 'horoscope.tabs.forecast', icon: TrendingUp, premiumOnly: true },
  { id: 'explore', labelKey: 'horoscope.tabs.explore', icon: Compass, premiumOnly: true },
];

export function HoroscopePage() {
  const { refreshProfile } = useAuth();
  return <PremiumHoroscopeHub refreshProfile={refreshProfile} />;
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
