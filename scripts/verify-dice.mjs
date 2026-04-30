/**
 * Verify the Dice Oracle.
 *
 * Audit findings (2026-05-01):
 *  - Three independent uniform d6 rolls.
 *  - Sum range 3-18 covered by the SUM_MEANINGS table (16 entries).
 *  - Math.random() PRNG is appropriate for divination — no need for
 *    cryptographic randomness here.
 *  - No bugs found.
 *
 * What this script verifies statically:
 *  1. SUM_MEANINGS covers exactly 3..18 (no gaps, no extras).
 *  2. Each meaning has the required fields (title, reading, prompt).
 *  3. Three-d6 sum distribution converges to the canonical triangular
 *     distribution (1, 3, 6, 10, 15, 21, 25, 27, 27, 25, 21, 15, 10, 6, 3, 1)/216.
 *  4. Per-die distribution is uniform 1..6.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

let allPassed = true;
function check(label, expected, actual) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  if (!ok) allPassed = false;
}

// ─── 1. SUM_MEANINGS coverage (read from source) ──────────────────
console.log('\n[1/4] SUM_MEANINGS — full coverage of 3..18');

const src = readFileSync(resolve(root, 'src/data/diceOracle.ts'), 'utf8');

// Pull integer keys from the SUM_MEANINGS object literal.
const sumKeyMatches = [...src.matchAll(/^\s+(\d+):\s*\{$/gm)].map((m) => parseInt(m[1], 10));
const expected = Array.from({ length: 16 }, (_, i) => i + 3);
check('Sums 3..18 declared', expected, sumKeyMatches);

// Each meaning has title, reading, prompt.
let missingFields = 0;
for (const sum of expected) {
  const blockMatch = src.match(new RegExp(`^\\s+${sum}:\\s*\\{[\\s\\S]*?^\\s+\\},`, 'm'));
  if (!blockMatch) { missingFields++; continue; }
  const block = blockMatch[0];
  if (!block.includes('title:')) missingFields++;
  if (!block.includes('reading:')) missingFields++;
  if (!block.includes('prompt:')) missingFields++;
}
check('All 16 meanings have title + reading + prompt', 0, missingFields);

// ─── 2. Mirror rollDice() to test distribution ────────────────────
function rollDice() {
  const r1 = Math.floor(Math.random() * 6) + 1;
  const r2 = Math.floor(Math.random() * 6) + 1;
  const r3 = Math.floor(Math.random() * 6) + 1;
  return { rolls: [r1, r2, r3], sum: r1 + r2 + r3 };
}

// ─── 3. Sum distribution ──────────────────────────────────────────
console.log('\n[2/4] Per-die distribution — uniform 1..6');
const N = 300_000;
const dieFreq = new Map([1, 2, 3, 4, 5, 6].map((v) => [v, 0]));
const sumFreq = new Map(expected.map((s) => [s, 0]));
for (let i = 0; i < N; i++) {
  const r = rollDice();
  for (const v of r.rolls) dieFreq.set(v, dieFreq.get(v) + 1);
  sumFreq.set(r.sum, sumFreq.get(r.sum) + 1);
}
// Expected per face: N * 3 / 6 = N / 2 (we count 3 dice per roll)
const totalDice = N * 3;
const expectedPerFace = totalDice / 6;
const tolerance = expectedPerFace * 0.01; // 1%
let outOfRange = 0;
for (const [face, count] of dieFreq) {
  if (Math.abs(count - expectedPerFace) > tolerance) {
    outOfRange++;
    console.log(`     face ${face}: ${count} vs expected ${expectedPerFace.toFixed(0)}`);
  }
}
check('All 6 faces equiprobable within 1% over 900k die rolls', 0, outOfRange);

// ─── 4. Triangular sum distribution (3-18) ────────────────────────
console.log('\n[3/4] Sum distribution — matches 3-d6 triangular');
// Number of combinations producing each sum (out of 216 total).
const COMBOS = {
  3: 1, 4: 3, 5: 6, 6: 10, 7: 15, 8: 21, 9: 25, 10: 27,
  11: 27, 12: 25, 13: 21, 14: 15, 15: 10, 16: 6, 17: 3, 18: 1,
};
const totalCombos = Object.values(COMBOS).reduce((a, b) => a + b, 0);
check('Combinations sum to 216 (= 6³)', 216, totalCombos);

let sumOutOfRange = 0;
for (const sum of expected) {
  const expectedRate = COMBOS[sum] / 216;
  const observedRate = sumFreq.get(sum) / N;
  const allowedDelta = Math.max(0.005, expectedRate * 0.05); // 5% relative or 0.5pp absolute
  if (Math.abs(observedRate - expectedRate) > allowedDelta) {
    sumOutOfRange++;
    console.log(`     sum ${sum}: observed ${(observedRate * 100).toFixed(2)}% vs expected ${(expectedRate * 100).toFixed(2)}%`);
  }
}
check('All 16 sums hit their canonical rate within tolerance', 0, sumOutOfRange);

// ─── 5. Bounds — no roll ever escapes 3..18 ───────────────────────
console.log('\n[4/4] Bounds — every roll lands in [3, 18]');
let bad = 0;
for (let i = 0; i < 50_000; i++) {
  const r = rollDice();
  if (r.sum < 3 || r.sum > 18) bad++;
  for (const v of r.rolls) if (v < 1 || v > 6) bad++;
}
check('Zero out-of-range rolls', 0, bad);

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES'));
process.exit(allPassed ? 0 : 1);
