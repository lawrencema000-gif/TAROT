import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * A horizontal snap row that bleeds to the screen edge snaps on the gutter.
 *
 * The pattern: the row cancels the page gutter (-mx-4), pads back to it
 * (px-4) so its first item lines up with the content above, and snaps its
 * items (snap-x, children snap-start). With no scroll padding the snap
 * points sit on the row's own edge, so mandatory snapping parks the first
 * item at scrollLeft 16, flush with the screen: the celestial map's "All"
 * chip sat at x = 0 while the search box above started at 16 px (p9 Q15).
 * scroll-px-N (or scroll-pl-N) moves the snap points onto the gutter.
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

/** Every class list written as a literal: className="…", '…' or a template. */
function classLists(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/className=(?:"([^"]*)"|'([^']*)'|\{\s*`([^`]*)`\s*\})/g)) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

/** The gutter a class list bleeds into and pads back to, if it snaps horizontally. */
function bleedingSnapRow(classes: string): { gutter: string; padded: boolean } | null {
  const list = classes.split(/\s+/);
  if (!list.includes('snap-x')) return null;
  const bleed = list.map((c) => /^-mx-(\d+(?:\.\d+)?)$/.exec(c)?.[1]).find(Boolean);
  if (!bleed || !list.includes(`px-${bleed}`)) return null;
  const padded = list.some((c) => c === `scroll-px-${bleed}` || c === `scroll-pl-${bleed}`);
  return { gutter: bleed, padded };
}

const files = walk(SRC)
  .map((p) => ({ path: rel(p), code: readFileSync(p, 'utf8') }))
  .filter((f) => !/\.test\.tsx$/.test(f.path));

describe('snap rows that bleed to the screen edge snap on the gutter (p9 Q15)', () => {
  it('reads the pattern', () => {
    expect(bleedingSnapRow('flex gap-2 overflow-x-auto -mx-4 px-4 snap-x snap-mandatory')).toEqual({ gutter: '4', padded: false });
    expect(bleedingSnapRow('-mx-4 flex px-4 scroll-px-4 snap-x')).toEqual({ gutter: '4', padded: true });
    expect(bleedingSnapRow('flex gap-2 overflow-x-auto snap-x snap-mandatory')).toBeNull();
    expect(bleedingSnapRow('-mx-4 px-4 flex gap-2')).toBeNull();
  });

  it('finds the rows it guards (the celestial map filter and the quiz shelf)', () => {
    const found = files.flatMap((f) => classLists(f.code).filter((c) => bleedingSnapRow(c)).map(() => f.path));
    expect(found).toEqual(expect.arrayContaining(['src/pages/CelestialMapPage.tsx', 'src/components/quizzes/QuizList.tsx']));
  });

  it('every such row has scroll padding on its gutter', () => {
    const offenders = files.flatMap((f) =>
      classLists(f.code)
        .filter((c) => bleedingSnapRow(c)?.padded === false)
        .map((c) => `${f.path}: "${c}"`),
    );
    expect(offenders).toEqual([]);
  });
});
