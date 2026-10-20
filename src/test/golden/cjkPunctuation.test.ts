import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * Japanese and Chinese strings use full-width punctuation: ？！、，；：（）.
 * An ASCII mark written against Japanese or Chinese text reads as a machine
 * translation ("キャンセルできますか?", "不是奢侈,是燃料。"). This gate holds the
 * ja and zh locale files to it.
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

function violations(lng: 'ja' | 'zh'): string[] {
  const bad: string[] = [];
  for (const file of readdirSync(join(ROOT, lng)).filter((f) => f.endsWith('.json'))) {
    const all: Array<[string, string]> = [];
    strings(JSON.parse(readFileSync(join(ROOT, lng, file), 'utf8')), '', all);
    for (const [path, raw] of all) {
      const s = raw.replace(PROTECT, '');
      if (AFTER_CJK.test(s) || BEFORE_CJK.test(s) || PARENS.test(s)) bad.push(`${lng}/${file} ${path}: ${raw.slice(0, 80)}`);
    }
  }
  return bad;
}

describe('CJK punctuation', () => {
  it.each(['ja', 'zh'] as const)('%s strings use full-width marks next to CJK text', (lng) => {
    expect(violations(lng)).toEqual([]);
  });
});
