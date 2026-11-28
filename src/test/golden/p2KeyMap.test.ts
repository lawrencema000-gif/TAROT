// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WP-P2-00: the P2 key map.
 *
 * WP-P2-00 adds, once and in all four languages, every string the
 * decision-free P2 packages read, so those packages never edit a locale
 * file in parallel. Their code asks for exactly these keys. This gate
 * holds the map in place in en, ja, ko and zh, keeps the English values
 * the consumers' tests rely on, and keeps the Horoscope Premium card from
 * selling the transit notes free members already see.
 *
 * Rows 23 and 24 of the map (`fengshui.annualUntil`,
 * `fengshui.directions.Center`) ship in WP-P2-14's own PR (it is dated and
 * runs ahead of P2), so they are checked only once they exist.
 */

const ROOT = process.cwd();
const LOCALES = join(ROOT, 'src', 'i18n', 'locales');
const LOCS = ['en', 'ja', 'ko', 'zh'] as const;

type Json = { [k: string]: Json | string | number | boolean | null | Json[] };

function load(loc: string): Json {
  return JSON.parse(readFileSync(join(LOCALES, loc, 'app.json'), 'utf8'));
}

function flat(o: Json | Json[], prefix = '', out: Record<string, string> = {}): Record<string, string> {
  const entries = Array.isArray(o) ? o.map((v, i) => [String(i), v] as const) : Object.entries(o);
  for (const [k, v] of entries) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flat(v as Json, key, out);
    else if (typeof v === 'string') out[key] = v;
  }
  return out;
}

/** Rows 1–26 of the key map, in order. */
const P2_KEYS = [
  'horoscope.birthChartCard.subtitle', // 1
  'horoscope.birthChartView.aspectMetaNoMotion', // 2
  'chartWheel.houseSystem.equal', // 3
  'profile.cosmic.animalYearNote', // 4
  'synastry.zoneFromPlace', // 5
  'synastry.noPlaceNote', // 6
  'synastry.placeZoneFailed', // 7
  'synastry.clearPlace', // 8
  'synastry.zoneAssumedHint', // 9
  'compat.compositeIn', // 10
  'compat.compositeAspect', // 11
  'compat.compositeMethod', // 12
  'compat.compositeNoMoon', // 13
  'home.cosmicScore.baseline', // 14
  'home.cosmicScore.smallerInfluences_one', // 15
  'home.cosmicScore.smallerInfluences_other', // 16
  'home.cosmicScore.countsOfAll', // 17
  'humanDesign.bodygraphSummary_one', // 18
  'humanDesign.bodygraphSummary_other', // 19
  'bazi.birthPlace', // 20
  'bazi.zoneUsed', // 21
  'bazi.lateZiNote', // 22
  'fengshui.annualUntil', // 23 (WP-P2-14)
  'fengshui.directions.Center', // 24 (WP-P2-14)
  'iching.changingLines', // 25
  'dates.reasons.yearClash', // 26
] as const;

/** Carried by WP-P2-14's PR, not this package's. */
const CARRIED_ELSEWHERE = new Set<string>(['fengshui.annualUntil', 'fengshui.directions.Center']);

const app = Object.fromEntries(LOCS.map((l) => [l, flat(load(l))])) as Record<(typeof LOCS)[number], Record<string, string>>;

describe('P2 key map (WP-P2-00)', () => {
  it('holds 26 rows', () => {
    expect(P2_KEYS).toHaveLength(26);
    expect(new Set(P2_KEYS).size).toBe(26);
  });

  for (const loc of LOCS) {
    it(`every key exists as a non-empty string in ${loc}`, () => {
      const missing = P2_KEYS.filter((k) => {
        const v = app[loc][k];
        if (CARRIED_ELSEWHERE.has(k) && v === undefined && app.en[k] === undefined) return false;
        return typeof v !== 'string' || v.trim() === '';
      });
      expect(missing).toEqual([]);
    });
  }

  it('the English values the consumers rely on match the map', () => {
    expect(app.en['horoscope.birthChartCard.subtitle']).toBe('Your full chart, forecasts and the Explore tab');
    expect(app.en['horoscope.birthChartView.aspectMetaNoMotion']).toBe('{{type}} • Orb: {{orb}}°');
    expect(app.en['chartWheel.houseSystem.equal']).toBe('Houses: Equal (from the Ascendant)');
    expect(app.en['home.cosmicScore.smallerInfluences_one']).toBe('{{count}} smaller influence');
    expect(app.en['home.cosmicScore.smallerInfluences_other']).toBe('{{count}} smaller influences');
    expect(app.en['dates.reasons.yearClash']).toBe('The day clashes with your birth-year animal (沖{{animal}})');
  });

  it('the Horoscope Premium card no longer sells transit notes', () => {
    const key = 'horoscope.birthChartCard.subtitle';
    expect(app.en[key]).not.toMatch(/transit/i);
    expect(app.ja[key]).not.toMatch(/トランジット/);
    expect(app.ko[key]).not.toMatch(/트랜짓/);
    expect(app.zh[key]).not.toMatch(/行运/);
    // It names the tabs by the tabs' own words.
    expect(app.ja[key]).toContain(app.ja['horoscope.tabs.explore']);
    expect(app.ja[key]).toContain('探求');
    for (const loc of LOCS) {
      expect(app[loc][key].toLowerCase()).toContain(app[loc]['horoscope.tabs.forecast'].toLowerCase());
    }
  });

  it('the birth-animal clash names the animal, not 太歲', () => {
    for (const loc of LOCS) {
      const v = app[loc]['dates.reasons.yearClash'];
      expect(v).toContain('{{animal}}');
      expect(v).not.toMatch(/太歲|太岁/);
    }
  });

  it('the two plurals carry _one and _other in every locale', () => {
    for (const loc of LOCS) {
      for (const base of ['home.cosmicScore.smallerInfluences', 'humanDesign.bodygraphSummary']) {
        expect(app[loc][`${base}_one`], `${loc} ${base}_one`).toBeTruthy();
        expect(app[loc][`${base}_other`], `${loc} ${base}_other`).toBeTruthy();
      }
    }
  });
});
