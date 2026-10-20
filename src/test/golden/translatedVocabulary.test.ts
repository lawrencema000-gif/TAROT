import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * English left in the Japanese, Korean and Chinese strings (p10 QA):
 *  - d3-ko-02: the compatibility invite offered its kinds as 'Zodiac',
 *    'Enneagram' and 'Big Five' (ja: every kind, 'Personality (MBTI)' and
 *    'Element' too);
 *  - d3-ko-03: the referral sheet said 'Moonstone' where the rest of the app
 *    says 문스톤, and the advisor screens 'Moonstones', '30% platform fee',
 *    'Email …' and 'Contact … if you believe this is wrong' in all three;
 *    zh said 月石 on five screens and 月光石 on ninety;
 *  - d2-ja-09: the systems list named Human Design 'HD', with
 *    「ヒューマンデザイン」 on its own gate and page.
 * The app's own vocabulary is translated in every UI namespace. Brand names
 * (Arcana, Google Play, App Store, Stripe) and standard abbreviations (MBTI,
 * AI, XP) stay in Latin, as do the names of people.
 */

const ROOT = join(process.cwd(), 'src', 'i18n', 'locales');
const NS = ['app', 'common', 'onboarding', 'landing'] as const;
const LANGS = ['ja', 'ko', 'zh'] as const;

function flat(node: unknown, path: string, out: Array<[string, string]>): Array<[string, string]> {
  if (typeof node === 'string') out.push([path, node]);
  else if (Array.isArray(node)) node.forEach((v, i) => flat(v, `${path}.${i}`, out));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) flat(v, path ? `${path}.${k}` : k, out);
  return out;
}
const read = (lng: string, ns: string) => JSON.parse(readFileSync(join(ROOT, lng, `${ns}.json`), 'utf8'));
const strings = (lng: string) => NS.flatMap((ns) => flat(read(lng, ns), '', []).map(([k, v]) => [`${ns}:${k}`, v] as const));
/** Placeholders, markup, URLs, a bare domain path and e-mail addresses are not words. */
const PROTECT = /\{\{.*?\}\}|<[^>]*>|\$t\([^)]*\)|https?:\/\/\S+|[\w.+-]+@[\w.-]+|\b[\w-]+\.app\/\S*/g;

/** The app's own vocabulary: each has a translation in every language. */
const VOCABULARY = /\b(?:Moonstones?|Zodiac|Enneagram|Big Five|Premium|Element|Personality|Human Design|HD|Tarot|Horoscope|Journal|Quiz(?:zes)?|Readings?|Spreads?|Advisors?|Community|E-?mail|Contact)\b/;
/** Runs of English words that are names: a store, a payment product, people, the copyright line. */
const NAMES = /^(?:Google Play|App Store|Stripe Connect|Kristin Neff|Jim Lewis|All rights reserved)$/;
const ENGLISH_RUN = /[A-Za-z][a-z’']+(?:[ -][A-Za-z][a-z’']+)+/g;

describe('the Japanese, Korean and Chinese strings carry no English UI words (p10 d3-ko-02, d3-ko-03, d2-ja-09)', () => {
  it.each(LANGS)('%s: none of the app’s own vocabulary is left in English', (lng) => {
    const hits = strings(lng)
      .map(([k, v]) => [k, v.replace(PROTECT, ' ')] as const)
      .filter(([, v]) => VOCABULARY.test(v))
      .map(([k, v]) => `${k}: ${v.slice(0, 80)}`);
    expect(hits).toEqual([]);
  });

  it.each(LANGS)('%s: no run of English words but a name', (lng) => {
    const hits: string[] = [];
    for (const [k, v] of strings(lng)) {
      for (const run of v.replace(PROTECT, ' ').match(ENGLISH_RUN) ?? []) if (!NAMES.test(run)) hits.push(`${k}: ${run}`);
    }
    expect(hits).toEqual([]);
  });

  it.each(LANGS)('%s: the compatibility kinds are written in the language (MBTI aside)', (lng) => {
    const kinds = read(lng, 'app').compatInvite.kinds as Record<string, string>;
    for (const [kind, label] of Object.entries(kinds)) expect(label.replace(/MBTI/g, ''), kind).not.toMatch(/[A-Za-z]/);
  });

  it.each(LANGS)('%s: the systems list names Human Design as its page and its gate do', (lng) => {
    const app = read(lng, 'app');
    expect(app.readings.tabs.humanDesign).toBe(app.humanDesign.title);
    expect(app.premium.paywall.unlocks.humanDesign.label).toBe(app.humanDesign.title);
  });

  it('one word for a Moonstone in each language', () => {
    const word: Record<(typeof LANGS)[number], RegExp> = { ja: /ムーンストーン/, ko: /문스톤/, zh: /月光石/ };
    for (const lng of LANGS) {
      const app = read(lng, 'app');
      expect(app.referral.heading, lng).toMatch(word[lng]);
      for (const key of ['costPreview', 'bookCta', 'bookedToast', 'insufficientBalance']) expect(app.advisorBooking[key], `${lng} ${key}`).toMatch(word[lng]);
      for (const key of ['cashableLabel', 'rateNote', 'cashoutMinimum', 'cashoutMinNote']) expect(app.advisorDashboard[key], `${lng} ${key}`).toMatch(word[lng]);
    }
    // 月石 is not 月光石: five zh screens said the one and ninety the other.
    expect(strings('zh').filter(([, v]) => /月石/.test(v)).map(([k]) => k)).toEqual([]);
  });
});
