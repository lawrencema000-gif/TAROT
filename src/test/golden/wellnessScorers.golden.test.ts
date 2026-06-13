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
// AGREEMENT-LIKERT -> PHQ-2 FREQUENCY MAP (independently derived from the
// documented rescale formula  f(v) = round( (v-1)*3 / 4 )  using JS round-
// half-up; confirmed by hand below):
//   v=1 -> round(0/4)   = round(0.00) = 0
//   v=2 -> round(3/4)   = round(0.75) = 1
//   v=3 -> round(6/4)   = round(1.50) = 2   (half rounds UP -> 2, not 1)
//   v=4 -> round(9/4)   = round(2.25) = 2   (NOT 3 — the key non-1:1 case)
//   v=5 -> round(12/4)  = round(3.00) = 3
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
  it('both cores at Likert 3 -> mapped 2+2 = 4 >= 3 -> seek-support', () => {
    // Derivation: f(3)=2, so 2+2=4. 4 >= 3 cutoff => positive screen.
    const r = scoreMoodScreener(moodVector({ lw1: 3, lw2: 3 }));
    expect(r.primary).toBe('seek-support');
  });

  it('both cores at Likert 1 -> 0+0 = 0 -> below cutoff -> low (healthy vector)', () => {
    // Derivation: f(1)=0, so 0+0=0 < 3 => NOT a positive screen.
    // To reach the documented 'low' baseline we make the 'low' dimension
    // (lo1..lo3) the strict average-max: lo* = 5 (avg 5.0) while every other
    // dimension averages 1.0. The fallback therefore types 'low'.
    const r = scoreMoodScreener(moodVector({ lw1: 1, lw2: 1, lo1: 5, lo2: 5, lo3: 5 }));
    expect(r.primary).toBe('low');
  });

  it('BOUNDARY: core sum == exactly 3 -> seek-support (cutoff is >=3)', () => {
    // Derivation: lw1=4 -> f=2, lw2=2 -> f=1; total 2+1 = 3. 3 >= 3 => positive.
    // This is the precise validated PHQ-2 threshold; it MUST trip.
    const r = scoreMoodScreener(moodVector({ lw1: 4, lw2: 2 }));
    expect(r.primary).toBe('seek-support');
  });

  it('BOUNDARY: core sum == exactly 2 -> NOT seek-support (just under cutoff)', () => {
    // Derivation: lw1=2 -> f=1, lw2=2 -> f=1; total 1+1 = 2. 2 < 3 => negative.
    // Make 'low' the strict max so the fallback resolves there (any non-
    // 'seek-support' label proves the cutoff did NOT fire).
    const r = scoreMoodScreener(moodVector({ lw1: 2, lw2: 2, lo1: 5, lo2: 5, lo3: 5 }));
    expect(r.primary).not.toBe('seek-support');
    expect(r.primary).toBe('low');
  });

  it('verifies 4 -> 2 (NOT 3): lw1=4, lw2=1 sums to 2 -> NOT seek-support', () => {
    // Under a NAIVE 1:1-ish map (Likert 4 = "nearly every day" = 3), lw1 would
    // contribute 3 and 3+0 = 3 would WRONGLY trip the cutoff. Under the real
    // map f(4)=2, so 2 + f(1)=0 = 2 < 3 => negative. Asserting NOT seek-support
    // here is what distinguishes the correct 4->2 mapping from a naive 1:1.
    const r = scoreMoodScreener(moodVector({ lw1: 4, lw2: 1, lo1: 5, lo2: 5, lo3: 5 }));
    expect(r.primary).not.toBe('seek-support');
  });

  it('verifies 5 -> 3: lw1=5, lw2=1 sums to 3 -> seek-support', () => {
    // Derivation: f(5)=3, f(1)=0; total 3+0 = 3 >= 3 => positive. If 5 were
    // (wrongly) mapped to 2, total would be 2 < 3 and this would fail —
    // so passing confirms the 5->3 (top-of-scale) mapping.
    const r = scoreMoodScreener(moodVector({ lw1: 5, lw2: 1 }));
    expect(r.primary).toBe('seek-support');
  });

  it('exposes raw per-dimension sums in scores (shape contract)', () => {
    // Independent sum check: with lw1=3, lw2=3 the 'seek-support' RAW sum is
    // the un-mapped Likert sum 3+3 = 6 (scores hold raw Likert sums, the PHQ
    // mapping only governs the cutoff decision).
    const r = scoreMoodScreener(moodVector({ lw1: 3, lw2: 3 }));
    expect(r.scores['seek-support']).toBe(6);
    // moderate raw sum = lw3+lw4+lw5 = 1+1+1 = 3.
    expect(r.scores.moderate).toBe(3);
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
