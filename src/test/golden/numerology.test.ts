import { describe, it, expect } from 'vitest';
import {
  getExpressionNumber, getSoulUrgeNumber, getPersonalityNumber,
} from '../../utils/numerology';

/**
 * Golden tests for name numerology.
 *
 * Expectations are computed by hand from the Pythagorean table
 * (a/j/s = 1, b/k/t = 2, … i/r = 9) rather than from the code, and the accent
 * cases are here because they were a real defect: the letter scan matched
 * /[a-z]/, so an accented character was silently DROPPED instead of folded.
 * Renée lost the master number 11 that Renee gets, and Björn got no Soul Urge
 * at all — the only vowel in the name was the character being discarded.
 */

describe('Pythagorean letter values', () => {
  it('scores single letters at their table position', () => {
    // a=1 j=1 s=1; i=9 r=9. Expression of a single letter is that letter.
    expect(getExpressionNumber('a')).toBe(1);
    expect(getExpressionNumber('j')).toBe(1);
    expect(getExpressionNumber('s')).toBe(1);
    expect(getExpressionNumber('i')).toBe(9);
    expect(getExpressionNumber('r')).toBe(9);
    expect(getExpressionNumber('h')).toBe(8);
  });

  it('reduces a hand-computed name correctly', () => {
    // "Ada": a(1) + d(4) + a(1) = 6.
    expect(getExpressionNumber('Ada')).toBe(6);
    // vowels a + a = 2; consonant d = 4.
    expect(getSoulUrgeNumber('Ada')).toBe(2);
    expect(getPersonalityNumber('Ada')).toBe(4);
  });

  it('ignores case, spaces and punctuation', () => {
    expect(getExpressionNumber('ada')).toBe(getExpressionNumber('ADA'));
    expect(getExpressionNumber("O'Neill")).toBe(getExpressionNumber('ONeill'));
    expect(getExpressionNumber('Mary Jane')).toBe(getExpressionNumber('MaryJane'));
    expect(getExpressionNumber('Anne-Marie')).toBe(getExpressionNumber('AnneMarie'));
  });
});

describe('master numbers', () => {
  it('preserves 11, 22 and 33 instead of reducing them', () => {
    // "Zoe": z(8) + o(6) + e(5) = 19 → 10 → 1 for expression; vowels o+e = 11,
    // which must survive as 11 rather than reducing to 2.
    expect(getSoulUrgeNumber('Zoe')).toBe(11);
    expect(getExpressionNumber('Renee')).toBe(11);
  });

  it('never returns a two-digit number other than a master', () => {
    const names = ['Ada', 'Zoe', 'Renee', 'Jose', 'Bjorn', 'Yolanda', 'Lynn', 'Christopher'];
    for (const n of names) {
      for (const v of [getExpressionNumber(n), getSoulUrgeNumber(n), getPersonalityNumber(n)]) {
        if (v === null) continue;
        expect([n, v <= 9 || [11, 22, 33].includes(v)]).toEqual([n, true]);
      }
    }
  });
});

describe('accents fold to their base letter', () => {
  const PAIRS: [string, string][] = [
    ['Jose', 'José'], ['Zoe', 'Zoë'], ['Renee', 'Renée'],
    ['Bjorn', 'Björn'], ['Ana Sofia', 'Ana Sofía'], ['Muller', 'Müller'],
    ['Francois', 'François'], ['Ines', 'Inés'],
  ];

  it('gives an accented name the same numbers as its plain spelling', () => {
    for (const [plain, accented] of PAIRS) {
      expect([plain, getExpressionNumber(accented)]).toEqual([plain, getExpressionNumber(plain)]);
      expect([plain, getSoulUrgeNumber(accented)]).toEqual([plain, getSoulUrgeNumber(plain)]);
      expect([plain, getPersonalityNumber(accented)]).toEqual([plain, getPersonalityNumber(plain)]);
    }
  });

  it('does not strip an accented vowel out of existence', () => {
    // The Björn case: ö was the only vowel, so dropping it returned null.
    expect(getSoulUrgeNumber('Björn')).not.toBeNull();
    expect(getSoulUrgeNumber('Björn')).toBe(getSoulUrgeNumber('Bjorn'));
  });

  it('keeps a precomposed and a decomposed spelling identical', () => {
    // U+00E9 vs 'e' + U+0301 — the same name typed on two different keyboards.
    expect(getExpressionNumber('José')).toBe(getExpressionNumber('José'));
  });
});

describe('Y is treated as a consonant, consistently', () => {
  it('never counts Y toward the soul urge', () => {
    // A documented simplification: Pythagorean practice splits on whether Y
    // does a vowel's work. 'Lynn' has no a/e/i/o/u, so it has no Soul Urge.
    expect(getSoulUrgeNumber('Lynn')).toBeNull();
    expect(getPersonalityNumber('Lynn')).not.toBeNull();
  });

  it('still counts Y toward expression and personality', () => {
    // y = 7. 'Y' alone is 7 as an expression and as a personality number.
    expect(getExpressionNumber('Y')).toBe(7);
    expect(getPersonalityNumber('Y')).toBe(7);
  });
});

describe('names this system cannot score', () => {
  it('returns null rather than a misleading zero for a non-Latin name', () => {
    for (const n of ['李雷', 'さくら', '민준', 'Дмитрий']) {
      expect([n, getExpressionNumber(n)]).toEqual([n, null]);
      expect([n, getSoulUrgeNumber(n)]).toEqual([n, null]);
    }
  });

  it('returns null for empty or letterless input', () => {
    for (const n of ['', '   ', '123', '!!!']) {
      expect([n, getExpressionNumber(n)]).toEqual([n, null]);
    }
  });

  it('scores the Latin part of a mixed-script name', () => {
    expect(getExpressionNumber('李 Lei')).toBe(getExpressionNumber('Lei'));
  });
});
