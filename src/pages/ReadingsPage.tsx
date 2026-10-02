import { lazy, Suspense, useState, useEffect, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { CustomSpreadInput } from '../components/readings/TarotSection';
import { Sun, Heart, BookOpen, Coins, Layers, Mountain, Cloud, Users, Home, Smile, Hash, Dice6, Globe2, Lock, ChevronLeft } from 'lucide-react';
import { TarotCardIcon, PlayingCardIcon } from '../components/ui/NavIcons';
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
import { PageHeader, CardSkeleton, Tabs, Page, ListRow, Badge } from '../components/ui';

// Lazy-load the eastern-systems pages — keeps ~40-60 KB of static data out
// of the main ReadingsPage bundle. Chunks only download when a user with
// the matching feature flag actually opens the system.
const IChingSection = lazy(() => import('./IChingPage').then(m => ({ default: m.IChingPage })));
const HumanDesignSection = lazy(() => import('./HumanDesignPage').then(m => ({ default: m.HumanDesignPage })));
const BaziSection = lazy(() => import('./BaziPage').then(m => ({ default: m.BaziPage })));
const DreamInterpreterSection = lazy(() => import('./DreamInterpreterPage').then(m => ({ default: m.DreamInterpreterPage })));
const MoodDiarySection = lazy(() => import('./MoodDiaryPage').then(m => ({ default: m.MoodDiaryPage })));
const PartnerCompatSection = lazy(() => import('./PartnerCompatPage').then(m => ({ default: m.PartnerCompatPage })));
const FengShuiSection = lazy(() => import('./FengShuiPage').then(m => ({ default: m.FengShuiPage })));
const RunesSection = lazy(() => import('./RunesPage').then(m => ({ default: m.RunesPage })));
const DiceSection = lazy(() => import('./DicePage').then(m => ({ default: m.DicePage })));

/**
 * The strip: the three readings everyone has, the playing deck when its
 * flag is on, one tab for the flag-gated systems (which used to be nine
 * tabs in a row that scrolled off the screen), and the library.
 */
type ReadingTab = 'tarot' | 'horoscope' | 'compatibility' | 'cartomancy' | 'systems' | 'library';

/** The systems behind the "More systems" tab. */
type SystemId = 'iching' | 'human-design' | 'bazi' | 'dream' | 'mood' | 'partner' | 'fengshui' | 'runes' | 'dice' | 'celestial';

const SYSTEM_IDS: ReadonlySet<string> = new Set<SystemId>(['iching', 'human-design', 'bazi', 'dream', 'mood', 'partner', 'fengshui', 'runes', 'dice', 'celestial']);

/**
 * Tabs and systems another screen may open directly via
 * `navigate('/readings', { state: { tab } })` — Home's ritual card asks for
 * the horoscope. Premium systems are not here: landing on one would skip the
 * paywall the grid shows.
 */
const LINKABLE: ReadonlySet<string> = new Set<ReadingTab | SystemId>([
  'tarot', 'horoscope', 'compatibility', 'library', 'cartomancy',
  'iching', 'mood', 'fengshui', 'runes', 'dice',
]);

function initialSelection(state: unknown): { tab: ReadingTab; system: SystemId | null } {
  const wanted = (state as { tab?: unknown } | null)?.tab;
  if (typeof wanted !== 'string' || !LINKABLE.has(wanted)) return { tab: 'tarot', system: null };
  if (SYSTEM_IDS.has(wanted)) return { tab: 'systems', system: wanted as SystemId };
  return { tab: wanted as ReadingTab, system: null };
}

/** Lucide icons and the app's own SVG glyphs both satisfy this. */
type TabIcon = ComponentType<{ className?: string }>;

interface TabDef {
  id: ReadingTab;
  labelKey: string;
  defaultLabel?: string;
  icon: TabIcon;
}

interface SystemDef {
  id: SystemId;
  labelKey: string;
  icon: TabIcon;
  premium?: boolean;
  enabled: boolean;
}

export function ReadingsPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPremium = !!profile?.isPremium;
  const [initial] = useState(() => initialSelection(location.state));
  const [activeTab, setActiveTab] = useState<ReadingTab>(initial.tab);
  const [activeSystem, setActiveSystem] = useState<SystemId | null>(initial.system);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');

  // A custom spread handed off from the builder via router state, or a tab
  // asked for by another screen. Both are captured once at mount (lazy
  // initializers) and then the history state is cleared so a tab switch or
  // refresh doesn't re-launch the same custom reading.
  const [customSpread] = useState<CustomSpreadInput | undefined>(
    () => (location.state as { customSpread?: CustomSpreadInput } | null)?.customSpread,
  );
  useEffect(() => {
    const state = location.state as { customSpread?: CustomSpreadInput; tab?: unknown } | null;
    if (state?.customSpread || state?.tab !== undefined) {
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
  const cartomancyEnabled = useFeatureFlag('cartomancy');

  const handleShowPaywall = (feature: string) => {
    setPaywallFeature(feature);
    setShowPaywall(true);
  };

  // `premium: true` marks premium-only systems (real AI, real ephemeris,
  // real synastry); they stay visible so a free reader can see what there
  // is to unlock, and tapping one surfaces the paywall.
  const allSystems: SystemDef[] = [
    { id: 'iching', labelKey: 'readings.tabs.iching', icon: Coins, enabled: ichingEnabled },
    { id: 'human-design', labelKey: 'readings.tabs.humanDesign', icon: Layers, premium: true, enabled: humanDesignEnabled },
    { id: 'bazi', labelKey: 'readings.tabs.bazi', icon: Mountain, premium: true, enabled: baziEnabled },
    { id: 'dream', labelKey: 'readings.tabs.dream', icon: Cloud, premium: true, enabled: dreamEnabled },
    { id: 'mood', labelKey: 'readings.tabs.mood', icon: Smile, enabled: moodDiaryEnabled },
    { id: 'partner', labelKey: 'readings.tabs.partner', icon: Users, premium: true, enabled: partnerCompatEnabled },
    { id: 'fengshui', labelKey: 'readings.tabs.fengshui', icon: Home, enabled: fengShuiEnabled },
    { id: 'runes', labelKey: 'readings.tabs.runes', icon: Hash, enabled: runesEnabled },
    { id: 'dice', labelKey: 'readings.tabs.dice', icon: Dice6, enabled: diceEnabled },
    { id: 'celestial', labelKey: 'readings.tabs.celestial', icon: Globe2, enabled: celestialEnabled },
  ];
  const systems = allSystems.filter((s) => s.enabled);

  const tabs: TabDef[] = [
    { id: 'tarot', labelKey: 'readings.tabs.tarot', icon: TarotCardIcon },
    { id: 'horoscope', labelKey: 'readings.tabs.horoscope', icon: Sun },
    { id: 'compatibility', labelKey: 'readings.tabs.compatibility', icon: Heart },
    ...(cartomancyEnabled ? [{ id: 'cartomancy' as const, labelKey: 'readings.tabs.cartomancy', defaultLabel: 'Playing cards', icon: PlayingCardIcon }] : []),
    ...(systems.length > 0 ? [{ id: 'systems' as const, labelKey: 'readings.tabs.systems', defaultLabel: 'More systems', icon: Layers }] : []),
    { id: 'library', labelKey: 'readings.tabs.library', icon: BookOpen },
  ];

  const tabLabel = (tab: TabDef) => (tab.defaultLabel ? t(tab.labelKey, { defaultValue: tab.defaultLabel }) : t(tab.labelKey));

  const handleTabClick = (tab: TabDef) => {
    if (tab.id === 'cartomancy') {
      // The playing-card section has its own header, hub and library.
      navigate('/cartomancy');
      return;
    }
    setActiveTab(tab.id);
  };

  const openSystem = (system: SystemDef) => {
    if (system.premium && !isPremium) {
      handleShowPaywall(t(system.labelKey) as string);
      return;
    }
    if (system.id === 'celestial') {
      // Celestial Map is a standalone surface with its own header, map
      // canvas, and paywall — navigate rather than render inline.
      navigate('/celestial-map');
      return;
    }
    setActiveSystem(system.id);
  };

  const systemView = (() => {
    switch (activeSystem) {
      case 'iching': return ichingEnabled ? <IChingSection /> : null;
      case 'human-design': return humanDesignEnabled ? <HumanDesignSection /> : null;
      case 'bazi': return baziEnabled ? <BaziSection /> : null;
      case 'dream': return dreamEnabled ? <DreamInterpreterSection /> : null;
      case 'mood': return moodDiaryEnabled ? <MoodDiarySection /> : null;
      case 'partner': return partnerCompatEnabled ? <PartnerCompatSection /> : null;
      case 'fengshui': return fengShuiEnabled ? <FengShuiSection /> : null;
      case 'runes': return runesEnabled ? <RunesSection /> : null;
      case 'dice': return diceEnabled ? <DiceSection /> : null;
      default: return null;
    }
  })();

  return (
    <Page spacing="md">
      <PageHeader title={t('readings.title')} divider />

      <Tabs<ReadingTab>
        items={tabs.map(tab => ({
          id: tab.id,
          label: tabLabel(tab),
          icon: tab.icon,
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

      {activeTab === 'systems' && (
        activeSystem && systemView ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveSystem(null)}
              className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
              {t('readings.systems.all', { defaultValue: 'All systems' })}
            </button>
            <Suspense fallback={<CardSkeleton />}>{systemView}</Suspense>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-ui text-mystic-400">
              {t('readings.systems.lede', { defaultValue: 'Other ways of asking: oracles and systems from East and West.' })}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="list">
              {systems.map((system) => {
                const locked = !!system.premium && !isPremium;
                const Icon = system.icon;
                return (
                  <div key={system.id} role="listitem" className="overflow-hidden rounded-card border border-mystic-700 bg-mystic-850">
                    <ListRow
                      size="lg"
                      icon={locked ? <Lock /> : <Icon />}
                      tone={locked ? 'violet' : 'gold'}
                      label={t(system.labelKey)}
                      trailing={locked ? <Badge tone="violet">{t('readings.systems.premium', { defaultValue: 'Premium' })}</Badge> : 'chevron'}
                      onClick={() => openSystem(system)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )
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
