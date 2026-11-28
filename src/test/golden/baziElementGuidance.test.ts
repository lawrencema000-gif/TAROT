import { describe, it, expect } from 'vitest';
import {
  computeBazi,
  computeFavorableElement,
  elementGuidance,
  ELEMENT_PRODUCES,
  ELEMENT_CONTROLS,
  ELEMENT_PRODUCED_BY,
  ELEMENT_CONTROLLED_BY,
  type FiveElement,
} from '../../data/bazi';

/**
 * WP-P2-12 (premium-02): the Bazi "Element guidance" read the five-element
 * cycles backwards. A chart weak in Fire was told to surround itself with
 * Earth "(which produces Fire)"; a chart heavy in Earth to balance with Water
 * "(which controls Earth)". In the classical cycles Wood produces Fire and
 * Wood controls Earth.
 *
 * The reference below is the classical table, written by hand — never derived
 * from the app's maps (it agrees with tyme4ts 1.5.2's Element).
 */

const CN: Record<string, FiveElement> = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
/** 相生: 木生火, 火生土, 土生金, 金生水, 水生木. */
const SHENG = ['木生火', '火生土', '土生金', '金生水', '水生木'].map((s) => [CN[s[0]], CN[s[2]]] as const);
/** 相克: 木克土, 土克水, 水克火, 火克金, 金克木. */
const KE = ['木克土', '土克水', '水克火', '火克金', '金克木'].map((s) => [CN[s[0]], CN[s[2]]] as const);

describe('five-element tables against the classical cycles', () => {
  it.each(SHENG)('相生: %s produces %s', (a, b) => {
    expect(ELEMENT_PRODUCES[a]).toBe(b);
    expect(ELEMENT_PRODUCED_BY[b]).toBe(a);
  });
  it.each(KE)('相克: %s controls %s', (a, b) => {
    expect(ELEMENT_CONTROLS[a]).toBe(b);
    expect(ELEMENT_CONTROLLED_BY[b]).toBe(a);
  });
  it('the inverse tables are exactly the classical ones', () => {
    expect(ELEMENT_PRODUCED_BY).toEqual({ fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal', wood: 'water' });
    expect(ELEMENT_CONTROLLED_BY).toEqual({ earth: 'wood', water: 'earth', fire: 'water', metal: 'fire', wood: 'metal' });
  });
});

describe('elementGuidance', () => {
  // Pillars from lunar-javascript 1.7.3; balance counted by hand.
  it('1991-03-08 06:45 (辛未 辛卯 丁丑 癸卯): weak Fire is fed by Wood; no excess', () => {
    const r = computeBazi('1991-03-08', '06:45')!;
    expect(r.elementBalance).toEqual({ wood: 2, fire: 1, earth: 2, metal: 2, water: 1 });
    expect(elementGuidance(r)).toEqual({ weak: 'fire', support: 'wood', excess: null, control: null, supportIsExcess: false });
  });
  it('1985-02-04 10:00 (乙丑 戊寅 甲戌 己巳): weak Metal fed by Earth, excess Earth controlled by Wood (母多子病)', () => {
    const r = computeBazi('1985-02-04', '10:00')!;
    expect(r.elementBalance).toEqual({ wood: 3, fire: 1, earth: 4, metal: 0, water: 0 });
    expect(elementGuidance(r)).toEqual({ weak: 'metal', support: 'earth', excess: 'earth', control: 'wood', supportIsExcess: true });
  });
  it('1996-03-04 08:00 (丙子 庚寅 庚子 庚辰): weak Wood is fed by Water; no excess', () => {
    const r = computeBazi('1996-03-04', '08:00')!;
    expect(r.elementBalance).toEqual({ wood: 1, fire: 1, earth: 1, metal: 3, water: 2 });
    expect(elementGuidance(r)).toEqual({ weak: 'wood', support: 'water', excess: null, control: null, supportIsExcess: false });
  });
});

describe('computeFavorableElement.supporting', () => {
  it('is the favourable element’s producer for every day of 1990 at 12:00', () => {
    for (let d = new Date(Date.UTC(1990, 0, 1)); d.getUTCFullYear() === 1990; d = new Date(d.getTime() + 86_400_000)) {
      const iso = d.toISOString().slice(0, 10);
      const fav = computeFavorableElement(computeBazi(iso, '12:00')!);
      expect(fav.supporting, iso).toBe(ELEMENT_PRODUCED_BY[fav.element]);
    }
  });
});
