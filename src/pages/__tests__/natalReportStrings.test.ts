import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * The paid natal report's own strings, in every locale (p8 F26, F77, F31,
 * F60). The report was rebuilt as fully localized, but the variant tabs read
 * 'Natal / 오늘의 Transits / Progressions / Solar return / Synastry' in
 * Korean, 'Computing…' and 'Age 35' in ja/ko/zh, the unlock buttons said
 * "200 Moonstonesでアンロック", and the synastry rows dropped whose planet is
 * whose in en/ko. Values that stay English look the same as a key that was
 * never translated, so they are pinned here.
 */

const load = (lng: string, ns: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, `${ns}.json`), 'utf8')) as Record<string, unknown>;
const at = (o: unknown, path: string) => path.split('.').reduce<unknown>((cur, k) => (cur as Record<string, unknown>)?.[k], o);

const en = load('en', 'app');
const LOCALES = ['ja', 'ko', 'zh'] as const;

/** Shown on the report; each must exist and differ from the English in ja/ko/zh. */
const REPORT_KEYS = [
  'natalReport.variant.natal',
  'natalReport.variant.transits',
  'natalReport.variant.progressions',
  'natalReport.variant.solar-return',
  'natalReport.variant.synastry',
  'natalReport.bigThreeHeading',
  'natalReport.locked.feat1',
  'natalReport.computing',
  'natalReport.progressedAge',
  'natalReport.unlockCta',
  'natalReport.upgradeToPremium',
  'natalReport.crossAspectRow',
];

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe('natal report strings', () => {
  for (const lng of LOCALES) {
    const app = load(lng, 'app');
    it(`${lng}: every report string is translated and keeps its placeholders`, () => {
      for (const key of REPORT_KEYS) {
        const local = at(app, key);
        const english = at(en, key) as string;
        expect(typeof local, `${lng} ${key}`).toBe('string');
        expect(local, `${lng} ${key} is still English`).not.toBe(english);
        expect(placeholders(local as string), `${lng} ${key}`).toEqual(placeholders(english));
        // No English words left in the CJK copy (F26: 'Transits', 'Big Three', 'Computing', 'Age').
        expect((local as string).replace(/\{\{\w+\}\}/g, ''), `${lng} ${key}`).not.toMatch(/[A-Za-z]{3,}/);
      }
    });

    it(`${lng}: the unlock buttons name Moonstones in ${lng} (F77)`, () => {
      for (const report of ['natalReport', 'yearAhead', 'careerReport']) {
        expect(at(app, `${report}.unlockCta`), `${lng} ${report}`).not.toMatch(/Moonstone/i);
      }
    });
  }

  it('en and ko name whose planet is whose in a cross-aspect row, as ja and zh do (F31)', () => {
    expect(at(en, 'natalReport.crossAspectRow')).toBe('Their {{partner}} {{type}} your {{natal}}');
    const ko = at(load('ko', 'app'), 'natalReport.crossAspectRow') as string;
    expect(ko).toMatch(/파트너의 \{\{partner\}\}/);
    expect(ko).toMatch(/나의 \{\{natal\}\}/);
  });

  it('the last onboarding step says Finish, short enough for one line beside Back (F60)', () => {
    const want = { en: 'Finish', ja: '完了', ko: '완료', zh: '完成' } as const;
    for (const [lng, label] of Object.entries(want)) {
      const ob = load(lng, 'onboarding');
      expect(at(ob, 'oauth.finish'), lng).toBe(label);
      expect(at(ob, 'oauth.beginJourney'), `${lng}: the old label is gone`).toBeUndefined();
    }
  });
});
