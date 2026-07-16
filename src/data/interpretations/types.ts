/**
 * Astrology interpretation content — schema shared by every module in this
 * folder and by the natal-chart / person / synastry UIs that render them.
 *
 * These are READ-ONLY content libraries (no user data), lazy-loaded so they
 * never enter the main bundle. Each entry is tone-matched to Arcana's voice:
 * warm, second-person, insightful, never fatalistic, 2-4 sentences.
 *
 * Keys align exactly with the edge-function chart output
 * (astrology-compute-natal / _shared/natal): planet names, sign names,
 * house numbers 1-12, and aspect types.
 */

export const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;
export type Planet = (typeof PLANETS)[number];

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;
export type Sign = (typeof SIGNS)[number];

export type HouseNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const ASPECT_TYPES = [
  'conjunction', 'opposition', 'trine', 'square', 'sextile',
] as const;
export type AspectType = (typeof ASPECT_TYPES)[number];

/** planet → sign → interpretation (2-3 sentences). 10×12 = 120 entries. */
export type PlanetInSign = Record<Planet, Record<Sign, string>>;

/** planet → house(1-12) → interpretation (2-3 sentences). 10×12 = 120 entries. */
export type PlanetInHouse = Record<Planet, Record<string, string>>;

export interface HouseMeaning {
  /** e.g. "The House of Self" */
  title: string;
  /** 3-5 short keywords */
  keywords: string[];
  /** 3-4 sentence description of the life area this house governs */
  description: string;
}
export type HouseMeanings = Record<string, HouseMeaning>; // keys "1".."12"

export interface AspectMeanings {
  /** the essence of each aspect type, planet-agnostic (2 sentences) */
  essence: Record<AspectType, string>;
  /** planet-pair dynamics keyed "PlanetA-PlanetB" (alphabetical), 45 pairs.
   *  Composed with `essence` at render: "<pair> — <essence tail>". */
  pairs: Record<string, string>;
}

export interface SignCompat {
  /** 0-100 overall resonance */
  score: number;
  love: string;
  friendship: string;
  work: string;
}
/** keyed "SignA-SignB" using SIGNS order (i<=j), 78 unordered pairs. */
export type SignCompatibility = Record<string, SignCompat>;

/** Canonical alphabetical pair key for two planets. */
export function planetPairKey(a: Planet, b: Planet): string {
  return [a, b].sort().join('-');
}

/** Canonical pair key for two signs, in zodiac order (lower index first). */
export function signPairKey(a: Sign, b: Sign): string {
  const ia = SIGNS.indexOf(a), ib = SIGNS.indexOf(b);
  return ia <= ib ? `${a}-${b}` : `${b}-${a}`;
}
