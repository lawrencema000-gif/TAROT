import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PHRASES_EN } from '../phrases.en';
import * as engine from '../index';

/*
 * WP-NF-02 A11: no template claims certainty or names a medical, legal or
 * financial act, in any of the four languages. The engine takes no focus
 * input, so a Health or Money question gets no instruction of any kind
 * (NF-D5); the only card text it quotes is what the card pages print.
 */

const load = (lng: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'summary.json'), 'utf8')) as Record<string, string>;

const CERTAINTY: Record<string, RegExp> = {
  en: /\b(will|definitely|certainly|guarantee[sd]?|always|never fails|you must)\b/i,
  ja: /必ず|絶対|保証/,
  ko: /반드시|틀림없이|보장/,
  zh: /一定会|必然|保证/,
};

const ACTS: Record<string, RegExp> = {
  en: /\b(doctors?|diagnos\w*|medications?|medicines?|therap\w*|lawyers?|attorneys?|sue|lawsuits?|invest\w*|loans?|debts?|stocks?)\b/i,
  ja: /医師|医者|診断|薬|治療|セラピー|弁護士|訴え|訴訟|投資|ローン|借金|融資|株/,
  ko: /의사|진단|약물|복용|치료|테라피|변호사|소송|고소|투자|대출|빚|부채|주식/,
  zh: /医生|诊断|药物|服药|治疗|疗法|律师|起诉|诉讼|投资|贷款|借款|债务|股票/,
};

const TEMPLATES: Record<string, Record<string, string>> = {
  en: { ...PHRASES_EN },
  ja: load('ja'),
  ko: load('ko'),
  zh: load('zh'),
};

describe('the templates are safe', () => {
  for (const lng of Object.keys(TEMPLATES)) {
    it(`${lng}: no certainty word`, () => {
      const hits = Object.entries(TEMPLATES[lng]).filter(([, v]) => CERTAINTY[lng].test(v));
      expect(hits).toEqual([]);
    });

    it(`${lng}: no medical, legal or financial act`, () => {
      const hits = Object.entries(TEMPLATES[lng]).filter(([, v]) => ACTS[lng].test(v));
      expect(hits).toEqual([]);
    });
  }

  it('takes no focus input (NF-D5)', () => {
    const src = ['types.ts', 'compose.ts', 'single.ts', 'tarot.ts', 'essence.ts']
      .map((f) => readFileSync(join(process.cwd(), 'src', 'lib', 'readingSummary', f), 'utf8'))
      .join('\n');
    expect(src).not.toMatch(/\bfocus\b|FocusArea/);
    expect(Object.keys(engine)).not.toContain('summarizeByFocus');
  });
});
