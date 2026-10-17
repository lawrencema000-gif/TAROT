import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ContentOverlay } from '../i18n/contentOverlay';
import { isPlanet } from '../lib/chart';
import { HD_TYPES } from './humanDesign';
import { AUTHORITY_SCRIPTS, TYPE_CASES } from './humanDesignCases';
import {
  HD_AUTHORITY_ID,
  HD_CHART_AUTHORITY_TEXT,
  HD_CHART_TYPE_TEXT,
  HD_POINT_NAMES,
  HD_TYPE_KEY,
  hdBodyName,
  humanDesignCorpus,
  localizeHumanDesign,
  type HdChartStrings,
} from './humanDesignReading';

/**
 * The 'humanDesign' content overlay. Before it, the paid Human Design result
 * read in English inside the translated chrome of ja/ko/zh: the type copy,
 * the strategy-in-practice cases, the decision scripts, and every string the
 * human-design-chart function sends (strategy, signature, not-self theme,
 * authority and its explanation, the activation bodies).
 */
const corpus = humanDesignCorpus();
const FN_SOURCE = readFileSync(join(process.cwd(), 'supabase/functions/human-design-chart/index.ts'), 'utf8');

/** Every leaf path, arrays included (`types.generator.strengths.0`). */
const paths = (v: unknown, prefix = ''): string[] =>
  v && typeof v === 'object'
    ? Object.entries(v).flatMap(([k, x]) => paths(x, prefix ? `${prefix}.${k}` : k))
    : [prefix];
const valueAt = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);
const placeholders = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join(' ');

/** The corpus with every string marked, so a read that falls back to English shows. */
function marked(): ContentOverlay {
  const mark = (v: unknown): unknown =>
    typeof v === 'string' ? `«${v}»`
      : Array.isArray(v) ? v.map(mark)
        : Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, mark(x)]));
  return mark(corpus) as ContentOverlay;
}

/** A chart's strings exactly as the function sends them for a Type and Authority. */
function chartFor(type: string, authority: keyof typeof HD_AUTHORITY_ID): HdChartStrings {
  const t = HD_CHART_TYPE_TEXT[HD_TYPE_KEY[type]];
  return {
    type,
    strategy: t.strategy,
    notSelfTheme: t.notSelfTheme,
    signature: t.signature,
    authority,
    authorityExplanation: HD_CHART_AUTHORITY_TEXT[HD_AUTHORITY_ID[authority]].explanation,
  };
}

describe('the function’s closed vocabulary, mirrored', () => {
  const union = (name: string) => {
    const start = FN_SOURCE.indexOf(`type ${name} =`);
    return [...FN_SOURCE.slice(start, FN_SOURCE.indexOf(';', start)).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  };

  it('every Type and Authority it can send has a key here', () => {
    expect(union('HDType').sort()).toEqual(Object.keys(HD_TYPE_KEY).sort());
    expect(union('HDAuthority').sort()).toEqual(Object.keys(HD_AUTHORITY_ID).sort());
    expect(Object.keys(AUTHORITY_SCRIPTS).sort()).toEqual(Object.keys(HD_AUTHORITY_ID).sort());
  });

  it('strategy, not-self and signature per Type are the function’s TYPE_INFO, word for word', () => {
    const rows = [...FN_SOURCE.matchAll(
      /^\s*"?([A-Za-z ]+?)"?:\s*\{\s*strategy:\s*"([^"]*)",\s*notSelf:\s*"([^"]*)",\s*signature:\s*"([^"]*)"\s*\},?\s*$/gm,
    )];
    expect(rows).toHaveLength(5);
    for (const [, type, strategy, notSelfTheme, signature] of rows) {
      expect(HD_CHART_TYPE_TEXT[HD_TYPE_KEY[type]], type).toEqual({ strategy, notSelfTheme, signature });
    }
  });

  it('each Authority’s explanation is the function’s AUTHORITY_EXPLANATION, word for word', () => {
    const start = FN_SOURCE.indexOf('const AUTHORITY_EXPLANATION');
    const block = FN_SOURCE.slice(start, FN_SOURCE.indexOf('\n};', start));
    const rows = [...block.matchAll(/^\s*"?([A-Za-z -]+?)"?:\s*"((?:[^"\\]|\\.)*)",?\s*$/gm)];
    expect(rows).toHaveLength(8);
    for (const [, authority, explanation] of rows) {
      const id = HD_AUTHORITY_ID[authority as keyof typeof HD_AUTHORITY_ID];
      expect(HD_CHART_AUTHORITY_TEXT[id], authority).toEqual({ name: authority, explanation });
    }
  });

  it('every activation body it names is a planet or one of the three points', () => {
    const bodies = new Set([
      ...[...FN_SOURCE.matchAll(/body:\s*"(\w+)"/g)].map((m) => m[1]),
      ...[...FN_SOURCE.matchAll(/\["(\w+)",\s*Astronomy\.Body\./g)].map((m) => m[1]),
    ]);
    expect(bodies.size).toBe(13);
    for (const b of bodies) expect(isPlanet(b) || b in HD_POINT_NAMES, b).toBe(true);
  });
});

describe('humanDesign overlay', () => {
  it('the corpus is every type’s copy, every case, every script and the function’s strings', () => {
    const all = paths(corpus);
    const typeLeaves = Object.values(HD_TYPES).reduce((n, t) => n + 4 + t.strengths.length + t.challenges.length, 0);
    const caseLeaves = Object.values(TYPE_CASES).reduce((n, list) => n + list.length * 4, 0);
    const scriptLeaves = Object.values(AUTHORITY_SCRIPTS).reduce((n, s) => n + 3 + s.decisionMakingScript.length, 0);
    expect(all).toHaveLength(typeLeaves + caseLeaves + scriptLeaves + 5 * 3 + 8 * 2 + 3);
    expect(all.filter((p) => !String(valueAt(corpus, p)).trim())).toEqual([]);
  });

  it('every string the result shows resolves through the corpus, for every Type and Authority', () => {
    const overlay = marked();
    for (const type of Object.keys(HD_TYPE_KEY)) {
      for (const authority of Object.keys(HD_AUTHORITY_ID) as (keyof typeof HD_AUTHORITY_ID)[]) {
        const chart = chartFor(type, authority);
        const text = localizeHumanDesign(chart, overlay);
        const key = HD_TYPE_KEY[type];
        expect(text.typeKey).toBe(key);
        for (const f of ['strategy', 'notSelfTheme', 'signature'] as const) expect(text[f], `${type}.${f}`).toBe(`«${chart[f]}»`);
        expect(text.authority).toBe(`«${authority}»`);
        expect(text.authorityExplanation).toBe(`«${chart.authorityExplanation}»`);
        const info = HD_TYPES[key];
        expect(text.info).toEqual({
          percentOfPopulation: `«${info.percentOfPopulation}»`,
          summary: `«${info.summary}»`,
          strengths: info.strengths.map((s) => `«${s}»`),
          challenges: info.challenges.map((s) => `«${s}»`),
          affirmation: `«${info.affirmation}»`,
          tarotPairing: `«${info.tarotPairing}»`,
        });
        expect(text.cases).toEqual(TYPE_CASES[key].map((c) => ({
          scenario: `«${c.scenario}»`, wrongMove: `«${c.wrongMove}»`, alignedMove: `«${c.alignedMove}»`, signature: `«${c.signature}»`,
        })));
        const s = AUTHORITY_SCRIPTS[authority];
        expect(text.script).toEqual({
          authorityName: `«${s.authorityName}»`,
          decisionMakingScript: s.decisionMakingScript.map((x) => `«${x}»`),
          commonMistake: `«${s.commonMistake}»`,
          realityCheck: `«${s.realityCheck}»`,
        });
      }
    }
    for (const b of Object.keys(HD_POINT_NAMES) as (keyof typeof HD_POINT_NAMES)[]) {
      expect(hdBodyName(b, overlay)).toBe(`«${HD_POINT_NAMES[b]}»`);
    }
  });

  it('English (no overlay) is what the function sent and the English copy', () => {
    const chart = chartFor('Projector', 'Splenic');
    const text = localizeHumanDesign(chart, null);
    expect([text.strategy, text.notSelfTheme, text.signature, text.authority, text.authorityExplanation])
      .toEqual([chart.strategy, chart.notSelfTheme, chart.signature, chart.authority, chart.authorityExplanation]);
    expect(text.info?.summary).toBe(HD_TYPES.projector.summary);
    expect(text.cases).toEqual(TYPE_CASES.projector);
    expect(text.script).toEqual(AUTHORITY_SCRIPTS.Splenic);
    expect(['Sun', 'Earth', 'NorthNode', 'SouthNode', 'Pluto'].map((b) => hdBodyName(b, null)))
      .toEqual(['Sun', 'Earth', 'North Node', 'South Node', 'Pluto']);
  });

  it('a Type or Authority outside the vocabulary shows what the function sent, never another type’s text', () => {
    const odd: HdChartStrings = {
      type: 'Mystic', strategy: 'Float', notSelfTheme: 'Gloom', signature: 'Glow', authority: 'Cosmic', authorityExplanation: 'Ask the sky.',
    };
    const text = localizeHumanDesign(odd, marked());
    expect(text).toMatchObject({ typeKey: null, info: null, cases: [], script: null, strategy: 'Float', authority: 'Cosmic', authorityExplanation: 'Ask the sky.' });
    expect(hdBodyName('Chiron', marked())).toBe('Chiron');
  });

  const known = paths(corpus).sort();
  for (const lng of ['ja', 'ko', 'zh']) {
    it(`${lng} content-humanDesign.json translates every corpus path, and only those`, () => {
      const data = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'content-humanDesign.json'), 'utf8')) as unknown;
      expect(paths(data).sort()).toEqual(known);
      for (const p of known) {
        const v = valueAt(data, p);
        const en = String(valueAt(corpus, p));
        expect(typeof v === 'string' && v.trim().length > 0, `${lng} ${p}`).toBe(true);
        expect(v, `${lng} ${p} is still English`).not.toBe(en);
        // House rules: no "!" in any locale; no Latin words left in CJK copy;
        // the emphasis marks and placeholders the English carries survive.
        expect(String(v), `${lng} ${p}`).not.toMatch(/[!！]/);
        expect(String(v).replace(/\{\{\w+\}\}/g, ''), `${lng} ${p}`).not.toMatch(/[A-Za-z]{2,}/);
        expect(placeholders(String(v)), `${lng} ${p}`).toBe(placeholders(en));
        expect((String(v).match(/\*/g) ?? []).length, `${lng} ${p} emphasis`).toBe((en.match(/\*/g) ?? []).length);
      }
    });
  }
});
