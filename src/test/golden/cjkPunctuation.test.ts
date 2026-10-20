import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as astrologyContent from '../../../supabase/functions/_shared/astrology-content.ts';
import * as astrologyContentExtra from '../../../supabase/functions/_shared/astrology-content-extra.ts';

/*
 * Japanese and Chinese strings use full-width punctuation: ？！、，；：（）.
 * An ASCII mark written against Japanese or Chinese text reads as a machine
 * translation ("キャンセルできますか?", "不是奢侈,是燃料。"). This gate holds the
 * ja and zh locale files to it, and the ja and zh rows of the edge
 * functions' own copy.
 *
 * A mark counts only when it touches CJK text: ASCII ? ! , ; directly after a
 * CJK character or directly before one (spaces between are ignored), a colon
 * directly after one, and ASCII parentheses around CJK text. Placeholders
 * ({{n}}), tags, $t() nesting and URLs are ignored, and so are numbers
 * (1,000 and 9:00).
 */

const ROOT = join(__dirname, '..', '..', 'i18n', 'locales');
const CJK = '\\u3000-\\u303f\\u3040-\\u309f\\u30a0-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uff00-\\uffef';
const PROTECT = /\{\{.*?\}\}|<[^>]*>|\$t\([^)]*\)|https?:\/\/\S+/g;
const AFTER_CJK = new RegExp(`[${CJK}][?!,;:]`);
const BEFORE_CJK = new RegExp(`(^|[^0-9])[?!,;] *[${CJK}]`);
const PARENS = new RegExp(`\\([^()]*[${CJK}][^()]*\\)`);

function strings(node: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${path}.${i}`, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) strings(v, path ? `${path}.${k}` : k, out);
  }
}

/** An ASCII mark against CJK text, by the rules above. */
function misPunctuated(raw: string): boolean {
  const s = raw.replace(PROTECT, '');
  return AFTER_CJK.test(s) || BEFORE_CJK.test(s) || PARENS.test(s);
}

function violations(lng: 'ja' | 'zh'): string[] {
  const bad: string[] = [];
  for (const file of readdirSync(join(ROOT, lng)).filter((f) => f.endsWith('.json'))) {
    const all: Array<[string, string]> = [];
    strings(JSON.parse(readFileSync(join(ROOT, lng, file), 'utf8')), '', all);
    for (const [path, raw] of all) {
      if (misPunctuated(raw)) bad.push(`${lng}/${file} ${path}: ${raw.slice(0, 80)}`);
    }
  }
  return bad;
}

describe('CJK punctuation', () => {
  it.each(['ja', 'zh'] as const)('%s strings use full-width marks next to CJK text', (lng) => {
    expect(violations(lng)).toEqual([]);
  });
});

/*
 * astrology-daily writes its lines from the tables in
 * supabase/functions/_shared/astrology-content.ts, and astrology-weekly and
 * -monthly from those in _shared/astrology-content-extra.ts, each keyed by
 * locale. Those rows are not locale files, and the gate above never read
 * them: every Japanese journal prompt ended in an ASCII "?"
 * (「…最後に感じたのはいつ?」), and the Chinese rows of both files used ","
 * and "?" throughout (「…行动,原本紧闭的门…」, 「…勇敢前行,承担创意风险…」,
 * p10 d2-ja-05, d3-ko-08). Every exported table with a ja or zh row is read,
 * so a table added later is held to it too.
 */
function edgeStrings(tables: Record<string, unknown>, lng: 'ja' | 'zh'): Array<[string, string]> {
  const all: Array<[string, string]> = [];
  for (const [name, table] of Object.entries(tables)) {
    if (table && typeof table === 'object' && lng in table) strings((table as Record<string, unknown>)[lng], `${name}.${lng}`, all);
  }
  return all;
}

/** Each file of edge copy, and how many ja (or zh) strings it holds at least, so neither can pass on nothing. */
const EDGE_COPY = [
  // Themes, summaries, categories, lists, prompts.
  ['astrology-content.ts', astrologyContent, 200],
  // Storylines, aspect lines and advice, moon themes, overviews, outer planets.
  ['astrology-content-extra.ts', astrologyContentExtra, 140],
] as const;

/*
 * Two more ASCII marks the rules above do not cover were in the same rows:
 * "--" for a dash (「{sign}の新月 -- 意図を立てる」) and straight quotes
 * (「对他人的邀请与建议说'是'」). The rows write — and —— for a dash and
 * 「」 or “” for quotes.
 */
const ASCII_DASH_OR_QUOTE = /--|['"]/;

describe('CJK punctuation in the edge functions’ copy', () => {
  for (const [file, tables, min] of EDGE_COPY) {
    it.each(['ja', 'zh'] as const)(`%s rows of _shared/${file} use full-width marks next to CJK text`, (lng) => {
      const all = edgeStrings(tables, lng);
      expect(all.length).toBeGreaterThan(min);
      expect(all.filter(([, raw]) => misPunctuated(raw)).map(([path, raw]) => `${path}: ${raw.slice(0, 80)}`)).toEqual([]);
    });

    it.each(['ja', 'zh'] as const)(`%s rows of _shared/${file} write no "--" dash and no straight quotes`, (lng) => {
      const all = edgeStrings(tables, lng);
      expect(all.filter(([, raw]) => ASCII_DASH_OR_QUOTE.test(raw)).map(([path, raw]) => `${path}: ${raw.slice(0, 80)}`)).toEqual([]);
    });
  }
});
