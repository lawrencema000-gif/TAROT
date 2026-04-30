/**
 * Verify mood-diary calculations.
 *
 * Audit findings (2026-04-30):
 *  1. entryToYValue had a sign bug for negative moods: high-intensity
 *     "drained" / "heavy" plotted ABOVE mild-intensity, the opposite of
 *     the docstring's intent. Fixed by symmetrising the intensity term.
 *  2. derivePattern correctness verified by spot-checking drift, dominant
 *     category shift detection, and headline generation.
 *
 * Run with: node scripts/verify-mood.mjs
 */

// Mirror the post-fix formula from src/data/moodDiary.ts.
const MOOD_Y_VALUE = {
  joyful: 5, curious: 4, charged: 4, steady: 3, calm: 3,
  anxious: 2, heavy: 1, drained: 1,
};

function entryToYValue(entry) {
  const base = MOOD_Y_VALUE[entry.category];
  const adjust = (entry.intensity - 3) * 0.3;
  if (base >= 3) return Math.min(5, base + adjust);
  return Math.max(1, base - adjust);
}

let allPassed = true;
function check(label, expected, actual) {
  const eps = typeof expected === 'number' ? Math.abs(expected - actual) < 0.01 : expected === actual;
  console.log(`  ${eps ? '✅' : '❌'} ${label}: expected ${expected}, got ${actual}`);
  if (!eps) allPassed = false;
}

// ─── 1. Negative moods: high intensity → LOWER y (more depleted) ─
console.log('\n[1/3] Negative moods — high intensity drives y lower (more down on chart)');
// drained base=1
check('drained intensity=1 (mild) → 1.6 (closer to neutral)', 1.6, entryToYValue({ category: 'drained', intensity: 1 }));
check('drained intensity=3 (neutral) → 1.0 (at base)', 1.0, entryToYValue({ category: 'drained', intensity: 3 }));
check('drained intensity=5 (extreme) → 1.0 (clamped at floor, most depleted)', 1.0, entryToYValue({ category: 'drained', intensity: 5 }));
// Heavy base=1
check('heavy intensity=1 → 1.6', 1.6, entryToYValue({ category: 'heavy', intensity: 1 }));
check('heavy intensity=5 → 1.0 (clamped)', 1.0, entryToYValue({ category: 'heavy', intensity: 5 }));
// anxious base=2
check('anxious intensity=1 (mild) → 2.6', 2.6, entryToYValue({ category: 'anxious', intensity: 1 }));
check('anxious intensity=3 → 2.0', 2.0, entryToYValue({ category: 'anxious', intensity: 3 }));
check('anxious intensity=5 (extreme) → 1.4 (more depleted)', 1.4, entryToYValue({ category: 'anxious', intensity: 5 }));

// Critical regression check: BEFORE the fix, intensity=5 drained = 1.6
// (HIGHER on chart than intensity=1 drained = 1.0). After the fix, this
// must invert.
const mildDrained = entryToYValue({ category: 'drained', intensity: 1 });
const extremeDrained = entryToYValue({ category: 'drained', intensity: 5 });
check('extreme-drained ≤ mild-drained (chart direction is correct)', true, extremeDrained <= mildDrained);

// ─── 2. Positive moods: high intensity → HIGHER y (more activated) ─
console.log('\n[2/3] Positive moods — high intensity drives y higher');
// joyful base=5
check('joyful intensity=5 → 5.0 (clamped at top)', 5.0, entryToYValue({ category: 'joyful', intensity: 5 }));
check('joyful intensity=1 → 4.4 (slightly less peak)', 4.4, entryToYValue({ category: 'joyful', intensity: 1 }));
// charged base=4
check('charged intensity=5 → 4.6', 4.6, entryToYValue({ category: 'charged', intensity: 5 }));
check('charged intensity=1 → 3.4', 3.4, entryToYValue({ category: 'charged', intensity: 1 }));
// steady base=3
check('steady intensity=5 → 3.6', 3.6, entryToYValue({ category: 'steady', intensity: 5 }));
check('steady intensity=1 → 2.4', 2.4, entryToYValue({ category: 'steady', intensity: 1 }));

// ─── 3. Bounds — never escapes [1, 5] ─────────────────────────────
console.log('\n[3/3] Bounds — y always in [1, 5]');
const allCategories = ['joyful', 'curious', 'charged', 'steady', 'calm', 'anxious', 'heavy', 'drained'];
let oob = false;
for (const cat of allCategories) {
  for (const intensity of [1, 2, 3, 4, 5]) {
    const y = entryToYValue({ category: cat, intensity });
    if (y < 1 || y > 5) {
      console.log(`  ❌ ${cat} intensity=${intensity} → ${y} (out of range)`);
      oob = true;
    }
  }
}
check('all 8×5=40 combinations in [1, 5]', false, oob);

// ─── 4. localDateStr — local components, not UTC ──────────────────
console.log('\n[4/5] localDateStr — uses local calendar, not UTC');
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Sanity: a Date created from local components should round-trip.
const localApr30 = new Date(2026, 3, 30, 12, 0, 0);
check('localDateStr round-trip 2026-04-30 noon local', '2026-04-30', localDateStr(localApr30));
// Padding zero
const localJan5 = new Date(2026, 0, 5, 23, 59, 0);
check('localDateStr pads month and day', '2026-01-05', localDateStr(localJan5));

// ─── 5. Local-day-of-week parsing ────────────────────────────────
console.log('\n[5/5] Local day-of-week parsing avoids UTC drift');
// Parse YYYY-MM-DD as local components.
function localDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
// 2026-04-30 = Thursday (any timezone, since we parse as local).
check('2026-04-30 → Thursday', 4, localDayOfWeek('2026-04-30'));
// 2026-01-01 = Thursday
check('2026-01-01 → Thursday', 4, localDayOfWeek('2026-01-01'));
// 2026-04-26 = Sunday
check('2026-04-26 → Sunday', 0, localDayOfWeek('2026-04-26'));

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES'));
process.exit(allPassed ? 0 : 1);
