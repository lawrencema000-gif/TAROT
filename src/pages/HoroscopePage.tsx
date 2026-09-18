import { useState, useEffect } from 'react';
import { Sun, Circle, TrendingUp, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNatalChart } from '../hooks/useAstrology';
import { HoroscopeOnboarding, TodayForYou, BirthChart, Forecast, Explore } from '../components/horoscope';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { preloadInterpModules } from '../data/preloadInterpModules';
import { useT } from '../i18n/useT';
import type { HoroscopeSubTab } from '../types/astrology';
import { PageHeader, Tabs } from '../components/ui';

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
  return <PremiumHoroscopeHub refreshProfile={async () => { await refreshProfile(); }} />;
}

function PremiumHoroscopeHub({ refreshProfile }: { refreshProfile: () => Promise<void> }) {
  const { t } = useT('app');
  const { chart, loading: chartLoading, computeChart, fetchChart } = useNatalChart();
  const [activeTab, setActiveTab] = useState<HoroscopeSubTab>('today');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');
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
    const tabDef = TABS.find((x) => x.id === tab);
    if (tabDef?.premiumOnly && !profile?.isPremium) {
      // Instead of silently ignoring the tap (old behaviour), surface the
      // paywall so non-premium users see what they'd unlock. The label
      // describes which feature the tab maps to — e.g. "Birth Chart",
      // "12-month Forecast", "Chart Explorer".
      setPaywallFeature(t(tabDef.labelKey) as string);
      setShowPaywall(true);
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div>
      <PageHeader title={t('pageTitles.horoscope.title')} className="mb-4" />
      <Tabs<HoroscopeSubTab>
        items={TABS.map((tab) => ({
          id: tab.id,
          label: t(tab.labelKey),
          icon: tab.icon,
          locked: !!tab.premiumOnly && !profile?.isPremium,
        }))}
        value={activeTab}
        onChange={handleTabChange}
        aria-label={t('pageTitles.horoscope.title') as string}
        size="sm"
        idPrefix="horoscope"
        className="mb-2"
      />

      {activeTab === 'today' && <TodayForYou />}
      {activeTab === 'chart' && <BirthChart />}
      {activeTab === 'forecast' && <Forecast />}
      {activeTab === 'explore' && <Explore />}

      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
      />
    </div>
  );
}
