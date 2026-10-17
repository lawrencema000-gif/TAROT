import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

/*
 * The CJK line-breaking rule (index.css, p8 F84) sets word-break,
 * line-break and overflow-wrap on headings, controls and short labels so a
 * title or a button breaks between phrases. All three properties inherit:
 * the rule reached the body copy inside clickable cards and list rows, and
 * phrase-level breaking needed a third line where line-clamp-2 shows two —
 * 「7日連続記録を保ち、/スピリチュアルな鍛錬を…」 on /achievements at 360 px,
 * 「90秒、12問 → あなたの/愛着スタイルが…」 on Home (p9 R26).
 *
 * jsdom applies no cascade, so this one is computed here from index.css
 * itself: for each element, the last matching rule that declares the
 * property (every one involved is zero-specificity :where(), so source
 * order decides — checked below), else the parent's value, else the
 * initial one.
 */

const CSS = readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8');
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
      expect(r.selector.trim().startsWith(':where(')).toBe(true);
      value = r.decls[prop];
    }
    if (value !== undefined) return value;
  }
  return INITIAL[prop];
}
const breaking = (el: Element) => PROPS.map((p) => computed(el, p)).join(' / ');
const DEFAULT = 'normal / auto / normal';

function page(lang: string, body: string): Document {
  document.documentElement.lang = lang;
  document.body.innerHTML = body;
  return document;
}

/** AchievementCard (a button): the name, and the description clamped to two lines. */
const ACHIEVEMENT = `
  <button type="button" id="card"><div class="flex-1 min-w-0">
    <h3 id="name" class="text-ui font-semibold">1週間の戦士</h3>
    <p id="desc" class="mt-1 text-meta line-clamp-2">7日連続記録を保ち、スピリチュアルな鍛錬を続けましょう。</p>
  </div></button>`;
/** ListRow (a button): the label, truncated, and the meta line clamped to two. */
const LIST_ROW = `
  <button type="button"><span class="min-w-0 flex-1">
    <span id="label" class="block truncate text-ui font-medium">愛の木</span>
    <span id="meta" class="text-meta text-mystic-400 line-clamp-2">90秒、12問 → あなたの愛着スタイルが生きた木として育ちます。</span>
  </span></button>`;
/** A clickable Card (role=button) with a description paragraph; an eyebrow and a keep-phrases label inside a control. */
const OPTED_IN = `
  <div role="button" tabindex="0"><p id="eyebrow" class="font-display-eyebrow">今日のカード</p><p id="cardDesc" class="text-meta">説明の文章がここに入ります。</p></div>
  <button type="button"><span id="kept" class="line-clamp-2 keep-phrases">ネイタルチャートの読み方</span></button>
  <button type="button"><h3><span id="headClamp" class="line-clamp-2">完全なネイタルチャート</span></h3></button>
  <h2 id="heading">タロットスプレッド</h2>
  <p id="body">本文はもともと既定の改行のままです。</p>`;

describe('CJK line breaks: body copy inside a control keeps the default breaking (p9 R26)', () => {
  it('ja: an achievement’s description and a list row’s meta line break as body copy; their titles keep phrases', () => {
    const d = page('ja', ACHIEVEMENT + LIST_ROW);
    expect(breaking(d.getElementById('desc')!)).toBe(DEFAULT);
    expect(breaking(d.getElementById('meta')!)).toBe(DEFAULT);
    expect(breaking(d.getElementById('name')!)).toBe('auto-phrase / strict / anywhere');
    expect(breaking(d.getElementById('card')!)).toBe('auto-phrase / strict / anywhere');
    expect(breaking(d.getElementById('label')!)).toBe('auto-phrase / strict / anywhere');
  });

  it('ja: a label that opts in keeps phrases inside a control; body copy elsewhere is untouched', () => {
    const d = page('ja', OPTED_IN);
    expect(breaking(d.getElementById('cardDesc')!)).toBe(DEFAULT);
    expect(breaking(d.getElementById('eyebrow')!)).toBe('auto-phrase / strict / anywhere');
    expect(breaking(d.getElementById('kept')!)).toBe('auto-phrase / strict / anywhere');
    expect(breaking(d.getElementById('headClamp')!)).toBe('auto-phrase / strict / anywhere');
    expect(breaking(d.getElementById('heading')!)).toBe('auto-phrase / strict / anywhere');
    expect(breaking(d.getElementById('body')!)).toBe(DEFAULT);
  });

  it.each([
    ['zh', 'auto-phrase / auto / anywhere'],
    ['ko', 'keep-all / auto / anywhere'],
  ])('%s: the same split', (lang, label) => {
    const d = page(lang, ACHIEVEMENT + LIST_ROW);
    expect(breaking(d.getElementById('desc')!)).toBe(DEFAULT);
    expect(breaking(d.getElementById('meta')!)).toBe(DEFAULT);
    expect(breaking(d.getElementById('name')!)).toBe(label);
  });

  it('en: nothing of this applies', () => {
    const d = page('en', ACHIEVEMENT + LIST_ROW + OPTED_IN);
    for (const id of ['desc', 'meta', 'name', 'label', 'eyebrow', 'heading']) expect(breaking(d.getElementById(id)!)).toBe(DEFAULT);
  });
});
