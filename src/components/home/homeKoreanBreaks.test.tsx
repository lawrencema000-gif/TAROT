import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postcss from 'postcss';

/*
 * p10 d3-ko-09: Korean keeps its words from the root (index.css), but Home's
 * stepped-down title and the Moonstone widget's labels set
 * [word-break:auto-phrase]. A utility outranks the zero-specificity language
 * rules, and Chromium implements auto-phrase for Japanese only, so in Korean
 * it acted as `normal` and broke between syllables again. Both opt in with
 * .keep-phrases instead: Japanese and Chinese by phrase, Korean by word,
 * English untouched; a token wider than the line still breaks
 * ([overflow-wrap:anywhere]).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d3' };

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { isPremium: false } }) }));
vi.mock('../../dal', () => ({
  moonstones: {
    getBalance: async () => ({ ok: true, data: 100 }),
    hasCheckedInToday: async () => ({ ok: true, data: true }),
    doDailyCheckin: async () => ({ ok: true, data: { amountAwarded: 0, streakDay: 1, isStreakContinuation: false, alreadyCheckedIn: true } }),
  },
}));
vi.mock('../../dal/moonstoneSpend', () => ({ onBalanceChange: () => () => {} }));
vi.mock('../moonstones/EarnMoonstonesSheet', () => ({ EarnMoonstonesSheet: () => null }));

import i18n from '../../i18n/config';
import { HomeHero } from './HomeHero';
import { MoonstoneWidget } from './MoonstoneWidget';

/*
 * What the browser computes: index.css's line-breaking rules are all
 * zero-specificity :where(), so source order decides among them (as in
 * src/test/cjkCascade.ts); a Tailwind arbitrary property on the element
 * ([word-break:…]) is a class and outranks every one of them. An element
 * that sets nothing inherits from its parent.
 */
type Prop = 'word-break' | 'overflow-wrap';
const RULES: Array<{ selector: string; decls: Partial<Record<Prop, string>> }> = [];
postcss.parse(readFileSync(join(__dirname, '..', '..', 'index.css'), 'utf8')).walkRules((rule) => {
  const decls: Partial<Record<Prop, string>> = {};
  rule.each((node) => {
    if (node.type === 'decl' && (node.prop === 'word-break' || node.prop === 'overflow-wrap')) decls[node.prop] = node.value;
  });
  if (Object.keys(decls).length > 0) RULES.push({ selector: rule.selector, decls });
});

function computed(el: Element, prop: Prop): string {
  for (let e: Element | null = el; e; e = e.parentElement) {
    const utility = [...e.classList].find((c) => c.startsWith(`[${prop}:`));
    if (utility) return utility.slice(prop.length + 2, -1);
    let value: string | undefined;
    for (const r of RULES) {
      if (!r.decls[prop] || !e.matches(r.selector)) continue;
      if (!r.selector.trim().startsWith(':where(')) throw new Error(`not zero-specificity: ${r.selector}`);
      value = r.decls[prop];
    }
    if (value !== undefined) return value;
  }
  return 'normal';
}
const breaking = (el: Element) => `${computed(el, 'word-break')} / ${computed(el, 'overflow-wrap')}`;

async function inLanguage(lng: string) {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
  document.documentElement.lang = lng;
}

// A title wider than the hero's box at the display size: it steps down and may wrap.
const width = { client: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'), offset: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth') };
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 240 });
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 400 });
});
afterAll(async () => {
  if (width.client) Object.defineProperty(HTMLElement.prototype, 'clientWidth', width.client);
  if (width.offset) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', width.offset);
  await i18n.changeLanguage('en');
  document.documentElement.lang = 'en';
});
afterEach(() => cleanup());

describe.each([
  ['ko', 'keep-all / anywhere'],
  ['ja', 'auto-phrase / anywhere'],
  ['zh', 'auto-phrase / anywhere'],
  ['en', 'normal / anywhere'],
] as const)('Home in %s', (lng, expected) => {
  it(`the stepped-down title breaks ${expected}`, async () => {
    await inLanguage(lng);
    render(
      <HomeHero
        greeting="Good evening"
        name="Kim Seo-yeon Alexandra Park"
        started={false}
        progress={{ horoscope: false, tarot: false, prompt: false }}
        progressLabel=""
        title="Today’s ritual"
        cta="Start"
        onStart={() => {}}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toMatch(/\bline-clamp-2\b/);
    expect(breaking(h1)).toBe(expected);
  });

  it(`the Moonstone widget's labels break ${expected}`, async () => {
    await inLanguage(lng);
    render(<MoonstoneWidget />);
    const label = await screen.findByText(i18n.t('app:moonstones.balanceLabel'));
    expect(breaking(label)).toBe(expected);
    // The line saying when the next claim opens, under the balance.
    const next = label.parentElement!.lastElementChild!;
    expect(next.tagName).toBe('P');
    expect(breaking(next)).toBe(expected);
  });
});
