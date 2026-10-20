import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p10 d2-ja-07: the close-call box is rendered only when the scorer reports
 * a tie (CloseCall in src/components/quizzes/shared.tsx names every tied
 * result). Its copy described a narrow gap instead: a love-language result
 * scored 15 and 15 read 「肯定の言葉 / 共に過ごす時間と同率」 above a box headed
 * 「僅差」 that said the scores differed 「ほんのわずか」. English said "Close
 * call … scored within a hair of each other", Korean 근소한 차이, Chinese
 * 只差一点点. In every language the box now says the scores are the same.
 */

const read = (lng: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'app.json'), 'utf8'));
const KEYS = ['closeCall', 'closeCallBody', 'closeCallBodyMany'] as const;

/** Words for a narrow gap, and words for equal scores, per language. */
const NARROW: Record<string, RegExp> = {
  en: /hair|close call|narrow|nearly|almost|slight/i,
  ja: /僅差|わずか|差/,
  ko: /근소|거의|차이/,
  zh: /只差|一点点|难分高下|相差|差距/,
};
const EQUAL: Record<string, RegExp> = {
  en: /\bthe same\b|\btied\b/i,
  ja: /同じ|同率|同点/,
  ko: /같아요|동점/,
  zh: /相同|并列/,
};

describe('the close-call box describes a tie (p10 d2-ja-07)', () => {
  it.each(['en', 'ja', 'ko', 'zh'])('%s: the heading and both bodies say the scores are equal, not close', (lng) => {
    const sections = read(lng).quizzes.resultSections as Record<string, string>;
    for (const key of KEYS) {
      expect(sections[key], `${lng} ${key}`).not.toMatch(NARROW[lng]);
      expect(sections[key], `${lng} ${key}`).toMatch(EQUAL[lng]);
    }
  });

  it('ja: the box’s heading is the word the verdict line uses for the same tie', () => {
    const sections = read('ja').quizzes.resultSections as Record<string, string>;
    expect(sections.coPrimary).toBe(`{{name}}と${sections.closeCall}`);
  });
});
