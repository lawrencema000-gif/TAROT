import { describe, it, expect } from 'vitest';
import {
  ASPECT_BRIEFS,
  PLANET_NAMES,
  buildAspectBrief,
  type AspectType,
  type Locale,
} from '../../../supabase/functions/_shared/astrology-content.ts';
import { finalConsonant } from '../../i18n/koJosa';

/**
 * astrology-daily's transit lines (buildAspectBrief). The ko templates write
 * two-form markers (이(가), 과(와), 을(를)) or one form chosen for some planet
 * ("{natalPlanet}으로"), and the line used to print them as written:
 * "목성과(와) 달이(가) 한목소리로 말합니다." (Q26). Every Korean planet name is
 * known when the line is built, so every particle can agree with it.
 */
const PLANETS = Object.keys(PLANET_NAMES.en);
const ASPECTS = Object.keys(ASPECT_BRIEFS.en) as AspectType[];
const LOCALES: Locale[] = ['en', 'ja', 'ko', 'zh'];

/** Every brief for one locale: each aspect, each ordered pair of different planets. */
function allBriefs(locale: Locale): string[] {
  const out: string[] = [];
  for (const aspect of ASPECTS) {
    for (const t of PLANETS) for (const n of PLANETS) if (t !== n) out.push(buildAspectBrief(locale, t, aspect, n));
  }
  return out;
}

/** The particle each 받침 class takes, independent of the helper's tables. */
function expected(name: string, particle: string): string {
  const f = finalConsonant(name);
  const consonant = f !== null && f > 0;
  switch (particle) {
    case '이': case '가': return consonant ? '이' : '가';
    case '을': case '를': return consonant ? '을' : '를';
    case '은': case '는': return consonant ? '은' : '는';
    case '과': case '와': return consonant ? '과' : '와';
    case '으로': case '로': return consonant && f !== 8 ? '으로' : '로';
    default: return particle;
  }
}

describe('Korean transit lines', () => {
  const ko = allBriefs('ko');
  const names = Object.values(PLANET_NAMES.ko).sort((a, b) => b.length - a.length).join('|');
  const onName = new RegExp(`(${names})(으로|이|가|을|를|은|는|과|와|로)(?![가-힣])`, 'g');

  it('print no two-form particle and no unfilled slot', () => {
    expect(ko.filter((s) => /\((가|이|와|과|를|을|는|은|으)\)/.test(s))).toEqual([]);
    expect(ko.filter((s) => /[{}]/.test(s))).toEqual([]);
  });

  it('give every planet name the particle its last syllable takes', () => {
    const wrong: string[] = [];
    let checked = 0;
    for (const s of ko) {
      for (const m of s.matchAll(onName)) {
        checked += 1;
        if (m[2] !== expected(m[1], m[2])) wrong.push(`${m[1]}${m[2]} in: ${s}`);
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(wrong).toEqual([]);
  });

  it('read as the QA run expected', () => {
    expect(ko).toContain('목성과 달이 한목소리로 말합니다. 갑자기 분명해진 것에 주목하세요.');
    expect(ko).toContain('수성과 천왕성이 조용히 협력합니다. 가벼운 초대에 \'네\'라고 답해 보세요.');
    // 달 ends in ㄹ: 로, not 으로.
    expect(ko.some((s) => s.includes('에서 달로 흐르는'))).toBe(true);
    expect(ko.some((s) => s.includes('달으로'))).toBe(false);
  });
});

describe('the other locales', () => {
  it('are filled exactly as before (plain substitution)', () => {
    for (const locale of LOCALES.filter((l) => l !== 'ko')) {
      for (const aspect of ASPECTS) {
        for (const t of PLANETS) for (const n of PLANETS) {
          if (t === n) continue;
          const brief = buildAspectBrief(locale, t, aspect, n);
          const variant = ASPECT_BRIEFS[locale][aspect].find(
            (v) => v.split('{transitPlanet}').join(PLANET_NAMES[locale][t]).split('{natalPlanet}').join(PLANET_NAMES[locale][n]) === brief,
          );
          expect(variant, `${locale} ${aspect} ${t}>${n}`).toBeDefined();
        }
      }
    }
  });
});
