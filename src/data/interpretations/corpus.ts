/**
 * The English corpora the `interpretations` and `celestial` content overlays
 * translate — built from the data modules, in exactly the shape the
 * screens read (see ./localize.ts and CityInsightPanel).
 *
 * NOT for app code: it imports every entry eagerly. The corpus files the
 * translators work from are generated from it, and the golden test
 * (src/test/golden/interpretationsOverlay.test.ts) proves every path a
 * screen reads exists here — so a translation keyed off this corpus is a
 * translation the screens will actually show.
 */

import { PLANET_IN_SIGN } from './planetInSign';
import { PLANET_IN_HOUSE } from './planetInHouse';
import { ASPECT_MEANINGS } from './aspectMeanings';
import { HOUSE_MEANINGS } from './houseMeanings';
import { SIGN_COMPATIBILITY } from './signCompatibility';
import { CHART_TYPES, FIRDARIA_LORD_MEANINGS } from '../chartSuiteContent';
import { INTERPRETATIONS as CELESTIAL_LINES } from '../celestialInterpretations';

/** `interpretations` overlay shape (English). */
export function interpretationsCorpus() {
  const signCompat: Record<string, { love: string; friendship: string; work: string }> = {};
  for (const [key, c] of Object.entries(SIGN_COMPATIBILITY)) {
    signCompat[key] = { love: c.love, friendship: c.friendship, work: c.work };
  }
  const houses: Record<string, { title: string; keywords: string[]; description: string }> = {};
  for (const [n, h] of Object.entries(HOUSE_MEANINGS)) {
    houses[n] = { title: h.title, keywords: [...h.keywords], description: h.description };
  }
  const chartTypes: Record<string, { description: string; whenToRead: string }> = {};
  for (const c of CHART_TYPES) chartTypes[c.key] = { description: c.description, whenToRead: c.whenToRead };
  const firdaria: Record<string, string> = {};
  for (const [lord, text] of Object.entries(FIRDARIA_LORD_MEANINGS)) firdaria[lord.replace(/\s+/g, '')] = text;
  return {
    planetInSign: PLANET_IN_SIGN,
    planetInHouse: PLANET_IN_HOUSE,
    aspects: { essence: ASPECT_MEANINGS.essence, pairs: ASPECT_MEANINGS.pairs },
    houses,
    signCompat,
    chartTypes,
    firdaria,
  };
}

/** `celestial` overlay shape (English): the 40 astrocartography line readings. */
export function celestialCorpus() {
  const lines: Record<string, Record<string, { headline: string; body: string }>> = {};
  for (const [planet, byAngle] of Object.entries(CELESTIAL_LINES)) {
    lines[planet] = {};
    for (const [angle, it] of Object.entries(byAngle)) lines[planet][angle] = { headline: it.headline, body: it.body };
  }
  return { lines };
}
