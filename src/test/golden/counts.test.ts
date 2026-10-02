import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_COUNT, SPREAD_COUNT, QUIZ_COUNT, SIGN_COUNT } from '../../data/counts';
import { fullDeck } from '../../data/tarotDeck';
import { allSpreads, tarotSpreads } from '../../data/tarotSpreads';
import { majorArcanaSpreads } from '../../data/majorArcanaSpreads';
import { ZODIAC_SIGNS } from '../../types/astrology';

/**
 * The landing page's figures are true.
 *
 * "78 cards, 40 spreads, 10 quizzes, 12 signs" used to be literals typed
 * into LandingPage.tsx next to a comment explaining which files they were
 * counted from. Nothing checked the comment. The figures now live in
 * src/data/counts.ts (so the landing chunk stays small) and this gate holds
 * each one to the source it claims to count — so a spread or a quiz added
 * without updating the number fails the build rather than the page.
 */

const ROOT = process.cwd();

/** Blank comments so prose inside the registry is not parsed. */
function strip(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
}

/** The text from `open` at index `from` to its matching `close`, inclusive. */
function balanced(src: string, from: number, open: string, close: string): string {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close && --depth === 0) return src.slice(from, i + 1);
  }
  throw new Error(`unbalanced ${open}${close} from ${from}`);
}

/**
 * The quiz registry is `const quizzes = [...]` inside the QuizzesPage
 * component, so it cannot be imported without rendering the page. Read the
 * source instead: take the array, cut out every `...(flag ? [...] : [])`
 * spread (those are the flag-gated entries), and count what is left.
 */
function alwaysOnQuizzes(): { alwaysOn: number; gated: number } {
  const src = strip(readFileSync(join(ROOT, 'src/pages/QuizzesPage.tsx'), 'utf8'));
  const start = src.indexOf('const quizzes = [');
  expect(start, 'QuizzesPage.tsx no longer declares `const quizzes = [` — point this test at the new registry').toBeGreaterThan(-1);
  const registry = balanced(src, src.indexOf('[', start), '[', ']');

  let stripped = registry;
  let gated = 0;
  for (let at = stripped.indexOf('...('); at !== -1; at = stripped.indexOf('...(')) {
    const spread = balanced(stripped, at + 3, '(', ')');
    gated++;
    stripped = stripped.slice(0, at) + stripped.slice(at + 3 + spread.length);
  }
  const alwaysOn = (stripped.match(/\bquiz:\s*localizeQuiz\(/g) ?? []).length;
  return { alwaysOn, gated };
}

describe('the landing page counts what the data holds', () => {
  it('cards: the full deck', () => {
    expect(CARD_COUNT).toBe(fullDeck.length);
  });

  it('spreads: the general spreads plus the major-arcana spreads', () => {
    expect(allSpreads.length).toBe(tarotSpreads.length + majorArcanaSpreads.length);
    expect(SPREAD_COUNT).toBe(allSpreads.length);
  });

  it('quizzes: the registry entries that are always on', () => {
    const { alwaysOn, gated } = alwaysOnQuizzes();
    // Guards the parser: the registry carries flag-gated spreads today. If
    // they go, the method still works, but check the count by hand once.
    expect(gated).toBeGreaterThan(0);
    expect(alwaysOn).toBeGreaterThan(0);
    expect(QUIZ_COUNT).toBe(alwaysOn);
  });

  it('signs: the zodiac', () => {
    expect(SIGN_COUNT).toBe(ZODIAC_SIGNS.length);
  });

  it('the landing page reads the figures from counts.ts, not from literals', () => {
    const src = strip(readFileSync(join(ROOT, 'src/pages/LandingPage.tsx'), 'utf8'));
    expect(src).toMatch(/from '\.\.\/data\/counts'/);
    expect(src).not.toMatch(/\b(?:QUIZ_COUNT|SPREAD_COUNT|CARD_COUNT|SIGN_COUNT)\s*=\s*\d/);
  });
});
