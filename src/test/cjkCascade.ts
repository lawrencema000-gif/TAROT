import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

/*
 * The CJK line-breaking cascade of index.css (p8 F84, p9 R26), computed for
 * a rendered element — jsdom applies no stylesheet. Every rule involved is a
 * zero-specificity :where(), so source order decides; a property not set on
 * the element is inherited from its parent, else initial. The same
 * computation as src/test/golden/cjkLineBreaks.test.ts, for render tests that
 * need to know whether a label keeps its phrases in ja/zh/ko.
 */

const CSS = readFileSync(join(__dirname, '..', 'index.css'), 'utf8');
const PROPS = ['word-break', 'line-break', 'overflow-wrap'] as const;
type Prop = (typeof PROPS)[number];
const INITIAL: Record<Prop, string> = { 'word-break': 'normal', 'line-break': 'auto', 'overflow-wrap': 'normal' };

const RULES: Array<{ selector: string; decls: Partial<Record<Prop, string>> }> = [];
postcss.parse(CSS).walkRules((rule) => {
  const decls: Partial<Record<Prop, string>> = {};
  rule.each((node) => {
    if (node.type === 'decl' && (PROPS as readonly string[]).includes(node.prop)) decls[node.prop as Prop] = node.value;
  });
  if (Object.keys(decls).length > 0) RULES.push({ selector: rule.selector, decls });
});

function computed(el: Element, prop: Prop): string {
  for (let e: Element | null = el; e; e = e.parentElement) {
    let value: string | undefined;
    for (const r of RULES) {
      if (!r.decls[prop] || !e.matches(r.selector)) continue;
      // Equal (zero) specificity is what lets source order decide here.
      if (!r.selector.trim().startsWith(':where(')) throw new Error(`not zero-specificity: ${r.selector}`);
      value = r.decls[prop];
    }
    if (value !== undefined) return value;
  }
  return INITIAL[prop];
}

/** "word-break / line-break / overflow-wrap" as the browser would compute them for `el`. */
export function cjkBreaking(el: Element): string {
  return PROPS.map((p) => computed(el, p)).join(' / ');
}

/** What a label that keeps its phrases computes to, per language. */
export const KEEPS_PHRASES: Record<'ja' | 'zh' | 'ko', string> = {
  ja: 'auto-phrase / strict / anywhere',
  zh: 'auto-phrase / auto / anywhere',
  ko: 'keep-all / auto / anywhere',
};

/** Body-copy breaking (the browser's default). */
export const DEFAULT_BREAKING = 'normal / auto / normal';
