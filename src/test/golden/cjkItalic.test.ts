import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

/*
 * Japanese, Korean and Chinese have no italic (pre-release pass). The CJK
 * faces carry no italic style, so the `italic` utility (and em, i) made the
 * browser slant the glyphs itself: the Companion's persona line, the
 * Whispering Well's intro and the reports' subtitles read as a rendering
 * fault in ja. index.css sets italic text in those languages upright; text
 * marked as English inside them, and every English screen, keeps its italic.
 *
 * jsdom applies no stylesheet, so this reads the rule out of index.css and
 * matches it against elements, as cjkLineBreaks.test.ts does for breaking.
 */

const CSS = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');
const RULES: Array<{ selector: string; value: string }> = [];
postcss.parse(CSS).walkRules((rule) => {
  rule.each((node) => {
    if (node.type === 'decl' && node.prop === 'font-style') RULES.push({ selector: rule.selector, value: node.value });
  });
});

/** The font-style index.css gives `el` itself, or null where it says nothing (an `italic` stays italic). */
function fontStyle(el: Element): string | null {
  let value: string | null = null;
  for (const r of RULES) if (el.matches(r.selector)) value = r.value;
  return value;
}

function page(lang: string): Document {
  document.documentElement.lang = lang;
  document.body.innerHTML = `
    <p id="intro" class="text-ui text-mystic-300 italic">落ち着いていて賢く、言葉を選んで語ります。</p>
    <p id="body">本文に<em id="em">強調</em>と<i id="i">書名</i>。</p>
    <p id="quote" class="reading-copy reading-quote italic">問いを差し出します。</p>
    <p id="en" class="italic" lang="en"><span id="en-inner" class="italic">Arcana</span></p>`;
  return document;
}

describe('italic text in Japanese, Korean and Chinese is set upright (pre-release)', () => {
  it('the rule outranks the `italic` utility: a class and a pseudo-class, (0,2,0)', () => {
    const rule = RULES.filter((r) => /:lang\((?:ja|ko|zh)\)/.test(r.selector));
    expect(rule.length).toBeGreaterThan(0);
    for (const r of rule) {
      expect(r.value).toBe('normal');
      for (const sel of r.selector.split(/,(?![^(]*\))/)) expect(sel.trim()).toMatch(/^:is\([^)]*\.italic[^)]*\):lang\((?:ja|ko|zh)\)$/);
    }
  });

  it.each(['ja', 'ko', 'zh'])('%s: an italic class, em and i are upright; a span marked lang="en" keeps its italic', (lang) => {
    const d = page(lang);
    for (const id of ['intro', 'em', 'i', 'quote']) expect(fontStyle(d.getElementById(id)!), id).toBe('normal');
    expect(fontStyle(d.getElementById('body')!)).toBeNull();
    expect(fontStyle(d.getElementById('en')!)).toBeNull();
    expect(fontStyle(d.getElementById('en-inner')!)).toBeNull();
  });

  it('en: italics stay italic', () => {
    const d = page('en');
    for (const id of ['intro', 'em', 'i', 'quote', 'en']) expect(fontStyle(d.getElementById(id)!)).toBeNull();
  });
});
