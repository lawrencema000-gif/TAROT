import { describe, it, expect } from 'vitest';
import { calculateDimensional, calculateExtraQuiz, darkTriadQuiz, discQuiz } from '../../data/extraQuizzes';
import { rankDimensions, scoreSelfCompassion, selfCompassionQuiz, SELF_COMPASSION_INFO, TIE_MARGIN } from '../../data/extraQuizzesPart2';
import { calculateDosha, ayurvedaQuiz, TRIDOSHIC_INFO } from '../../data/ayurvedaQuiz';
import { calculateLoveLanguage, loveLanguageQuiz } from '../../data/quizzes';
import { calculateShadowArchetype, shadowArchetypeQuiz } from '../../data/shadowArchetypeQuiz';
import { calculateElementAffinity } from '../../data/elementAffinityQuiz';
import { calculateEnneagram, enneagramQuiz } from '../../data/enneagramQuiz';
import { calculateCourtMatch } from '../../data/tarotCourtQuiz';

/**
 * GOLDEN tests for the final Phase 7 round (F19, F65, O#160): a tie names
 * EVERY result level at the top, not the first two. Each expectation is
 * derived by hand from the rule in the scorer's comment; the arithmetic is
 * written next to it.
 */

function allAnswers(quiz: { questions: { id: string }[] }, value: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of quiz.questions) out[q.id] = value;
  return out;
}

function answersFor(
  quiz: { questions: { id: string; dimension?: string }[] },
  pick: (dimension: string | undefined, id: string) => number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of quiz.questions) out[q.id] = pick(q.dimension, q.id);
  return out;
}

describe('dimensional quizzes: `tied` is every dimension within TIE_MARGIN of the top (F65)', () => {
  it('REPRO F65: Dark Triad all-Neutral — all three means 3.0 — ties all three, narcissism first', () => {
    // 5 items each × 3 = 15 → 3.0 on every trait; 3.0 ≥ LOW_SIGNAL 2.5, so not the low card.
    const r = calculateExtraQuiz('dark-triad-v1', allAnswers(darkTriadQuiz, 3))!;
    expect(r.primary).toBe('narcissism');
    expect(r.isTie).toBe(true);
    expect(r.secondary).toBe('machiavellianism'); // unchanged: the runner-up
    expect(r.tied).toEqual(['narcissism', 'machiavellianism', 'psychopathy']);
  });

  it('DISC all-Neutral ties all four in declared order', () => {
    const r = calculateDimensional(discQuiz, allAnswers(discQuiz, 3), ['dominance', 'influence', 'steadiness', 'conscientiousness']);
    expect(r.tied).toEqual(['dominance', 'influence', 'steadiness', 'conscientiousness']);
  });

  it('only what is within the margin of the TOP: 3.4 / 3.2 / 3.0 / 1.0 ties the first two', () => {
    // dominance 4,3,3,3,4 = 17 → 3.4 ; influence 3,3,3,4,3 = 16 → 3.2 ; steadiness 15 → 3.0 ; conscientiousness 5 → 1.0
    // 3.4 − 3.2 = 0.2 ≤ 0.25 (tie) ; 3.4 − 3.0 = 0.4 > 0.25 (out).
    const pick = (d: string | undefined, id: string) =>
      d === 'dominance' ? (id === 'd1' || id === 'd5' ? 4 : 3)
        : d === 'influence' ? (id === 'i4' ? 4 : 3)
          : d === 'steadiness' ? 3
            : 1;
    const r = calculateDimensional(discQuiz, answersFor(discQuiz, pick), ['dominance', 'influence', 'steadiness', 'conscientiousness']);
    expect(r.averages.dominance).toBeCloseTo(3.4, 9);
    expect(r.averages.influence).toBeCloseTo(3.2, 9);
    expect(r.isTie).toBe(true);
    expect(r.tied).toEqual(['dominance', 'influence']);
  });

  it('rankDimensions: no tie, no list; the list always holds the runner-up when there is one', () => {
    expect(rankDimensions({ a: 5, b: 1, c: 1 }, ['a', 'b', 'c']).tied).toBeUndefined();
    const r = rankDimensions({ a: 4, b: 4 - TIE_MARGIN, c: 4 - TIE_MARGIN - 0.01 }, ['a', 'b', 'c']);
    expect(r.secondary).toBe('b');
    expect(r.tied).toEqual(['a', 'b']);
  });

  it('the low card is not a tie and names nobody: Dark Triad all-1', () => {
    const r = calculateExtraQuiz('dark-triad-v1', allAnswers(darkTriadQuiz, 1))!;
    expect(r.primary).toBe('low');
    expect(r.isTie).toBe(false);
    expect(r.tied).toBeUndefined();
  });
});

describe('calculateDosha: `tied` names every dosha level at the top (F19)', () => {
  const spread = (v: number, p: number) => {
    const out: Record<string, number> = {};
    ayurvedaQuiz.questions.forEach((q, i) => { out[q.id] = i < v ? 1 : i < v + p ? 2 : 3; });
    return out;
  };

  it('REPRO F19: 10/10/10 ties all three (Kapha included), tridoshic', () => {
    const r = calculateDosha(spread(10, 10));
    expect(r.scores).toEqual({ vata: 10, pitta: 10, kapha: 10 });
    expect(r.tridoshic).toBe(true);
    expect(r.isTie).toBe(true);
    expect(r.coPrimary).toBe('pitta');
    expect(r.tied).toEqual(['vata', 'pitta', 'kapha']);
  });

  it('13/13/4 ties two; 13/12/5 ties none', () => {
    expect(calculateDosha(spread(13, 13)).tied).toEqual(['vata', 'pitta']);
    expect(calculateDosha(spread(13, 12)).tied).toBeUndefined();
  });

  it('the tridoshic copy no longer calls the dosha below "the one currently leading" (in a tie none leads)', () => {
    expect(TRIDOSHIC_INFO.summary).not.toMatch(/leading/);
    expect(TRIDOSHIC_INFO.summary).toMatch(/a place to start/);
  });
});

describe('the curated quizzes report every key in an unbroken tie', () => {
  it('love language all-Neutral: all five, gifts first (sum 9, no 5s each)', () => {
    const r = calculateLoveLanguage(allAnswers(loveLanguageQuiz, 3));
    expect(r.isTie).toBe(true);
    expect(r.coPrimary).toBe('words');
    expect(r.tied).toEqual(['gifts', 'words', 'acts', 'touch', 'time']);
  });

  it('love language: a 5s count that breaks the tie leaves no list', () => {
    // words 5,4,3 = 12 (one 5) vs touch 4,4,4 = 12 (no 5s), others 1 → words outright.
    const ids = (d: string) => loveLanguageQuiz.questions.filter((q) => q.dimension === d).map((q) => q.id);
    const a: Record<string, number> = allAnswers(loveLanguageQuiz, 1);
    ids('words').forEach((id, i) => { a[id] = [5, 4, 3][i]; });
    ids('touch').forEach((id) => { a[id] = 4; });
    const r = calculateLoveLanguage(a);
    expect(r.primary).toBe('words');
    expect(r.tied).toBeUndefined();
  });

  it('shadow archetypes all-Neutral: all seven in declared order', () => {
    const r = calculateShadowArchetype(allAnswers(shadowArchetypeQuiz, 3));
    expect(r.tied).toEqual(['lover', 'warrior', 'magician', 'sovereign', 'sage', 'innocent', 'explorer']);
  });

  it('element: the unresolved 4-4-2 split ties fire and water (ten votes allow no wider one)', () => {
    // fire el1,2,4,5 = 4 ; water el6,7,8,10 = 4 ; air el3,el9 = 2 → el9 and el3 are both air (not tied).
    const r = calculateElementAffinity({ el1: 1, el2: 1, el3: 3, el4: 1, el5: 1, el6: 2, el7: 2, el8: 2, el9: 3, el10: 2 });
    expect(r.isTie).toBe(true);
    expect(r.tied).toEqual(['fire', 'water']);
  });

  it('court match keeps its two-way notes: a 2-2-1-1 suit split the tie-break misses', () => {
    const r = calculateCourtMatch({ ce1: 1, ce2: 1, ce3: 2, ce4: 2, ce5: 3, ce6: 4, cr1: 2, cr2: 2, cr3: 2, cr4: 2, cr5: 2, cr6: 2 });
    expect(r.elementTie).toBe(true);
    expect(r.element).toBe('wands');
  });
});

describe('calculateEnneagram: the wing tie-break weighs EVERY type at the top', () => {
  // Five items per type: all 5s = 25, all 4s = 20, all 1s = 5.
  const byType = (scores: Record<number, number>) =>
    answersFor(enneagramQuiz, (d) => scores[Number(String(d).replace('type', ''))] ?? 1);

  it('all-Neutral: nine types at 15 with equal wings → all nine tied, Type 1 first', () => {
    const r = calculateEnneagram(allAnswers(enneagramQuiz, 3));
    expect(r.primaryType).toBe(1);
    expect(r.isTie).toBe(true);
    expect(r.coPrimary).toBe(2);
    expect(r.tied).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('REPRO: 1, 5 and 7 at 25 with the Six at 20 — 5 and 7 share the best wing (20), so both are named', () => {
    // wing(1) = max(9, 2) = 5 ; wing(5) = max(4, 6) = 20 ; wing(7) = max(6, 8) = 20.
    // The old pairwise rule compared only 1 and 5 and crowned 5 outright.
    const r = calculateEnneagram(byType({ 1: 5, 5: 5, 7: 5, 6: 4 }));
    expect(r.primaryType).toBe(5);
    expect(r.isTie).toBe(true);
    expect(r.tied).toEqual([5, 7]);
  });

  it('REPRO: 1, 5 and 7 at 25 with the Eight at 20 — only 7 is supported (wing 20), so it wins outright', () => {
    // wing(1) = max(9, 2) = 5 ; wing(5) = max(4, 6) = 5 ; wing(7) = max(6, 8) = 20.
    // The old rule compared 1 and 5 (5 = 5) and reported "Type 1, close call with Type 5".
    const r = calculateEnneagram(byType({ 1: 5, 5: 5, 7: 5, 8: 4 }));
    expect(r.primaryType).toBe(7);
    expect(r.isTie).toBe(false);
    expect(r.tied).toBeUndefined();
  });
});

describe('scoreSelfCompassion: up to three components named; the bands point at nothing (O#160)', () => {
  const positives = new Set(['self-kind', 'common-humanity', 'mindful']);

  it('REPRO O#160 (a): all "Strongly agree" — total (5 + 1) / 2 = 3, moderate — the three negatives sit at coded 1 and are all named', () => {
    const r = scoreSelfCompassion(allAnswers(selfCompassionQuiz, 5));
    expect(r.primary).toBe('moderate');
    expect([r.extra?.weakest, r.extra?.weakestAlso, r.extra?.weakestThird]).toEqual(['self-judging', 'isolation', 'over-identified']);
  });

  it('all "Strongly disagree" — moderate — the three positives at coded 1 are named', () => {
    const r = scoreSelfCompassion(allAnswers(selfCompassionQuiz, 1));
    expect(r.primary).toBe('moderate');
    expect([r.extra?.weakest, r.extra?.weakestAlso, r.extra?.weakestThird]).toEqual(['self-kind', 'common-humanity', 'mindful']);
  });

  it('four components level at the bottom name none: self-kind and common humanity 5, the rest Neutral', () => {
    // coded: self-kind 5, common-humanity 5, the other four 3 → four at the bottom.
    const r = scoreSelfCompassion(answersFor(selfCompassionQuiz, (d) => (d === 'self-kind' || d === 'common-humanity' ? 5 : 3)));
    expect(r.extra?.weakest).toBeUndefined();
    expect(r.extra?.weakestThird).toBeUndefined();
  });

  it('REPRO O#160 (b): the minimum (positives 1, negatives 5) is low and level — nothing named', () => {
    const r = scoreSelfCompassion(answersFor(selfCompassionQuiz, (d) => (positives.has(d ?? '') ? 1 : 5)));
    expect(r.primary).toBe('low');
    expect(r.extra?.weakest).toBeUndefined();
  });

  it('no band summary points at "the component below" (the card says it, when there is one)', () => {
    for (const band of ['low', 'moderate', 'high'] as const) {
      expect(SELF_COMPASSION_INFO[band].summary, band).not.toMatch(/component below|below is/i);
    }
  });
});
