/**
 * Astrology interpretation library — accessors that turn a computed chart into
 * human-readable text. All data modules are re-exported so a single dynamic
 * import (`import('../data/interpretations')`) pulls the whole ~560-entry
 * library lazily, keeping it out of the main bundle.
 */

import { PLANET_IN_SIGN } from './planetInSign';
import { PLANET_IN_HOUSE } from './planetInHouse';
import { ASPECT_MEANINGS } from './aspectMeanings';
import { SIGN_COMPATIBILITY } from './signCompatibility';
import { HOUSE_MEANINGS } from './houseMeanings';
import { planetPairKey, signPairKey, type Planet, type Sign, type AspectType, type HouseMeaning } from './types';

export { PLANET_IN_SIGN, PLANET_IN_HOUSE, ASPECT_MEANINGS, SIGN_COMPATIBILITY, HOUSE_MEANINGS };
export type { Planet, Sign, AspectType };

export function planetInSignText(planet: string, sign: string): string | null {
  return PLANET_IN_SIGN[planet as Planet]?.[sign as Sign] ?? null;
}

export function planetInHouseText(planet: string, house: number | null): string | null {
  if (house == null) return null;
  return PLANET_IN_HOUSE[planet as Planet]?.[String(house)] ?? null;
}

export function houseMeaning(house: number): HouseMeaning | null {
  return HOUSE_MEANINGS[String(house)] ?? null;
}

/** Composed aspect reading: the planet-pair dynamic + the angle's flavor. */
export function aspectText(planet1: string, planet2: string, type: string): string {
  const pair = ASPECT_MEANINGS.pairs[planetPairKey(planet1 as Planet, planet2 as Planet)] ?? '';
  const essence = ASPECT_MEANINGS.essence[type as AspectType] ?? '';
  return [pair, essence].filter(Boolean).join(' ');
}

export function aspectEssence(type: string): string {
  return ASPECT_MEANINGS.essence[type as AspectType] ?? '';
}

export function signCompatText(signA: string, signB: string) {
  return SIGN_COMPATIBILITY[signPairKey(signA as Sign, signB as Sign)] ?? null;
}
