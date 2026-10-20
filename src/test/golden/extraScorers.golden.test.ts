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
import { displayTritype } from '../../data/enneagramQuiz';
import { computeSneakPeek, encouragementFor, ENCOURAGEMENT } from '../../components/quizzes/sneakPeek';
import { dimensionScaleMax, extraResultName } from '../../components/quizzes/extraNames';
import { resultChipLabel } from '../../components/quizzes/chipLabel';
import { calendarDaysBetween, relativeDay } from '../../components/quizzes/relativeDay';
import { phq2Quiz } from '../../data/extraQuizzesPart2';

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
  it('all-Neutral: nothing is agreed with (every mean 3, none > 3) → unclear, not "Rigid Walls"', () => {
    const r = scoreBoundaries(allAnswers(boundariesQuiz, 3));
    expect(r.primary).toBe('unclear');
    expect(r.isTie).toBe(false);
  });

  it('healthy items 5, walls and pores 1, situational 1 → healthy (healthy ≥ 3.5, neither walls nor pores endorsed)', () => {
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

// ---------------------------------------------------------------------------
// Phase 7 fix round (R7) — every case below is a reproduced failure.
// ---------------------------------------------------------------------------

describe('scoreBoundaries — a verdict needs agreement (R7 #99)', () => {
  it('REPRO: rg1-3 Neutral, rg4 Disagree (2.75), po Disagree (2.0), hl Strongly agree (5.0), sn Strongly disagree → healthy, not Rigid Walls', () => {
    // rigid (3+3+3+2)/4 = 2.75 < 3.5 → not endorsed; healthy 5 ≥ 3.5 → healthy.
    const answers = answersFor(boundariesQuiz, (d, id) =>
      d === 'rigid' ? (id === 'rg4' ? 2 : 3) : d === 'porous' ? 2 : d === 'healthy' ? 5 : 1,
    );
    const r = scoreBoundaries(answers);
    expect(r.averages.rigid).toBe(2.75);
    expect(r.primary).toBe('healthy');
  });

  it('REPRO: every answer Strongly disagree (incl. hl1 "I say no when I need to") → unclear, not Healthy Flex', () => {
    expect(scoreBoundaries(allAnswers(boundariesQuiz, 1)).primary).toBe('unclear');
  });

  it('walls endorsed (rigid 4) beat a higher healthy mean (5): the healthy items are the agreeable ones', () => {
    const answers = answersFor(boundariesQuiz, (d) => (d === 'rigid' ? 4 : d === 'healthy' ? 5 : 1));
    expect(scoreBoundaries(answers).primary).toBe('rigid');
  });

  it('nothing endorsed but walls lean (3.25 > 3) over healthy 3 → rigid as a leaning', () => {
    const answers = answersFor(boundariesQuiz, (d, id) => (d === 'rigid' ? (id === 'rg1' ? 4 : 3) : d === 'healthy' ? 3 : 1));
    expect(scoreBoundaries(answers).primary).toBe('rigid');
  });

  it('every result the scorer returns has a card', () => {
    for (const v of [1, 2, 3, 4, 5]) {
      const k = scoreBoundaries(allAnswers(boundariesQuiz, v)).primary;
      expect(EXTRA_QUIZ_SCORING['boundaries-v1'].info[k], `all-${v} → ${k}`).toBeDefined();
    }
  });
});

describe('scoreWellnessType — balanced has to be meant (R7 #101)', () => {
  it('REPRO: all eight items Strongly disagree (every bar 1.0) → unclear, not The Balanced', () => {
    const r = scoreWellnessType(allAnswers(wellnessTypeQuiz, 1));
    expect(r.primary).toBe('unclear');
    expect(EXTRA_QUIZ_SCORING['wellness-type-v1'].info[r.primary]).toBeDefined();
  });

  it('REPRO: athlete 2 / healer 2.5 / contemplative 2 with w7 = w8 = 1 → unclear (spread 0.5 at a disagree level)', () => {
    const answers = answersFor(wellnessTypeQuiz, (d, id) => (d === 'healer' ? (id === 'w3' ? 3 : 2) : d === 'balanced' ? 1 : 2));
    const r = scoreWellnessType(answers);
    expect(r.averages.healer).toBe(2.5);
    expect(r.primary).toBe('unclear');
  });

  it('a flat AGREEING profile with the balance items not disagreed → balanced (all 4, w7/w8 3)', () => {
    const answers = answersFor(wellnessTypeQuiz, (d) => (d === 'balanced' ? 3 : 4));
    expect(scoreWellnessType(answers).primary).toBe('balanced');
  });

  it('a flat agreeing profile whose person disagrees with "a mix" (w7 = w8 = 1) is not balanced: the leader, reported as a tie', () => {
    const answers = answersFor(wellnessTypeQuiz, (d) => (d === 'balanced' ? 1 : 4));
    const r = scoreWellnessType(answers);
    expect(r.primary).toBe('athlete');
    expect(r.isTie).toBe(true);
  });
});

describe('scoreSelfCompassion — "where to practise" only when a component is lower (R7 #160)', () => {
  const positives = new Set(['self-kind', 'common-humanity', 'mindful']);

  it('REPRO: the maximum score (positives 5, negatives 1, every coded mean 5) names no weakest component', () => {
    const r = scoreSelfCompassion(answersFor(selfCompassionQuiz, (d) => (positives.has(d ?? '') ? 5 : 1)));
    expect(r.primary).toBe('high');
    expect(r.extra?.weakest).toBeUndefined();
  });

  it('all-Neutral (every coded mean 3) names no weakest component', () => {
    expect(scoreSelfCompassion(allAnswers(selfCompassionQuiz, 3)).extra?.weakest).toBeUndefined();
  });

  it('REPRO (ja QA): self-kind 5, every other item Neutral — five components level at coded 3 → no weakest named', () => {
    const r = scoreSelfCompassion(answersFor(selfCompassionQuiz, (d) => (d === 'self-kind' ? 5 : 3)));
    expect(r.extra?.weakest).toBeUndefined();
  });

  it('two components level at the bottom are both named (weakest + weakestAlso)', () => {
    // self-kind 1 → coded 1; isolation 5 → coded 1; every other component Neutral (3).
    const answers = answersFor(selfCompassionQuiz, (d) => (d === 'self-kind' ? 1 : d === 'isolation' ? 5 : 3));
    const r = scoreSelfCompassion(answers);
    expect(r.extra?.weakest).toBe('self-kind');
    expect(r.extra?.weakestAlso).toBe('isolation');
  });
});

describe('calculateDosha — an exact two-dosha tie is reported (R7 #106)', () => {
  const spread = (v: number, p: number) => {
    const out: Record<string, number> = {};
    ayurvedaQuiz.questions.forEach((q, i) => { out[q.id] = i < v ? 1 : i < v + p ? 2 : 3; });
    return out;
  };

  it('REPRO: vata 13, pitta 13, kapha 4 (not tridoshic) → isTie with pitta as co-primary, no "secondary"', () => {
    const r = calculateDosha(spread(13, 13));
    expect(r.scores).toEqual({ vata: 13, pitta: 13, kapha: 4 });
    expect(r.tridoshic).toBe(false);
    expect(r.isTie).toBe(true);
    expect(r.coPrimary).toBe('pitta');
    expect(r.secondary).toBeUndefined();
  });

  it('a one-point lead is not a tie and keeps its secondary', () => {
    const r = calculateDosha(spread(13, 12));
    expect(r.isTie).toBe(false);
    expect(r.secondary).toBe('pitta');
  });
});

describe('displayTritype — saved pre-Phase-7 rows (R7 #104)', () => {
  const scores = { 1: 40, 2: 52, 3: 92, 4: 60, 5: 48, 6: 56, 7: 72, 8: 64, 9: 44 };

  it('REPRO: an old row {primaryType 3, tritype [3,3,3]} is recomputed from its scores: 3, top of body (8), top of head (7)', () => {
    expect(displayTritype({ primaryType: 3, tritype: [3, 3, 3], scores })).toEqual([3, 8, 7]);
  });

  it('an old row without scores shows no tritype', () => {
    expect(displayTritype({ primaryType: 3, tritype: [3, 3, 3], scores: undefined as unknown as Record<string, number> })).toBeNull();
  });

  it('a valid tritype (one per centre, primary first) is shown as saved', () => {
    expect(displayTritype({ primaryType: 3, tritype: [3, 9, 5], scores })).toEqual([3, 9, 5]);
  });

  it('a fresh scorer result always passes its own check', () => {
    const r = calculateEnneagram(allAnswers(enneagramQuiz, 4));
    expect(displayTritype(r)).toEqual(r.tritype);
  });
});

// A t() that returns the defaultValue, interpolated — what English renders.
const tEn = (key: string, opts?: Record<string, unknown>): string => {
  const raw = typeof opts?.defaultValue === 'string' ? opts.defaultValue : key;
  return raw.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(opts?.[k] ?? ''));
};

/** The answers on screen at 1-based question `step`: every earlier question answered with pick(). */
function answeredBefore(quiz: { questions: { id: string; dimension?: string }[] }, step: number, pick: (d: string | undefined, id: string) => number) {
  const out: Record<string, number> = {};
  quiz.questions.slice(0, step - 1).forEach((q) => { out[q.id] = pick(q.dimension, q.id); });
  return out;
}

describe('early reading — never contradicts the scorer (R7 #27, #100)', () => {
  it('REPRO #27: the PHQ-2 screener has no early reading, even at 6/12 and 9/12 after a positive screen', () => {
    // lw1 = lw2 "Nearly every day" (4) → PHQ-2 = 6; every Likert item Strongly agree.
    const pick = (d: string | undefined) => (d === 'seek-support' ? 4 : 5);
    for (const step of [3, 6, 9]) {
      expect(computeSneakPeek(phq2Quiz, answeredBefore(phq2Quiz, step, pick), step, 12, tEn), `step ${step}`).toBeNull();
    }
  });

  it('REPRO #100: self-compassion never names a component (its results are bands); with sk1-3 Strongly agree at 8/16 and 12/16 → nothing', () => {
    const pick = (d: string | undefined) => (d === 'self-kind' ? 5 : 3);
    for (const step of [4, 8, 12]) {
      expect(computeSneakPeek(selfCompassionQuiz, answeredBefore(selfCompassionQuiz, step, pick), step, 16, tEn)).toBeNull();
    }
  });

  it('REPRO #100: boundaries cannot announce "Healthy Flex" before the situational items are in (derived verdict)', () => {
    const pick = (d: string | undefined, id: string) => (d === 'rigid' ? (id === 'rg4' ? 2 : 3) : d === 'porous' ? 2 : d === 'healthy' ? 5 : 1);
    for (const step of [4, 8, 12]) {
      expect(computeSneakPeek(boundariesQuiz, answeredBefore(boundariesQuiz, step, pick), step, 16, tEn)).toBeNull();
    }
  });

  it('a derived-result quiz speaks once every dimension is in, and names what its scorer returns (empath/HSP at 6/12)', () => {
    // em1-3 = 5 (empath 5.0), hs1-2 = 1 (hsp 1.0) → scoreEmpathHsp → empath.
    const answers = answeredBefore(empathQuiz, 6, (d) => (d === 'empath' ? 5 : 1));
    expect(computeSneakPeek(empathQuiz, answers, 6, 12, tEn)).toBe('Leaning Empath so far…');
    expect(calculateExtraQuiz('empath-hsp-v1', answers)?.primary).toBe('empath');
  });

  it('a highest-mean quiz names an endorsed leader (DISC dominance 5 vs influence 1 at 10/20)', () => {
    const answers = answeredBefore(discQuiz, 10, (d) => (d === 'dominance' ? 5 : 1));
    expect(computeSneakPeek(discQuiz, answers, 10, 20, tEn)).toBe('Leaning Dominance (D) so far…');
  });

  it('…and stays quiet on a tie or below agreement', () => {
    expect(computeSneakPeek(discQuiz, answeredBefore(discQuiz, 10, () => 5), 10, 20, tEn)).toBeNull(); // 5.0 vs 5.0
    expect(computeSneakPeek(discQuiz, answeredBefore(discQuiz, 10, (d) => (d === 'dominance' ? 3 : 1)), 10, 20, tEn)).toBeNull(); // 3.0 < 3.5
  });

  it('a name is read through the result chain: a scored component without a card asks extraQuizzes.<key>.dimensions.<d>', () => {
    const asked: string[] = [];
    const tSpy = (key: string, opts?: Record<string, unknown>) => { asked.push(key); return tEn(key, opts); };
    expect(extraResultName('self-compassion-v1', 'self-kind', tSpy)).toBe('Self-kindness');
    expect(asked).toEqual(['extraQuizzes.self-compassion.dimensions.self-kind']);
  });
});

describe('encouragement — a position claim only where it is true (R7 #157)', () => {
  const at = (step: number, total: number) => encouragementFor(step, total)?.en ?? null;

  it('REPRO: DISC 18/20 (90 %) no longer reads "Almost halfway there."', () => {
    expect(at(18, 20)).toBe('Nearly there now.');
  });

  it('attachment / dosha 18/30 (60 %) claims no position', () => {
    const line = at(18, 30);
    expect(line).not.toBeNull();
    expect(line).not.toBe('Almost halfway there.');
    expect(line).not.toBe('Nearly there now.');
  });

  it('for every long quiz length, "Almost halfway" only at 40-50 % and "Nearly there" only at 80 %+', () => {
    for (let total = 12; total <= 60; total++) {
      for (let step = 1; step <= total; step++) {
        const e = encouragementFor(step, total);
        if (!e) continue;
        const p = step / total;
        if (e.key === 'e4') expect(p >= 0.4 && p < 0.5, `${step}/${total}`).toBe(true);
        if (e.key === 'e8') expect(p >= 0.8, `${step}/${total}`).toBe(true);
        expect(step % 6).toBe(0);
        expect(step).toBeLessThan(total);
      }
    }
    expect(ENCOURAGEMENT).toHaveLength(10);
  });
});

describe('quiz list helpers (R7 #158, #156) and the screener scale (R7 #102)', () => {
  it('REPRO #158: taken 23:00 yesterday, viewed 08:00 today → 1 calendar day ("yesterday"), not "today"', () => {
    const taken = new Date(2026, 9, 2, 23, 0);
    const now = new Date(2026, 9, 3, 8, 0);
    expect(calendarDaysBetween(taken, now)).toBe(1);
    expect(relativeDay(taken.toISOString(), 'en', now)).toBe('yesterday');
    expect(relativeDay(new Date(2026, 9, 3, 0, 5).toISOString(), 'en', now)).toBe('today');
    expect(relativeDay(new Date(2026, 9, 1, 23, 59).toISOString(), 'en', now)).toBe('2 days ago');
  });

  it('REPRO #156: an old self-compassion row labelled "over-identified" reads "Needs a retake", never the raw key', () => {
    const sc = EXTRA_QUIZZES.find((q) => q.id === 'self-compassion-v1')!;
    expect(resultChipLabel(sc, 'over-identified', tEn)).toBe('Needs a retake');
    expect(resultChipLabel(sc, 'high', tEn)).toBe('Steady self-compassion');
  });

  it('REPRO #102: the PHQ-2 core items are drawn out of 4, every Likert group out of 5', () => {
    expect(dimensionScaleMax(phq2Quiz, ['low', 'mild', 'moderate', 'seek-support'])).toEqual({ low: 5, mild: 5, moderate: 5, 'seek-support': 4 });
    expect(new Set(Object.values(dimensionScaleMax(discQuiz, EXTRA_QUIZ_SCORING['disc-v1'].dimensions)))).toEqual(new Set([5]));
  });

  it('#161: every quiz title is sentence case (no capital after the first word, bar acronyms and names)', () => {
    expect(EXTRA_QUIZZES.find((q) => q.id === 'self-compassion-v1')!.title).toBe('Self-compassion');
  });
});
