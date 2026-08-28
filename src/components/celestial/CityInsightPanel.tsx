import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Crown, Sparkles, Coins, Loader2, AlertCircle } from 'lucide-react';
import { Sheet, Button } from '../ui';
import { useT } from '../../i18n/useT';
import type { PlanetName, Angle } from '../../utils/astrocartography';
import {
  linesNearPoint,
  nearestCity,
  ccToFlag,
  type CityLineHit,
} from '../../utils/celestialGeo';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { getInterpretation } from '../../data/celestialInterpretations';
import {
  generateCelestialReading,
  type CelestialReadingResponse,
  type LifeIntent,
} from '../../dal/celestialReading';

/**
 * City Insight Panel — slide-up bottom sheet shown when a user taps a
 * point on the celestial map.
 *
 * Surfaces the nearest known city + all planetary lines that pass within
 * `radiusKm` of the tapped point. Each line is a chip the user can
 * expand to read the interpretation. A CTA at the bottom triggers the
 * AI Travel Reading (premium-included or 250 Moonstones, gated upstream
 * by the `tryConsume` prop).
 *
 * Free vs. premium handling: we receive `visibleLines` (what's on the
 * map for this user — filtered by free tier + life-area selector) AND
 * `allLines` (every computed line). The diff is what we show as the
 * locked upgrade teaser ("3 more lines run through here, unlock to see").
 *
 * `radiusKm` defaults to 700km — the traditional astrocartography
 * "within 5° of latitude" zone. Jim Lewis's original rule was 500 miles
 * (~800km); we tighten slightly to keep the chips list readable.
 */

const DEFAULT_RADIUS_KM = 700;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Tapped lon/lat from the map. */
  point: { lon: number; lat: number } | null;
  /** Lines currently rendered to the user (free tier + filter applied). */
  visibleLines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  /** All computed lines, including ones gated behind premium. */
  allLines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  isPremium: boolean;
  /** Birth UTC ISO for the AI reading request body. */
  birthUtc: string;
  /** Active life-area filter — drives the AI reading's intent. */
  intent: LifeIntent;
  /** Light personalisation for the AI prompt. */
  zodiacSign?: string;
  mbtiType?: string;
  locale?: string;
  /**
   * Moonstones spend gate — returns true if the spend succeeded (or
   * caller is premium and no spend needed). The parent owns this hook
   * so its EarnSheet stays a single instance.
   */
  trySpend: () => Promise<boolean>;
  /** Hook into the upgrade-to-premium CTA. */
  onUpgrade: () => void;
}

const PLANET_DOT_COLOR: Record<PlanetName, string> = {
  Sun: '#f4d668',
  Moon: '#e6e0ff',
  Mercury: '#a8e8e0',
  Venus: '#f0b8a0',
  Mars: '#e07a5f',
  Jupiter: '#d4af37',
  Saturn: '#c2b280',
  Uranus: '#80c8e8',
  Neptune: '#8e6eb5',
  Pluto: '#a83253',
};

export function CityInsightPanel({
  open,
  onClose,
  point,
  visibleLines,
  allLines,
  isPremium,
  birthUtc,
  intent,
  zodiacSign,
  mbtiType,
  locale,
  trySpend,
  onUpgrade,
}: Props) {
  const { t } = useT('app');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);
  const [reading, setReading] = useState<CelestialReadingResponse | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);

  // Identify the nearest city — this drives the panel title. If the user
  // tapped the open ocean we still show coordinates, just without a city
  // name (the nearest match would be misleading 1000km away).
  const cityInfo = useMemo(() => {
    if (!point) return null;
    return nearestCity(GLOBAL_CITIES, point.lat, point.lon);
  }, [point]);

  // The lines passing within radius of the tap. Computed against both
  // visible and "all" sets so we can show free-user upgrade hints.
  const visibleHits = useMemo<CityLineHit[]>(() => {
    if (!point) return [];
    return linesNearPoint(point.lat, point.lon, visibleLines, DEFAULT_RADIUS_KM);
  }, [point, visibleLines]);

  const allHits = useMemo<CityLineHit[]>(() => {
    if (!point) return [];
    return linesNearPoint(point.lat, point.lon, allLines, DEFAULT_RADIUS_KM);
  }, [point, allLines]);

  const hiddenCount = isPremium ? 0 : Math.max(0, allHits.length - visibleHits.length);
  const isFarFromCity = cityInfo && cityInfo.distanceKm > 300;

  // Reset reading/error when the sheet re-opens at a new point — readings
  // are place-specific and getting stale text in a new sheet would be
  // confusing.
  useEffect(() => {
    if (!open) return;
    setReading(null);
    setReadingError(null);
    setExpandedKey(null);
  }, [open, point?.lat, point?.lon]);

  async function handleRequestReading() {
    if (!point || !cityInfo) return;
    // Premium passes through; non-premium hits the spend gate first.
    if (!isPremium) {
      const spent = await trySpend();
      if (!spent) return;
    }
    setLoadingReading(true);
    setReadingError(null);
    const res = await generateCelestialReading({
      city: {
        name: cityInfo.city.name,
        country: cityInfo.city.country,
        lat: cityInfo.city.lat,
        lon: cityInfo.city.lon,
      },
      intent,
      // We use the full (premium) line set when fetching the AI reading
      // because the AI's job is to synthesise the *true* astrocartography
      // for this point, not the gated subset. The free user paid for
      // this read (or is premium); the cap is on the line-graph, not the
      // text interpretation.
      lines: allHits.map((h) => ({ planet: h.planet, angle: h.angle, distanceKm: h.distanceKm })),
      birth: { utc: birthUtc },
      userContext: { zodiacSign, mbtiType, locale },
    });
    setLoadingReading(false);
    if (res.ok) {
      setReading(res.data);
    } else {
      setReadingError(res.error);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} variant="glow">
      <div className="space-y-5">
        {/* ── Header: city name + distance from tap ─────────────── */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-mystic-800/60 hairline-gold-soft flex items-center justify-center text-2xl">
            {cityInfo ? ccToFlag(cityInfo.city.cc) : <MapPin className="w-5 h-5 text-gold" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="heading-display-md text-mystic-100 truncate">
              {cityInfo && !isFarFromCity ? cityInfo.city.name : t('celestial.city.unknown', { defaultValue: 'Open ocean / remote' })}
            </h2>
            <p className="text-xs text-mystic-400 mt-0.5">
              {cityInfo && !isFarFromCity
                ? cityInfo.city.country
                : point
                  ? `${point.lat.toFixed(2)}°, ${point.lon.toFixed(2)}°`
                  : ''}
              {cityInfo && !isFarFromCity && (
                <span className="text-mystic-500 ml-2">
                  · {Math.round(cityInfo.distanceKm)} km from tap
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── No lines nearby ───────────────────────────────────── */}
        {visibleHits.length === 0 && allHits.length === 0 && (
          <div className="rounded-2xl bg-mystic-800/40 hairline-gold-soft p-5 text-center">
            <p className="text-sm text-mystic-300 leading-relaxed">
              {t('celestial.city.noLines', {
                defaultValue: 'No planetary lines run within 700 km of here. This place is celestially quiet for your chart — neither helping nor hindering.',
              })}
            </p>
          </div>
        )}

        {/* ── Active lines list ─────────────────────────────────── */}
        {visibleHits.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-gold/80 font-medium">
              {t('celestial.city.activeLines', { defaultValue: 'Active lines here' })}
            </h3>
            <div className="space-y-2">
              {visibleHits.map((hit, i) => {
                const key = `${hit.planet}-${hit.angle}`;
                const interp = getInterpretation(hit.planet, hit.angle);
                const isExpanded = expandedKey === key;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                    className="rounded-xl bg-mystic-800/50 hairline-gold-soft overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedKey(isExpanded ? null : key)}
                      className="w-full flex items-start gap-3 p-4 text-left hover:bg-mystic-800/70 transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div
                        className="flex-shrink-0 w-3 h-3 rounded-full mt-1.5"
                        style={{
                          backgroundColor: PLANET_DOT_COLOR[hit.planet],
                          boxShadow: `0 0 8px ${PLANET_DOT_COLOR[hit.planet]}55`,
                        }}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-mystic-100">
                            {hit.planet} {hit.angle}
                          </span>
                          <span className="text-xs text-mystic-500">
                            · {Math.round(hit.distanceKm)} km
                          </span>
                        </div>
                        <p className="text-xs text-mystic-300 mt-0.5">{interp.headline}</p>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-mystic-400 flex-shrink-0 transition-transform mt-1.5 ${isExpanded ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          key="body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-mystic-800/60">
                            <p className="text-sm text-mystic-300 leading-relaxed">
                              {interp.body}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Locked lines teaser (free users) ──────────────────── */}
        {hiddenCount > 0 && (
          <button
            onClick={onUpgrade}
            className="w-full rounded-2xl bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/30 p-4 text-left hover:from-gold/20 hover:to-gold/10 transition-all"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-gold flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-mystic-100">
                  {t('celestial.city.lockedCount', {
                    count: hiddenCount,
                    defaultValue: '{{count}} more planetary lines run through here',
                  })}
                </p>
                <p className="text-xs text-mystic-400 mt-0.5">
                  {t('celestial.city.unlockHint', {
                    defaultValue: 'Unlock the full map with Premium',
                  })}
                </p>
              </div>
            </div>
          </button>
        )}

        {/* ── AI Travel Reading CTA or result ───────────────────── */}
        {(visibleHits.length > 0 || allHits.length > 0) && !reading && (
          <div className="rounded-2xl bg-mystic-900/60 hairline-gold-soft p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-medium text-mystic-100">
                {t('celestial.city.aiReading.title', {
                  defaultValue: 'Personal travel reading',
                })}
              </h3>
            </div>
            <p className="text-xs text-mystic-400 leading-relaxed">
              {t('celestial.city.aiReading.body', {
                defaultValue: 'Get a tailored interpretation weaving these lines together with your birth chart and what you\'re seeking — written specifically for you.',
              })}
            </p>
            {readingError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/40 p-3">
                <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-200 leading-relaxed">
                  {t('celestial.city.aiReading.error', {
                    defaultValue: 'Could not generate the reading just now. Please try again in a moment.',
                  })}
                </p>
              </div>
            )}
            <Button
              variant={isPremium ? 'primary' : 'gold'}
              size="md"
              fullWidth
              disabled={loadingReading}
              onClick={handleRequestReading}
            >
              {loadingReading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                  {t('celestial.city.aiReading.loading', { defaultValue: 'Drawing your reading…' })}
                </>
              ) : isPremium ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" aria-hidden />
                  {t('celestial.city.aiReading.ctaPremium', { defaultValue: 'Generate reading' })}
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" aria-hidden />
                  {t('celestial.city.aiReading.ctaMoonstones', { defaultValue: 'Unlock for 250 Moonstones' })}
                </>
              )}
            </Button>
          </div>
        )}

        {/* ── AI reading result ─────────────────────────────────── */}
        {reading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="rounded-2xl bg-gradient-to-br from-gold/10 to-mystic-900/60 hairline-gold-soft p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-xs uppercase tracking-wider text-gold/90 font-medium">
                {t('celestial.city.aiReading.label', { defaultValue: 'Your reading' })}
              </span>
            </div>
            <p className="text-base font-medium text-mystic-100 leading-snug italic">
              "{reading.verdict}"
            </p>
            <p className="text-sm text-mystic-200 leading-relaxed">
              {reading.body}
            </p>
            {reading.lineNotes.length > 0 && (
              <div className="space-y-2 pt-1">
                {reading.lineNotes.map((note, i) => (
                  <div key={`${note.planet}-${note.angle}-${i}`} className="flex items-start gap-2.5">
                    <div
                      className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                      style={{ backgroundColor: PLANET_DOT_COLOR[note.planet as PlanetName] ?? '#d4af37' }}
                      aria-hidden
                    />
                    <p className="text-xs text-mystic-300 leading-relaxed flex-1">
                      <span className="text-mystic-100 font-medium">{note.planet} {note.angle}</span>
                      {' — '}{note.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-xl bg-mystic-900/40 p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-mystic-500 font-medium">
                {t('celestial.city.aiReading.cautionsLabel', { defaultValue: 'Watch for' })}
              </p>
              <p className="text-xs text-mystic-300 leading-relaxed">{reading.cautionsNote}</p>
            </div>
            <div className="rounded-xl bg-gold/10 border border-gold/20 p-3 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-gold/80 font-medium">
                {t('celestial.city.aiReading.practiceLabel', { defaultValue: 'First three days here' })}
              </p>
              <p className="text-xs text-mystic-200 leading-relaxed">{reading.practice}</p>
            </div>
          </motion.div>
        )}
      </div>
    </Sheet>
  );
}
