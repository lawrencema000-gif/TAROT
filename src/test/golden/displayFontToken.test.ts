import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postcss, { type Rule } from 'postcss';

/*
 * p10 d3-ko-10, in the page stylesheets: index.css's display classes read
 * one token, --font-display, which Korean redefines so a heading's Hangul
 * and its marks ("?", "!", quotes) come from the Korean face rather than the
 * Latin serif. Two rules in src/styles spelled the old stack out instead:
 * .tm-related-title, the tarot card page's "All … cards" heading (a stack
 * with no Korean face the app loads), and the landing timeline's numerals.
 */

const STYLES = join(process.cwd(), 'src', 'styles');
const sheets = readdirSync(STYLES)
  .filter((f) => f.endsWith('.css'))
  .map((file) => ({ file, root: postcss.parse(readFileSync(join(STYLES, file), 'utf8')) }));

function family(file: string, selector: string): string | undefined {
  let value: string | undefined;
  sheets
    .find((s) => s.file === file)!
    .root.walkRules((rule) => {
      if (rule.selector !== selector) return;
      rule.walkDecls('font-family', (d) => {
        value = d.value;
      });
    });
  return value;
}

describe('the page stylesheets read the display token (p10 d3-ko-10)', () => {
  it('no rule in src/styles spells out the display serif stack', () => {
    const literal: string[] = [];
    for (const { file, root } of sheets) {
      root.walkDecls('font-family', (d) => {
        if (/Cormorant|Noto Serif/i.test(d.value)) literal.push(`${file} ${(d.parent as Rule).selector}`);
      });
    }
    expect(sheets.map((s) => s.file)).toEqual(expect.arrayContaining(['landing.css', 'tarot-meanings.css']));
    expect(literal).toEqual([]);
  });

  it('the related-cards heading and the timeline numerals read var(--font-display)', () => {
    expect(family('tarot-meanings.css', '.tm-related-title')).toBe('var(--font-display)');
    expect(family('landing.css', '.lp-timeline-watermark')).toBe('var(--font-display)');
  });
});
