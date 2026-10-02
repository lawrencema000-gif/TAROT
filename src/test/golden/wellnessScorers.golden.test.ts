import { describe, it, expect } from 'vitest';
import { scoreMoodScreener } from '../../data/extraQuizzesPart2';
import { calculateMoodCheck } from '../../data/quizzes';
import { scoreLoveTree } from '../../data/loveTree';

/**
 * GOLDEN / INDEPENDENT-REFERENCE TESTS — wellness & screening scorers.
 *
 * Every expected value below is hand-derived from first principles or a
 * published clinical reference, NOT from running the function under test.
 * Derivations are documented inline next to each assertion.
 */

// ===========================================================================
// 1. PHQ-2 Mood Screener  (scoreMoodScreener)
// ===========================================================================
//
// CORE PHQ-2 ITEMS: lw1 ("felt down or depressed") and lw2 ("little interest
// or pleasure"). These are exactly the two items of the validated PHQ-2.
//
// PHQ-2 FREQUENCY SCALE. Phase 7 (R3 §2.28) gave the two core items the
// instrument's own four-point frequency options instead of an agreement
// Likert, so the recorded value IS the frequency plus one:
//   v=1 "Not at all"              -> 0
//   v=2 "Several days"            -> 1
//   v=3 "More than half the days" -> 2
//   v=4 "Nearly every day"        -> 3
// (The old agreement→frequency rescale — where "Neutral" read as "more than
// half the days" and all-Neutral screened positive — is gone; the tests
// below were rewritten for the new scale, with the same clinical cutoff.)
//
// VALIDATED CLINICAL CUTOFF (Kroenke, Spitzer & Williams, 2003, "The Patient
// Health Questionnaire-2"): the two core items each score 0-3, are summed to
// a total of 0-6, and a total of >= 3 is the recommended optimal cut-point
// for a positive depression screen. Here a positive screen routes to
// 'seek-support'. This >=3 boundary is the most clinically important
// assertion in this file and is tested exactly at 2 (negative) and 3
// (positive).
//
// For the below-cutoff fallback (average-per-dimension typing, ties resolving
// toward greater severity), the quiz's dimension assignment is:
//   seek-support : lw1, lw2          (the two PHQ-2 cores)
//   moderate     : lw3, lw4, lw5
//   mild         : mi1, mi2, mi3, mi4
//   low          : lo1, lo2, lo3
// To land on a NON-'seek-support' result we must (a) keep the core sum < 3
// AND (b) ensure the targeted dimension has the strictly-highest average.

// Helper that hand-builds a *complete* 12-item answer vector so the
// average-fallback is fully determined (no missing-item ambiguity).
function moodVector(overrides: Record<string, number>): Record<string, number> {
  const base: Record<string, number> = {
    lw1: 1, lw2: 1,            // cores
    lw3: 1, lw4: 1, lw5: 1,    // moderate
    mi1: 1, mi2: 1, mi3: 1, mi4: 1, // mild
    lo1: 1, lo2: 1, lo3: 1,    // low
  };
  return { ...base, ...overrides };
}

describe('scoreMoodScreener — PHQ-2 cutoff (independent clinical reference)', () => {
  it('both cores "More than half the days" (3) -> 2+2 = 4 >= 3 -> seek-support', () => {
    const r = scoreMoodScreener(moodVector({ lw1: 3, lw2: 3 }));
    expect(r.primary).toBe('seek-support');
    expect(r.extra?.phq2Total).toBe(4);
  });

  it('both cores "Not at all" (1) -> 0+0 = 0 -> below cutoff -> low (healthy vector)', () => {
    // To reach the documented 'low' baseline we make the 'low' dimension
    // (lo1..lo3) the strict average-max: lo* = 5 (avg 5.0) while every other
    // dimension averages 1.0. The fallback therefore types 'low'.
    const r = scoreMoodScreener(moodVector({ lw1: 1, lw2: 1, lo1: 5, lo2: 5, lo3: 5 }));
    expect(r.primary).toBe('low');
    expect(r.extra?.phq2Total).toBe(0);
  });

  it('BOUNDARY: core sum == exactly 3 -> seek-support (cutoff is >=3)', () => {
    // lw1 "More than half the days" (3) -> 2, lw2 "Several days" (2) -> 1; 2+1 = 3 >= 3 => positive.
    // This is the precise validated PHQ-2 threshold; it MUST trip.
    const r = scoreMoodScreener(moodVector({ lw1: 3, lw2: 2 }));
    expect(r.primary).toBe('seek-support');
  });

  it('BOUNDARY: core sum == exactly 2 -> NOT seek-support (just under cutoff)', () => {
    // Both cores "Several days" (2) -> 1+1 = 2 < 3 => negative. Make 'low' the
    // strict max so the fallback resolves there (any non-'seek-support'
    // label proves the cutoff did NOT fire).
    const r = scoreMoodScreener(moodVector({ lw1: 2, lw2: 2, lo1: 5, lo2: 5, lo3: 5 }));
    expect(r.primary).not.toBe('seek-support');
    expect(r.primary).toBe('low');
  });

  it('"Nearly every day" (4) on one core alone -> 3+0 = 3 -> seek-support', () => {
    const r = scoreMoodScreener(moodVector({ lw1: 4, lw2: 1 }));
    expect(r.primary).toBe('seek-support');
  });

  it('"More than half the days" on one core alone -> 2+0 = 2 -> NOT seek-support', () => {
    const r = scoreMoodScreener(moodVector({ lw1: 3, lw2: 1, lo1: 5, lo2: 5, lo3: 5 }));
    expect(r.primary).not.toBe('seek-support');
  });

  it('an old five-point answer replayed from a stored result is clamped: 5 -> 3, never 4', () => {
    const r = scoreMoodScreener(moodVector({ lw1: 5, lw2: 1 }));
    expect(r.extra?.phq2Total).toBe(3);
    expect(r.primary).toBe('seek-support');
  });

  it('STATED: the indifferent respondent — cores "Several days", every other item Neutral — is moderate, not seek-support', () => {
    // Cores 2+2 -> 1+1 = 2 < 3, so the average fallback decides: low 3.0,
    // mild 3.0, moderate 3.0, seek-support 2.0 (raw 2+2 over two items).
    // Equal means resolve toward the more supportive result, so the
    // three-way tie lands on moderate. Under the old agreement mapping the
    // same person (Neutral on the cores too) screened positive.
    const r = scoreMoodScreener({ lw1: 2, lw2: 2, lw3: 3, lw4: 3, lw5: 3, mi1: 3, mi2: 3, mi3: 3, mi4: 3, lo1: 3, lo2: 3, lo3: 3 });
    expect(r.primary).toBe('moderate');
    expect(r.averages.low).toBe(3);
    expect(r.averages['seek-support']).toBe(2);
  });

  it('exposes raw per-dimension sums in scores (shape contract) and the Likert means in averages', () => {
    // With lw1=3, lw2=3 the 'seek-support' RAW sum is 3+3 = 6 (scores hold raw
    // recorded values; the PHQ mapping only governs the cutoff decision).
    const r = scoreMoodScreener(moodVector({ lw1: 3, lw2: 3 }));
    expect(r.scores['seek-support']).toBe(6);
    // moderate raw sum = lw3+lw4+lw5 = 1+1+1 = 3; mean 1.
    expect(r.scores.moderate).toBe(3);
    expect(r.averages.moderate).toBe(1);
    expect(r.isTie).toBe(false);
  });
});

// ===========================================================================
// 2. Mood Check  (calculateMoodCheck)
// ===========================================================================
//
// Four scored dimensions (energy, emotion, connection, clarity) each take the
// answer value directly; 'need' (mood5) selects a suggestion only.
//   avgScore = (energy + emotion + connection + clarity) / 4
//   moodScore = round(avgScore * 20)          => documented range 20..100
//   overallMood: >=4 Thriving, >=3.5 Good, >=2.5 Okay, >=1.5 Struggling, else Depleted

describe('calculateMoodCheck — independent arithmetic references', () => {
  it('all-positive vector: avg 5 -> moodScore 100, Thriving', () => {
    // Derivation: energy=emotion=connection=clarity=5 -> avg=5 -> 5*20=100.
    // avg 5 >= 4 => 'Thriving'.
    const r = calculateMoodCheck({ mood1: 5, mood2: 5, mood3: 5, mood4: 5, mood5: 5 });
    expect(r.moodScore).toBe(100);
    expect(r.overallMood).toBe('Thriving');
  });

  it('all-negative vector: avg 1 -> moodScore 20, Depleted', () => {
    // Derivation: all four scored dims = 1 -> avg=1 -> 1*20=20.
    // avg 1 < 1.5 => 'Depleted'.
    const r = calculateMoodCheck({ mood1: 1, mood2: 1, mood3: 1, mood4: 1, mood5: 1 });
    expect(r.moodScore).toBe(20);
    expect(r.overallMood).toBe('Depleted');
  });

  it('positive moodScore strictly exceeds negative moodScore', () => {
    // Ordering check: 100 (all-5) > 20 (all-1).
    const pos = calculateMoodCheck({ mood1: 5, mood2: 5, mood3: 5, mood4: 5, mood5: 5 });
    const neg = calculateMoodCheck({ mood1: 1, mood2: 1, mood3: 1, mood4: 1, mood5: 1 });
    expect(pos.moodScore).toBeGreaterThan(neg.moodScore);
    expect(pos.overallMood).not.toBe(neg.overallMood);
  });

  it('moodScore stays within documented 20..100 range for both extremes', () => {
    // Range derivation: avg in [1,5] -> moodScore = round(avg*20) in [20,100].
    const pos = calculateMoodCheck({ mood1: 5, mood2: 5, mood3: 5, mood4: 5, mood5: 5 });
    const neg = calculateMoodCheck({ mood1: 1, mood2: 1, mood3: 1, mood4: 1, mood5: 1 });
    for (const r of [pos, neg]) {
      expect(r.moodScore).toBeGreaterThanOrEqual(20);
      expect(r.moodScore).toBeLessThanOrEqual(100);
    }
  });

  it('mid vector: avg 3 -> moodScore 60, Okay', () => {
    // Derivation: all four scored dims = 3 -> avg=3 -> 3*20=60.
    // avg 3 is in [2.5, 3.5) => 'Okay'.
    const r = calculateMoodCheck({ mood1: 3, mood2: 3, mood3: 3, mood4: 3, mood5: 3 });
    expect(r.moodScore).toBe(60);
    expect(r.overallMood).toBe('Okay');
  });

  // Phase 7: the chosen need is returned as a key so the screen can read
  // quizzes.mood.suggestions.<need> instead of matching English text.
  it('mood5 maps 1..5 onto rest / support / space / action / connection; anything else is balance', () => {
    expect(calculateMoodCheck({ mood1: 3, mood2: 3, mood3: 3, mood4: 3, mood5: 1 }).need).toBe('rest');
    expect(calculateMoodCheck({ mood1: 3, mood2: 3, mood3: 3, mood4: 3, mood5: 3 }).need).toBe('space');
    expect(calculateMoodCheck({ mood1: 3, mood2: 3, mood3: 3, mood4: 3, mood5: 5 }).need).toBe('connection');
    expect(calculateMoodCheck({ mood1: 3, mood2: 3, mood3: 3, mood4: 3 }).need).toBe('space'); // default needValue 3
  });
});

// ===========================================================================
// 3. Love Tree  (scoreLoveTree)
// ===========================================================================
//
// 6 anxiety items (a1..a6) + 6 avoidance items (v1..v6), Likert 1..5.
// Reverse-coded items (value -> 6-value): a4, a6 (anxiety); v5 (avoidance).
// anxiety   = mean of the 6 (reverse-adjusted) anxiety values
// avoidance = mean of the 6 (reverse-adjusted) avoidance values, each rounded
//             to 1 decimal.
// Classification by midpoint 3.0:
//   anx<=3 & avd<=3 -> secure ; anx>3 & avd<=3 -> anxious
//   anx<=3 & avd>3  -> avoidant ; anx>3 & avd>3 -> fearful

describe('scoreLoveTree — independent attachment classifications', () => {
  it('low anxiety + low avoidance -> secure (both means <= 3)', () => {
    // Strategy: drive BOTH means to 1.0.
    // Anxiety items: forward a1,a2,a3,a5 -> answer 1 (contributes 1 each);
    //   reverse a4,a6 -> answer 5 (6-5=1 each). Mean = (1*6)/6 = 1.0 <= 3.
    // Avoidance: forward v1,v2,v3,v4,v6 -> answer 1; reverse v5 -> answer 5
    //   (6-5=1). Mean = 1.0 <= 3 => 'secure'.
    const r = scoreLoveTree({
      a1: 1, a2: 1, a3: 1, a5: 1, a4: 5, a6: 5,
      v1: 1, v2: 1, v3: 1, v4: 1, v6: 1, v5: 5,
    });
    expect(r.anxiety).toBeCloseTo(1.0, 5);
    expect(r.avoidance).toBeCloseTo(1.0, 5);
    expect(r.attachment).toBe('secure');
  });

  it('high anxiety + low avoidance -> anxious', () => {
    // Anxiety -> 5.0: forward a1,a2,a3,a5 -> 5; reverse a4,a6 -> 1 (6-1=5).
    //   Mean = (5*6)/6 = 5.0 > 3.
    // Avoidance -> 1.0 (same low pattern as secure case): forward v* -> 1,
    //   reverse v5 -> 5. Mean = 1.0 <= 3 => 'anxious'.
    const r = scoreLoveTree({
      a1: 5, a2: 5, a3: 5, a5: 5, a4: 1, a6: 1,
      v1: 1, v2: 1, v3: 1, v4: 1, v6: 1, v5: 5,
    });
    expect(r.anxiety).toBeCloseTo(5.0, 5);
    expect(r.avoidance).toBeCloseTo(1.0, 5);
    expect(r.attachment).toBe('anxious');
  });

  it('low anxiety + high avoidance -> avoidant', () => {
    // Anxiety -> 1.0 (low pattern). Avoidance -> 5.0: forward v1,v2,v3,v4,v6
    //   -> 5; reverse v5 -> 1 (6-1=5). Mean = 5.0 > 3 => 'avoidant'.
    const r = scoreLoveTree({
      a1: 1, a2: 1, a3: 1, a5: 1, a4: 5, a6: 5,
      v1: 5, v2: 5, v3: 5, v4: 5, v6: 5, v5: 1,
    });
    expect(r.anxiety).toBeCloseTo(1.0, 5);
    expect(r.avoidance).toBeCloseTo(5.0, 5);
    expect(r.attachment).toBe('avoidant');
  });

  it('high anxiety + high avoidance -> fearful', () => {
    // Both means -> 5.0 using the high patterns above.
    const r = scoreLoveTree({
      a1: 5, a2: 5, a3: 5, a5: 5, a4: 1, a6: 1,
      v1: 5, v2: 5, v3: 5, v4: 5, v6: 5, v5: 1,
    });
    expect(r.anxiety).toBeCloseTo(5.0, 5);
    expect(r.avoidance).toBeCloseTo(5.0, 5);
    expect(r.attachment).toBe('fearful');
  });

  it('reverse-coding is applied: midpoint case lands exactly on means and rounds to 1dp', () => {
    // All raw answers = 4. Forward items contribute 4; reverse items contribute
    // 6-4 = 2. Anxiety items: a1,a2,a3,a5 (forward)=4, a4,a6 (reverse)=2.
    //   sum = 4+4+4+4+2+2 = 20 ; mean = 20/6 = 3.3333... -> rounds to 3.3.
    // Avoidance items: v1,v2,v3,v4,v6 (forward)=4, v5 (reverse)=2.
    //   sum = 4*5 + 2 = 22 ; mean = 22/6 = 3.6666... -> rounds to 3.7.
    // anx 3.3 > 3 AND avd 3.7 > 3 => 'fearful'.
    const r = scoreLoveTree({
      a1: 4, a2: 4, a3: 4, a4: 4, a5: 4, a6: 4,
      v1: 4, v2: 4, v3: 4, v4: 4, v5: 4, v6: 4,
    });
    expect(r.anxiety).toBeCloseTo(3.3, 5);
    expect(r.avoidance).toBeCloseTo(3.7, 5);
    expect(r.attachment).toBe('fearful');
  });

  it('all anxiety/avoidance outputs land within the documented 1..5 band', () => {
    // For any Likert input in 1..5 (forward or reverse), per-item value is in
    // 1..5, so the mean is in 1..5. Check at both extremes.
    const lo = scoreLoveTree({
      a1: 1, a2: 1, a3: 1, a5: 1, a4: 5, a6: 5,
      v1: 1, v2: 1, v3: 1, v4: 1, v6: 1, v5: 5,
    });
    const hi = scoreLoveTree({
      a1: 5, a2: 5, a3: 5, a5: 5, a4: 1, a6: 1,
      v1: 5, v2: 5, v3: 5, v4: 5, v6: 5, v5: 1,
    });
    for (const r of [lo, hi]) {
      expect(r.anxiety).toBeGreaterThanOrEqual(1);
      expect(r.anxiety).toBeLessThanOrEqual(5);
      expect(r.avoidance).toBeGreaterThanOrEqual(1);
      expect(r.avoidance).toBeLessThanOrEqual(5);
    }
  });
});
