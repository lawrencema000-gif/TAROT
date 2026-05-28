/**
 * "Find Your Place" scoring algorithm.
 *
 * Given a user's full astrocartography line set + a life-area intent,
 * rank every city in the dataset by how strongly it aligns. Used by
 * the headline reveal feature on the Celestial Map.
 *
 * The math:
 *
 *   score(city, intent) =
 *     Σ over planet-lines passing within RADIUS_KM of city of:
 *       weight[planet][angle][intent] × distanceFactor(km)
 *
 *   distanceFactor(km) = max(0, 1 - km / RADIUS_KM)
 *
 * Higher score = stronger fit. Population is the tiebreaker so when
 * two cities have ~equal scores the more recognisable destination
 * wins.
 *
 * The weight table is anchored on Jim Lewis's canonical mapping of
 * planet+angle to life domain, with a "intent multiplier" layered on
 * top — e.g. for the "career" intent, Jupiter MC scores 1.0 (perfect
 * fit) while Moon IC scores 0.3 (still meaningful but off-theme).
 */

import { haversineKm, type City } from './celestialGeo';
import type { PlanetName, Angle } from './astrocartography';

export type LifeIntent = 'love' | 'career' | 'travel' | 'healing' | 'home' | 'growth' | 'all';

const RADIUS_KM = 700;
const TOP_N = 5;

/**
 * Per-planet+angle base weight + per-intent modifier table.
 *
 * The intent modifier rewards lines that traditional astrocartography
 * associates with that life area. Values are deliberately not 0 — even
 * an "off-theme" line still contributes some pull because no place is
 * single-purpose. Weights tuned to keep top scores roughly comparable
 * across intents (so the scoring magnitudes feel consistent in UI).
 */
const PLANET_INTENT_WEIGHT: Record<PlanetName, Record<Angle, Record<LifeIntent, number>>> = {
  Sun: {
    AC: { love: 0.6, career: 0.9, travel: 0.7, healing: 0.5, home: 0.5, growth: 0.7, all: 0.8 },
    DC: { love: 0.8, career: 0.5, travel: 0.4, healing: 0.4, home: 0.6, growth: 0.5, all: 0.6 },
    MC: { love: 0.4, career: 1.0, travel: 0.6, healing: 0.3, home: 0.4, growth: 0.6, all: 0.8 },
    IC: { love: 0.5, career: 0.4, travel: 0.3, healing: 0.5, home: 0.9, growth: 0.5, all: 0.6 },
  },
  Moon: {
    AC: { love: 0.7, career: 0.4, travel: 0.4, healing: 0.9, home: 0.7, growth: 0.5, all: 0.7 },
    DC: { love: 0.9, career: 0.4, travel: 0.4, healing: 0.7, home: 0.6, growth: 0.5, all: 0.7 },
    MC: { love: 0.5, career: 0.6, travel: 0.4, healing: 0.6, home: 0.6, growth: 0.5, all: 0.6 },
    IC: { love: 0.6, career: 0.3, travel: 0.3, healing: 0.9, home: 1.0, growth: 0.4, all: 0.7 },
  },
  Mercury: {
    AC: { love: 0.4, career: 0.8, travel: 0.7, healing: 0.5, home: 0.4, growth: 0.7, all: 0.6 },
    DC: { love: 0.5, career: 0.6, travel: 0.6, healing: 0.4, home: 0.4, growth: 0.7, all: 0.6 },
    MC: { love: 0.3, career: 0.9, travel: 0.6, healing: 0.4, home: 0.4, growth: 0.7, all: 0.7 },
    IC: { love: 0.4, career: 0.4, travel: 0.3, healing: 0.4, home: 0.6, growth: 0.6, all: 0.5 },
  },
  Venus: {
    AC: { love: 0.9, career: 0.6, travel: 0.6, healing: 0.7, home: 0.7, growth: 0.5, all: 0.8 },
    DC: { love: 1.0, career: 0.5, travel: 0.5, healing: 0.7, home: 0.7, growth: 0.5, all: 0.8 },
    MC: { love: 0.6, career: 0.7, travel: 0.6, healing: 0.5, home: 0.5, growth: 0.5, all: 0.7 },
    IC: { love: 0.7, career: 0.3, travel: 0.4, healing: 0.7, home: 0.9, growth: 0.5, all: 0.7 },
  },
  Mars: {
    AC: { love: 0.6, career: 0.7, travel: 0.6, healing: 0.3, home: 0.3, growth: 0.7, all: 0.6 },
    DC: { love: 0.7, career: 0.5, travel: 0.4, healing: 0.3, home: 0.4, growth: 0.6, all: 0.5 },
    MC: { love: 0.4, career: 0.8, travel: 0.5, healing: 0.3, home: 0.3, growth: 0.7, all: 0.6 },
    IC: { love: 0.4, career: 0.3, travel: 0.3, healing: 0.4, home: 0.4, growth: 0.7, all: 0.4 },
  },
  Jupiter: {
    AC: { love: 0.7, career: 0.9, travel: 1.0, healing: 0.6, home: 0.7, growth: 0.9, all: 0.9 },
    DC: { love: 0.8, career: 0.7, travel: 0.7, healing: 0.5, home: 0.6, growth: 0.7, all: 0.8 },
    MC: { love: 0.5, career: 1.0, travel: 0.9, healing: 0.5, home: 0.5, growth: 0.8, all: 0.9 },
    IC: { love: 0.6, career: 0.4, travel: 0.5, healing: 0.6, home: 0.9, growth: 0.6, all: 0.7 },
  },
  Saturn: {
    AC: { love: 0.4, career: 0.8, travel: 0.4, healing: 0.5, home: 0.6, growth: 0.7, all: 0.6 },
    DC: { love: 0.5, career: 0.6, travel: 0.3, healing: 0.4, home: 0.6, growth: 0.6, all: 0.5 },
    MC: { love: 0.3, career: 0.9, travel: 0.4, healing: 0.4, home: 0.5, growth: 0.7, all: 0.7 },
    IC: { love: 0.4, career: 0.4, travel: 0.3, healing: 0.4, home: 0.8, growth: 0.6, all: 0.5 },
  },
  Uranus: {
    AC: { love: 0.5, career: 0.6, travel: 0.7, healing: 0.5, home: 0.3, growth: 0.9, all: 0.6 },
    DC: { love: 0.6, career: 0.5, travel: 0.5, healing: 0.4, home: 0.3, growth: 0.8, all: 0.5 },
    MC: { love: 0.4, career: 0.7, travel: 0.6, healing: 0.4, home: 0.3, growth: 0.8, all: 0.6 },
    IC: { love: 0.4, career: 0.3, travel: 0.4, healing: 0.5, home: 0.4, growth: 0.8, all: 0.5 },
  },
  Neptune: {
    AC: { love: 0.7, career: 0.4, travel: 0.5, healing: 0.9, home: 0.5, growth: 0.7, all: 0.6 },
    DC: { love: 0.7, career: 0.3, travel: 0.4, healing: 0.7, home: 0.5, growth: 0.6, all: 0.5 },
    MC: { love: 0.4, career: 0.6, travel: 0.5, healing: 0.6, home: 0.4, growth: 0.7, all: 0.5 },
    IC: { love: 0.6, career: 0.3, travel: 0.4, healing: 0.9, home: 0.7, growth: 0.7, all: 0.6 },
  },
  Pluto: {
    AC: { love: 0.6, career: 0.5, travel: 0.5, healing: 0.6, home: 0.3, growth: 0.9, all: 0.5 },
    DC: { love: 0.8, career: 0.4, travel: 0.4, healing: 0.6, home: 0.3, growth: 0.8, all: 0.5 },
    MC: { love: 0.5, career: 0.7, travel: 0.5, healing: 0.5, home: 0.3, growth: 0.8, all: 0.5 },
    IC: { love: 0.5, career: 0.3, travel: 0.3, healing: 0.7, home: 0.6, growth: 0.8, all: 0.5 },
  },
};

export interface ContributingLine {
  planet: PlanetName;
  angle: Angle;
  distanceKm: number;
  /** Contribution to this city's total score from this line. */
  contribution: number;
}

export interface PlaceScore {
  city: City;
  score: number;
  contributingLines: ContributingLine[];
}

/**
 * Score every city in `cities` against `lines` for the user's intent.
 *
 * Returns the top N ranked by score (then by population for tiebreaks),
 * excluding any city with a zero score. If every city scores zero (the
 * filter rejected all lines), returns an empty array — the caller
 * should fall back to "no strong place for this intent" UI.
 */
export function scorePlaces(
  cities: readonly City[],
  lines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >,
  intent: LifeIntent,
  topN = TOP_N,
): PlaceScore[] {
  const out: PlaceScore[] = [];
  for (const city of cities) {
    const contributing: ContributingLine[] = [];
    let total = 0;

    // Per planet+angle, track the closest sample point — multiple
    // segments of the same line (antimeridian splits) collapse into a
    // single line contribution.
    const seen = new Map<string, { distanceKm: number }>();
    for (const feat of lines.features) {
      const { planet, angle } = feat.properties!;
      const key = `${planet}-${angle}`;
      const coords = feat.geometry.coordinates as [number, number][];
      let minDist = Infinity;
      for (const [lon, lat] of coords) {
        const d = haversineKm(city.lat, city.lon, lat, lon);
        if (d < minDist) minDist = d;
      }
      if (minDist <= RADIUS_KM) {
        const prev = seen.get(key);
        if (!prev || minDist < prev.distanceKm) {
          seen.set(key, { distanceKm: minDist });
        }
      }
    }

    for (const [key, { distanceKm }] of seen) {
      const [planet, angle] = key.split('-') as [PlanetName, Angle];
      const baseWeight = PLANET_INTENT_WEIGHT[planet]?.[angle]?.[intent] ?? 0.3;
      const distanceFactor = Math.max(0, 1 - distanceKm / RADIUS_KM);
      const contribution = baseWeight * distanceFactor;
      total += contribution;
      contributing.push({ planet, angle, distanceKm, contribution });
    }

    if (total > 0) {
      contributing.sort((a, b) => b.contribution - a.contribution);
      out.push({ city, score: total, contributingLines: contributing });
    }
  }

  out.sort((a, b) => b.score - a.score || b.city.pop - a.city.pop);
  return out.slice(0, topN);
}
