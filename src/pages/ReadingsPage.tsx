import { lazy, Suspense, useState, useRef, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Sun, Sparkles, Heart, BookOpen, Coins, Layers, Mountain, Cloud, Users, Home, Smile, Hash, Dice6, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { SectionDivider } from '../components/ui';

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

interface TabDef {
  id: ReadingTab;
  labelKey: string;
  icon: LucideIcon;
  premium?: boolean;
}

/**
 * Horizontal tab strip with desktop-friendly scroll affordances.
 *
 * The default behaviour (overflow-x-auto + hidden scrollbar) works fine
 * on touch devices — users swipe naturally — but desktop users with a
 * mouse have no obvious way to scroll horizontally, so several reading
 * tabs (Bazi, Dream, Partner, Runes, Library, etc.) end up invisible
 * past the right edge.
 *
 * Improvements added here for desktop:
 *   - Click-to-scroll chevron buttons on left + right edges. They appear
 *     only when there's actually content to scroll to in that direction
 *     (driven by scrollLeft + scrollWidth + clientWidth).
 *   - Click-and-drag panning across the tab strip — power users can
 *     just grab and drag.
 *   - Mouse-wheel vertical scroll is translated to horizontal scroll
 *     when the cursor is over the strip (so wheel just works).
 *   - Auto-scrolls the active tab into view when activeTab changes
 *     programmatically (e.g. deep-link).
 *
 * Touch-device behaviour is preserved — drag handlers ignore touchstart
 * so swipes still work natively.
 */
function ReadingsTabStrip({
  tabs,
  activeTab,
  isPremium,
  onTabClick,
  labelFor,
}: {
  tabs: TabDef[];
  activeTab: ReadingTab;
  isPremium: boolean;
  onTabClick: (tab: TabDef) => void;
  labelFor: (key: string) => string;
}) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragRef = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false, startX: 0, startScroll: 0, moved: false,
  });

  const updateScrollState = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    // 4px slack on each side to avoid flicker at extremes.
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = stripRef.current;
    if (!el) return;
    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [updateScrollState, tabs.length]);

  // Auto-scroll the active tab into view when it changes (e.g., via deep
  // link or programmatic switch). Uses inline:'nearest' so it doesn't
  // jump if the tab is already visible.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLButtonElement>(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [activeTab]);

  const scrollByDir = (dir: 'left' | 'right') => {
    const el = stripRef.current;
    if (!el) return;
    // Scroll one "card cluster" worth — about 70% of the visible width.
    const delta = Math.max(160, Math.floor(el.clientWidth * 0.7)) * (dir === 'right' ? 1 : -1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // Mouse drag-to-pan. Only enables on actual mousedown (not touchstart),
  // so native touch scrolling on mobile is untouched.
  const onMouseDown = (e: React.MouseEvent) => {
    const el = stripRef.current;
    if (!el || e.button !== 0) return;
    dragRef.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    el.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    const el = stripRef.current;
    if (!drag.active || !el) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    el.scrollLeft = drag.startScroll - dx;
  };
  const onMouseUp = () => {
    const el = stripRef.current;
    if (el) el.style.cursor = '';
    dragRef.current.active = false;
  };

  // Translate vertical wheel into horizontal scroll when over the strip.
  // Helps mouse users without horizontal-scroll trackpads.
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = stripRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      // Don't preventDefault — passive wheel handling is fine, and we
      // don't want to break page-level vertical scroll if the strip
      // is at its horizontal end.
    }
  };

  return (
    <div className="relative -mx-4">
      {/* Left chevron — desktop only, fades in when there's content to
          scroll to on the left */}
      <button
        type="button"
        aria-label="Scroll tabs left"
        onClick={() => scrollByDir('left')}
        className={`hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-mystic-900/85 hairline-gold-soft text-gold backdrop-blur-sm transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-2 px-4 snap-x snap-mandatory scroll-smooth select-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          cursor: 'grab',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isLocked = tab.premium && !isPremium;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => {
                // If user just dragged the strip, suppress the click so
                // they don't accidentally switch tabs on release.
                if (dragRef.current.moved) {
                  dragRef.current.moved = false;
                  return;
                }
                onTabClick(tab);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all active:scale-95 flex-shrink-0 snap-start relative ${
                isActive
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow-lg shadow-gold/20'
                  : isLocked
                    ? 'bg-mystic-800/30 text-mystic-400 border border-gold/15 hover:border-gold/30'
                    : 'bg-mystic-800/50 text-mystic-300 border border-transparent hover:bg-mystic-800'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4 text-gold/70" /> : <Icon className="w-4 h-4" />}
              {labelFor(tab.labelKey)}
            </button>
          );
        })}
        <div className="w-4 flex-shrink-0" aria-hidden="true" />
      </div>

      {/* Edge fades — give a visual hint there's more content. Pointer-
          events-none so they don't block tab clicks underneath. */}
      <div
        className={`absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-mystic-950 via-mystic-950/80 to-transparent pointer-events-none transition-opacity ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-mystic-950 via-mystic-950/80 to-transparent pointer-events-none transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Right chevron — desktop only */}
      <button
        type="button"
        aria-label="Scroll tabs right"
        onClick={() => scrollByDir('right')}
        className={`hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-mystic-900/85 hairline-gold-soft text-gold backdrop-blur-sm transition-opacity ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

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
      <div className="space-y-2">
        <h1 className="heading-display-xl text-mystic-100">{t('readings.title')}</h1>
        <SectionDivider tone="gold" />
      </div>

      <ReadingsTabStrip
        tabs={tabs}
        activeTab={activeTab}
        isPremium={isPremium}
        onTabClick={handleTabClick}
        labelFor={(key: string) => t(key) as string}
      />

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
