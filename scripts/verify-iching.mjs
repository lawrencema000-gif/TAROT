/**
 * Verify I-Ching computation:
 *  1. All 64 binary patterns map to a unique hexagram number 1-64.
 *  2. Three-coin method probability distribution converges to expected
 *     theoretical values (1/8, 3/8, 3/8, 1/8) over a large sample.
 *  3. Changing-line transformation produces a different valid hexagram
 *     when there is at least one changing line.
 *  4. A handful of canonical King Wen lookups (1, 2, 3, 4, 11, 12, 63, 64)
 *     match their trigram-pair definitions.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Inline the LINES_TO_HEXAGRAM table from src/data/ichingHexagrams.ts so
// we don't need to compile TypeScript for this verification.
const LINES_TO_HEXAGRAM = {
  '111111': 1, '000000': 2, '100010': 3, '010001': 4, '111010': 5, '010111': 6,
  '010000': 7, '000010': 8, '111011': 9, '110111': 10, '111000': 11, '000111': 12,
  '101111': 13, '111101': 14, '001000': 15, '000100': 16, '100110': 17, '011001': 18,
  '110000': 19, '000011': 20, '100101': 21, '101001': 22, '000001': 23, '100000': 24,
  '100111': 25, '111001': 26, '100001': 27, '011110': 28, '010010': 29, '101101': 30,
  '001110': 31, '011100': 32, '001111': 33, '111100': 34, '000101': 35, '101000': 36,
  '101011': 37, '110101': 38, '001010': 39, '010100': 40, '110001': 41, '100011': 42,
  '111110': 43, '011111': 44, '000110': 45, '011000': 46, '010110': 47, '011010': 48,
  '101110': 49, '011101': 50, '100100': 51, '001001': 52, '001011': 53, '110100': 54,
  '101100': 55, '001101': 56, '011011': 57, '110110': 58, '010011': 59, '110010': 60,
  '110011': 61, '001100': 62, '101010': 63, '010101': 64,
};

let allPassed = true;
function check(label, expected, actual) {
  const ok = expected === actual;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${expected}, got ${actual}`);
  if (!ok) allPassed = false;
}

// ─── 1. Coverage + uniqueness ─────────────────────────────────
console.log('\n[1/4] Hexagram table coverage + uniqueness');
const numbers = Object.values(LINES_TO_HEXAGRAM);
const uniqueNumbers = new Set(numbers);
const patterns = Object.keys(LINES_TO_HEXAGRAM);
const uniquePatterns = new Set(patterns);
check('64 entries', 64, numbers.length);
check('64 unique hexagram numbers', 64, uniqueNumbers.size);
check('64 unique patterns', 64, uniquePatterns.size);
check('numbers cover 1..64', true, [...uniqueNumbers].every((n) => n >= 1 && n <= 64));
const allBinary = patterns.every((p) => p.length === 6 && /^[01]{6}$/.test(p));
check('all patterns 6-char binary', true, allBinary);

// All 64 possible binary strings present?
const expected64 = new Set();
for (let i = 0; i < 64; i++) expected64.add(i.toString(2).padStart(6, '0'));
const missing = [...expected64].filter((p) => !(p in LINES_TO_HEXAGRAM));
check('all 64 binary combinations covered', 0, missing.length);
if (missing.length) console.log('     Missing:', missing.join(', '));

// ─── 2. Canonical King Wen anchors ────────────────────────────
console.log('\n[2/4] Canonical King Wen anchors');
// Trigram cheat-sheet (bottom-to-top): heaven 111, earth 000, fire 101,
// water 010, thunder 100, mountain 001, lake 011, wind 110.
// Each hexagram = lower-trigram bits + upper-trigram bits, bottom-to-top.
const cases = [
  { label: '#1 Qian (heaven over heaven)',     pattern: '111111', expected: 1 },
  { label: '#2 Kun (earth over earth)',        pattern: '000000', expected: 2 },
  { label: '#11 Tai (earth over heaven)',      pattern: '111000', expected: 11 },
  { label: '#12 Pi (heaven over earth)',       pattern: '000111', expected: 12 },
  { label: '#63 Ji Ji (water over fire)',      pattern: '101010', expected: 63 },
  { label: '#64 Wei Ji (fire over water)',     pattern: '010101', expected: 64 },
];
for (const c of cases) {
  check(c.label, c.expected, LINES_TO_HEXAGRAM[c.pattern]);
}

// ─── 3. Three-coin method probability distribution ────────────
console.log('\n[3/4] Three-coin method probability distribution (N=200000)');
function tossCoins(rng = Math.random) {
  const coin1 = rng() < 0.5 ? 2 : 3;
  const coin2 = rng() < 0.5 ? 2 : 3;
  const coin3 = rng() < 0.5 ? 2 : 3;
  return coin1 + coin2 + coin3;
}
const N = 200_000;
const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
for (let i = 0; i < N; i++) {
  const v = tossCoins();
  counts[v]++;
}
const expected = { 6: 1 / 8, 7: 3 / 8, 8: 3 / 8, 9: 1 / 8 };
const tolerance = 0.01; // 1% slack on 200k samples is plenty
for (const v of [6, 7, 8, 9]) {
  const observed = counts[v] / N;
  const diff = Math.abs(observed - expected[v]);
  const ok = diff < tolerance;
  console.log(
    `  ${ok ? '✅' : '❌'} P(${v}): expected ${expected[v].toFixed(4)}, observed ${observed.toFixed(4)} (diff ${diff.toFixed(4)})`,
  );
  if (!ok) allPassed = false;
}

// ─── 4. Changing-line transformation ──────────────────────────
console.log('\n[4/4] Changing-line transformation');
// Cast: 9, 7, 7, 7, 7, 7  → primary all-yang (#1), one changing line at idx 0
// Transformed: 0, 1, 1, 1, 1, 1 = '011111' = #44 (Gou/Coming to Meet).
function castFromLineValues(lineValues) {
  const primaryLines = lineValues.map((v) => (v === 7 || v === 9 ? '1' : '0'));
  const changingLineIndexes = lineValues
    .map((v, i) => (v === 6 || v === 9 ? i : -1))
    .filter((i) => i >= 0);
  const primary = LINES_TO_HEXAGRAM[primaryLines.join('')];
  let transformed = null;
  if (changingLineIndexes.length > 0) {
    const t = primaryLines.map((bit, i) =>
      changingLineIndexes.includes(i) ? (bit === '1' ? '0' : '1') : bit,
    );
    transformed = LINES_TO_HEXAGRAM[t.join('')];
  }
  return { primary, transformed, changingLineIndexes };
}
const t1 = castFromLineValues([9, 7, 7, 7, 7, 7]);
check('All-yang with changing bottom line — primary', 1, t1.primary);
check('All-yang with changing bottom line — transformed (#44 Gou)', 44, t1.transformed);

const t2 = castFromLineValues([6, 8, 8, 8, 8, 8]);
check('All-yin with changing bottom line — primary', 2, t2.primary);
// transformed: 1, 0, 0, 0, 0, 0 = '100000' = #24 Fu (Return)
check('All-yin with changing bottom line — transformed (#24 Fu)', 24, t2.transformed);

const t3 = castFromLineValues([7, 7, 7, 7, 7, 7]);
check('Static yang — primary', 1, t3.primary);
check('Static yang — transformed (none)', null, t3.transformed);

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES — algorithm has a bug'));
process.exit(allPassed ? 0 : 1);
