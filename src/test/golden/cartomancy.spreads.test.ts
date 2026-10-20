import { describe, it, expect } from 'vitest';
import { CARTO_SPREADS, CARTO_FREE_SPREADS, getCartoSpread, isCartoSpreadSlug } from '../../data/cartomancy/spreads';
import { CARTO_LESSONS, getCartoLesson } from '../../data/cartomancy/lessons';
import { getPlayingCardBySlug } from '../../data/cartomancy/deck';
import { allSpreads } from '../../data/tarotSpreads';
import { SPREAD_COUNT } from '../../data/counts';

/**
 * The nine playing-card spreads describe real tables.
 *
 * Every position has a cell and every cell a position; grids hold their
 * cells inside rows × cols without two cards in one place; the Horseshoe's
 * arc stays inside its box; the Romany's spine is the fourth column. The
 * free set is exactly the four cheap readings, and none of this touches
 * the tarot figure the landing page quotes.
 */

const EXPECTED_SLUGS = [
  'carto-single',
  'carto-three-timeline',
  'carto-three-action',
  'carto-horseshoe',
  'carto-nine-square',
  'carto-romany',
  'carto-wish',
  'carto-yes-no',
  'carto-relationship',
];

const FREE = ['carto-single', 'carto-three-timeline', 'carto-three-action', 'carto-yes-no'];

const strings = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
};

describe('the playing-card spreads', () => {
  it('are the nine, each found by slug', () => {
    expect(CARTO_SPREADS.map((s) => s.slug).sort()).toEqual([...EXPECTED_SLUGS].sort());
    for (const slug of EXPECTED_SLUGS) expect(getCartoSpread(slug)?.slug).toBe(slug);
    expect(getCartoSpread('celtic-cross')).toBeNull();
    expect(EXPECTED_SLUGS.every(isCartoSpreadSlug)).toBe(true);
    expect(isCartoSpreadSlug('celtic-cross')).toBe(false);
  });

  it('positions, cardCount and layout cells agree, and positions run 1..n', () => {
    for (const s of CARTO_SPREADS) {
      expect(s.positions.length, s.slug).toBe(s.cardCount);
      expect(s.layout.cells.length, s.slug).toBe(s.cardCount);
      expect(s.positions.map((p) => p.position), s.slug).toEqual(s.positions.map((_, i) => i + 1));
      expect(s.layout.cells.map((c) => c.index).sort((a, b) => a - b), s.slug).toEqual(s.positions.map((_, i) => i));
      for (const p of s.positions) {
        expect(p.name.length, s.slug).toBeGreaterThan(0);
        expect(p.meaning.length, s.slug).toBeGreaterThan(0);
      }
    }
  });

  it('related spreads resolve within the nine', () => {
    for (const s of CARTO_SPREADS) {
      expect(s.relatedSpreads.length, s.slug).toBeGreaterThan(0);
      for (const r of s.relatedSpreads) {
        expect(getCartoSpread(r), `${s.slug} → ${r}`).not.toBeNull();
        expect(r).not.toBe(s.slug);
      }
    }
  });

  it('grid and pillar cells sit inside rows × cols, one card per place, and labels match', () => {
    for (const s of CARTO_SPREADS) {
      const l = s.layout;
      if (l.kind !== 'grid' && l.kind !== 'pillars') continue;
      const taken = new Set<string>();
      for (const c of l.cells) {
        const span = c.span ?? 1;
        expect(c.row, s.slug).toBeGreaterThanOrEqual(0);
        expect(c.row, s.slug).toBeLessThan(l.rows);
        expect(c.col, s.slug).toBeGreaterThanOrEqual(0);
        expect(c.col + span, s.slug).toBeLessThanOrEqual(l.cols);
        for (let k = 0; k < span; k++) {
          const key = `${c.row}:${c.col + k}`;
          expect(taken.has(key), `${s.slug}: two cards at ${key}`).toBe(false);
          taken.add(key);
        }
      }
      if (l.rowLabels) expect(l.rowLabels, s.slug).toHaveLength(l.rows);
      if (l.colLabels) expect(l.colLabels, s.slug).toHaveLength(l.cols);
    }
  });

  it('row cells lie on one row in order', () => {
    for (const s of CARTO_SPREADS) {
      const l = s.layout;
      if (l.kind !== 'row') continue;
      expect(l.cells.every((c) => c.row === 0), s.slug).toBe(true);
      expect(l.cells.map((c) => c.col), s.slug).toEqual(l.cells.map((_, i) => i));
    }
  });

  it('the Horseshoe arc stays inside its box, left to right, symmetric in tilt', () => {
    const horseshoe = getCartoSpread('carto-horseshoe');
    expect(horseshoe?.layout.kind).toBe('arc');
    if (!horseshoe || horseshoe.layout.kind !== 'arc') return;
    const { box, cells } = horseshoe.layout;
    expect(cells).toHaveLength(7);
    // every 60×90 tile centre sits a half-tile inside the box (a tilted
    // corner may overhang the edge by a couple of px; the layout shows it)
    for (const c of cells) {
      expect(c.cx - 30).toBeGreaterThanOrEqual(0);
      expect(c.cx + 30).toBeLessThanOrEqual(box.w);
      expect(c.cy - 45).toBeGreaterThanOrEqual(0);
      expect(c.cy + 45).toBeLessThanOrEqual(box.h);
    }
    expect(cells.map((c) => c.cx)).toEqual([...cells.map((c) => c.cx)].sort((a, b) => a - b));
    expect(cells.map((c) => c.rot)).toEqual([-18, -12, -6, 0, 6, 12, 18]);
    expect(cells[3].cy).toBe(Math.min(...cells.map((c) => c.cy)));
  });

  it('the Romany spine is the fourth column: positions 4, 11 and 18', () => {
    const romany = getCartoSpread('carto-romany');
    expect(romany?.layout.kind).toBe('grid');
    if (!romany || romany.layout.kind !== 'grid') return;
    expect(romany.layout.rows).toBe(3);
    expect(romany.layout.cols).toBe(7);
    const spine = romany.layout.cells.filter((c) => c.col === 3).sort((a, b) => a.row - b.row);
    expect(spine.map((c) => c.index + 1)).toEqual([4, 11, 18]);
    expect(spine.map((c) => romany.positions[c.index].name)).toEqual(['Past: the matter', 'Present: the matter', 'Future: the matter']);
  });

  it('frees exactly the single, both three-card lines and Yes or No', () => {
    expect(CARTO_SPREADS.filter((s) => s.free).map((s) => s.slug).sort()).toEqual([...FREE].sort());
    expect(CARTO_FREE_SPREADS.map((s) => s.slug).sort()).toEqual([...FREE].sort());
  });

  it('carries verdict rules on the Wish and on Yes or No only', () => {
    for (const s of CARTO_SPREADS) {
      if (s.slug === 'carto-wish') expect(s.verdict?.kind).toBe('wish');
      else if (s.slug === 'carto-yes-no') expect(s.verdict?.kind).toBe('yes-no');
      else expect(s.verdict, s.slug).toBeUndefined();
    }
    const yesNo = getCartoSpread('carto-yes-no');
    expect(yesNo?.layout.kind === 'row' && yesNo.layout.variant?.cardCount).toBe(5);
  });

  it('reads as the house voice: no exclamation marks, every text field filled', () => {
    for (const s of CARTO_SPREADS) {
      for (const str of strings(s)) expect(str, s.slug).not.toContain('!');
      expect(s.readingMethod.length, s.slug).toBeGreaterThan(40);
      expect(s.bestFor.length, s.slug).toBeGreaterThanOrEqual(3);
      expect(s.exampleQuestions.length, s.slug).toBeGreaterThanOrEqual(3);
      expect(s.faqs.length, s.slug).toBeGreaterThanOrEqual(2);
      expect(s.durationMin, s.slug).toBeGreaterThan(0);
    }
  });

  it('stays out of allSpreads, leaving SPREAD_COUNT as it was', () => {
    expect(SPREAD_COUNT).toBe(40);
    expect(allSpreads.length).toBe(SPREAD_COUNT);
    expect(allSpreads.some((s) => s.slug.startsWith('carto-'))).toBe(false);
  });
});

describe('the twelve lessons', () => {
  it('are twelve, in order, each found by slug', () => {
    expect(CARTO_LESSONS).toHaveLength(12);
    expect(CARTO_LESSONS.map((l) => l.order)).toEqual(CARTO_LESSONS.map((_, i) => i + 1));
    expect(new Set(CARTO_LESSONS.map((l) => l.slug)).size).toBe(12);
    for (const l of CARTO_LESSONS) {
      expect(l.slug).toMatch(/^[a-z0-9-]+$/);
      expect(getCartoLesson(l.slug)).toBe(l);
      expect(l.eyebrow).toBe(`Lesson ${l.order}`);
    }
    expect(getCartoLesson('nope')).toBeNull();
  });

  it('each carries 3–5 points, three paragraphs, a practice and cards that exist', () => {
    for (const l of CARTO_LESSONS) {
      expect(l.points.length, l.slug).toBeGreaterThanOrEqual(3);
      expect(l.points.length, l.slug).toBeLessThanOrEqual(5);
      expect(l.body, l.slug).toHaveLength(3);
      expect(l.practice.length, l.slug).toBeGreaterThan(20);
      expect(l.lede.length, l.slug).toBeGreaterThan(20);
      expect(l.relatedCards.length, l.slug).toBeGreaterThanOrEqual(2);
      for (const slug of l.relatedCards) expect(getPlayingCardBySlug(slug), `${l.slug} → ${slug}`).toBeDefined();
      for (const str of strings(l)) expect(str, l.slug).not.toContain('!');
    }
  });
});
