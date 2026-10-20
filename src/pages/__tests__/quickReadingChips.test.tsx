import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p9 Q30 — Quick reading in Japanese at 360 px: a suggestion chip is a whole
 * question on one line, and Chip does not shrink (flex-shrink-0). Eight of
 * the 80 ja suggestions measure 333–357 px against the 328 px row (QA,
 * Chromium); the widest widened the document to 373 px, the page scrolled
 * sideways and the fixed nav and CTA were laid out below the screen. A chip
 * held to the row's width wraps instead.
 *
 * jsdom lays nothing out, so this holds what decides it — every suggestion
 * chip of every lens carries max-w-full (a flex item's max-width caps its
 * size even when it may not shrink) and nothing that forbids wrapping — and
 * does the arithmetic: an all-full-width ja suggestion is 12 px a character
 * at the chip's 12 px caption size, plus 2 × 10 px padding and 2 × 1 px
 * border (「うまくいっているのに、つい見過ごしていることは何ですか？」: 28 ×
 * 12 + 22 = 358, QA 357).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000ea', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };

const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 100 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    rpc: async () => ({ data: null, error: null }),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown>>(function M(props, ref) {
      const { children, ...rest } = props as { children?: ReactNode } & Record<string, unknown>;
      return createElement(tag, { ...strip(rest), ref }, children);
    }),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { QuickReadingPage } from '../QuickReadingPage';

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
}

const ja = JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', 'ja', 'app.json'), 'utf8'));
const pools = ja.quickReading.suggestions as Record<string, Record<string, string>>;
const lenses = ja.quickReading.lens as Record<string, string>;
const ALL = new Set(Object.values(pools).flatMap((p) => Object.values(p)));
/** One line of a ja suggestion chip at 12 px: full-width characters are 1 em; padding and border. */
const oneLine = (s: string) => [...s].length * 12 + 2 * 10 + 2;
const ROW_AT_360 = 360 - 2 * 16;

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  await act(async () => { await i18n.changeLanguage('ja'); });
});
afterEach(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('p9 Q30 — a long suggestion wraps inside the row instead of widening the page', () => {
  it('the arithmetic: some ja suggestions are wider than the 328 px row on one line', () => {
    const wide = [...ALL].filter((s) => /^[\u3000-\u9fff\uff00-\uffef]+$/.test(s) && oneLine(s) > ROW_AT_360);
    expect(wide.length).toBeGreaterThanOrEqual(8);
    expect(oneLine(pools.general['9'])).toBe(358);
  });

  it('every suggestion chip of every lens is held to the row’s width and free to wrap', async () => {
    render(<MemoryRouter><QuickReadingPage /></MemoryRouter>);
    const lensRow = screen.getByRole('group', { name: ja.quickReading.lensLabel });
    let checked = 0;
    for (const [key, name] of Object.entries(lenses)) {
      fireEvent.click(within(lensRow).getByRole('button', { name }));
      const chips = screen.getAllByRole('button').filter((b) => ALL.has(b.textContent ?? ''));
      expect(chips.length, key).toBe(4);
      for (const chip of chips) {
        const c = chip.className.split(/\s+/);
        expect(c, chip.textContent!).toContain('max-w-full');
        expect(c).toContain('text-left');
        expect(c.some((k) => /^(?:whitespace-nowrap|truncate|text-nowrap)$/.test(k))).toBe(false);
        expect(chip.parentElement!.className.split(/\s+/)).toEqual(expect.arrayContaining(['flex', 'flex-wrap']));
        checked++;
      }
    }
    expect(checked).toBe(4 * Object.keys(lenses).length);
  });
});
