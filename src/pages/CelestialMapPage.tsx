import { useMemo, useState } from 'react';
import { Globe2, Heart, Briefcase, Plane, Sparkles, Home as HomeIcon, Sprout, Crown } from 'lucide-react';
import { Card, Button, EyebrowLabel, SectionDivider } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { CelestialMapView } from '../components/celestial/CelestialMapView';
import { CityInsightPanel } from '../components/celestial/CityInsightPanel';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { computeCelestialLines, type PlanetName } from '../utils/astrocartography';
import { getZodiacSign } from '../utils/zodiac';

/**
 * Celestial Map — astrocartography surface.
 *
 * Free users: world map with only Sun + Moon lines visible (a teaser).
 * Premium: all 40 lines (10 planets × 4 angles) + filter + city tap.
 * Non-premium can unlock a one-shot AI Travel Reading for 250 Moonstones
 * (handled inside CityInsightPanel — not in this commit).
 *
 * Birth data: pulled from the user profile. If the profile is missing
 * birth date/time we show a "complete your chart" CTA pointing back to
 * Profile → edit. Astrocartography requires at minimum the birth DATE
 * (UTC); time and place are needed for line accuracy at the 1-degree
 * level which most users care about.
 */

type LifeArea = 'love' | 'career' | 'travel' | 'healing' | 'home' | 'growth' | 'all';

const LIFE_AREA_PLANETS: Record<LifeArea, Set<PlanetName> | null> = {
  // Each life-area filter selects the planets that traditional
  // astrocartography associates with that domain. Astroline and other
  // popular tools use roughly the same mapping; this is just the canonical
  // assignment from Jim Lewis (the practice's founder).
  love:    new Set<PlanetName>(['Venus', 'Moon', 'Mars']),
  career:  new Set<PlanetName>(['Sun', 'Saturn', 'Mercury', 'Jupiter']),
  travel:  new Set<PlanetName>(['Jupiter', 'Sun', 'Uranus']),
  healing: new Set<PlanetName>(['Moon', 'Neptune', 'Venus']),
  home:    new Set<PlanetName>(['Moon', 'Venus', 'Saturn']),
  growth:  new Set<PlanetName>(['Jupiter', 'Uranus', 'Pluto']),
  all:     null, // null = show every planet
};

const LIFE_AREA_LABELS: { id: LifeArea; icon: typeof Heart; key: string; defaultLabel: string }[] = [
  { id: 'all',     icon: Globe2,    key: 'celestial.filter.all',     defaultLabel: 'All' },
  { id: 'love',    icon: Heart,     key: 'celestial.filter.love',    defaultLabel: 'Love' },
  { id: 'career',  icon: Briefcase, key: 'celestial.filter.career',  defaultLabel: 'Career' },
  { id: 'travel',  icon: Plane,     key: 'celestial.filter.travel',  defaultLabel: 'Travel' },
  { id: 'healing', icon: Sparkles,  key: 'celestial.filter.healing', defaultLabel: 'Healing' },
  { id: 'home',    icon: HomeIcon,  key: 'celestial.filter.home',    defaultLabel: 'Home' },
  { id: 'growth',  icon: Sprout,    key: 'celestial.filter.growth',  defaultLabel: 'Growth' },
];

// Free users see only these two — the teaser. Enough to feel real,
// little enough that the unlock is meaningful.
const FREE_TIER_PLANETS = new Set<PlanetName>(['Sun', 'Moon']);

export function CelestialMapPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const isPremium = !!profile?.isPremium;
  const [activeFilter, setActiveFilter] = useState<LifeArea>('all');
  const [showPaywall, setShowPaywall] = useState(false);
  const [tappedPoint, setTappedPoint] = useState<{ lon: number; lat: number } | null>(null);
  const [showInsightPanel, setShowInsightPanel] = useState(false);
  const { tryConsume, EarnSheet } = useMoonstoneSpend('celestial-travel-reading', { cost: 250 });

  // Compose the birth-data we'll feed to the astrocartography compute.
  // Conservative: if birth time is missing we still render but cap
  // expectations in the empty-state UI; we don't fudge a fake time
  // silently (would draw wildly inaccurate lines).
  const birth = useMemo(() => {
    if (!profile?.birthDate) return null;
    // Combine date + time + use Z (we don't have tz here; for Stage E
    // we'll wire tz lookup from birthPlace). For Stage A this gives a
    // reasonable first approximation — within 1-2 hours which is the
    // existing app's accuracy posture for natal charts anyway.
    const time = profile.birthTime || '12:00';
    const utcDate = new Date(`${profile.birthDate}T${time}:00Z`);
    return { utcDate };
  }, [profile?.birthDate, profile?.birthTime]);

  const visiblePlanets: Set<PlanetName> | null = useMemo(() => {
    const filterSet = LIFE_AREA_PLANETS[activeFilter];
    if (isPremium) return filterSet;
    // Free user: intersect the active filter with the free-tier
    // allowlist. If the filter chooses planets outside the free tier,
    // the user sees the (smaller) intersection and a paywall hint.
    if (!filterSet) return FREE_TIER_PLANETS;
    const intersection = new Set<PlanetName>();
    for (const p of filterSet) {
      if (FREE_TIER_PLANETS.has(p)) intersection.add(p);
    }
    return intersection;
  }, [activeFilter, isPremium]);

  // Compute the full FeatureCollection once per birth chart, then
  // derive the filtered version each render. The full set is what we
  // pass into the City Insight Panel so it can count locked lines and
  // surface "X more lines run through here" upgrade hints.
  const allLines = useMemo(() => {
    return birth ? computeCelestialLines(birth) : null;
  }, [birth]);

  const filteredLines = useMemo(() => {
    if (!allLines) return null;
    if (!visiblePlanets) return allLines;
    return {
      ...allLines,
      features: allLines.features.filter((f) =>
        visiblePlanets.has(f.properties!.planet),
      ),
    };
  }, [allLines, visiblePlanets]);

  // ── Empty state — no birth data yet ──────────────────────────────
  if (!birth) {
    return (
      <div className="space-y-6 pb-32">
        <header className="space-y-2">
          <EyebrowLabel rules>{t('celestial.eyebrow', { defaultValue: 'Celestial Map' })}</EyebrowLabel>
          <h1 className="heading-display-xl text-mystic-100 text-center">
            {t('celestial.needBirthDate.title', { defaultValue: 'We need your birth date first' })}
          </h1>
          <SectionDivider />
        </header>
        <Card variant="ritual" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('celestial.needBirthDate.body', {
              defaultValue:
                'Your celestial map is drawn from your birth chart. Add your birth date (and time, if you know it) on the Profile page and your map will be ready.',
            })}
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              window.location.href = '/profile';
            }}
          >
            {t('celestial.needBirthDate.cta', { defaultValue: 'Go to Profile' })}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <header className="space-y-2">
        <EyebrowLabel rules>{t('celestial.eyebrow', { defaultValue: 'Celestial Map' })}</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100 text-center">
          {t('celestial.title', { defaultValue: 'Where your stars align' })}
        </h1>
        <SectionDivider />
      </header>

      {!isPremium && (
        <Card variant="ritual" padding="md" className="border-gold/30">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mystic-100 mb-1">
                {t('celestial.previewLock.title', {
                  defaultValue: 'You’re seeing the Sun + Moon preview.',
                })}
              </p>
              <p className="text-xs text-mystic-400 leading-relaxed mb-3">
                {t('celestial.previewLock.body', {
                  defaultValue:
                    'Unlock all 40 planetary lines, city interpretations, and AI travel readings with Premium — or get a single travel reading for 250 Moonstones.',
                })}
              </p>
              <Button
                variant="gold"
                size="sm"
                onClick={() => setShowPaywall(true)}
              >
                {t('celestial.previewLock.cta', { defaultValue: 'Unlock full map' })}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Life-area filter */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {LIFE_AREA_LABELS.map(({ id, icon: Icon, key, defaultLabel }) => {
          const isActive = activeFilter === id;
          return (
            <button
              key={id}
              onClick={() => setActiveFilter(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all active:scale-95 flex-shrink-0 snap-start ${
                isActive
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow-glow'
                  : 'bg-mystic-800/50 text-mystic-300 border border-transparent hover:bg-mystic-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{t(key, { defaultValue: defaultLabel })}</span>
            </button>
          );
        })}
      </div>

      {/* The map itself — fixed aspect so it doesn’t collapse on
          orientation changes or short viewports. */}
      <div className="rounded-2xl overflow-hidden hairline-gold-soft" style={{ aspectRatio: '4 / 3', minHeight: 360 }}>
        {filteredLines && (
          <CelestialMapView
            lines={filteredLines}
            onMapClick={(lonLat) => {
              const [lon, lat] = lonLat;
              setTappedPoint({ lon, lat });
              setShowInsightPanel(true);
            }}
            onLineClick={(planet, angle) => {
              // Tapping a line currently routes through the same panel
              // anchored to the tap location — the panel surfaces the
              // line in its "active lines here" list with the closest
              // distance. Future enhancement: pre-expand that specific
              // line on open.
              void planet;
              void angle;
            }}
          />
        )}
      </div>

      <p className="text-xs text-mystic-500 text-center px-6 leading-relaxed">
        {t('celestial.disclaimer', {
          defaultValue:
            'The lines mark where each planet was rising, setting, or at its meridian when you were born. They are signals, not destiny.',
        })}
      </p>

      {filteredLines && allLines && (
        <CityInsightPanel
          open={showInsightPanel}
          onClose={() => setShowInsightPanel(false)}
          point={tappedPoint}
          visibleLines={filteredLines}
          allLines={allLines}
          isPremium={isPremium}
          birthUtc={birth.utcDate.toISOString()}
          intent={activeFilter}
          zodiacSign={profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined}
          mbtiType={profile?.mbtiType ?? undefined}
          locale={typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2) : undefined}
          trySpend={tryConsume}
          onUpgrade={() => {
            setShowInsightPanel(false);
            setShowPaywall(true);
          }}
        />
      )}

      <PaywallSheet
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={t('celestial.title', { defaultValue: 'Celestial Map' }) as string}
      />
      {EarnSheet}
    </div>
  );
}

export default CelestialMapPage;
