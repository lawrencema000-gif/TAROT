import { describe, it, expect } from 'vitest';
import {
  calculateDimensional,
  calculateExtraQuiz,
  scoreBoundaries,
  discQuiz,
  darkTriadQuiz,
  burnoutQuiz,
  boundariesQuiz,
  EXTRA_QUIZZES,
  EXTRA_QUIZ_SCORING,
  TIE_MARGIN,
  LOW_SIGNAL,
} from '../../data/extraQuizzes';
import {
  jungianQuiz,
  empathQuiz,
  selfCompassionQuiz,
  scoreEmpathHsp,
  scoreSelfCompassion,
} from '../../data/extraQuizzesPart2';
import { anxietyProfileQuiz, wellnessTypeQuiz, scoreWellnessType } from '../../data/extraQuizzesPart3';
import { calculateEnneagram, enneagramQuiz } from '../../data/enneagramQuiz';
import { calculateCourtMatch } from '../../data/tarotCourtQuiz';
import { calculateElementAffinity } from '../../data/elementAffinityQuiz';
import { calculateShadowArchetype, shadowArchetypeQuiz } from '../../data/shadowArchetypeQuiz';
import { calculateDosha, ayurvedaQuiz } from '../../data/ayurvedaQuiz';

/**
 * GOLDEN tests for the Phase 7 scorer fixes (R3 §3). Every expectation is
 * derived by hand from the rule written in the scorer's own comment, not
 * by running it: the rule is quoted next to each assertion.
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

describe('calculateDimensional — ties are reported, not resolved by declaration order (F3)', () => {
  it('all-Neutral on DISC: every mean is 3, margin 0, isTie true, primary is the first declared', () => {
    const r = calculateDimensional(discQuiz, allAnswers(discQuiz, 3), ['dominance', 'influence', 'steadiness', 'conscientiousness']);
    // 5 items per dimension × 3 = 15 raw; 15 / 5 = 3.0 mean on every dimension.
    expect(r.scores.dominance).toBe(15);
    expect(r.averages.dominance).toBe(3);
    expect(r.margin).toBe(0);
    expect(r.isTie).toBe(true);
    expect(r.primary).toBe('dominance');
    expect(r.secondary).toBe('influence');
  });

  it('a clear lead is not a tie: influence 5s vs the rest 1s → margin 4', () => {
    const answers = answersFor(discQuiz, (d) => (d === 'influence' ? 5 : 1));
    const r = calculateDimensional(discQuiz, answers, ['dominance', 'influence', 'steadiness', 'conscientiousness']);
    expect(r.primary).toBe('influence');
    expect(r.isTie).toBe(false);
    expect(r.margin).toBe(4);
    expect(r.secondary).toBeUndefined();
  });

  it(`TIE_MARGIN is ${0.25}: two five-item dimensions one Likert point apart (0.2) tie; two three-item ones (0.33) do not`, () => {
    expect(TIE_MARGIN).toBe(0.25);
    // dominance: 5,5,5,5,4 = 24 → 4.8 ; influence: 5,5,5,5,5 = 25 → 5.0 ; others 1 → 1.0
    const answers = answersFor(discQuiz, (d, id) => (d === 'influence' ? 5 : d === 'dominance' ? (id === 'd5' ? 4 : 5) : 1));
    const r = calculateDimensional(discQuiz, answers, ['dominance', 'influence', 'steadiness', 'conscientiousness']);
    expect(r.primary).toBe('influence');
    expect(r.margin).toBeCloseTo(0.2, 6);
    expect(r.isTie).toBe(true);
  });
});

describe('low results when nothing is elevated (dark triad, burnout, anxiety profile)', () => {
  it(`LOW_SIGNAL is ${2.5}; all-1 on each returns the "low" card instead of the first-declared trait`, () => {
    expect(LOW_SIGNAL).toBe(2.5);
    expect(calculateExtraQuiz('dark-triad-v1', allAnswers(darkTriadQuiz, 1))?.primary).toBe('low');
    expect(calculateExtraQuiz('burnout-v1', allAnswers(burnoutQuiz, 1))?.primary).toBe('low');
    expect(calculateExtraQuiz('anxiety-profile-v1', allAnswers(anxietyProfileQuiz, 1))?.primary).toBe('low');
  });

  it('all-Neutral (mean 3.0 ≥ 2.5) is NOT low: the flat dark-triad profile is a reported tie on the first trait', () => {
    const r = calculateExtraQuiz('dark-triad-v1', allAnswers(darkTriadQuiz, 3));
    expect(r?.primary).toBe('narcissism');
    expect(r?.isTie).toBe(true);
  });

  it('a Disagree-leaning profile with one elevated trait still types the trait: psychopathy 4s, others 2s', () => {
    const answers = answersFor(darkTriadQuiz, (d) => (d === 'psychopathy' ? 4 : 2));
    const r = calculateExtraQuiz('dark-triad-v1', answers);
    expect(r?.primary).toBe('psychopathy');
    expect(r?.averages.psychopathy).toBe(4);
  });

  it('every low card has copy and is NOT a scored dimension (no bar is drawn for it)', () => {
    for (const id of ['dark-triad-v1', 'burnout-v1', 'anxiety-profile-v1']) {
      const entry = EXTRA_QUIZ_SCORING[id];
      expect(entry.lowResult).toBe('low');
      expect(entry.info.low?.name).toBeTruthy();
      expect(entry.dimensions).not.toContain('low');
    }
  });
});

describe('scoreEmpathHsp — both / neither are derived from the two traits (F4)', () => {
  it('all recorded 5 → both (both means 5 > 3.5)', () => {
    const r = scoreEmpathHsp(allAnswers(empathQuiz, 5));
    expect(r.primary).toBe('both');
    expect(r.averages.empath).toBe(5);
    expect(r.averages.hsp).toBe(5);
  });

  it('all recorded 1 → neither (both means 1 ≤ 3)', () => {
    expect(scoreEmpathHsp(allAnswers(empathQuiz, 1)).primary).toBe('neither');
  });

  it('empath items 5, hsp items 2 → empath; the reverse-keyed items belong to their trait', () => {
    const answers = answersFor(empathQuiz, (d) => (d === 'empath' ? 5 : 2));
    const r = scoreEmpathHsp(answers);
    expect(r.primary).toBe('empath');
    expect(r.isTie).toBe(false);
    // five empath items (em1-3, bt3, nn2) and seven hsp items (hs1-3, bt1, bt2, nn1, nn3)
    expect(empathQuiz.questions.filter((q) => q.dimension === 'empath')).toHaveLength(5);
    expect(empathQuiz.questions.filter((q) => q.dimension === 'hsp')).toHaveLength(7);
    for (const id of ['nn1', 'nn2', 'nn3']) {
      const q = empathQuiz.questions.find((x) => x.id === id)!;
      expect(q.options[0].label).toBe('Strongly Disagree');
      expect(q.options[0].value).toBe(5);
    }
  });

  it('empath 4, hsp 4 → a reported tie, not both (3.5 < 4 but both is > 3.5: both wins)', () => {
    // Both means 4 > 3.5 → both. The tie branch only applies below the both threshold.
    expect(scoreEmpathHsp(allAnswers(empathQuiz, 4)).primary).toBe('both');
    // empath 3.4 (5,5,5,1,1 → 17/5), hsp 3.43 (5,5,5,1,1,1,6? no — 4,4,4,3,3,3,3 → 24/7 = 3.43): neither both nor neither, tie by margin
    const answers = answersFor(empathQuiz, (d, id) =>
      d === 'empath' ? (['em1', 'em2', 'em3'].includes(id) ? 5 : 1) : ['hs1', 'hs2', 'hs3'].includes(id) ? 4 : 3,
    );
    const r = scoreEmpathHsp(answers);
    expect(r.primary).toBe('hsp'); // 3.43 > 3.4
    expect(r.isTie).toBe(true); // |3.4 − 3.43| ≤ 0.25
    expect(r.secondary).toBe('empath');
  });
});

describe('scoreWellnessType — balanced is derived (F4)', () => {
  it('flat profile (all 3) → balanced: spread between the three practices is 0 ≤ 0.5', () => {
    const r = scoreWellnessType(allAnswers(wellnessTypeQuiz, 3));
    expect(r.primary).toBe('balanced');
  });

  it('athlete 5s, healer and contemplative 1s, balance items 1 → athlete', () => {
    const answers = answersFor(wellnessTypeQuiz, (d) => (d === 'athlete' ? 5 : 1));
    const r = scoreWellnessType(answers);
    expect(r.primary).toBe('athlete');
    expect(r.isTie).toBe(false);
  });

  it('the two balance items at 4+ override a clear leader: athlete 5s, w7/w8 = 4 → balanced', () => {
    const answers = answersFor(wellnessTypeQuiz, (d) => (d === 'athlete' ? 5 : d === 'balanced' ? 4 : 1));
    expect(scoreWellnessType(answers).primary).toBe('balanced');
  });
});

describe('scoreBoundaries — healthy and situational are derived (F4)', () => {
  it('all-Neutral: rigid 3 vs porous 3 — neither ≤ 2.5, so not healthy; a reported rigid/porous tie', () => {
    const r = scoreBoundaries(allAnswers(boundariesQuiz, 3));
    expect(r.primary).toBe('rigid');
    expect(r.isTie).toBe(true);
    expect(r.secondary).toBe('porous');
  });

  it('healthy items 5, walls and pores 1, situational 1 → healthy (rigid ≤ 2.5 and porous ≤ 2.5)', () => {
    const answers = answersFor(boundariesQuiz, (d) => (d === 'healthy' ? 5 : 1));
    expect(scoreBoundaries(answers).primary).toBe('healthy');
  });

  it('situational 5 (≥ 3.5 and the max) → situational even when walls are high (rigid 4)', () => {
    const answers = answersFor(boundariesQuiz, (d) => (d === 'situational' ? 5 : d === 'rigid' ? 4 : 1));
    expect(scoreBoundaries(answers).primary).toBe('situational');
  });

  it('porous 4, rigid 2, healthy 5 → porous: endorsing the "healthy" items does not cancel elevated porousness', () => {
    const answers = answersFor(boundariesQuiz, (d) => (d === 'porous' ? 4 : d === 'rigid' ? 2 : d === 'healthy' ? 5 : 1));
    expect(scoreBoundaries(answers).primary).toBe('porous');
  });
});

describe('scoreSelfCompassion — a banded total over six components (§2.27)', () => {
  const positives = new Set(['self-kind', 'common-humanity', 'mindful']);

  it('positives 5, negatives 1 → coded means all 5 → total 5 → high', () => {
    const answers = answersFor(selfCompassionQuiz, (d) => (positives.has(d ?? '') ? 5 : 1));
    const r = scoreSelfCompassion(answers);
    expect(r.primary).toBe('high');
    expect(r.extra?.total).toBe(5);
  });

  it('positives 1, negatives 5 → coded means all 1 → total 1 → low', () => {
    const answers = answersFor(selfCompassionQuiz, (d) => (positives.has(d ?? '') ? 1 : 5));
    expect(scoreSelfCompassion(answers).primary).toBe('low');
  });

  it('all-Neutral → total 3 → moderate; sixteen items across six components', () => {
    const r = scoreSelfCompassion(allAnswers(selfCompassionQuiz, 3));
    expect(r.primary).toBe('moderate');
    expect(r.extra?.total).toBe(3);
    expect(selfCompassionQuiz.questions).toHaveLength(16);
    expect(new Set(selfCompassionQuiz.questions.map((q) => q.dimension)).size).toBe(6);
  });

  it('the weakest component is the lowest COMPASSION-CODED mean: isolation 5s is weakest when everything else is 3', () => {
    const answers = answersFor(selfCompassionQuiz, (d) => (d === 'isolation' ? 5 : 3));
    const r = scoreSelfCompassion(answers);
    // isolation coded = 6 − 5 = 1, every other component = 3.
    expect(r.extra?.weakest).toBe('isolation');
    // bars keep the raw sums: isolation 2 items × 5 = 10
    expect(r.scores.isolation).toBe(10);
  });
});

describe('Jungian functions — two items per function (§2.22)', () => {
  it('sixteen items, two per function', () => {
    expect(jungianQuiz.questions).toHaveLength(16);
    for (const f of ['Ni', 'Ne', 'Si', 'Se', 'Ti', 'Te', 'Fi', 'Fe']) {
      expect(jungianQuiz.questions.filter((q) => q.dimension === f)).toHaveLength(2);
    }
  });

  it('ni1 = ni2 = 4 against se1 = 5 with se2 = 3 is a 4.0 vs 4.0 tie, reported with Ni first — a single item no longer wins', () => {
    const answers = answersFor(jungianQuiz, (d, id) => (d === 'Ni' ? 4 : id === 'se1' ? 5 : 3));
    const r = calculateExtraQuiz('jungian-functions-v1', answers)!;
    expect(r.primary).toBe('Ni');
    expect(r.isTie).toBe(true);
    expect(r.secondary).toBe('Se');
    expect(r.margin).toBe(0);
  });

  it('se1 = se2 = 5 beats ni 4,4', () => {
    const answers = answersFor(jungianQuiz, (d) => (d === 'Ni' ? 4 : d === 'Se' ? 5 : 3));
    expect(calculateExtraQuiz('jungian-functions-v1', answers)?.primary).toBe('Se');
  });
});

describe('calculateEnneagram — tritype across the three centres and the primary tie rule (F8, §2.6)', () => {
  it('a Type 3 gets [3, x ∈ body, y ∈ head], never [3, 3, 3]', () => {
    const answers = answersFor(enneagramQuiz, (d) => (d === 'type3' ? 5 : 1));
    const r = calculateEnneagram(answers);
    expect(r.primaryType).toBe(3);
    expect(r.tritype[0]).toBe(3);
    expect([8, 9, 1]).toContain(r.tritype[1]);
    expect([5, 6, 7]).toContain(r.tritype[2]);
  });

  it('a Type 8 gets [8, heart, head]; a Type 6 gets [6, body, heart]', () => {
    const eight = calculateEnneagram(answersFor(enneagramQuiz, (d) => (d === 'type8' ? 5 : 1)));
    expect(eight.tritype[0]).toBe(8);
    expect([2, 3, 4]).toContain(eight.tritype[1]);
    expect([5, 6, 7]).toContain(eight.tritype[2]);
    const six = calculateEnneagram(answersFor(enneagramQuiz, (d) => (d === 'type6' ? 5 : 1)));
    expect(six.tritype[0]).toBe(6);
    expect([8, 9, 1]).toContain(six.tritype[1]);
    expect([2, 3, 4]).toContain(six.tritype[2]);
  });

  it('a non-adjacent primary tie goes to the type whose adjacent wing scores higher: 1 and 5 tied, Two 4s → Type 1', () => {
    // type1 = type5 = 25; type2 = 20 (wing of 1); every other type 5.
    // wing(1) = max(type9 = 5, type2 = 20) = 20 ; wing(5) = max(type4 = 5, type6 = 5) = 5 → Type 1.
    const answers = answersFor(enneagramQuiz, (d) => (d === 'type1' || d === 'type5' ? 5 : d === 'type2' ? 4 : 1));
    const r = calculateEnneagram(answers);
    expect(r.primaryType).toBe(1);
    expect(r.isTie).toBe(false);
  });

  it('…and the other way when the Six is the supported wing: 1 and 5 tied, Six 4s → Type 5', () => {
    const answers = answersFor(enneagramQuiz, (d) => (d === 'type1' || d === 'type5' ? 5 : d === 'type6' ? 4 : 1));
    expect(calculateEnneagram(answers).primaryType).toBe(5);
  });

  it('adjacent types tied with equal wing support stay a reported tie: 1 and 2 at 25, all else 1', () => {
    const answers = answersFor(enneagramQuiz, (d) => (d === 'type1' || d === 'type2' ? 5 : 1));
    const r = calculateEnneagram(answers);
    expect(r.primaryType).toBe(1);
    expect(r.isTie).toBe(true);
    expect(r.coPrimary).toBe(2);
  });
});

describe('forced-choice tie-breaks (court, element, dosha, shadow)', () => {
  it('court: a 3-3 element split goes to the ce6 answer; a 3-3 rank split to the cr5 answer', () => {
    // ce1-3 wands (1), ce4-6 cups (2): 3-3; ce6 = cups → cups. cr1-3 page (1), cr4-6 king (4): 3-3; cr5 = king → king.
    const answers = { ce1: 1, ce2: 1, ce3: 1, ce4: 2, ce5: 2, ce6: 2, cr1: 1, cr2: 1, cr3: 1, cr4: 4, cr5: 4, cr6: 4 };
    const r = calculateCourtMatch(answers);
    expect(r.courtCard).toBe('king-of-cups');
    expect(r.elementTie).toBe(false);
    expect(r.rankTie).toBe(false);
  });

  it('court: a split the tie-break answer is not part of stays in declared order and is flagged', () => {
    // Six element questions: a 3-3 split always includes ce6, so the only
    // unresolved tie is a wider spread — wands 2, cups 2, swords 1,
    // pentacles 1 with ce6 = pentacles (not among the tied) → wands, flagged.
    const answers = { ce1: 1, ce2: 1, ce3: 2, ce4: 2, ce5: 3, ce6: 4, cr1: 2, cr2: 2, cr3: 2, cr4: 2, cr5: 2, cr6: 2 };
    const r = calculateCourtMatch(answers);
    expect(r.element).toBe('wands');
    expect(r.elementTie).toBe(true);
    expect(r.rank).toBe('knight');
    expect(r.rankTie).toBe(false);
  });

  it('element: a fire/water split goes to el9, then el3; otherwise it is reported', () => {
    // el1-5 fire (1), el6-10 water (2) → 5-5; el9 = water → water.
    const tie = { el1: 1, el2: 1, el3: 1, el4: 1, el5: 1, el6: 2, el7: 2, el8: 2, el9: 2, el10: 2 };
    expect(calculateElementAffinity(tie).primary).toBe('water');
    // el9 = air (not tied) → fall to el3 = fire → fire.
    expect(calculateElementAffinity({ ...tie, el9: 3, el6: 2, el3: 1 }).primary).toBe('fire');
    // neither tie-break among the tied: el9 = air, el3 = air; fire el1,2,4,5 = 4 votes, water el6,7,8,10 = 4, air el3,el9 = 2.
    const unresolved = { el1: 1, el2: 1, el3: 3, el4: 1, el5: 1, el6: 2, el7: 2, el8: 2, el9: 3, el10: 2 };
    const r = calculateElementAffinity(unresolved);
    expect(r.primary).toBe('fire');
    expect(r.isTie).toBe(true);
    expect(r.coPrimary).toBe('water');
  });

  it('dosha: 10/10/10 is tridoshic; 15/10/5 is a secondary-free vata; 12/11/7 has a secondary but is not tridoshic', () => {
    const spread = (v: number, p: number, k: number) => {
      const out: Record<string, number> = {};
      ayurvedaQuiz.questions.forEach((q, i) => { out[q.id] = i < v ? 1 : i < v + p ? 2 : 3; });
      void k;
      return out;
    };
    const flat = calculateDosha(spread(10, 10, 10));
    expect(flat.tridoshic).toBe(true);
    expect(flat.scores).toEqual({ vata: 10, pitta: 10, kapha: 10 });
    const clear = calculateDosha(spread(15, 10, 5));
    expect(clear.primary).toBe('vata');
    expect(clear.secondary).toBeUndefined(); // 15 − 10 = 5 > 3
    expect(clear.tridoshic).toBe(false); // 15 − 5 = 10 > 3
    const dual = calculateDosha(spread(12, 11, 7));
    expect(dual.primary).toBe('vata');
    expect(dual.secondary).toBe('pitta'); // 12 − 11 = 1 ≤ 3
    expect(dual.tridoshic).toBe(false); // 12 − 7 = 5 > 3
  });

  it('shadow: all-Neutral is a reported tie (lover first), broken by the count of 5s when sums are equal', () => {
    const flat = calculateShadowArchetype(allAnswers(shadowArchetypeQuiz, 3));
    expect(flat.archetype).toBe('lover');
    expect(flat.isTie).toBe(true);
    expect(flat.margin).toBe(0);
    // warrior 5,5,2 = 12 (two 5s) vs sage 4,4,4 = 12 (no 5s), others 1 → warrior, not a tie.
    const answers = answersFor(shadowArchetypeQuiz, (d, id) => (d === 'WAR' ? (id === 'war3' ? 2 : 5) : d === 'SAG' ? 4 : 1));
    const r = calculateShadowArchetype(answers);
    expect(r.archetype).toBe('warrior');
    expect(r.isTie).toBe(false);
    expect(r.secondary).toBe('sage');
  });
});

describe('every Likert item keeps "Strongly Disagree" first (the renderer draws options as declared)', () => {
  const LIKERT = new Set(['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']);
  it('across all extra quizzes, a five-option agreement item starts with Strongly Disagree and its values run 1..5 or 5..1', () => {
    let seen = 0;
    for (const quiz of EXTRA_QUIZZES) {
      for (const q of quiz.questions) {
        if (q.options.length !== 5 || !q.options.every((o) => LIKERT.has(o.label))) continue;
        seen++;
        expect(q.options[0].label, `${quiz.id}/${q.id}`).toBe('Strongly Disagree');
        const values = q.options.map((o) => o.value).join(',');
        expect(['1,2,3,4,5', '5,4,3,2,1'], `${quiz.id}/${q.id}`).toContain(values);
      }
    }
    expect(seen).toBeGreaterThan(250);
  });

  it('the two PHQ-2 core items use the four-point frequency scale, recorded 1..4', () => {
    const screener = EXTRA_QUIZZES.find((q) => q.id === 'mood-screener-v1')!;
    for (const id of ['lw1', 'lw2']) {
      const q = screener.questions.find((x) => x.id === id)!;
      expect(q.options.map((o) => o.label)).toEqual(['Not at all', 'Several days', 'More than half the days', 'Nearly every day']);
      expect(q.options.map((o) => o.value)).toEqual([1, 2, 3, 4]);
    }
  });
});
