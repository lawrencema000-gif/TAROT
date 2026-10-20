import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHART_TYPES } from '../../data/chartSuiteContent';

/**
 * Sentences on the Eastern-systems screens that used to be spliced or
 * counted by hand, held in all four locales.
 */
const app = (lng: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'app.json'), 'utf8'));
const LOCALES = ['en', 'ja', 'ko', 'zh'] as const;

describe('the sukuyō note is one sentence per language (P7 F29/F81)', () => {
  it('each locale wraps the name in one <gold> tag and closes the clause in its own punctuation', () => {
    const closes: Record<string, RegExp> = {
      en: /<gold>\{\{mansion\}\}<\/gold>\. Both/,
      ja: /あなたの宿は<gold>\{\{mansion\}\}<\/gold>です。どちらも/,
      ko: /당신의 수는 <gold>\{\{mansion\}\}<\/gold>예요\. 둘 다/,
      zh: /它把你归入<gold>\{\{mansion\}\}<\/gold>。两者/,
    };
    for (const lng of LOCALES) {
      const m = app(lng).mansions;
      expect(m.sukuyo, lng).toMatch(closes[lng]);
      expect(m.sukuyo.match(/\{\{mansion\}\}/g), lng).toHaveLength(1);
      // The spliced halves are gone, so nothing can glue an ASCII full stop into ja/zh again.
      expect(m.sukuyoBefore, lng).toBeUndefined();
      expect(m.sukuyoAfter, lng).toBeUndefined();
    }
    for (const lng of ['ja', 'zh']) expect(app(lng).mansions.sukuyo, lng).not.toMatch(/[぀-鿿]\. /);
  });
});

describe('/charts counts its own list (P7 F62/F90)', () => {
  it('every locale interpolates the count; none hard-codes one', () => {
    expect(CHART_TYPES.length).toBe(14);
    for (const lng of LOCALES) {
      const s: string = app(lng).chartSuite.subtitle;
      expect(s, lng).toContain('{{n}}');
      expect(s.replace('{{n}}', ''), lng).not.toMatch(/\d|thirteen|fourteen|十三|十四|열세|열네/i);
    }
    expect(app('en').chartSuite.subtitle.replace('{{n}}', String(CHART_TYPES.length))).toMatch(/^14 ways to read a moment/);
  });
});

describe('the Zi Wei chart centre names the lunar calendar in each language', () => {
  it('ziwei.lunarDate: 農曆 / 旧暦 / 음력 / 农历', () => {
    expect(LOCALES.map((l) => app(l).ziwei.lunarDate)).toEqual(['農曆 {{date}}', '旧暦 {{date}}', '음력 {{date}}', '农历 {{date}}']);
  });
});
