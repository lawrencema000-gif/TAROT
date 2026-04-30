/**
 * Verify Human Design constants and derivation logic.
 *
 * Static structural checks (no astronomy needed):
 *   1. GATE_WHEEL: exactly 64 entries, each gate 1..64 appears exactly once.
 *   2. GATE_CENTER: every gate 1..64 maps to exactly one center.
 *   3. CHANNELS: 36 unique channels (canonical HD set), no duplicates,
 *      no channel maps a gate to itself, every gate in a channel exists.
 *   4. Type / authority derivation: spot-check known activation patterns.
 *
 * Dynamic chart accuracy (real ecliptic longitudes + 88° design arc) is
 * not verified here — it requires astronomy-engine which only runs in the
 * edge runtime. To verify a real chart, hit the deployed function and
 * compare to a known reference (e.g. genetic-matrix.com).
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

// ─── Mirror constants from supabase/functions/human-design-chart/index.ts ─

const GATE_WHEEL = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36,
  25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20,
  16, 35, 45, 12, 15, 52,
  39, 53, 62, 56, 31, 33,
  7, 4, 29, 59, 40, 64,
  47, 6, 46, 18, 48, 57,
  32, 50, 28, 44, 1, 43,
  14, 34, 9, 5, 26, 11,
  10, 58, 38, 54, 61, 60,
];

const GATE_CENTER = {
  64: "Head", 61: "Head", 63: "Head",
  47: "Ajna", 24: "Ajna", 4: "Ajna", 17: "Ajna", 43: "Ajna", 11: "Ajna",
  62: "Throat", 23: "Throat", 56: "Throat", 16: "Throat", 20: "Throat",
  31: "Throat", 8: "Throat", 33: "Throat", 35: "Throat", 12: "Throat",
  45: "Throat",
  7: "G", 1: "G", 13: "G", 25: "G", 46: "G", 2: "G", 15: "G", 10: "G",
  21: "Heart", 40: "Heart", 26: "Heart", 51: "Heart",
  34: "Sacral", 5: "Sacral", 14: "Sacral", 29: "Sacral",
  59: "Sacral", 9: "Sacral", 3: "Sacral", 42: "Sacral", 27: "Sacral",
  6: "SolarPlexus", 37: "SolarPlexus", 22: "SolarPlexus",
  36: "SolarPlexus", 30: "SolarPlexus", 55: "SolarPlexus", 49: "SolarPlexus",
  50: "Spleen", 32: "Spleen", 28: "Spleen", 18: "Spleen",
  48: "Spleen", 57: "Spleen", 44: "Spleen",
  53: "Root", 60: "Root", 52: "Root", 19: "Root",
  39: "Root", 41: "Root", 58: "Root", 38: "Root", 54: "Root",
};

const CHANNELS = [
  [64, 47],  [61, 24],  [63, 4],
  [17, 62],  [43, 23],  [11, 56],
  [20, 10],  [20, 34],  [20, 57],
  [16, 48],
  [35, 36],  [12, 22],
  [45, 21],
  [8, 1],    [33, 13],  [31, 7],
  [10, 57],  [10, 34],
  [25, 51],
  [2, 14],   [15, 5],   [29, 46],
  [59, 6],
  [27, 50],
  [42, 53],  [3, 60],   [9, 52],
  [34, 57],
  [26, 44],
  [40, 37],
  [54, 32],  [28, 38],  [18, 58],
  [19, 49],  [39, 55],  [41, 30],
];

let allPassed = true;
function check(label, expected, actual) {
  const ok = expected === actual;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${expected}, got ${actual}`);
  if (!ok) allPassed = false;
}

// ─── 1. GATE_WHEEL coverage ────────────────────────────────────
console.log('\n[1/4] Gate wheel — 64 unique gates 1..64');
check('64 entries', 64, GATE_WHEEL.length);
const wheelSet = new Set(GATE_WHEEL);
check('64 unique gates', 64, wheelSet.size);
const expectedSet = new Set();
for (let i = 1; i <= 64; i++) expectedSet.add(i);
const missingWheel = [...expectedSet].filter((g) => !wheelSet.has(g));
const extraWheel = [...wheelSet].filter((g) => !expectedSet.has(g));
check('every gate 1..64 present', 0, missingWheel.length);
check('no out-of-range gates', 0, extraWheel.length);
if (missingWheel.length) console.log('     Missing:', missingWheel.join(', '));
if (extraWheel.length) console.log('     Extra:', extraWheel.join(', '));

// ─── 2. GATE_CENTER coverage ───────────────────────────────────
console.log('\n[2/4] Gate-to-center map — every gate 1..64 maps to a center');
const mappedGates = Object.keys(GATE_CENTER).map(Number);
check('64 gates mapped', 64, mappedGates.length);
const missingCenter = [...expectedSet].filter((g) => !(g in GATE_CENTER));
check('every gate has a center', 0, missingCenter.length);
if (missingCenter.length) console.log('     Missing:', missingCenter.join(', '));
const validCenters = new Set([
  'Head', 'Ajna', 'Throat', 'G', 'Heart',
  'Sacral', 'SolarPlexus', 'Spleen', 'Root',
]);
const invalidCenter = mappedGates.filter((g) => !validCenters.has(GATE_CENTER[g]));
check('all centers in valid 9-set', 0, invalidCenter.length);

// ─── 3. CHANNELS ───────────────────────────────────────────────
console.log('\n[3/4] Channels — 36 unique HD channels');
check('CHANNELS entries', 36, CHANNELS.length);
const channelKeys = CHANNELS.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`));
const uniqueChannels = new Set(channelKeys);
check('all 36 channels unique (no [a,b]/[b,a] duplicates)', 36, uniqueChannels.size);
if (uniqueChannels.size < 36) {
  const seen = new Map();
  for (const k of channelKeys) seen.set(k, (seen.get(k) || 0) + 1);
  for (const [k, n] of seen) {
    if (n > 1) console.log(`     Duplicate: ${k} appears ${n}× in CHANNELS`);
  }
}
const selfChannels = CHANNELS.filter(([a, b]) => a === b);
check('no self-loop channels', 0, selfChannels.length);
const orphanedGates = [];
for (const [a, b] of CHANNELS) {
  if (!(a in GATE_CENTER)) orphanedGates.push(a);
  if (!(b in GATE_CENTER)) orphanedGates.push(b);
}
check('every channel gate is in GATE_CENTER', 0, orphanedGates.length);

// Canonical HD channel set (36 channels). Source: Ra Uru Hu's "Definition".
const CANONICAL_CHANNELS = [
  '1-8', '2-14', '3-60', '4-63', '5-15', '6-59', '7-31', '9-52',
  '10-20', '10-34', '10-57', '11-56', '12-22', '13-33', '16-48',
  '17-62', '18-58', '19-49', '20-34', '20-57', '21-45', '23-43',
  '24-61', '25-51', '26-44', '27-50', '28-38', '29-46', '30-41',
  '32-54', '34-57', '35-36', '37-40', '39-55', '42-53', '47-64',
];
const canonSet = new Set(CANONICAL_CHANNELS);
const missingCanon = CANONICAL_CHANNELS.filter((k) => !uniqueChannels.has(k));
const extraCanon = [...uniqueChannels].filter((k) => !canonSet.has(k));
check('matches canonical 36-channel HD set — no missing', 0, missingCanon.length);
check('matches canonical 36-channel HD set — no extras', 0, extraCanon.length);
if (missingCanon.length) console.log('     Missing canonical channels:', missingCanon.join(', '));
if (extraCanon.length) console.log('     Extra non-canonical channels:', extraCanon.join(', '));

// ─── 4. Type / Authority derivation ────────────────────────────
console.log('\n[4/4] Type & authority derivation logic');
function deriveTypeAndAuthority(activationGates) {
  const allGates = new Set(activationGates);
  const definedCenters = new Set();
  const channels = [];
  for (const [a, b] of CHANNELS) {
    if (allGates.has(a) && allGates.has(b)) {
      const cA = GATE_CENTER[a];
      const cB = GATE_CENTER[b];
      if (cA) definedCenters.add(cA);
      if (cB) definedCenters.add(cB);
      channels.push(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
  }
  const sacralDefined = definedCenters.has('Sacral');
  const MOTOR_CENTERS = ['Sacral', 'SolarPlexus', 'Heart', 'Root'];
  const throatToMotor = channels.some((c) => {
    const [a, b] = c.split('-').map(Number);
    const ca = GATE_CENTER[a];
    const cb = GATE_CENTER[b];
    return (
      (ca === 'Throat' && MOTOR_CENTERS.includes(cb)) ||
      (cb === 'Throat' && MOTOR_CENTERS.includes(ca))
    );
  });

  let type;
  if (definedCenters.size === 0) type = 'Reflector';
  else if (sacralDefined) type = throatToMotor ? 'Manifesting Generator' : 'Generator';
  else if (throatToMotor) type = 'Manifestor';
  else type = 'Projector';

  let authority;
  if (type === 'Reflector') authority = 'Lunar';
  else if (definedCenters.has('SolarPlexus')) authority = 'Emotional';
  else if (definedCenters.has('Sacral')) authority = 'Sacral';
  else if (definedCenters.has('Spleen')) authority = 'Splenic';
  else if (definedCenters.has('Heart')) authority = type === 'Projector' ? 'Ego Projected' : 'Ego Manifested';
  else if (definedCenters.has('G')) authority = 'Self-Projected';
  else authority = 'Mental';

  return { type, authority, definedCenters: [...definedCenters].sort(), channels };
}

// Reflector: no defined centers (no channels firing).
let r = deriveTypeAndAuthority([]);
check('No activations → Reflector / Lunar', 'Reflector', r.type);
check('Reflector authority', 'Lunar', r.authority);

// Generator: sacral defined, no throat-motor connection.
// Channel 5-15 (Rhythm) defines Sacral + G.
r = deriveTypeAndAuthority([5, 15]);
check('Channel 5-15 → Generator', 'Generator', r.type);
check('Generator with G+Sacral → Sacral authority', 'Sacral', r.authority);

// Manifesting Generator: sacral defined AND throat-to-motor.
// Channel 20-34 (Charisma) gives Throat-Sacral directly.
r = deriveTypeAndAuthority([20, 34]);
check('Channel 20-34 (Throat-Sacral) → Manifesting Generator', 'Manifesting Generator', r.type);

// Manifestor: throat-to-motor (Heart/SP/Root), no sacral.
// Channel 21-45 (Money Line) gives Throat-Heart.
r = deriveTypeAndAuthority([21, 45]);
check('Channel 21-45 (Throat-Heart) → Manifestor', 'Manifestor', r.type);
check('Manifestor with only Heart motor → Ego Manifested', 'Ego Manifested', r.authority);

// Projector: at least one center defined, no sacral, no throat-to-motor.
// Channel 4-63 defines Ajna+Head only.
r = deriveTypeAndAuthority([4, 63]);
check('Channel 4-63 (Ajna-Head) → Projector', 'Projector', r.type);
check('Projector with no SP/Sacral/Spleen/Heart/G → Mental', 'Mental', r.authority);

// Authority priority: SP beats Sacral.
// Channel 35-36 (SP-Throat) + 5-15 (Sacral-G) → both SP and Sacral defined.
r = deriveTypeAndAuthority([35, 36, 5, 15]);
check('SP+Sacral both defined → Emotional authority (SP wins)', 'Emotional', r.authority);

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES — algorithm has a bug'));
process.exit(allPassed ? 0 : 1);
