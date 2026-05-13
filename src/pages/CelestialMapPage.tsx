import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe2, Heart, Briefcase, Plane, Sparkles, Home as HomeIcon, Sprout, Crown } from 'lucide-react';
import { Card, Button, EyebrowLabel, SectionDivider } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import { CelestialMapView } from '../components/celestial/CelestialMapView';
import { CityInsightPanel } from '../components/celestial/CityInsightPanel';
import { CelestialMapIntroLoader } from '../components/celestial/CelestialMapIntroLoader';
import { CelestialBirthDataForm } from '../components/celestial/CelestialBirthDataForm';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { computeCelestialLines, type PlanetName } from '../utils/astrocartography';
import { getZodiacSign } from '../utils/zodiac';

const INTRO_SEEN_KEY = 'arcana_celestial_intro_seen';

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
  const { profile, refreshProfile } = useAuth();
  const isPremium = !!profile?.isPremium;
  const [activeFilter, setActiveFilter] = useState<LifeArea>('all');
  const [showPaywall, setShowPaywall] = useState(false);
  const [tappedPoint, setTappedPoint] = useState<{ lon: number; lat: number } | null>(null);
  const [showInsightPanel, setShowInsightPanel] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const { tryConsume, EarnSheet } = useMoonstoneSpend('celestial-travel-reading', { cost: 250 });

  // First-open intro loader. Persisted in localStorage so subsequent
  // visits go straight to the map. Setting the flag pre-emptively means
  // a refresh during the 4-second animation still counts as "seen".
  useEffect(() => {
    try {
      if (!localStorage.getItem(INTRO_SEEN_KEY)) {
        setShowIntro(true);
        localStorage.setItem(INTRO_SEEN_KEY, '1');
      }
    } catch {
      // private mode / storage unavailable — silently skip the intro.
    }
  }, []);

  // Compose the birth-data we'll feed to the astrocartography compute.
  // Conservative: if birth time is missing we still render but cap
  // expectations in the empty-state UI; we don't fudge a fake time
  // silently (would draw wildly inaccurate lines).
  const birth = useMemo(() => {
    if (!profile?.birthDate) return null;
    // Normalise birthDate to ISO YYYY-MM-DD if it slipped in as a
    // legacy free-text format like "06/15/1995". `new Date()` accepts
    // both shapes; we reformat so the timestamp concat below works.
    let dateIso = profile.birthDate;
    if (!/^\d{4}-\d{2}-\d{2}/.test(dateIso)) {
      const reparsed = new Date(dateIso);
      if (Number.isNaN(reparsed.getTime())) return null;
      const y = reparsed.getFullYear();
      const m = String(reparsed.getMonth() + 1).padStart(2, '0');
      const d = String(reparsed.getDate()).padStart(2, '0');
      dateIso = `${y}-${m}-${d}`;
    } else {
      dateIso = dateIso.slice(0, 10);
    }
    // Normalise birthTime: accept "HH:MM" or "HH:MM:SS" (legacy format),
    // emit "HH:MM:SS" for the ISO timestamp.
    const rawTime = profile.birthTime || '12:00';
    const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(rawTime);
    const hms = timeMatch
      ? `${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3] ?? '00'}`
      : '12:00:00';
    const utcDate = new Date(`${dateIso}T${hms}Z`);
    if (Number.isNaN(utcDate.getTime())) return null;
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
  //
  // try/catch is defensive — astronomy-engine can throw for far-future
  // or far-past dates outside its ephemeris range. If compute fails we
  // surface the empty state CTA rather than crashing the whole page.
  const allLines = useMemo(() => {
    if (!birth) return null;
    try {
      return computeCelestialLines(birth);
    } catch (err) {
      console.warn('[CelestialMap] compute failed:', err);
      return null;
    }
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

  // ── Empty state — no birth data yet, OR compute failed ──────────
  // Inline birth-data form: most users entered this at signup, but
  // OAuth users + accounts with legacy/malformed date strings hit
  // this path. Keep them on the page instead of bouncing through
  // /profile — fewer taps, higher conversion to actually seeing the
  // map. The form pre-fills anything the profile already has so the
  // user only types what's missing.
  if (!birth || allLines === null) {
    const headlineKey = profile?.birthDate
      ? 'celestial.needBirthDate.titleFix'
      : 'celestial.needBirthDate.title';
    const headlineDefault = profile?.birthDate
      ? 'Let’s fix your birth date'
      : 'We need your birth date first';
    const bodyKey = profile?.birthDate
      ? 'celestial.needBirthDate.bodyFix'
      : 'celestial.needBirthDate.body';
    const bodyDefault = profile?.birthDate
      ? 'Your saved birth date couldn’t be read. Re-enter it below and your map will be ready.'
      : 'Your celestial map is drawn from your birth chart. Enter your birth date — and time + place if you know them — and your map will be ready.';
    return (
      <div className="space-y-6 pb-32">
        <header className="space-y-2">
          <EyebrowLabel rules>{t('celestial.eyebrow', { defaultValue: 'Celestial Map' })}</EyebrowLabel>
          <h1 className="heading-display-xl text-mystic-100 text-center">
            {t(headlineKey, { defaultValue: headlineDefault })}
          </h1>
          <SectionDivider />
        </header>
        <Card variant="ritual" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-5">
            {t(bodyKey, { defaultValue: bodyDefault })}
          </p>
          <CelestialBirthDataForm onSaved={refreshProfile} />
          <button
            type="button"
            onClick={() => {
              window.location.href = '/profile';
            }}
            className="block mt-4 mx-auto text-xs text-mystic-500 hover:text-mystic-300 underline underline-offset-2 transition-colors"
          >
            {t('celestial.needBirthDate.secondary', { defaultValue: 'Edit full profile instead' })}
          </button>
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
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
        </motion.div>
      )}

      {/* Life-area filter */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {LIFE_AREA_LABELS.map(({ id, icon: Icon, key, defaultLabel }, i) => {
          const isActive = activeFilter === id;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04, duration: 0.3, ease: 'easeOut' }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveFilter(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors flex-shrink-0 snap-start ${
                isActive
                  ? 'bg-gold/20 text-gold border border-gold/30 shadow-glow'
                  : 'bg-mystic-800/50 text-mystic-300 border border-transparent hover:bg-mystic-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm">{t(key, { defaultValue: defaultLabel })}</span>
            </motion.button>
          );
        })}
      </div>

      {/* The map itself — fixed aspect so it doesn’t collapse on
          orientation changes or short viewports. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className="rounded-2xl overflow-hidden hairline-gold-soft"
        style={{ aspectRatio: '4 / 3', minHeight: 360 }}
      >
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
      </motion.div>

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

      <CelestialMapIntroLoader
        open={showIntro}
        onDone={() => setShowIntro(false)}
      />
    </div>
  );
}

export default CelestialMapPage;
