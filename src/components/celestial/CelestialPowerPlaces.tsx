import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { GLOBAL_CITIES } from '../../data/citiesGlobal';
import { haversineKm, ccToFlag, type City } from '../../utils/celestialGeo';
import type { PlanetName, Angle } from '../../utils/astrocartography';

/**
 * "Your power places" — surfaces the cities with the most active
 * planetary lines passing within range, weighted toward the user's
 * current life-area filter.
 *
 * The math: for each city in our curated 280-city dataset, count
 * planetary lines (from `lines`) whose nearest sample point falls
 * within ~700km. Cities are ranked first by line count, then by
 * population (so tiebreak prefers the more recognisable destination).
 *
 * This intentionally uses the FULL line set (not the filtered one)
 * so the suggestions reflect the entire chart's strongest spots, not
 * just whatever the active filter happens to show. The active filter
 * already drives the headline tone.
 *
 * Premium gating: free users see the count of total lines but the
 * city names are obscured behind a "Unlock to see your places" CTA,
 * surfaced via the parent's onUpgrade callback when they tap.
 */

const NEAR_KM = 700;
const TOP_N = 5;

interface Hit {
  city: City;
  lineCount: number;
  topPlanets: PlanetName[];
}

interface Props {
  /** All computed lines (unfiltered — covers the whole chart). */
  allLines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >;
  isPremium: boolean;
  /** Tap handler — receives the picked city's coords for the panel. */
  onPick: (city: City) => void;
  onUpgrade: () => void;
}

export function CelestialPowerPlaces({ allLines, isPremium, onPick, onUpgrade }: Props) {
  const { t } = useT('app');

  const ranked = useMemo<Hit[]>(() => {
    const out: Hit[] = [];
    for (const city of GLOBAL_CITIES) {
      const planetSeen = new Map<PlanetName, number>(); // planet → min distance
      for (const feat of allLines.features) {
        const { planet } = feat.properties!;
        const coords = feat.geometry.coordinates as [number, number][];
        let minDist = Infinity;
        for (const [lon, lat] of coords) {
          const d = haversineKm(city.lat, city.lon, lat, lon);
          if (d < minDist) minDist = d;
        }
        if (minDist <= NEAR_KM) {
          const prev = planetSeen.get(planet);
          if (prev === undefined || minDist < prev) planetSeen.set(planet, minDist);
        }
      }
      if (planetSeen.size === 0) continue;
      const topPlanets = [...planetSeen.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
        .map(([p]) => p);
      out.push({ city, lineCount: planetSeen.size, topPlanets });
    }
    out.sort((a, b) => b.lineCount - a.lineCount || b.city.pop - a.city.pop);
    return out.slice(0, TOP_N);
  }, [allLines]);

  if (ranked.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" aria-hidden />
        <h2 className="text-sm uppercase tracking-wider text-gold/90 font-medium">
          {t('celestial.power.title', { defaultValue: 'Your power places' })}
        </h2>
      </div>
      <p className="text-xs text-mystic-400 leading-relaxed">
        {t('celestial.power.subtitle', {
          defaultValue:
            'Where the most planetary lines converge for your chart. Strong spots to consider visiting, moving to, or revisiting.',
        })}
      </p>
      <div className="space-y-2">
        {ranked.map((hit, i) => (
          <motion.button
            key={`${hit.city.name}-${hit.city.cc}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.3, ease: 'easeOut' }}
            onClick={() => (isPremium ? onPick(hit.city) : onUpgrade())}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-mystic-800/50 hairline-gold-soft hover:bg-mystic-800/70 transition-colors text-left"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-mystic-900/60 flex items-center justify-center text-lg" aria-hidden>
              {ccToFlag(hit.city.cc)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-mystic-100 truncate">
                  {isPremium ? hit.city.name : '••••••'}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-gold/70">
                  {hit.lineCount} {hit.lineCount === 1 ? 'line' : 'lines'}
                </span>
              </div>
              <p className="text-xs text-mystic-400 truncate">
                {isPremium
                  ? `${hit.city.country} · ${hit.topPlanets.join(' · ')}`
                  : t('celestial.power.lockedHint', {
                      defaultValue: 'Unlock to see your places',
                    })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-mystic-500 flex-shrink-0" aria-hidden />
          </motion.button>
        ))}
      </div>
    </motion.section>
  );
}
