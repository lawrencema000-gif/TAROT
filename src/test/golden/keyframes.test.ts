import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Guard against a bug this repo actually shipped.
 *
 * A sweep deleted `@keyframes shuffle-card` from index.css on the grounds that
 * its `.animate-shuffle` class had no call sites. That was true and irrelevant:
 * the real consumer is an inline style in TarotSection.tsx that names the
 * keyframe directly. The tarot shuffle then animated nothing — and typecheck,
 * lint and 462 tests all stayed green, because a missing @keyframes is not an
 * error in CSS. It is simply ignored.
 *
 * So the invariant has to be asserted somewhere, and this is it: every
 * animation name referenced from a component must be defined somewhere that
 * ships — index.css, the Tailwind theme, or a <style> block in the same file.
 */

const SRC = join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(p) ? [p] : [];
  });
}

/** Keyframe names defined in a stylesheet or a `<style>` block. */
function keyframesIn(text: string): Set<string> {
  return new Set(
    [...text.matchAll(/@keyframes\s+([A-Za-z0-9_-]+)/g)].map((m) => m[1]),
  );
}

const globalCss = readFileSync(join(SRC, 'index.css'), 'utf8');
const tailwind = readFileSync(join(process.cwd(), 'tailwind.config.js'), 'utf8');
const globalNames = new Set([...keyframesIn(globalCss), ...keyframesIn(tailwind)]);

// Tailwind ships these itself; a utility referencing one is fine.
const BUILT_IN = new Set(['spin', 'ping', 'pulse', 'bounce']);

/**
 * Pull the animation *name* out of every `animation:` shorthand in a file.
 * Handles the three shapes that occur here: a plain string, a template
 * literal, and a ternary whose branches are either of those.
 */
function referencedNames(raw: string): { name: string; line: number }[] {
  // Comments talk ABOUT animations. Blank them out — keeping the newlines so
  // reported line numbers stay honest — rather than matching prose.
  const source = raw
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
  const out: { name: string; line: number }[] = [];
  // Terminator is `,` in a JSX style object and `;` in a <style> block.
  const re = /\banimation:\s*([\s\S]{0,400}?)[;,]\s*\n/g;
  for (const m of source.matchAll(re)) {
    const line = source.slice(0, m.index).split('\n').length;
    for (const lit of m[1].matchAll(/[`'"]\s*([A-Za-z][A-Za-z0-9_-]*)[\s`'"]/g)) {
      const name = lit[1];
      if (name === 'none' || name === 'inherit' || name === 'initial') continue;
      out.push({ name, line });
    }
  }
  return out;
}

describe('every animation a component names is actually defined', () => {
  const files = walk(SRC).filter((f) => {
    const p = f.split(sep).join('/');
    return !p.includes('/test/') && !p.includes('/__tests__/');
  });

  it('finds the references at all (guards the parser itself)', () => {
    // If this drops to zero the test has silently stopped testing anything —
    // which is the same failure mode it exists to catch.
    const total = files.reduce((n, f) => n + referencedNames(readFileSync(f, 'utf8')).length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('resolves every referenced keyframe name', () => {
    const missing: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const local = keyframesIn(source); // a <style> block in this same file
      for (const { name, line } of referencedNames(source)) {
        if (globalNames.has(name) || local.has(name) || BUILT_IN.has(name)) continue;
        missing.push(`${file.replace(SRC, 'src')}:${line} → @keyframes ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('the motion scale is the only source of durations', () => {
  it('defines every --dur-* token the Tailwind scale points at', () => {
    const tokens = [...tailwind.matchAll(/var\(--(dur-[a-z]+)/g)].map((m) => m[1]);
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      expect([t, globalCss.includes(`--${t}:`)]).toEqual([t, true]);
    }
  });

  it('keeps raw duration utilities out of the app', () => {
    // `duration-0` is a real value with no token: it means "no transition".
    const raw: string[] = [];
    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/\bduration-(\[?\d+m?s?\]?)/g)) {
        if (m[1] === '0') continue;
        const line = source.slice(0, m.index).split('\n').length;
        raw.push(`${file.replace(SRC, 'src')}:${line} → duration-${m[1]}`);
      }
    }
    expect(raw).toEqual([]);
  });
});
