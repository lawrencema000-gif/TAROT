import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import postcss, { type Rule } from 'postcss';

/*
 * p10 d2-ja-13 left landing.css styling markup that no longer exists: the
 * landing page sets Google's own badge in each language, so .lp-play-clip
 * (which cut the old English badge out of a checkerboard baked into its
 * pixels) had nothing to style, and nor had .lp-lang-flag since the
 * language menu showed codes instead of flags. Every class the sheet styles
 * is one a component sets; the badge keeps .lp-play's 12px clear space.
 */

const SRC = join(process.cwd(), 'src');
const sheet = postcss.parse(readFileSync(join(SRC, 'styles', 'landing.css'), 'utf8'));

/** Every component and module under src: the code that can set a class. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || path === join(SRC, 'test') ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
const code = sources(SRC)
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

describe('landing.css styles only what the page renders (p10 d2-ja-13)', () => {
  it('every .lp-* class in the sheet is set by a component', () => {
    const classes = new Set<string>();
    sheet.walkRules((rule) => {
      for (const m of rule.selector.matchAll(/\.(lp-[\w-]+)/g)) classes.add(m[1]);
    });
    expect(classes.size).toBeGreaterThan(40);
    const unused = [...classes].filter((c) => !new RegExp(`(?<![\\w-])${c}(?![\\w-])`).test(code));
    expect(unused).toEqual([]);
  });

  it('the Google Play badge keeps its clear space: 12px of .lp-play padding, a quarter of the 48px badge', () => {
    const rule = sheet.nodes.find((n): n is Rule => n.type === 'rule' && n.selector === '.lp-play');
    const padding = rule?.nodes.find((n) => n.type === 'decl' && n.prop === 'padding');
    expect(padding && padding.type === 'decl' ? padding.value : undefined).toBe('12px');
  });
});
