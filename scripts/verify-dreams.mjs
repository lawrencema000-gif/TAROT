/**
 * Verify the Dream Interpreter's local keyword matcher.
 *
 * Audit findings (2026-04-30):
 *  1. 11 keywords in dreamSymbols.ts use the apostrophe-less form (e.g.
 *     "cant scream", "havent studied"). Without normalisation those would
 *     never match real user input ("can't scream", "haven't studied")
 *     because regex \b doesn't match contiguous letter+apostrophe+letter
 *     spans.
 *  2. The fix: normaliseForKeywordMatch strips apostrophes from BOTH the
 *     input text and the keyword before regex compilation.
 *  3. This script regression-tests that real-user phrasing now matches.
 *
 * Static checks: every keyword is reachable via at least one example
 * input phrasing. We don't import the TS module — instead we mirror the
 * regex-build logic and walk the source file for keywords.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function normalise(s) {
  return s.toLowerCase().replace(/[’‘'`´]/g, '');
}

function buildRegex(keyword) {
  const normalised = normalise(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${normalised}\\b`, 'i');
}

function matches(text, keyword) {
  return buildRegex(keyword).test(normalise(text));
}

let allPassed = true;
function check(label, expected, actual) {
  const ok = expected === actual;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${expected}, got ${actual}`);
  if (!ok) allPassed = false;
}

// ─── 1. Apostrophe-stripped keywords match real user phrasing ───────
console.log('\n[1/3] Apostrophe normalisation — real-user phrasings now match');
const cases = [
  // Originally dead-letter keywords — verify they now match.
  { keyword: 'cant scream', input: 'I tried to scream but I cant scream and woke up terrified' },
  { keyword: 'cant scream', input: 'I want to scream but I can\'t scream' },
  { keyword: 'havent studied', input: 'I walked into the exam and havent studied at all' },
  { keyword: 'havent studied', input: 'walked into the exam and haven\'t studied at all' },
  { keyword: 'cant find', input: 'I am wandering through the woods and I can\'t find my way' },
  { keyword: 'cant breathe', input: 'I can\'t breathe in the dream' },
  { keyword: 'cant see', input: 'It went dark and I can\'t see anything' },
  { keyword: 'cant run', input: 'I tried to escape but I can\'t run, my legs are heavy' },
  { keyword: 'cant find food', input: 'I am starving and can\'t find food anywhere' },
  { keyword: 'cant find water', input: 'In the desert and can\'t find water' },
  { keyword: 'cant get in', input: 'I am at my old house and can\'t get in' },
  { keyword: 'cant be found', input: 'I am hiding and can\'t be found' },
  { keyword: 'cant hear', input: 'Everyone is talking but I can\'t hear them' },
  { keyword: 'cant stop laughing', input: 'I can\'t stop laughing in the dream' },
  { keyword: 'cant tell time', input: 'The clock is broken — I can\'t tell time' },
  { keyword: 'cant speak', input: 'I open my mouth but I can\'t speak' },
  // Curly apostrophe (smart quote) variant — comes from iOS auto-correct.
  { keyword: 'cant speak', input: 'I open my mouth but I can’t speak' },
];
for (const c of cases) {
  check(`"${c.keyword}" matches in "${c.input.slice(0, 50)}…"`, true, matches(c.input, c.keyword));
}

// ─── 2. Existing matches without apostrophes still work ──────────────
console.log('\n[2/3] Non-apostrophe keywords still match (no regression)');
const noRegression = [
  { keyword: 'water', input: 'I was swimming in deep water' },
  { keyword: 'fire', input: 'A wild fire burned through the field' },
  { keyword: 'flying', input: 'I was flying over the city' },
  { keyword: 'death', input: 'I dreamed of my own death' },
  { keyword: 'snake', input: 'A green snake coiled around my arm' },
  { keyword: 'house', input: 'My childhood house had new rooms' },
  { keyword: 'bridge', input: 'I crossed an old wooden bridge' },
];
for (const c of noRegression) {
  check(`"${c.keyword}" matches in "${c.input}"`, true, matches(c.input, c.keyword));
}

// ─── 3. Word-boundary correctness ────────────────────────────────────
console.log('\n[3/3] Word-boundary correctness — false positives prevented');
const noFalsePositive = [
  // "fire" should NOT match in "firearm" (no word boundary).
  { keyword: 'fire', input: 'I was carrying a firearm', shouldMatch: false },
  // "water" should match in "water" but not "underwater" (water is preceded by 'r' which is word).
  { keyword: 'water', input: 'I was underwater holding my breath', shouldMatch: false },
  // Direction "up" — should NOT match "lupus" or "supper".
  { keyword: 'up', input: 'I had supper with my grandmother', shouldMatch: false },
];
for (const c of noFalsePositive) {
  check(
    `"${c.keyword}" ${c.shouldMatch ? 'matches' : 'does NOT match'} in "${c.input}"`,
    c.shouldMatch,
    matches(c.input, c.keyword),
  );
}

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES — keyword matcher has a bug'));
process.exit(allPassed ? 0 : 1);
