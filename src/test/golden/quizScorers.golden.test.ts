import { describe, it, expect } from 'vitest';
import {
  calculateMBTI,
  calculateLoveLanguage,
  mbtiQuiz,
  loveLanguageQuiz,
} from '../../data/quizzes';
import { calculateBigFive, bigFiveQuiz } from '../../data/bigFiveQuiz';
import { calculateAttachment, attachmentQuiz } from '../../data/attachmentQuiz';

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
});
