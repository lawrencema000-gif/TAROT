/**
 * Every catalogue spread has a glyph layout.
 *
 * The spread picker (TarotHomeView, SpreadsPage) draws each spread's shape
 * with SpreadGlyph from `getSpreadLayout`. A layout that is missing or the
 * wrong length would silently fall back to rows of three, so the gate
 * holds every one of the forty to its own card count, with no two cards on
 * the same cell except the Celtic Cross's crossing card (r: 90).
 */
import { describe, it, expect } from 'vitest';
import {
  allSpreads,
  getSpreadLayout,
  defaultSpreadLayout,
  MAJOR_ARCANA_SPREAD_LAYOUTS,
  tarotSpreads,
} from '../../data/tarotSpreads';
import { majorArcanaSpreads } from '../../data/majorArcanaSpreads';
import { SPREAD_LAYOUTS } from '../../components/icons/SpreadGlyph';

describe('spread layouts', () => {
  it('the catalogue is still forty spreads', () => {
    expect(allSpreads).toHaveLength(40);
    expect(tarotSpreads).toHaveLength(18);
    expect(majorArcanaSpreads).toHaveLength(22);
  });

  it('every base spread carries its own glyph layout, one cell per position', () => {
    for (const s of tarotSpreads) {
      expect(s.glyph, s.slug).toBeDefined();
      expect(s.glyph, s.slug).toHaveLength(s.cardCount);
      expect(s.glyph, s.slug).toHaveLength(s.positions.length);
    }
  });

  it('every Major Arcana spread is in the layout table at its card count', () => {
    for (const s of majorArcanaSpreads) {
      const l = MAJOR_ARCANA_SPREAD_LAYOUTS[s.slug];
      expect(l, s.slug).toBeDefined();
      expect(l, s.slug).toHaveLength(s.cardCount);
      expect(l, s.slug).toHaveLength(s.positions.length);
    }
  });

  it('getSpreadLayout never falls back for a catalogue spread, and no two cards share a cell', () => {
    for (const s of allSpreads) {
      const l = getSpreadLayout(s);
      // Its own layout, by identity — never the rows-of-three fallback.
      expect(l, s.slug).toBe(s.glyph ?? MAJOR_ARCANA_SPREAD_LAYOUTS[s.slug]);
      expect(l).toHaveLength(s.cardCount);
      const cells = l.filter((p) => p.r !== 90).map((p) => `${p.x},${p.y}`);
      expect(new Set(cells).size, `${s.slug} has overlapping cells`).toBe(cells.length);
      for (const p of l) {
        expect(p.x, s.slug).toBeGreaterThanOrEqual(0);
        expect(p.y, s.slug).toBeGreaterThanOrEqual(0);
        expect(p.x, s.slug).toBeLessThanOrEqual(4); // five columns at most (the horseshoe, the career path)
        expect(p.y, s.slug).toBeLessThanOrEqual(3);
      }
    }
  });

  it('the Celtic Cross keeps the icon layout the six legacy ids already use', () => {
    const celtic = allSpreads.find((s) => s.slug === 'celtic-cross')!;
    expect(getSpreadLayout(celtic)).toEqual(SPREAD_LAYOUTS['celtic-cross']);
  });

  it('the fallback is rows of three', () => {
    expect(defaultSpreadLayout(1)).toEqual([{ x: 0, y: 0 }]);
    expect(defaultSpreadLayout(4)).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
    ]);
  });
});
