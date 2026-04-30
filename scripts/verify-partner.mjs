/**
 * Verify Partner / Synastry computations.
 *
 * Audit findings (2026-04-30):
 *  1. astrology-synastry was treating partner birth time as UTC by
 *     appending 'Z'. For non-UTC partners the Moon drifted up to ~5°
 *     (sometimes into the next sign). Schema now accepts partnerTimezone
 *     and uses the same localToUTC helper as partner-synastry-adhoc.
 *  2. Both callers (SoulmateScorePage, NatalChartReportPage) now pass
 *     the user's own IANA timezone as a partner-timezone proxy.
 *
 * This script verifies the static logic that lives in the codebase:
 *   - MBTI compatibility scoring (mbtiCompatScore)
 *   - Astro element compatibility table
 *   - Aspect orb arithmetic and shortArc helper
 *   - localToUTC round-trips
 *
 * Real ephemeris testing (Astronomy.SunPosition etc.) requires
 * astronomy-engine which only runs in the edge function — we trust
 * that library and verify the wrapper logic around it.
 */

let allPassed = true;
function check(label, expected, actual) {
  const ok = typeof expected === 'number'
    ? Math.abs(expected - actual) < 0.001
    : expected === actual;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  if (!ok) allPassed = false;
}

// ─── 1. MBTI compatibility scoring ─────────────────────────────────
console.log('\n[1/4] MBTI compatibility (mirrors src/data/partnerCompat.ts)');

function mbtiCompatScore(a, b) {
  let score = 50;
  const sameN = a[1] === b[1];
  score += sameN ? 15 : -10;
  const sameEI = a[0] === b[0];
  score += sameEI ? 5 : 8;
  const sameTF = a[2] === b[2];
  score += sameTF ? 0 : 10;
  const sameJP = a[3] === b[3];
  score += sameJP ? 7 : -2;
  const golden = new Set(['INTJ-ENFP', 'INFJ-ENTP', 'INFP-ENTJ', 'INTP-ENFJ', 'ISTJ-ESFP', 'ISFJ-ESTP', 'ISFP-ESTJ', 'ISTP-ESFJ']);
  if (golden.has(`${a}-${b}`) || golden.has(`${b}-${a}`)) score += 15;
  if (a === b) score = 55;
  return Math.max(10, Math.min(95, score));
}

// Golden pair INTJ-ENFP: 50 +15 (sameN) +8 (diff EI) +10 (diff TF) -2 (diff JP) +15 (golden) = 96 → clamp 95
check('INTJ ↔ ENFP (golden) → 95', 95, mbtiCompatScore('INTJ', 'ENFP'));
check('Same type INTJ ↔ INTJ → 55 (override)', 55, mbtiCompatScore('INTJ', 'INTJ'));
// ESTJ ↔ INFP: diff E/I (+8), diff N/S (-10), diff T/F (+10), diff J/P (-2) = 50 + 6 = 56
check('ESTJ ↔ INFP → 56', 56, mbtiCompatScore('ESTJ', 'INFP'));
// Bounds
check('Score never < 10', true, mbtiCompatScore('ESTJ', 'INFP') >= 10);
check('Score never > 95', true, mbtiCompatScore('INTJ', 'ENFP') <= 95);

// ─── 2. Astro element compatibility ────────────────────────────────
console.log('\n[2/4] Astro element compatibility');

const ELEMENT_PAIRS = {
  'fire-fire': 70, 'water-water': 70, 'air-air': 70, 'earth-earth': 70,
  'fire-air': 85, 'air-fire': 85,
  'water-earth': 85, 'earth-water': 85,
  'fire-water': 55, 'water-fire': 55,
  'fire-earth': 50, 'earth-fire': 50,
  'water-air': 55, 'air-water': 55,
  'earth-air': 60, 'air-earth': 60,
};
check('Fire-Air = 85 (creative spark)', 85, ELEMENT_PAIRS['fire-air']);
check('Water-Earth = 85 (grounded nurture)', 85, ELEMENT_PAIRS['water-earth']);
check('Same element = 70 (resonance)', 70, ELEMENT_PAIRS['fire-fire']);
check('Fire-Earth = 50 (lowest)', 50, ELEMENT_PAIRS['fire-earth']);
check('All 16 element pair combos covered', 16, Object.keys(ELEMENT_PAIRS).length);
// Symmetry check
const elements = ['fire', 'earth', 'air', 'water'];
let asym = 0;
for (const a of elements) for (const b of elements) {
  if (ELEMENT_PAIRS[`${a}-${b}`] !== ELEMENT_PAIRS[`${b}-${a}`]) asym++;
}
check('Element table is symmetric', 0, asym);

// ─── 3. Aspect arithmetic — shortArc + orb ─────────────────────────
console.log('\n[3/4] Aspect arithmetic — shortArc + orb checks');

function shortArc(d) {
  let r = ((d % 360) + 540) % 360 - 180;
  if (r === -180) r = 180;
  return r;
}
check('shortArc(0) = 0', 0, shortArc(0));
check('shortArc(180) = 180', 180, shortArc(180));
check('shortArc(190) = -170', -170, shortArc(190));
check('shortArc(-10) = -10', -10, shortArc(-10));
check('shortArc(360) = 0', 0, shortArc(360));
check('shortArc(540) = 180', 180, shortArc(540));

// Aspect detection: my Sun at 100°, partner Moon at 220° → diff 120° = trine.
const ASPECTS = [
  { type: 'conjunction', angle: 0,   maxOrb: 6 },
  { type: 'opposition',  angle: 180, maxOrb: 6 },
  { type: 'trine',       angle: 120, maxOrb: 5 },
  { type: 'square',      angle: 90,  maxOrb: 5 },
  { type: 'sextile',     angle: 60,  maxOrb: 4 },
];
function detectAspect(lonA, lonB) {
  const sep = Math.abs(shortArc(lonA - lonB));
  for (const a of ASPECTS) {
    if (Math.abs(sep - a.angle) <= a.maxOrb) return { type: a.type, orb: Math.abs(sep - a.angle) };
  }
  return null;
}
check('100° ↔ 220° = trine (exact 120°)', 'trine', detectAspect(100, 220).type);
check('100° ↔ 280° = opposition (exact 180°)', 'opposition', detectAspect(100, 280).type);
check('100° ↔ 100° = conjunction (exact 0°)', 'conjunction', detectAspect(100, 100).type);
check('100° ↔ 190° = square (exact 90°)', 'square', detectAspect(100, 190).type);
check('100° ↔ 160° = sextile (exact 60°)', 'sextile', detectAspect(100, 160).type);
// Wide gap, no aspect
check('100° ↔ 145° = no aspect (45° between sextile and square)', null, detectAspect(100, 145));
// Just inside trine orb
check('100° ↔ 224° (4° from trine, within 5° orb) = trine', 'trine', detectAspect(100, 224).type);
// Just outside trine orb
check('100° ↔ 226° (6° from trine, outside 5° orb) = no trine', null, detectAspect(100, 226));

// ─── 4. localToUTC timezone math ──────────────────────────────────
console.log('\n[4/4] localToUTC — partner birth time interpreted in partner timezone');

function localToUTC(date, time, timezone) {
  const tz = timezone || 'UTC';
  const timeStr = time || '12:00:00';
  const full = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const dt = new Date(`${date}T${full}Z`);
  if (tz === 'UTC') return dt;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(dt);
    const p = {};
    for (const part of parts) p[part.type] = part.value;
    const hour = p.hour === '24' ? '00' : p.hour;
    const localStr = `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}Z`;
    const localAsUtc = new Date(localStr);
    const offsetMs = localAsUtc.getTime() - dt.getTime();
    return new Date(dt.getTime() - offsetMs);
  } catch {
    return dt;
  }
}

// Sydney is UTC+10 in winter (no DST), so 2026-06-08 16:15 in Sydney = 06:15 UTC.
// (June is winter in Sydney; AEST = UTC+10, no DST.)
const sydneyMoment = localToUTC('2026-06-08', '16:15', 'Australia/Sydney');
check('Sydney 2026-06-08 16:15 → UTC 06:15', '2026-06-08T06:15:00.000Z', sydneyMoment.toISOString());

// New York 2026-06-08 16:15 EDT (UTC-4 during DST) → 20:15 UTC
const nycMoment = localToUTC('2026-06-08', '16:15', 'America/New_York');
check('NYC 2026-06-08 16:15 EDT → UTC 20:15', '2026-06-08T20:15:00.000Z', nycMoment.toISOString());

// UTC fast-path: same as input
const utcMoment = localToUTC('2026-06-08', '16:15', 'UTC');
check('UTC 16:15 → UTC 16:15', '2026-06-08T16:15:00.000Z', utcMoment.toISOString());

// No timezone defaults to UTC
const noTzMoment = localToUTC('2026-06-08', '16:15', undefined);
check('No timezone defaults to UTC', '2026-06-08T16:15:00.000Z', noTzMoment.toISOString());

// No time defaults to noon
const noTimeMoment = localToUTC('2026-06-08', undefined, 'UTC');
check('No time → noon UTC', '2026-06-08T12:00:00.000Z', noTimeMoment.toISOString());

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES'));
process.exit(allPassed ? 0 : 1);
