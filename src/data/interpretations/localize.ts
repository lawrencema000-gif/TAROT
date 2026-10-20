/**
 * The interpretation library in the reader's language.
 *
 * The English library (this folder) stays the source of truth and stays
 * lazy: `import('./index')` pulls all ~560 entries only when a chart screen
 * needs them. The translation is the `interpretations` content overlay
 * (src/i18n/contentOverlay.ts), keyed by the same stable ids the library
 * uses — planet and sign names, house numbers, aspect types, the canonical
 * pair keys — never by English text:
 *
 *   planetInSign.<Planet>.<Sign>             string
 *   planetInHouse.<Planet>.<1..12>           string
 *   aspects.essence.<type>                   string
 *   aspects.pairs.<PlanetA-PlanetB>          string (alphabetical pair key)
 *   houses.<1..12>.{title,description}       string
 *   houses.<1..12>.keywords                  string[] (same length as English)
 *   signCompat.<SignA-SignB>.{love,friendship,work}   string (zodiac-order pair key)
 *   chartTypes.<key>.{description,whenToRead}         string (the chart library)
 *   firdaria.<Planet>                                  string (time-lord meanings)
 *
 * Every accessor falls back to the English entry when the overlay lacks
 * one, so an unfinished overlay ships safely. This file imports no content
 * — only the schema — so a page can import it statically.
 */

import { ct, ctList, type ContentOverlay } from '../../i18n/contentOverlay';
import { planetPairKey, signPairKey, type Planet, type Sign, type AspectType, type HouseMeaning, type SignCompat } from './types';

export type InterpModule = typeof import('./index');

export interface Interpretations {
  planetInSignText(planet: string, sign: string): string | null;
  planetInHouseText(planet: string, house: number | null): string | null;
  houseMeaning(house: number): HouseMeaning | null;
  /** The planet-pair dynamic, then the angle's flavour. */
  aspectText(planet1: string, planet2: string, type: string): string;
  aspectEssence(type: string): string;
  signCompatText(signA: string, signB: string): SignCompat | null;
}

/**
 * Join two passages the way their script does: nothing after a full-width
 * stop (Japanese, Chinese), a space after anything else (English, Korean —
 * and an English fallback inside a translated page).
 */
function joinPassages(a: string, b: string): string {
  if (!a) return b;
  if (!b) return a;
  return /[。！？．][’”"')\]」』）】]?$/.test(a) ? a + b : `${a} ${b}`;
}

/** The library `mod`, read through `overlay` (null for English). */
export function withOverlay(mod: InterpModule, overlay: ContentOverlay | null | undefined): Interpretations {
  return {
    planetInSignText(planet, sign) {
      const en = mod.planetInSignText(planet, sign);
      return en === null ? null : ct(overlay, `planetInSign.${planet}.${sign}`, en);
    },
    planetInHouseText(planet, house) {
      const en = mod.planetInHouseText(planet, house);
      return en === null ? null : ct(overlay, `planetInHouse.${planet}.${house}`, en);
    },
    houseMeaning(house) {
      const en = mod.houseMeaning(house);
      if (!en) return null;
      return {
        title: ct(overlay, `houses.${house}.title`, en.title),
        keywords: ctList(overlay, `houses.${house}.keywords`, en.keywords),
        description: ct(overlay, `houses.${house}.description`, en.description),
      };
    },
    aspectText(planet1, planet2, type) {
      const pairKey = planetPairKey(planet1 as Planet, planet2 as Planet);
      const pairEn = mod.ASPECT_MEANINGS.pairs[pairKey] ?? '';
      const essenceEn = mod.ASPECT_MEANINGS.essence[type as AspectType] ?? '';
      const pair = pairEn ? ct(overlay, `aspects.pairs.${pairKey}`, pairEn) : '';
      const essence = essenceEn ? ct(overlay, `aspects.essence.${type}`, essenceEn) : '';
      return joinPassages(pair, essence);
    },
    aspectEssence(type) {
      const en = mod.aspectEssence(type);
      return en ? ct(overlay, `aspects.essence.${type}`, en) : '';
    },
    signCompatText(signA, signB) {
      const en = mod.signCompatText(signA, signB);
      if (!en) return null;
      const key = signPairKey(signA as Sign, signB as Sign);
      return {
        score: en.score,
        love: ct(overlay, `signCompat.${key}.love`, en.love),
        friendship: ct(overlay, `signCompat.${key}.friendship`, en.friendship),
        work: ct(overlay, `signCompat.${key}.work`, en.work),
      };
    },
  };
}
