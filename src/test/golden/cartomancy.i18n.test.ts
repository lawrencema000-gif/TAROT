import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CARTO_LESSONS, CARTO_SPREADS, PLAYING_CARDS_ALL } from '../../data/cartomancy';

/**
 * The translated playing-card corpus (src/i18n/locales/<lng>/cartomancy.json).
 *
 * i18n.test.ts holds the four UI namespaces to one key tree; the corpora
 * (tarot.json, cartomancy.json) sit outside it because English for them is
 * TypeScript data, not JSON. This gate is the corpus's own: the three
 * translations carry the same tree as each other, and once a translation
 * is filled it covers every card, spread and lesson the data ships, under
 * the ids and slugs the data uses (never localized). An empty file — the
 * state before the translation round — is allowed: localizePlayingCard
 * falls back to English field by field.
 */

const LOCALES = join(process.cwd(), 'src', 'i18n', 'locales');
const OTHERS = ['ja', 'ko', 'zh'] as const;

type Json = { [k: string]: Json | string | number | boolean | null | Json[] };

function load(loc: string): Json {
  return JSON.parse(readFileSync(join(LOCALES, loc, 'cartomancy.json'), 'utf8')) as Json;
}

function tree(o: Json | Json[], prefix = '', out: string[] = []): string[] {
  const entries = Array.isArray(o) ? o.map((v, i) => [String(i), v] as const) : Object.entries(o);
  for (const [k, v] of entries) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') tree(v as Json, key, out);
    else out.push(key);
  }
  return out;
}

describe('the playing-card corpus translations', () => {
  it('exists in ja, ko and zh as a JSON object', () => {
    for (const loc of OTHERS) {
      expect(existsSync(join(LOCALES, loc, 'cartomancy.json')), `${loc}/cartomancy.json`).toBe(true);
      const json = load(loc);
      expect(json && typeof json === 'object' && !Array.isArray(json), `${loc} is an object`).toBe(true);
    }
  });

  it('carries the same key tree in every translation', () => {
    const [first, ...rest] = OTHERS;
    const base = tree(load(first)).sort();
    for (const loc of rest) expect(tree(load(loc)).sort(), `${loc} vs ${first}`).toEqual(base);
  });

  it('once filled, covers every card id, spread slug and lesson slug, and nothing else', () => {
    for (const loc of OTHERS) {
      const json = load(loc) as { cards?: Record<string, unknown>; spreads?: Record<string, unknown>; lessons?: Record<string, unknown> };
      if (Object.keys(json).length === 0) continue;
      expect(Object.keys(json.cards ?? {}).sort(), `${loc} cards`).toEqual(PLAYING_CARDS_ALL.map((c) => String(c.id)).sort());
      expect(Object.keys(json.spreads ?? {}).sort(), `${loc} spreads`).toEqual(CARTO_SPREADS.map((s) => s.slug).sort());
      expect(Object.keys(json.lessons ?? {}).sort(), `${loc} lessons`).toEqual(CARTO_LESSONS.map((l) => l.slug).sort());
    }
  });

  it('once filled, keeps list lengths equal to the English data, so the overlay never drops to English mid-list', () => {
    for (const loc of OTHERS) {
      const json = load(loc) as {
        cards?: Record<string, { keywords?: unknown[]; combinations?: unknown[] }>;
        spreads?: Record<string, { positions?: unknown[] }>;
        lessons?: Record<string, { points?: unknown[]; body?: unknown[] }>;
      };
      if (Object.keys(json).length === 0) continue;
      const bad: string[] = [];
      for (const card of PLAYING_CARDS_ALL) {
        const tr = json.cards?.[String(card.id)];
        if (!tr) continue;
        if (tr.keywords && tr.keywords.length !== card.keywords.length) bad.push(`${loc} card ${card.id} keywords`);
        if (tr.combinations && tr.combinations.length !== card.combinations.length) bad.push(`${loc} card ${card.id} combinations`);
      }
      for (const spread of CARTO_SPREADS) {
        const tr = json.spreads?.[spread.slug];
        if (tr?.positions && tr.positions.length !== spread.positions.length) bad.push(`${loc} spread ${spread.slug} positions`);
      }
      for (const lesson of CARTO_LESSONS) {
        const tr = json.lessons?.[lesson.slug];
        if (tr?.points && tr.points.length !== lesson.points.length) bad.push(`${loc} lesson ${lesson.slug} points`);
        if (tr?.body && tr.body.length !== lesson.body.length) bad.push(`${loc} lesson ${lesson.slug} body`);
      }
      expect(bad).toEqual([]);
    }
  });
});

describe('the corpus overlay', () => {
  it('reads a translated card, spread and combination line from the store, and falls back to English field by field', async () => {
    const { default: i18n } = await import('../../i18n/config');
    const { localizePlayingCard, localizeCartoSpread, localizeCombinationHit } = await import('../../i18n/localizePlayingCard');
    const { findCombinations, getPlayingCardBySlug, getCartoSpread, SAME_RANK_COMBINATIONS } = await import('../../data/cartomancy');
    const queens = ['queen-of-hearts', 'queen-of-clubs', 'queen-of-spades'].map((s) => getPlayingCardBySlug(s)!);
    const at = SAME_RANK_COMBINATIONS.findIndex((e) => e.rank === 'queen' && e.count === 3);
    const sameRank = SAME_RANK_COMBINATIONS.map((e, i) => (i === at ? { rank: e.rank, count: e.count, meaning: 'JA three queens' } : {}));
    i18n.addResourceBundle('ja', 'cartomancy', {
      cards: { [String(queens[0].id)]: { name: 'JA Queen of Hearts' } },
      spreads: { 'carto-single': { name: 'JA One card' } },
      sameRankCombinations: sameRank,
    }, true, true);
    try {
      const card = localizePlayingCard(queens[0], 'ja');
      expect(card.name).toBe('JA Queen of Hearts');
      expect(card.meaningUpright).toBe(queens[0].meaningUpright);
      expect(localizeCartoSpread(getCartoSpread('carto-single')!, 'ja').name).toBe('JA One card');
      const hit = findCombinations(queens).find((h) => h.kind === 'same-rank')!;
      const line = localizeCombinationHit(hit, 'ja');
      expect(line.meaning).toBe('JA three queens');
      expect(line.label).toContain('JA Queen of Hearts');
      expect(localizeCombinationHit(hit, 'en')).toEqual({ label: hit.label, meaning: hit.meaning });
    } finally {
      i18n.removeResourceBundle('ja', 'cartomancy');
    }
  });
});
