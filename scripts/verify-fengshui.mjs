/**
 * Verify Feng Shui computations.
 *
 * Audit findings (2026-05-01):
 *  1. CRITICAL: the hard-coded "2026 Flying Stars" layout was actually
 *     the 2023 layout (centre = Star 4 instead of Star 1). Star 5 (Wu
 *     Wang — the worst star) was placed in SE when it should be in N.
 *     Users following the bad layout protected the wrong direction.
 *     Fix: compute centre star from year, fly Lo Shu through 9 palaces.
 *  2. Kua year boundary: traditional formula uses solar year (立春 ≈
 *     Feb 4), not Gregorian. computeKua now accepts an optional
 *     birthDate and rolls Jan 1 - Feb 3 birthdays back a year (matches
 *     how Bazi handles the same boundary).
 *
 * This script verifies all of that statically.
 */

let allPassed = true;
function check(label, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  if (!ok) allPassed = false;
}

// ─── 1. Annual centre-star sequence ─────────────────────────────
console.log('\n[1/4] Annual centre star — decrements by 1 each year (mod 9, 0→9)');

function centerStarFor(year) {
  const anchor = 2024;
  const anchorStar = 3;
  const offset = year - anchor;
  let star = ((anchorStar - offset) % 9 + 9) % 9;
  if (star === 0) star = 9;
  return star;
}

// Anchored sequence — well-established in feng shui practice.
const anchors = [
  [2020, 7], [2021, 6], [2022, 5], [2023, 4],
  [2024, 3], [2025, 2], [2026, 1], [2027, 9],
  [2028, 8], [2029, 7], [2030, 6],
];
for (const [year, expected] of anchors) {
  check(`centerStarFor(${year})`, expected, centerStarFor(year));
}

// ─── 2. Flying-star layout (Lo Shu shift) ───────────────────────
console.log('\n[2/4] Flying star layout — Lo Shu shifted by (centre - 5)');

const LO_SHU = {
  NW: 4, N: 9, NE: 2,
  W:  3, Center: 5, E: 7,
  SW: 8, S: 1, SE: 6,
};
const DIRS = ['NW', 'N', 'NE', 'W', 'Center', 'E', 'SW', 'S', 'SE'];

function flyLayout(centerStar) {
  const shift = centerStar - 5;
  const out = {};
  for (const dir of DIRS) {
    let v = ((LO_SHU[dir] + shift) % 9 + 9) % 9;
    if (v === 0) v = 9;
    out[dir] = v;
  }
  return out;
}

// Lo Shu identity: centre 5 = the base square.
check('Centre 5 returns Lo Shu untouched', LO_SHU, flyLayout(5));

// Centre 1 (2026) — verified against canonical sources.
check('2026 (centre 1) — full layout', {
  NW: 9, N: 5, NE: 7,
  W:  8, Center: 1, E: 3,
  SW: 4, S: 6, SE: 2,
}, flyLayout(1));

// Centre 4 (2023) — what the buggy hard-coded table actually had.
check('2023 (centre 4) — full layout', {
  NW: 3, N: 8, NE: 1,
  W:  2, Center: 4, E: 6,
  SW: 7, S: 9, SE: 5,
}, flyLayout(4));

// Centre 9 (2027)
check('2027 (centre 9) — full layout', {
  NW: 8, N: 4, NE: 6,
  W:  7, Center: 9, E: 2,
  SW: 3, S: 5, SE: 1,
}, flyLayout(9));

// Star 5 location matters most — it's the worst direction.
const layouts = {
  2024: flyLayout(3),
  2025: flyLayout(2),
  2026: flyLayout(1),
  2027: flyLayout(9),
};
// Lo Shu cell value 7 (E) shifted by (centre - 5) lands on 5 when
// centre = 3. Working through each year from the canonical centre star:
check('Star 5 (Wu Wang) location — 2024 is in E', 'E',
  Object.entries(layouts[2024]).find(([, v]) => v === 5)[0]);
check('Star 5 (Wu Wang) location — 2025 is in SW', 'SW',
  Object.entries(layouts[2025]).find(([, v]) => v === 5)[0]);
check('Star 5 (Wu Wang) location — 2026 is in N (NOT SE as buggy code claimed)', 'N',
  Object.entries(layouts[2026]).find(([, v]) => v === 5)[0]);
check('Star 5 (Wu Wang) location — 2027 is in S', 'S',
  Object.entries(layouts[2027]).find(([, v]) => v === 5)[0]);

// ─── 3. Kua computation ─────────────────────────────────────────
console.log('\n[3/4] Kua number — verified against canonical anchors');

function computeKua(birthYear, gender, birthDate) {
  if (!Number.isFinite(birthYear) || birthYear < 1900 || birthYear > 2100) return null;
  let effectiveYear = birthYear;
  if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const [, m, d] = birthDate.split('-').map(Number);
    if (m === 1 || (m === 2 && d <= 3)) effectiveYear = birthYear - 1;
  }
  const last2 = effectiveYear % 100;
  let digitSum = Math.floor(last2 / 10) + (last2 % 10);
  while (digitSum >= 10) digitSum = Math.floor(digitSum / 10) + (digitSum % 10);
  let raw;
  const isModern = effectiveYear >= 2000;
  if (gender === 'male') {
    raw = isModern ? (9 - digitSum) : (11 - digitSum);
    while (raw <= 0) raw += 9;
    raw = ((raw - 1) % 9) + 1;
  } else {
    raw = isModern ? (6 + digitSum) : (4 + digitSum);
    raw = ((raw - 1) % 9) + 1;
  }
  if (raw === 5) raw = gender === 'male' ? 2 : 8;
  return raw;
}

// Canonical Kua anchors — verifiable from any Eight Mansions chart.
check('1980 male → Kua 3', 3, computeKua(1980, 'male'));
check('1980 female → Kua 3', 3, computeKua(1980, 'female'));
check('1985 male → Kua 7', 7, computeKua(1985, 'male'));
check('1985 female → Kua 8', 8, computeKua(1985, 'female'));
check('2000 male → Kua 9', 9, computeKua(2000, 'male'));
check('2000 female → Kua 6', 6, computeKua(2000, 'female'));
check('2001 male → Kua 8', 8, computeKua(2001, 'male'));
check('2001 female → Kua 7', 7, computeKua(2001, 'female'));
check('2024 male → Kua 3', 3, computeKua(2024, 'male'));
// Kua 5 substitutions. To produce raw=5 for a pre-2000 male we need
// 11 - reducedDigitSum = 5, so reducedDigitSum = 6. Year 1942 → 4+2=6.
// Substitute to Kua 2 (Kun, West group).
check('1942 male (raw Kua 5) → substitute 2', 2, computeKua(1942, 'male'));
// Female pre-2000: 4 + reducedDigitSum = 5, so sum = 1. Year 1910 → 1+0=1.
// Substitute to Kua 8 (Gen, West group).
check('1910 female (raw Kua 5) → substitute 8', 8, computeKua(1910, 'female'));

// ─── 4. Kua solar-year boundary (Feb 4 / 立春) ────────────────────
console.log('\n[4/4] Kua year boundary — Jan 1 - Feb 3 belongs to previous year');

// 1985 male without date → Kua 7. Born Jan 15 1985 should belong to 1984.
// 1984 male: 8+4=12→3. 11-3=8. Kua 8.
check('1985 male, no birthDate → 7', 7, computeKua(1985, 'male'));
check('1985 male born 1985-01-15 → 8 (rolled back to 1984)', 8, computeKua(1985, 'male', '1985-01-15'));
check('1985 male born 1985-02-03 → 8 (rolled back, still pre-立春)', 8, computeKua(1985, 'male', '1985-02-03'));
check('1985 male born 1985-02-04 → 7 (on or after 立春, no rollback)', 7, computeKua(1985, 'male', '1985-02-04'));
check('1985 male born 1985-06-15 → 7 (mid-year, no rollback)', 7, computeKua(1985, 'male', '1985-06-15'));
// Edge: malformed date is ignored (falls back to year-only).
check('1985 male, malformed birthDate → 7 (graceful)', 7, computeKua(1985, 'male', 'not-a-date'));

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES'));
process.exit(allPassed ? 0 : 1);
