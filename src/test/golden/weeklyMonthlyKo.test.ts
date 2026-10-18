// @vitest-environment node
/**
 * p9 QT2 (requests 2, 3): the Korean weekly and monthly forecasts printed
 * both particle forms and particles cut off from their nouns. The weekly
 * key moment glued a fragment between the names — "목성이(가) 과(와) 강력히
 * 융합합니다. 대상은 당신의 네이탈 달" — the monthly key date read "수성이(가)
 * 물병자리에 진입", and the outer-planet fallback "목성이(가) 양자리을(를)
 * 통과하며…". Every line that puts a name into a sentence is now built in
 * _shared/astrology-content-extra.ts, and the Korean particle on each name
 * agrees with it (ko-josa.ts). This renders every combination.
 */
import { describe, expect, it } from 'vitest';
import {
  ASPECT_ADVICE,
  ASPECT_EVENTS,
  BEST_DAYS_ACTIVITIES,
  FULL_MOON_THEMES,
  KEY_DATES,
  NEW_MOON_THEMES,
  ONE_THING,
  OUTER_PLANET_THEMES,
  OVERVIEWS,
  STORYLINES,
  monthlyIngress,
  outerPlanetFallback,
  weeklyAspectEvent,
} from '../../../supabase/functions/_shared/astrology-content-extra';
import { PLANET_NAMES, SIGN_NAMES } from '../../../supabase/functions/_shared/astrology-content';
import { koParticle } from '../../../supabase/functions/_shared/ko-josa';

const KO_PLANETS = Object.values(PLANET_NAMES.ko);
const KO_SIGNS = Object.values(SIGN_NAMES.ko);
const INNER = ['Mercury', 'Venus', 'Mars'].map((p) => PLANET_NAMES.ko[p]);
const OUTER = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].map((p) => PLANET_NAMES.ko[p]);
// Every planet and sign name ends in a consonant or in 리; names ending in a
// vowel (and in ㄹ) exercise the other forms, for whatever is named next.
const OTHER_NAMES = ['루나', '세레스', '키론', '베스타'];

/** A two-form particle, in either order, or a (이)/(으) marker. */
const DUAL = /이\(가\)|가\(이\)|을\(를\)|를\(을\)|은\(는\)|는\(은\)|과\(와\)|와\(과\)|\(으\)로|\(이\)/;
/** A particle standing on its own: written after a space, attached to no word. */
const DETACHED = /(?:^|\s)(?:이|가|을|를|은|는|과|와|의|에)(?=[\s(.,]|$)/;
const PAIR_FORMS = new Set(['이', '가', '을', '를', '은', '는', '과', '와']);

/** Each name in `line` that carries a particle carries the form that agrees with it. */
function disagreements(line: string, names: string[]): string[] {
  const out: string[] = [];
  for (const name of names) {
    let at = line.indexOf(name);
    while (at >= 0) {
      const next = line[at + name.length];
      const after = line[at + name.length + 1];
      // A one-syllable particle: the syllable after the name, then not Hangul.
      if (next && PAIR_FORMS.has(next) && !(after && /[가-힣]/.test(after)) && koParticle(name, next) !== next) {
        out.push(`${name}${next} in "${line}"`);
      }
      at = line.indexOf(name, at + name.length);
    }
  }
  return out;
}

function expectClean(line: string, names: string[]) {
  expect(line, line).not.toMatch(DUAL);
  expect(line, line).not.toMatch(DETACHED);
  expect(line, line).not.toMatch(/\{\w+\}/);
  expect(disagreements(line, names)).toEqual([]);
}

describe('ko weekly key moments: every aspect phrase with every transit and natal planet', () => {
  const phrases = Object.values(ASPECT_EVENTS.ko).flat();

  it('15 phrases, each a whole sentence with the three slots', () => {
    expect(phrases).toHaveLength(15);
    for (const p of phrases) {
      expect(p, p).toMatch(/^\{transit\}이 당신의 \{natalWord\} \{natal\}/);
      expect(p, p).toMatch(/\.$/);
    }
  });

  it('1,500 lines: no two-form or detached particle, and each particle agrees with its name', () => {
    let n = 0;
    for (const phrase of phrases) {
      for (const t of KO_PLANETS) {
        for (const nat of KO_PLANETS) {
          const line = weeklyAspectEvent('ko', phrase, t, nat);
          expectClean(line, [t, nat]);
          expect(line.startsWith(`${t}${koParticle(t, '이')} 당신의 네이탈 ${nat}`), line).toBe(true);
          n++;
        }
      }
    }
    expect(n).toBe(1500);
  });

  it('names ending in a vowel take 가 / 를 / 와', () => {
    for (const phrase of phrases) {
      for (const t of OTHER_NAMES) for (const nat of OTHER_NAMES) expectClean(weeklyAspectEvent('ko', phrase, t, nat), [t, nat]);
    }
    expect(weeklyAspectEvent('ko', ASPECT_EVENTS.ko.conjunction[1], '루나', '베스타')).toBe('루나가 당신의 네이탈 베스타와 강력하게 융합합니다.');
    expect(weeklyAspectEvent('ko', ASPECT_EVENTS.ko.sextile[1], '목성', '세레스')).toBe('목성이 당신의 네이탈 세레스를 부드럽게 깨웁니다.');
  });

  it('reads as Korean: the QA’s line, and one of each particle', () => {
    expect(weeklyAspectEvent('ko', ASPECT_EVENTS.ko.conjunction[1], '목성', '달')).toBe('목성이 당신의 네이탈 달과 강력하게 융합합니다.');
    expect(weeklyAspectEvent('ko', ASPECT_EVENTS.ko.conjunction[0], '토성', '태양')).toBe('토성이 당신의 네이탈 태양을 둘러싼 주제를 강화합니다.');
    expect(weeklyAspectEvent('ko', ASPECT_EVENTS.ko.square[0], '화성', '금성')).toBe('화성이 당신의 네이탈 금성에 관해 행동하도록 밀어붙입니다.');
  });
});

describe('ko monthly lines', () => {
  it('a planet entering a sign: 36 key dates', () => {
    for (const p of INNER) for (const s of KO_SIGNS) expectClean(monthlyIngress('ko', p, s), [p, s]);
    expect(monthlyIngress('ko', '수성', '물병자리')).toBe('수성이 물병자리에 진입');
    expect(monthlyIngress('ko', '루나', '양자리')).toBe('루나가 양자리에 진입');
  });

  it('the outer-planet fallback: 60 lines', () => {
    for (const p of OUTER) for (const s of KO_SIGNS) expectClean(outerPlanetFallback('ko', p, s), [p, s]);
    expect(outerPlanetFallback('ko', '목성', '양자리')).toBe('목성이 양자리를 통과하며 집단적 주제를 빚어냅니다.');
    expect(outerPlanetFallback('ko', '루나', '키론')).toBe('루나가 키론을 통과하며 집단적 주제를 빚어냅니다.');
  });

  it('new and full moon key dates, every sign', () => {
    for (const s of KO_SIGNS) {
      expectClean(KEY_DATES.ko.newMoonLabel.replace('{sign}', s), [s]);
      expectClean(KEY_DATES.ko.fullMoonLabel.replace('{sign}', s), [s]);
    }
  });
});

describe('every other ko weekly / monthly text', () => {
  const strings = (v: unknown): string[] =>
    typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

  it.each([
    ['ASPECT_ADVICE', ASPECT_ADVICE.ko],
    ['STORYLINES', STORYLINES.ko],
    ['BEST_DAYS_ACTIVITIES', BEST_DAYS_ACTIVITIES.ko],
    ['NEW_MOON_THEMES', NEW_MOON_THEMES.ko],
    ['FULL_MOON_THEMES', FULL_MOON_THEMES.ko],
    ['OVERVIEWS', OVERVIEWS.ko],
    ['ONE_THING', ONE_THING.ko],
    ['OUTER_PLANET_THEMES', OUTER_PLANET_THEMES.ko],
  ])('%s: no two-form particle, no unfilled slot', (_name, value) => {
    const all = strings(value);
    expect(all.length).toBeGreaterThan(0);
    for (const s of all) {
      expect(s, s).not.toMatch(DUAL);
      expect(s, s).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('the other languages read as before', () => {
  it('weekly key moments', () => {
    expect(weeklyAspectEvent('en', ASPECT_EVENTS.en.conjunction[1], 'Jupiter', 'Moon')).toBe('Jupiter merges powerfully with your natal Moon');
    expect(weeklyAspectEvent('ja', ASPECT_EVENTS.ja.conjunction[1], '木星', '月')).toBe('木星と力強く融合します、対象はあなたのネイタル月');
    expect(weeklyAspectEvent('zh', ASPECT_EVENTS.zh.conjunction[1], '木星', '月亮')).toBe('木星与之强力融合:你的本命月亮');
  });

  it('monthly key dates and the outer-planet fallback', () => {
    expect(monthlyIngress('en', 'Mercury', 'Aquarius')).toBe('Mercury enters Aquarius');
    expect(monthlyIngress('ja', '水星', '水瓶座')).toBe('水星が水瓶座に入る');
    expect(monthlyIngress('zh', '水星', '水瓶座')).toBe('水星进入水瓶座');
    expect(outerPlanetFallback('en', 'Jupiter', 'Aries')).toBe('Jupiter transits through Aries, shaping collective themes.');
    expect(outerPlanetFallback('ja', '木星', '牡羊座')).toBe('木星が牡羊座を通過し、集合的なテーマを形作ります。');
    expect(outerPlanetFallback('zh', '木星', '白羊座')).toBe('木星经过白羊座,塑造集体主题。');
  });
});
