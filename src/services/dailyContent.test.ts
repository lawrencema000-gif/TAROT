import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import i18n from '../i18n/config';
import { generateDailyReading, type DailyReading } from './dailyContent';
import { finalConsonant } from '../i18n/koJosa';
import type { ZodiacSign } from '../types';

/**
 * The deterministic daily horoscope (Readings → Horoscope → more insights:
 * shadow, caution, mini-ritual). Its templates are filled from the sign's
 * profile and from vocabulary lists, and three things broke the lines:
 *
 *  - ja (and ko) filled noun slots with adjectives and verb phrases:
 *    「今日の緊張は過度に信頼するに関わること」, 「衝動的を、どうすれば…」 (Q31);
 *  - {sign}, {element} and {planet} were the English keys in every locale:
 *    「airの性質が」, "수호성 Jupiter이", 「Pisces的阴影」;
 *  - ko particles were written for one noun and filled with many
 *    ("{challenge}이" with 거리 두기, "{area}로" with 자기 성장).
 */
const SIGNS: ZodiacSign[] = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const FIELDS = ['general', 'love', 'career', 'wellness', 'reflection', 'shadow', 'caution', 'miniRitual'] as const;
const LOCALES = join(process.cwd(), 'src/i18n/locales');
const load = (lng: string, ns: string) => JSON.parse(readFileSync(join(LOCALES, lng, `${ns}.json`), 'utf8'));

/** Every line a locale produces over a year of dates (every sixth day), all signs. */
async function lines(lng: string): Promise<string[]> {
  await i18n.changeLanguage(lng);
  const out = new Set<string>();
  const start = Date.UTC(2026, 0, 1);
  for (const sign of SIGNS) {
    for (let d = 0; d < 366; d += 6) {
      const date = new Date(start + d * 86400000).toISOString().slice(0, 10);
      const reading: DailyReading = generateDailyReading({ sign, date });
      for (const f of FIELDS) out.add(reading[f]);
    }
  }
  return [...out];
}

const produced: Record<string, string[]> = {};
beforeAll(async () => {
  for (const lng of ['en', 'ja', 'ko', 'zh']) produced[lng] = await lines(lng);
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('daily horoscope lines', () => {
  it.each(['ja', 'ko', 'zh'])('%s: no English word and no unfilled slot', (lng) => {
    expect(produced[lng].length).toBeGreaterThan(300);
    expect(produced[lng].filter((s) => /[A-Za-z]/.test(s))).toEqual([]);
    expect(produced[lng].filter((s) => /[{}]/.test(s))).toEqual([]);
  });

  it('ja: the sign, its element and its ruler are named in Japanese', () => {
    const ja = produced.ja.join('\n');
    expect(ja).toMatch(/魚座の影は/);
    expect(ja).toMatch(/[火地風水]の性質が/);
    expect(ja).toMatch(/守護星(太陽|月|水星|金星|火星|木星|土星|天王星|海王星|冥王星)が/);
  });

  it('English keeps the words it always had', () => {
    const en = produced.en.join('\n');
    expect(en).toMatch(/Your (fire|earth|air|water) nature/);
    expect(en).toMatch(/(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces) at its worst: /);
    expect(produced.en.filter((s) => /[぀-ヿ一-鿿가-힣]/.test(s))).toEqual([]);
  });

  it('ja: the lines the QA run quoted no longer occur', () => {
    const ja = produced.ja.join('\n');
    for (const bad of ['過度に信頼するに', '衝動的を', '思いやりのあるを', 'ユーモアのセンスが素晴らしいを', '恐れるの不安', '一貫性がないの']) {
      expect(ja.includes(bad), bad).toBe(false);
    }
  });
});

describe('ja trait words fill noun slots', () => {
  const profiles = load('ja', 'zodiac').profiles as Record<string, { strengths: string[]; challenges: string[]; loveStyle: string }>;
  // A noun phrase does not end in a verb's dictionary form, an i-adjective,
  // a past form, an attributive な/の or a bare -的 stem.
  const inflected = /([うくぐすつぬぶむるいたなのだ]|的)$/;

  it('strengths and challenges are nouns (が/を/に/へ/と/の/という take them)', () => {
    const bad: string[] = [];
    for (const [sign, p] of Object.entries(profiles)) {
      for (const w of [...p.strengths, ...p.challenges]) if (inflected.test(w)) bad.push(`${sign}: ${w}`);
    }
    expect(bad).toEqual([]);
  });

  it('a love style takes 〜な (「{loveStyle}な愛し方」)', () => {
    // A na-adjective stem (献身的, 誠実, 話し上手), not a verb or i-adjective
    // ("コミュニケーションに富む", "コミットされている") and not a list ("育み、保護的").
    const bad = Object.entries(profiles)
      .filter(([, p]) => /[うくぐすつぬぶむるいたなのだ]$/.test(p.loveStyle) || p.loveStyle.includes('、'))
      .map(([sign, p]) => `${sign}: ${p.loveStyle}`);
    expect(bad).toEqual([]);
  });
});

describe('ko daily lines', () => {
  const profiles = load('ko', 'zodiac').profiles as Record<string, { strengths: string[]; challenges: string[]; careerStrengths: string[]; loveStyle: string }>;
  const app = load('ko', 'app');
  const di = app.dailyInsights;

  it('strengths and challenges are nouns, not attributive adjectives', () => {
    // 용감한, 결단력 있는, 개척하는, 공정한 마음의 … cannot carry a particle.
    const attributive = /(한|인|는|운|은|된|진|던|린|할|일|울|다)$|[^주]의$/;
    const bad: string[] = [];
    for (const [sign, p] of Object.entries(profiles)) {
      for (const w of [...p.strengths, ...p.challenges]) if (attributive.test(w)) bad.push(`${sign}: ${w}`);
    }
    expect(bad).toEqual([]);
  });

  it('a love style is attributive, and the templates set it before a noun', () => {
    for (const [sign, p] of Object.entries(profiles)) {
      const f = finalConsonant(p.loveStyle);
      expect(f === 4 || p.loveStyle.endsWith('는'), `${sign}: ${p.loveStyle}`).toBe(true);
    }
    const all = Object.values(di).flatMap((v) => (Array.isArray(v) ? v : [])).filter((s): s is string => typeof s === 'string');
    expect(all.filter((s) => s.includes('{loveStyle}') && !s.includes('{loveStyle} '))).toEqual([]);
  });

  it('every particle after a filled word agrees with that word', () => {
    const values = new Set<string>();
    for (const p of Object.values(profiles)) for (const w of [...p.strengths, ...p.challenges, ...p.careerStrengths]) values.add(w);
    for (const k of ['focusAreas', 'loveActions', 'workActivities', 'selfCareActivities', 'careerActions', 'aspirations', 'approaches', 'healingActivities', 'nurturing', 'healthFocuses']) {
      for (const w of di[k] as string[]) values.add(w);
    }
    for (const d of di.dayThemes as Array<{ theme: string; focus: string }>) { values.add(d.theme); values.add(d.focus); }
    for (const p of Object.values(di.planets as Record<string, { theme: string }>)) values.add(p.theme);
    for (const e of Object.values(di.elements as Record<string, { energy: string }>)) values.add(e.energy);
    for (const e of Object.values(app.profile.elements as Record<string, string>)) values.add(e);
    for (const s of ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '궁수자리', '염소자리', '물병자리', '물고기자리']) values.add(s);
    for (const s of ['태양', '달', '수성', '금성', '화성', '목성', '토성', '천왕성', '해왕성', '명왕성']) values.add(s);

    const alt = [...values].sort((a, b) => b.length - a.length).map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp(`(${alt})(["”」]?)(이에요|예요|이라는|라는|으로|이|가|을|를|은|는|과|와|로)(?![가-힣])`, 'g');
    const want = (word: string, p: string) => {
      const f = finalConsonant(word);
      const c = f !== null && f > 0;
      if (p === '이에요' || p === '예요') return c ? '이에요' : '예요';
      if (p === '이라는' || p === '라는') return c ? '이라는' : '라는';
      if (p === '으로' || p === '로') return c && f !== 8 ? '으로' : '로';
      const pairs: Record<string, [string, string]> = { 이: ['이', '가'], 가: ['이', '가'], 을: ['을', '를'], 를: ['을', '를'], 은: ['은', '는'], 는: ['은', '는'], 과: ['과', '와'], 와: ['과', '와'] };
      return c ? pairs[p][0] : pairs[p][1];
    };
    const wrong: string[] = [];
    let checked = 0;
    for (const s of produced.ko) {
      for (const m of s.matchAll(re)) {
        checked += 1;
        if (m[3] !== want(m[1], m[3])) wrong.push(`${m[1]}${m[2]}${m[3]} — ${s}`);
      }
    }
    expect(checked).toBeGreaterThan(300);
    expect(wrong).toEqual([]);
    expect(produced.ko.filter((s) => /\((가|이|와|과|를|을|는|은|으)\)/.test(s))).toEqual([]);
  });
});
