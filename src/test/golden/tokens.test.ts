import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * The design system, enforced.
 *
 * Phases 1 to 5 of the remake put the main surfaces on the type roles, the
 * radius roles, the token palette and the designed glyphs, and took the
 * ambient loops off them. The screens the remake had not reached yet still
 * carried the old habits, and nothing stopped a new screen from reaching
 * for them again. This gate does: every rule below is a habit the audits
 * named as the thing that made the app read as generated.
 *
 * Allowances are listed by file, so a legitimate exception is visible and
 * a stale one fails the gate when it stops being needed.
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx$/.test(p) ? [p] : [];
  });
}

const rel = (p: string) => p.slice(process.cwd().length + 1).split(sep).join('/');

const files = walk(SRC)
  .map((p) => ({ path: rel(p), code: readFileSync(p, 'utf8') }))
  .filter((f) => !/\/(test|dev)\//.test(f.path) && !/RedesignShowcasePage/.test(f.path));

/** Blank comments and JSX comments so prose about a class is not a hit. */
function strip(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
}

function hits(re: RegExp, code: string): string[] {
  return [...strip(code).matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))].map((m) => m[0]);
}

type Rule = { name: string; re: RegExp; allowed: Set<string> };

const RULES: Rule[] = [
  {
    // Ambient loops that report no state. `animate-spin` on a loading
    // indicator is state, and stays allowed everywhere; the Skeleton's
    // shimmer is its own keyframe (animate-shimmer), not a pulse.
    name: 'infinite animation classes',
    re: /\banimate-(?:pulse|pulse-slow|spin-slow|ping|bounce)\b/,
    allowed: new Set(),
  },
  {
    name: 'micro-labels below the caption role',
    re: /\btext-\[(?:9|10|11)px\]/,
    allowed: new Set(),
  },
  {
    // The role classes: caption 12 / meta 13 / ui 15 / body 17 / lede 19.
    name: 'text-xs instead of a type role',
    re: /\btext-xs\b/,
    allowed: new Set(),
  },
  {
    // inset 8 / control 12 / card 16 / sheet 24 / pill.
    name: 'radii off the scale',
    re: /\brounded(?:-[trbl]|-[tb][lr])?-(?:xl|2xl|3xl)\b/,
    allowed: new Set(),
  },
  {
    // The palette is mystic + gold + teal + coral + cosmic blue / violet /
    // rose (+ -ink). Tailwind's stock hues are not in it.
    name: 'stock Tailwind hues',
    re: /\b(?:text|bg|border|from|via|to|ring|stroke|fill|shadow|divide|outline|decoration|placeholder)-(?:emerald|pink|amber|rose|sky|indigo|purple|orange|lime|cyan|fuchsia|slate|gray|zinc|neutral|stone|yellow|green|blue|violet|teal|red)-\d{2,3}\b/,
    allowed: new Set(),
  },
  {
    // U+2648-2653 are emoji on Android; the glyph set is drawn.
    name: 'zodiac signs as Unicode text',
    re: /\.symbol\}/,
    allowed: new Set(),
  },
  {
    // The symmetric-sparkle ornaments the audits called the tell.
    name: 'ornate cards, flourishes and dividers',
    re: /variant="ornate"|<FourCornerFlourishes\b|<OrnateDivider\b|<StarBurst\b/,
    // Card.tsx no longer renders FourCornerFlourishes: `ornate` resolves to
    // `accent`, so the allowance it used to need is gone.
    allowed: new Set(),
  },
  {
    name: 'MysticalStar',
    re: /<MysticalStar\b/,
    allowed: new Set(['src/components/ui/MysticalStar.tsx']),
  },
  {
    // Elevation is by fill; a blur costs a compositing layer and hides
    // nothing on an opaque surface. The Sheet scrim is the one blur.
    name: 'backdrop-blur',
    re: /\bbackdrop-blur(?:-\w+)?\b/,
    allowed: new Set(['src/components/ui/Sheet.tsx']),
  },
];

describe('the design system holds on every screen', () => {
  it('finds the source at all (guards the walker)', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  for (const rule of RULES) {
    it(`no ${rule.name} outside the allowed files`, () => {
      const found: string[] = [];
      const stale: string[] = [];
      for (const f of files) {
        const h = hits(rule.re, f.code);
        if (rule.allowed.has(f.path)) {
          if (!h.length) stale.push(f.path);
          continue;
        }
        if (h.length) found.push(`${f.path}: ${[...new Set(h)].join(', ')} (${h.length})`);
      }
      expect(found).toEqual([]);
      expect(stale).toEqual([]);
    });
  }
});
