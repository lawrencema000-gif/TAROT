import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PHRASES_EN, isEnOnlyKey } from '../phrases.en';

/*
 * The ja, ko and zh templates (src/i18n/locales/<lng>/summary.json) carry
 * exactly the English keys (but the English-only count words), with the same
 * placeholders. cjkPunctuation.test.ts reads every json in the ja and zh
 * folders, so it holds these files to full-width punctuation too.
 */

const OTHERS = ['ja', 'ko', 'zh'] as const;
const load = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'summary.json'), 'utf8')) as Record<string, unknown>;
const placeholders = (s: string) => [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();

/** 하십시오체 (koSpeechLevel.test.ts): a syllable closed by ㅂ before 니다 or 니까. */
function formalEndings(s: string): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(/([가-힣])니[다까]/g)) if ((m[1].charCodeAt(0) - 0xac00) % 28 === 17) out.push(m[0]);
  return out;
}

describe('summary.json', () => {
  const enKeys = Object.keys(PHRASES_EN).filter((k) => !isEnOnlyKey(k)).sort();

  it.each(OTHERS)('%s holds every English key and nothing else, as flat strings', (lng) => {
    const json = load(lng);
    expect(Object.keys(json).sort()).toEqual(enKeys);
    for (const [k, v] of Object.entries(json)) {
      expect(typeof v, k).toBe('string');
      expect((v as string).trim(), k).not.toBe('');
    }
  });

  it.each(OTHERS)('%s keeps every placeholder, name for name', (lng) => {
    const json = load(lng) as Record<string, string>;
    for (const k of enKeys) expect(placeholders(json[k]), `${lng} ${k}`).toEqual(placeholders(PHRASES_EN[k as keyof typeof PHRASES_EN]));
  });

  it('ko speaks 해요체: no 하십시오체 ending', () => {
    const hits = Object.entries(load('ko') as Record<string, string>).filter(([, v]) => formalEndings(v).length > 0);
    expect(hits).toEqual([]);
  });

  it('ja and zh hold no ASCII quote, dash pair or Latin word', () => {
    for (const lng of ['ja', 'zh'] as const) {
      for (const [k, v] of Object.entries(load(lng) as Record<string, string>)) {
        const bare = v.replace(/\{\{\s*\w+\s*\}\}/g, '');
        expect(/--|['"]/.test(bare), `${lng} ${k}`).toBe(false);
        // The playing deck's own rank letters (A, J, Q, K in zh card names) are single letters.
        expect(/[A-Za-z]{2}/.test(bare), `${lng} ${k}`).toBe(false);
      }
    }
  });
});
