import { describe, it, expect } from 'vitest';
import {
  calculateMBTI,
  calculateLoveLanguage,
  mbtiQuiz,
  loveLanguageQuiz,
} from '../../data/quizzes';
import { calculateBigFive, bigFiveBand, bigFiveQuiz } from '../../data/bigFiveQuiz';
import { calculateAttachment, attachmentQuiz } from '../../data/attachmentQuiz';
import { mbtiQuickQuiz } from '../../data/mbtiQuickQuiz';
import { enneagramQuiz } from '../../data/enneagramQuiz';
import { shadowArchetypeQuiz } from '../../data/shadowArchetypeQuiz';

/**
 * GOLDEN reference tests for the four personality-quiz scorers.
 *
 * METHODOLOGY: every expected number below is derived BY HAND from the
 * documented scoring formula (read directly out of the source), NOT by
 * running the scorer and pasting its output. Each block shows raw sum,
 * item count, and the formula it was plugged into. The question-id lists
 * are read straight from the quiz definitions so the constructed answer
 * vectors are exhaustive and unambiguous.
 */

// ---------------------------------------------------------------------------
// Helpers: build a complete answer vector for EVERY question in a quiz by
// pulling the real ids out of the imported quiz definition. This guarantees
// "all-N" really means all items, and lets us hand-verify item COUNTS.
// ---------------------------------------------------------------------------
function allAnswers(quiz: { questions: { id: string }[] }, value: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of quiz.questions) out[q.id] = value;
  return out;
}

function answersForDimension(
  quiz: { questions: { id: string; dimension?: string }[] },
  dimension: string,
  value: number,
  others: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const q of quiz.questions) out[q.id] = q.dimension === dimension ? value : others;
  return out;
}

// ===========================================================================
// MBTI
// ===========================================================================
// Quiz shape (read from quizzes.ts): 12 items per dimension — EI(ei1..ei12),
// SN(sn1..sn12), TF(tf1..tf12), JP(jp1..jp12). The recorded answer value is
// ALREADY first-pole strength on 1..5 (5 = strongly E/S/T/J, 1 = strongly
// I/N/F/P). Scoring (symmetric): for each item  first += v ; second += (6-v).
// Type letter: e>=i ? 'E':'I', etc. First poles are E, S, T, J.
//
// Per-dimension hand math with n = 12 items:
//   all-5  -> first  = 12*5  = 60, second = 12*(6-5) = 12*1 = 12  => first wins
//   all-1  -> first  = 12*1  = 12, second = 12*(6-1) = 12*5 = 60  => second wins
//   all-3  -> first  = 12*3  = 36, second = 12*(6-3) = 12*3 = 36  => tie -> first (>=)
// ===========================================================================
describe('calculateMBTI — golden', () => {
  it('all-5 (max first-pole strength) yields the all-first-pole type ESTJ', () => {
    // first pole per axis: E, S, T, J  -> "ESTJ"
    const result = calculateMBTI(allAnswers(mbtiQuiz, 5), mbtiQuiz);
    expect(result.type).toBe('ESTJ');
    // raw bucket sums hand-computed above
    expect(result.dimensions.E).toBe(60);
    expect(result.dimensions.I).toBe(12);
    expect(result.dimensions.S).toBe(60);
    expect(result.dimensions.N).toBe(12);
    expect(result.dimensions.T).toBe(60);
    expect(result.dimensions.F).toBe(12);
    expect(result.dimensions.J).toBe(60);
    expect(result.dimensions.P).toBe(12);
  });

  it('all-1 (min first-pole strength) yields the exact opposite type INFP', () => {
    // second pole per axis: I, N, F, P -> "INFP"
    const result = calculateMBTI(allAnswers(mbtiQuiz, 1), mbtiQuiz);
    expect(result.type).toBe('INFP');
    expect(result.dimensions.E).toBe(12);
    expect(result.dimensions.I).toBe(60);
    expect(result.dimensions.S).toBe(12);
    expect(result.dimensions.N).toBe(60);
    expect(result.dimensions.T).toBe(12);
    expect(result.dimensions.F).toBe(60);
    expect(result.dimensions.J).toBe(12);
    expect(result.dimensions.P).toBe(60);
  });

  it('all-3 (neutral) ties every axis and resolves to ESTJ with ~50% dimensions', () => {
    // tie convention: >= favours the first pole (E,S,T,J) -> "ESTJ"
    const result = calculateMBTI(allAnswers(mbtiQuiz, 3), mbtiQuiz);
    expect(result.type).toBe('ESTJ');
    // Each pole bucket = 36, total per axis = 72, so each pole is exactly 50%.
    // Hand: 36 / (36 + 36) * 100 = 50.
    const axes: [string, string][] = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    for (const [a, b] of axes) {
      const total = result.dimensions[a] + result.dimensions[b];
      const pctA = (result.dimensions[a] / total) * 100;
      const pctB = (result.dimensions[b] / total) * 100;
      expect(pctA).toBeCloseTo(50, 6);
      expect(pctB).toBeCloseTo(50, 6);
    }
  });

  it('one mild I-lean among neutrals flips E->I (symmetric accumulation, no off-midpoint bias)', () => {
    // All EI items neutral (3) EXCEPT ei1 answered 2 (mild I lean: recorded value 2
    // is below the 3.0 midpoint, i.e. leaning toward the second pole I).
    // EI bucket math: 11 neutral items contribute first=33, second=33.
    //   ei1 (v=2): first += 2, second += (6-2)=4.
    //   E = 33 + 2 = 35 ; I = 33 + 4 = 37  => I wins (35 < 37).
    // Other axes all neutral -> tie -> S, T, J. Result "ISTJ".
    const scores = allAnswers(mbtiQuiz, 3);
    scores['ei1'] = 2;
    const result = calculateMBTI(scores, mbtiQuiz);
    expect(result.dimensions.E).toBe(35);
    expect(result.dimensions.I).toBe(37);
    expect(result.type).toBe('ISTJ');
  });

  // Phase 7 (R3 §2.1): the scorer exposes |first − second| per axis and a
  // borderline flag so the result screen can show a coin flip as one.
  // Rule: borderline when margin ≤ max(2, round(10% of the axis total)).
  //   full quiz: total 72 → threshold max(2, 7) = 7
  //   quick quiz: total 18 → threshold max(2, 2) = 2
  it('all-3 on the full quiz: every margin 0 and every axis borderline', () => {
    const result = calculateMBTI(allAnswers(mbtiQuiz, 3), mbtiQuiz);
    expect(result.margins).toEqual({ EI: 0, SN: 0, TF: 0, JP: 0 });
    expect(result.borderline).toEqual({ EI: true, SN: true, TF: true, JP: true });
  });

  it('all-5 on the full quiz: margin 60 − 12 = 48 on every axis, nothing borderline', () => {
    const result = calculateMBTI(allAnswers(mbtiQuiz, 5), mbtiQuiz);
    expect(result.margins.EI).toBe(48);
    expect(result.borderline.EI).toBe(false);
  });

  it('full quiz: three items at 4 among neutrals is margin 6 ≤ 7 (borderline); four items is margin 8 (not)', () => {
    const three = allAnswers(mbtiQuiz, 3);
    three.ei1 = 4; three.ei3 = 4; three.ei5 = 4; // E = 36 + 3 = 39, I = 36 − 3 = 33 → margin 6
    expect(calculateMBTI(three, mbtiQuiz).margins.EI).toBe(6);
    expect(calculateMBTI(three, mbtiQuiz).borderline.EI).toBe(true);
    const four = { ...three, ei7: 4 }; // margin 8
    expect(calculateMBTI(four, mbtiQuiz).margins.EI).toBe(8);
    expect(calculateMBTI(four, mbtiQuiz).borderline.EI).toBe(false);
  });

  it('quick quiz: one item at 4 among neutrals is margin 2 (borderline); two items is 4 (not)', () => {
    const one = allAnswers(mbtiQuickQuiz, 3);
    one.qei1 = 4; // E = 9 + 1 = 10, I = 9 − 1 = 8 → margin 2
    const r1 = calculateMBTI(one, mbtiQuickQuiz);
    expect(r1.margins.EI).toBe(2);
    expect(r1.borderline.EI).toBe(true);
    const two = { ...one, qei3: 4 };
    const r2 = calculateMBTI(two, mbtiQuickQuiz);
    expect(r2.margins.EI).toBe(4);
    expect(r2.borderline.EI).toBe(false);
  });
});

// ===========================================================================
// Love Language
// ===========================================================================
// Channels: gifts, words, acts, touch, time. 3 items each (15 total):
//   gifts: ll1, ll6, ll11   words: ll2, ll7, ll12   acts: ll3, ll8, ll13
//   touch: ll4, ll9, ll14   time:  ll5, ll10, ll15
// Scorer sums per-channel; primary = channel with the highest sum.
// ===========================================================================
describe('calculateLoveLanguage — golden', () => {
  it('a vector dominant in "touch" yields primary "touch"', () => {
    // touch items (ll4, ll9, ll14) = 5 each -> 15; every other item = 1.
    // touch sum = 15; gifts/words/acts/time = 1*3 = 3 each. Max is touch.
    const scores = answersForDimension(loveLanguageQuiz, 'touch', 5, 1);
    const result = calculateLoveLanguage(scores);
    expect(result.primary).toBe('touch');
    expect(result.scores.touch).toBe(15); // 3 items * 5
    expect(result.scores.gifts).toBe(3); // 3 items * 1
    expect(result.scores.words).toBe(3);
    expect(result.scores.acts).toBe(3);
    expect(result.scores.time).toBe(3);
  });

  it('a vector dominant in "words" yields primary "words"', () => {
    // words items (ll2, ll7, ll12) = 5 -> 15; others = 2 -> 6 each.
    const scores = answersForDimension(loveLanguageQuiz, 'words', 5, 2);
    const result = calculateLoveLanguage(scores);
    expect(result.primary).toBe('words');
    expect(result.scores.words).toBe(15);
    expect(result.scores.gifts).toBe(6); // 3 items * 2
    expect(result.isTie).toBe(false);
  });

  // Phase 7 (R3 §2.3): an equal top sum is broken by the number of
  // "Strongly agree" (5) answers in each language; only when that is also
  // equal is a co-primary declared, instead of object order (gifts first).
  it('equal sums, different count of 5s: words 5,4,3 (one 5) beats touch 4,4,4 (none) at 12 each', () => {
    const scores = allAnswers(loveLanguageQuiz, 1);
    scores.ll2 = 5; scores.ll7 = 4; scores.ll12 = 3; // words = 12, one 5
    scores.ll4 = 4; scores.ll9 = 4; scores.ll14 = 4; // touch = 12, no 5
    const result = calculateLoveLanguage(scores);
    expect(result.scores.words).toBe(12);
    expect(result.scores.touch).toBe(12);
    expect(result.primary).toBe('words');
    expect(result.isTie).toBe(false);
    expect(result.coPrimary).toBeUndefined();
  });

  it('equal sums AND equal 5s: words and touch all 5s → isTie with the other named as coPrimary', () => {
    const scores = allAnswers(loveLanguageQuiz, 1);
    for (const id of ['ll2', 'll7', 'll12', 'll4', 'll9', 'll14']) scores[id] = 5;
    const result = calculateLoveLanguage(scores);
    expect(result.isTie).toBe(true);
    expect(new Set([result.primary, result.coPrimary])).toEqual(new Set(['words', 'touch']));
  });
});

// ===========================================================================
// Big Five
// ===========================================================================
// 10 items per dimension (openness o1..o10, conscientiousness c1..c10,
// extraversion e1..e10, agreeableness a1..a10, neuroticism n1..n10). Recorded
// values are already trait-coded (reverse items pre-reversed in option values).
// Normalization (read from bigFiveQuiz.ts):
//   pct = round( ((raw - count) / (count*4)) * 100 ),  count = 10.
// Anchors (n=10):
//   all-3 : raw = 30 -> (30-10)/(40) *100 = 20/40*100 = 50
//   all-1 : raw = 10 -> (10-10)/(40) *100 = 0
//   all-5 : raw = 50 -> (50-10)/(40) *100 = 40/40*100 = 100
// NOTE: the returned top-level dimension fields hold the raw 0-100 pct
// (0 / 50 / 100); percentageScore is the SAME value clamped to 1..99
// (so 0 -> 1 and 100 -> 99). We assert the unclamped dimension field for the
// 0/50/100 anchors, and the clamp on the extremes separately.
// ===========================================================================
describe('calculateBigFive — golden', () => {
  const dims = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;

  it('all-3 (neutral) maps every dimension to exactly 50', () => {
    const result = calculateBigFive(allAnswers(bigFiveQuiz, 3));
    for (const d of dims) {
      expect(result[d]).toBe(50);
      // clamp(50) = 50, unaffected by the 1..99 clamp
      expect(result.percentageScore[d]).toBe(50);
    }
  });

  it('all-1 maps every dimension to 0 (clamped display floor 1)', () => {
    const result = calculateBigFive(allAnswers(bigFiveQuiz, 1));
    for (const d of dims) {
      expect(result[d]).toBe(0); // unclamped raw pct
      expect(result.percentageScore[d]).toBe(1); // clampPct floor
    }
  });

  it('all-5 maps every dimension to 100 (clamped display ceiling 99)', () => {
    const result = calculateBigFive(allAnswers(bigFiveQuiz, 5));
    for (const d of dims) {
      expect(result[d]).toBe(100); // unclamped raw pct
      expect(result.percentageScore[d]).toBe(99); // clampPct ceiling
    }
  });

  it('mixed per-dimension anchors compute independently (openness=100, others=50)', () => {
    // openness items all 5 -> raw 50 -> 100 ; every other dim all 3 -> 50.
    const scores = answersForDimension(bigFiveQuiz, 'openness', 5, 3);
    const result = calculateBigFive(scores);
    expect(result.openness).toBe(100);
    expect(result.conscientiousness).toBe(50);
    expect(result.extraversion).toBe(50);
    expect(result.agreeableness).toBe(50);
    expect(result.neuroticism).toBe(50);
  });

  it('percentiles alias mirrors percentageScore (backwards-compat getter)', () => {
    const result = calculateBigFive(allAnswers(bigFiveQuiz, 3));
    expect(result.percentiles).toEqual(result.percentageScore);
  });

  // Phase 7 (R3 F7): the result screen bands a score with a ten-point
  // middle — > 55 leans high, < 45 leans low, otherwise balanced — so the
  // neutral respondent above (exactly 50 everywhere) reads as balanced on
  // every trait and never gets the high-trait copy.
  it('bigFiveBand: 50 and the band edges', () => {
    expect(bigFiveBand(50)).toBe('balanced');
    expect(bigFiveBand(55)).toBe('balanced');
    expect(bigFiveBand(56)).toBe('high');
    expect(bigFiveBand(45)).toBe('balanced');
    expect(bigFiveBand(44)).toBe('low');
    expect(bigFiveBand(100)).toBe('high');
    expect(bigFiveBand(0)).toBe('low');
  });

  it('all-Neutral renders the balanced branch on all five traits', () => {
    const result = calculateBigFive(allAnswers(bigFiveQuiz, 3));
    for (const d of dims) expect(bigFiveBand(result[d])).toBe('balanced');
  });
});

// ===========================================================================
// Attachment
// ===========================================================================
// 15 anxiety items + 15 avoidance items (read from attachmentQuiz.ts). Values
// are pre-reversed: higher always = more anxious / more avoidant.
// Classification on RAW 1-5 MEANS vs midpoint 3.0:
//   anxiety<=3 & avoidance<=3 -> secure
//   anxiety> 3 & avoidance<=3 -> anxious
//   anxiety<=3 & avoidance> 3 -> avoidant
//   else                       -> fearful-avoidant
// Display score: round( ((mean - 1) / 4) * 100 ).
//   mean 3.0 -> ((3-1)/4)*100 = (2/4)*100 = 50
//   mean 5.0 -> ((5-1)/4)*100 = 100
//   mean 1.0 -> 0
// ===========================================================================
describe('calculateAttachment — golden', () => {
  it('low anxiety + low avoidance -> secure; mean 1.0 displays as 0', () => {
    // all items = 1 -> both means = 1.0 (<=3) -> secure. display=((1-1)/4)*100=0.
    const result = calculateAttachment(allAnswers(attachmentQuiz, 1));
    expect(result.style).toBe('secure');
    expect(result.anxiety).toBe(0);
    expect(result.avoidance).toBe(0);
  });

  it('exact midpoint (all 3s) -> secure, with both display scores exactly 50', () => {
    // both means = 3.0; classification uses <=3 so secure. display=50 each.
    const result = calculateAttachment(allAnswers(attachmentQuiz, 3));
    expect(result.style).toBe('secure');
    expect(result.anxiety).toBe(50);
    expect(result.avoidance).toBe(50);
  });

  it('high anxiety + low avoidance -> anxious', () => {
    // anxiety items = 5 (mean 5 > 3), avoidance items = 1 (mean 1 <= 3).
    // display: anxiety=((5-1)/4)*100=100, avoidance=((1-1)/4)*100=0.
    const scores = answersForDimension(attachmentQuiz, 'anxiety', 5, 1);
    const result = calculateAttachment(scores);
    expect(result.style).toBe('anxious');
    expect(result.anxiety).toBe(100);
    expect(result.avoidance).toBe(0);
  });

  it('low anxiety + high avoidance -> avoidant', () => {
    // avoidance items = 5 (mean 5 > 3), anxiety items = 1 (mean 1 <= 3).
    const scores = answersForDimension(attachmentQuiz, 'avoidance', 5, 1);
    const result = calculateAttachment(scores);
    expect(result.style).toBe('avoidant');
    expect(result.anxiety).toBe(0);
    expect(result.avoidance).toBe(100);
  });

  it('high anxiety + high avoidance -> fearful-avoidant', () => {
    // all items = 5 -> both means 5 > 3 -> fearful-avoidant. both display 100.
    const result = calculateAttachment(allAnswers(attachmentQuiz, 5));
    expect(result.style).toBe('fearful-avoidant');
    expect(result.anxiety).toBe(100);
    expect(result.avoidance).toBe(100);
  });

  it('just-above-midpoint means (mean=4) on both axes -> fearful-avoidant; display=75', () => {
    // all items = 4 -> mean 4 (>3 on both). display=((4-1)/4)*100=(3/4)*100=75.
    const result = calculateAttachment(allAnswers(attachmentQuiz, 4));
    expect(result.style).toBe('fearful-avoidant');
    expect(result.anxiety).toBe(75);
    expect(result.avoidance).toBe(75);
  });

  // Phase 7 (R3 §2.7, F6): four anxiety items are reverse-keyed so the
  // axis is no longer 15 forward / 0 reverse. The tests above still hold
  // because answersForDimension sets RECORDED values (already pole-coded).
  it('at18, at24, at28, at30 list Strongly Disagree first with value 5 (reverse-keyed anxiety)', () => {
    for (const id of ['at18', 'at24', 'at28', 'at30']) {
      const q = attachmentQuiz.questions.find((x) => x.id === id)!;
      expect(q.dimension).toBe('anxiety');
      expect(q.options[0]).toEqual({ value: 5, label: 'Strongly Disagree' });
      expect(q.options[4]).toEqual({ value: 1, label: 'Strongly Agree' });
    }
    expect(attachmentQuiz.questions.filter((q) => q.dimension === 'anxiety' && q.options[0].value === 5)).toHaveLength(4);
  });

  it('the invented four-way percentages are gone: the result is the two axis scores and the quadrant', () => {
    const result = calculateAttachment(allAnswers(attachmentQuiz, 3));
    expect(Object.keys(result).sort()).toEqual(['anxiety', 'avoidance', 'style']);
  });
});

// ===========================================================================
// Label order — every Likert item in every curated quiz is drawn as declared,
// so a reverse-keyed item must still START with "Strongly Disagree" (value 5).
// ===========================================================================
describe('Likert items keep Strongly Disagree first in every curated quiz', () => {
  const LIKERT = new Set(['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree']);
  it('values run 1..5 (forward) or 5..1 (reverse), never shuffled', () => {
    let seen = 0;
    for (const quiz of [mbtiQuiz, mbtiQuickQuiz, loveLanguageQuiz, bigFiveQuiz, enneagramQuiz, attachmentQuiz, shadowArchetypeQuiz]) {
      for (const q of quiz.questions) {
        expect(q.options.every((o) => LIKERT.has(o.label)), `${quiz.id}/${q.id} is a Likert item`).toBe(true);
        expect(q.options[0].label, `${quiz.id}/${q.id}`).toBe('Strongly Disagree');
        expect(['1,2,3,4,5', '5,4,3,2,1'], `${quiz.id}/${q.id}`).toContain(q.options.map((o) => o.value).join(','));
        seen++;
      }
    }
    expect(seen).toBe(48 + 12 + 15 + 50 + 45 + 30 + 21);
  });
});

// ===========================================================================
// What the user READS must be what the item scores. localizeQuiz used to
// label every Likert option by its recorded value (quizzes.likert.<value>),
// so a reverse-keyed item (value 5 declared on "Strongly Disagree") drew
// "Strongly agree" on the option that scores as disagreement: every
// reverse-keyed item since April 2026 was scored backwards. Labels are now
// chosen by the option's declared English meaning.
// ===========================================================================
describe('localizeQuiz draws each Likert option by what it says, not by the value it records', () => {
  const curated = [mbtiQuiz, mbtiQuickQuiz, loveLanguageQuiz, bigFiveQuiz, enneagramQuiz, attachmentQuiz, shadowArchetypeQuiz];

  it('en: every Likert option of every quiz keeps its declared meaning, reverse-keyed items included', async () => {
    const { default: i18n } = await import('../../i18n/config');
    const { localizeQuiz, isLikertQuestion } = await import('../../i18n/localizeQuiz');
    const { EXTRA_QUIZZES } = await import('../../data/extraQuizzes');
    await i18n.changeLanguage('en');
    let reversed = 0;
    for (const quiz of [...curated, ...EXTRA_QUIZZES]) {
      const localized = localizeQuiz(quiz);
      quiz.questions.forEach((q, qi) => {
        if (!isLikertQuestion(q)) return;
        if (q.options[0].value === 5) reversed++;
        q.options.forEach((o, oi) => {
          const shown = localized.questions[qi].options[oi];
          expect(shown.value, `${quiz.id}/${q.id}`).toBe(o.value);
          expect(shown.label.toLowerCase(), `${quiz.id}/${q.id} value ${o.value}`).toBe(o.label.toLowerCase());
        });
      });
    }
    // Big Five, attachment and the empath / extra reverse-keyed items.
    expect(reversed).toBeGreaterThan(20);
  });

  it('another locale: a reverse-keyed item shows that locale’s label for the scale point it declares', async () => {
    const { default: i18n } = await import('../../i18n/config');
    const { localizeQuiz } = await import('../../i18n/localizeQuiz');
    i18n.addResourceBundle('ja', 'app', { quizzes: { likert: { 1: 'JA-SD', 2: 'JA-D', 3: 'JA-N', 4: 'JA-A', 5: 'JA-SA' } } }, true, true);
    await i18n.changeLanguage('ja');
    try {
      const o3 = bigFiveQuiz.questions.findIndex((q) => q.id === 'o3');
      expect(bigFiveQuiz.questions[o3].options[0]).toEqual({ value: 5, label: 'Strongly Disagree' });
      const shown = localizeQuiz(bigFiveQuiz).questions[o3].options;
      expect(shown.map((o) => o.label)).toEqual(['JA-SD', 'JA-D', 'JA-N', 'JA-A', 'JA-SA']);
      expect(shown.map((o) => o.value)).toEqual([5, 4, 3, 2, 1]);
      // The labels are no longer English, so the renderer reads the flag to pick its "How much do you agree?" prompt.
      expect(localizeQuiz(bigFiveQuiz).questions[o3].likert).toBe(true);
    } finally {
      await i18n.changeLanguage('en');
    }
  });
});
