import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { withColumnHyphens } from './columnHyphens';
import { CARTO_SPREADS } from '../../../data/cartomancy/spreads';

/*
 * Pre-release pass: "Subconscious", "professionally" and "Consequence"
 * spilled 3 px out of each side of their 74 px column on the select screen
 * (and "surroundings" by half a pixel). They break inside the column now,
 * at soft hyphens — and only they: a soft hyphen is taken greedily, so a
 * word that fits a line of its own must not carry one.
 */

const SHY = '­';
const plain = (s: string) => s.split(SHY).join('');

const app = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', 'en', 'app.json'), 'utf8'));
const catalogue = Object.values(app.spreads.catalog as Record<string, { positions?: Record<string, string> }>).flatMap((s) => Object.values(s.positions ?? {}));
const legacy = Object.values(app.readings.spreadPositions as Record<string, string[] | Record<string, string>>).flatMap((v) => (Array.isArray(v) ? v : Object.values(v)));
const cartomancy = CARTO_SPREADS.flatMap((s) => s.positions.map((p) => p.name));
const names = [...catalogue, ...legacy, ...cartomancy];

describe('withColumnHyphens (pre-release)', () => {
  it('gives the words wider than a column their dictionary break points, keeping their capitals', () => {
    expect(withColumnHyphens('Subconscious influences')).toBe(`Sub${SHY}con${SHY}scious influences`);
    expect(withColumnHyphens('Where you stand professionally')).toBe(`Where you stand pro${SHY}fes${SHY}sion${SHY}al${SHY}ly`);
    expect(withColumnHyphens('Consequence')).toBe(`Con${SHY}se${SHY}quence`);
    expect(withColumnHyphens('Past: home and surroundings')).toBe(`Past: home and sur${SHY}round${SHY}ings`);
  });

  it('leaves a word that fits a column alone, and any other script', () => {
    for (const s of ['Best possible outcome', 'What the unconscious knows', 'What is approaching', 'Strengths of the connection', '本当の名前', '죽어 가는 것', '']) {
      expect(withColumnHyphens(s)).toBe(s);
    }
  });

  it('adds nothing but soft hyphens to any position name, and each listed word is still in use', () => {
    expect(names.length).toBeGreaterThan(150);
    for (const n of names) expect(plain(withColumnHyphens(n))).toBe(n);
    const hyphenated = names.filter((n) => withColumnHyphens(n) !== n);
    for (const word of ['Subconscious', 'professionally', 'Consequence', 'surroundings']) {
      expect(hyphenated.some((n) => n.includes(word)), word).toBe(true);
    }
  });
});
