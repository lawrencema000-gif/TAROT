/**
 * Geo helpers for the Celestial Map — nearest-city lookup, great-circle
 * distance, and "which planetary lines pass near this city?" queries.
 *
 * Kept separate from astrocartography.ts because that module is pure
 * math + ephemeris; this one is data-driven (city list + distance ops)
 * and is allowed to grow as we add features (continent grouping, time-
 * zone lookup, etc.).
 */

import type { PlanetName, Angle } from './astrocartography';

export interface City {
  name: string;
  country: string;
  /** ISO 3166-1 alpha-2 — used for flag emoji + filter UX. */
  cc: string;
  lat: number;
  lon: number;
  /** Population, used to bias proximity ties toward the more notable city. */
  pop: number;
}

export interface CityLineHit {
  planet: PlanetName;
  angle: Angle;
  /** Kilometres from the city to the closest point on this line. */
  distanceKm: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle (haversine) distance between two points in kilometres.
 * Accurate to ~0.5% for typical use (Earth is not a perfect sphere; we
 * don't care about sub-kilometre precision for "is this line near you?"
 * astrocartography).
 */
export function haversineKm(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Find the city in `cities` closest to (lat, lon). Returns null only if
 * the list is empty.
 *
 * For ties (rare but possible at exactly equidistant points) we prefer
 * the more populated city — usually what the user means by "near".
 */
export function nearestCity(
  cities: City[],
  lat: number,
  lon: number,
): { city: City; distanceKm: number } | null {
  if (cities.length === 0) return null;
  let best = cities[0];
  let bestDist = haversineKm(lat, lon, best.lat, best.lon);
  for (let i = 1; i < cities.length; i++) {
    const d = haversineKm(lat, lon, cities[i].lat, cities[i].lon);
    if (d < bestDist || (d === bestDist && cities[i].pop > best.pop)) {
      best = cities[i];
      bestDist = d;
    }
  }
  return { city: best, distanceKm: bestDist };
}

/**
 * Find all planetary lines that pass within `radiusKm` of (lat, lon).
 *
 * For MC/IC lines this is the longitudinal distance at the city's
 * latitude — straightforward since those lines are vertical.
 *
 * For AC/DC (horizon) lines we sample the precomputed GeoJSON segments
 * for the planet+angle and find the minimum point-to-point distance.
 * This is approximate but plenty good for the 700km "near you" threshold
 * Astroline uses; we don't need polyline-perpendicular accuracy.
 */
export function linesNearPoint(
  lat: number,
  lon: number,
  lines: GeoJSON.FeatureCollection<
    GeoJSON.LineString,
    { planet: PlanetName; angle: Angle }
  >,
  radiusKm: number,
): CityLineHit[] {
  const hits = new Map<string, CityLineHit>();
  for (const feature of lines.features) {
    const { planet, angle } = feature.properties!;
    const key = `${planet}-${angle}`;
    const coords = feature.geometry.coordinates as [number, number][];
    let minDist = Infinity;
    for (const [pLon, pLat] of coords) {
      const d = haversineKm(lat, lon, pLat, pLon);
      if (d < minDist) minDist = d;
    }
    if (minDist <= radiusKm) {
      const prev = hits.get(key);
      // A single planet+angle can appear in multiple GeoJSON features
      // (segments split at the antimeridian); keep the closest one.
      if (!prev || minDist < prev.distanceKm) {
        hits.set(key, { planet, angle, distanceKm: minDist });
      }
    }
  }
  // Sort closest first — that's what UI consumers want.
  return [...hits.values()].sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Render a country code as its flag emoji. ISO-3166-1 alpha-2 codes are
 * directly convertible — each letter maps to a regional-indicator
 * codepoint (`A` → `🇦`).
 */
export function ccToFlag(cc: string): string {
  if (!cc || cc.length !== 2) return '';
  const codePoints = cc
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
