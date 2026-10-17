import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Crown, Sparkles, Coins, Loader2, AlertCircle } from 'lucide-react';
import { Sheet, Button, ReadingProse } from '../ui';
import { useT } from '../../i18n/useT';
import { PLANETS, type PlanetName, type Angle } from '../../utils/astrocartography';
import { localizeCountry } from './placeNames';
import {
  linesNearPoint,
  nearestCity,
  ccToFlag,
  type City,
  type CityLineHit,
} from '../../utils/celestialGeo';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { getInterpretation } from '../../data/celestialInterpretations';
import { ct, useContentOverlay } from '../../i18n/contentOverlay';
import { localizePlanetName } from '../../i18n/localizeNames';
import {
  generateCelestialReading,
  type CelestialReadingRequest,
  type CelestialReadingResponse,
  type LifeIntent,
} from '../../dal/celestialReading';

/**
 * City Insight Panel — slide-up bottom sheet shown when a user taps a
 * point on the celestial map, or picks a place (search, a listed city, the
 * destined place).
 *
 * Surfaces the picked place, or for a tap the nearest known city (the spot
 * itself when none is within 300 km), + all planetary lines that pass within
 * `radiusKm` of the point. Each line is a chip the user can
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
  /**
   * The place the reader picked — from the city search (any place the
   * geocoder knows, not only the listed cities), a listed city, or the
   * destined place — when the panel opened at it (p9 R31). It names the
   * panel and is the place the reading is about. Without it (a tap on the
   * map) the panel names the nearest listed city within 300 km, or calls
   * the spot remote and reads the spot itself. Used only while `point` is
   * its position.
   */
  place?: City | null;
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

/** A planet the model named, in the reader's language when it is one of the ten (p8 F27). */
const planetLabel = (p: string) => ((PLANETS as readonly string[]).includes(p) ? localizePlanetName(p as PlanetName) : p);

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
  place,
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
  // The line readings in ja/ko/zh: the `celestial` content overlay,
  // `lines.<Planet>.<Angle>.{headline,body}`, over the English.
  const { overlay: celestialOverlay, ready: overlayReady } = useContentOverlay('celestial');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [loadingReading, setLoadingReading] = useState(false);

  // What the panel names, and the place the reading is about (p9 R31):
  //  - a place the reader picked (the search answers any town the geocoder
  //    knows, and for ja/ko/zh readers every search goes there): that place,
  //    by its own name and region — never the nearest listed city;
  //  - a tap on the map: the nearest listed city when it is within 300 km,
  //    named with its distance from the tap; farther than that the spot is
  //    remote, and the reading is about the spot itself, not a city
  //    1,000 km away.
  const picked = place && point && Math.abs(place.lat - point.lat) < 1e-6 && Math.abs(place.lon - point.lon) < 1e-6
    ? place
    : null;
  const cityInfo = useMemo(() => {
    if (!point) return null;
    return nearestCity(GLOBAL_CITIES, point.lat, point.lon);
  }, [point]);
  const nearCity = !picked && cityInfo && cityInfo.distanceKm <= 300 ? cityInfo : null;
  const remoteLabel = t('celestial.city.unknown', { defaultValue: 'Open ocean / remote' });
  const coordsLabel = point ? `${point.lat.toFixed(2)}°, ${point.lon.toFixed(2)}°` : '';
  const title = picked ? picked.name : nearCity ? nearCity.city.name : remoteLabel;
  const flagCc = picked ? picked.cc : nearCity ? nearCity.city.cc : '';
  const subtitle = picked
    ? (picked.cc ? localizeCountry(picked.cc, picked.country) : picked.country) || coordsLabel
    : nearCity
      ? localizeCountry(nearCity.city.cc, nearCity.city.country)
      : coordsLabel;

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

  // The paid request for the place on screen, and its body as a string: the
  // key of everything below.
  const req: CelestialReadingRequest | null = point
    ? {
        city: picked
          // The function requires a country; a search row can lack one.
          ? { name: picked.name, country: picked.country || picked.name, lat: picked.lat, lon: picked.lon }
          : nearCity
            ? { name: nearCity.city.name, country: nearCity.city.country, lat: nearCity.city.lat, lon: nearCity.city.lon }
            // Remote: the spot itself, named by its coordinates (kept in the function's range).
            : {
                name: coordsLabel,
                country: remoteLabel,
                lat: Math.max(-90, Math.min(90, point.lat)),
                lon: ((((point.lon + 180) % 360) + 360) % 360) - 180,
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
      }
    : null;
  const signature = req ? JSON.stringify(req) : null;

  /**
   * Readings this panel sold, by the request they answered (p9 R08).
   * celestial-travel-reading takes the 250 before its 7-day cache, so the
   * same request bought again is the same text for another 250: reopening a
   * city shows the reading already paid for instead of selling it again.
   */
  const [kept, setKept] = useState<Record<string, CelestialReadingResponse>>({});
  const reading = signature ? kept[signature] ?? null : null;
  /** The last failure, for the request it was about. */
  const [failure, setFailure] = useState<{ signature: string; error: string } | null>(null);
  const readingError = failure && failure.signature === signature ? failure.error : null;
  /**
   * The requestId of each request sent without a reading back, by its body,
   * kept through closing and reopening the panel and through other cities
   * read meanwhile: retrying one is the server's free replay of a reply that
   * may already be paid for, never a new charge (it used to be cleared on
   * every open, so a lost reply became a second 250).
   */
  const pending = useRef(new Map<string, string>());
  /** A request is between its first line and its last. */
  const busy = useRef(false);

  // A fresh look each time the sheet opens: lines folded, no stale error.
  // The readings and the unanswered requests stay.
  useEffect(() => {
    if (!open) return;
    setFailure(null);
    setExpandedKey(null);
  }, [open, point?.lat, point?.lon]);

  /**
   * One tap, one charge (p8 F20). `busy` is set before the spend gate is
   * awaited, so a second tap during the gate's round trip returns at once
   * (it used to send a second, separately charged 250-Moonstone request),
   * and the button is disabled from the gate check on. The request carries
   * a `requestId`, kept until a reading lands: the server debits once per
   * (requestId, body), so a retry after a dropped connection gets the first
   * run's reading back instead of a second charge, and skips the gate (the
   * first attempt may have left the balance under the cost).
   */
  async function handleRequestReading() {
    if (!req || !signature || busy.current) return;
    busy.current = true;
    setLoadingReading(true);
    setFailure(null);
    const sent = signature;
    try {
      let requestId = pending.current.get(sent);
      if (!requestId) {
        requestId = crypto.randomUUID();
        pending.current.set(sent, requestId);
        // Premium passes through; non-premium hits the spend gate first.
        if (!isPremium && !(await trySpend())) {
          pending.current.delete(sent);
          return;
        }
      }
      const res = await generateCelestialReading({ ...req, requestId });
      if (res.ok) {
        pending.current.delete(sent);
        // Kept under the request it answers: if the panel moved to another
        // place meanwhile, it shows there only when the reader comes back.
        setKept((k) => ({ ...k, [sent]: res.data }));
      } else {
        // Answered once and no longer replayable: the next press is a new request.
        if (res.error === 'REQUEST_ALREADY_USED') pending.current.delete(sent);
        setFailure({ signature: sent, error: res.error });
      }
    } finally {
      busy.current = false;
      setLoadingReading(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="glow"
      label={title}
    >
      <div className="space-y-5">
        {/* ── Header: the place, and for a tap its distance from it ─ */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-card bg-mystic-800/60 hairline-gold-soft flex items-center justify-center text-2xl">
            {flagCc ? ccToFlag(flagCc) : <MapPin className="w-5 h-5 text-gold" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="heading-display-md text-mystic-100 truncate">
              {title}
            </h2>
            <p className="text-meta text-mystic-400 mt-0.5">
              {subtitle}
              {nearCity && (
                <span className="ml-2">
                  · {t('celestial.city.kmFromTap', { defaultValue: '{{km}} km from tap', km: Math.round(nearCity.distanceKm) })}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── No lines nearby ───────────────────────────────────── */}
        {visibleHits.length === 0 && allHits.length === 0 && (
          <div className="rounded-card bg-mystic-800/40 hairline-gold-soft p-5">
            <p className="reading-copy">
              {t('celestial.city.noLines', {
                defaultValue: 'No planetary lines run within 700 km of here. This place is celestially quiet for your chart — neither helping nor hindering.',
              })}
            </p>
          </div>
        )}

        {/* ── Active lines list ─────────────────────────────────── */}
        {visibleHits.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-display-eyebrow text-gold/80">
              {t('celestial.city.activeLines', { defaultValue: 'Active lines here' })}
            </h3>
            <div className="space-y-2">
              {visibleHits.map((hit, i) => {
                const key = `${hit.planet}-${hit.angle}`;
                const en = getInterpretation(hit.planet, hit.angle);
                const linePath = `lines.${hit.planet}.${hit.angle}`;
                const interp = {
                  headline: ct(celestialOverlay, `${linePath}.headline`, en.headline),
                  body: ct(celestialOverlay, `${linePath}.body`, en.body),
                };
                const isExpanded = expandedKey === key;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                    className="rounded-control bg-mystic-800/50 hairline-gold-soft overflow-hidden"
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
                          <span className="text-ui font-medium text-mystic-100">
                            {localizePlanetName(hit.planet)} {hit.angle}
                          </span>
                          <span className="text-meta text-mystic-400 tabular-nums">
                            · {t('celestial.city.km', { defaultValue: '{{km}} km', km: Math.round(hit.distanceKm) })}
                          </span>
                        </div>
                        {/* The overlay is a small lazy chunk: hold the line
                            for it rather than flash the English first. */}
                        <p className="text-ui text-mystic-200 mt-0.5">{overlayReady ? interp.headline : '\u00a0'}</p>
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
                            <p className="reading-copy">
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
            className="w-full rounded-card bg-gradient-to-br from-gold/15 to-gold/5 border border-gold/30 p-4 text-left hover:from-gold/20 hover:to-gold/10 transition-all"
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
                <p className="text-meta text-mystic-400 mt-0.5">
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
          <div className="rounded-card bg-mystic-900/60 hairline-gold-soft p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="heading-display-md text-mystic-100">
                {t('celestial.city.aiReading.title', {
                  defaultValue: 'Personal travel reading',
                })}
              </h3>
            </div>
            <p className="text-ui text-mystic-300">
              {t('celestial.city.aiReading.body', {
                defaultValue: 'Get a tailored interpretation weaving these lines together with your birth chart and what you\'re seeking — written specifically for you.',
              })}
            </p>
            {readingError && (
              <div className="flex items-start gap-2 rounded-control bg-coral/10 border border-coral/25 p-3">
                <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" />
                <p className="text-ui text-coral-light">
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
            className="rounded-card bg-gradient-to-br from-gold/10 to-mystic-900/60 hairline-gold-soft p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="font-display-eyebrow text-gold/90">
                {t('celestial.city.aiReading.label', { defaultValue: 'Your reading' })}
              </span>
            </div>
            <p className="reading-quote">
              {reading.verdict}
            </p>
            <ReadingProse text={reading.body} />
            {reading.lineNotes.length > 0 && (
              <div className="space-y-2 pt-1">
                {reading.lineNotes.map((note, i) => (
                  <div key={`${note.planet}-${note.angle}-${i}`} className="flex items-start gap-2.5">
                    <div
                      className="flex-shrink-0 w-2 h-2 rounded-full mt-2.5"
                      style={{ backgroundColor: PLANET_DOT_COLOR[note.planet as PlanetName] ?? '#d4af37' }}
                      aria-hidden
                    />
                    <p className="reading-copy flex-1">
                      <span className="text-mystic-100 font-medium">{planetLabel(note.planet)} {note.angle}</span>
                      {' — '}{note.note}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-control bg-mystic-900/40 p-3 space-y-1">
              <p className="font-display-eyebrow text-mystic-500">
                {t('celestial.city.aiReading.cautionsLabel', { defaultValue: 'Watch for' })}
              </p>
              <p className="reading-copy">{reading.cautionsNote}</p>
            </div>
            <div className="rounded-control bg-gold/10 border border-gold/20 p-3 space-y-1">
              <p className="font-display-eyebrow text-gold/80">
                {t('celestial.city.aiReading.practiceLabel', { defaultValue: 'First three days here' })}
              </p>
              <p className="reading-copy">{reading.practice}</p>
            </div>
          </motion.div>
        )}
      </div>
    </Sheet>
  );
}
