import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p10 d3-ko-04: three moods logged once each (고요, 안정, 기쁨), and the 30-day
 * curve named '가장 자주 나타난 무드 / 고요' — the first one logged — right
 * above the weekly card's "여러 무드가 섞인 한 주예요". A tie names no mood
 * now, by the rule the weekly card's dominant() keeps; the average intensity
 * stays. The Korean value needs the p10 'pages' delta (mood.dominantMixed).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000c4', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };
const days = vi.hoisted(() => ({ entries: [] as Array<{ date: string; category: string; intensity: number; savedAt: number }> }));

const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 100 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: async () => ({ data: null, error: null }) },
    rpc: async () => ({ data: null, error: null }),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
vi.mock('../../dal/moodEntries', () => ({
  isUnavailable: () => false,
  listForUser: async () => ({ ok: true, data: days.entries }),
  upsertMany: async () => ({ ok: true, data: 0 }),
  upsert: async () => ({ ok: false, error: 'offline' }),
}));
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
import { MoodDiaryPage } from '../MoodDiaryPage';
import { localDateStr } from '../../utils/localDate';

/** Node 25 ships its own (file-less, broken) localStorage over jsdom's; give the code a real one. */
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

/** One mood per day, the last one yesterday — always inside the 30-day curve. */
function logged(moods: Array<[category: string, intensity: number]>) {
  days.entries = moods.map(([category, intensity], i) => {
    const d = new Date();
    d.setDate(d.getDate() - (moods.length - i));
    return { date: localDateStr(d), category, intensity, savedAt: Date.now() - (moods.length - i) * 86_400_000 };
  });
}

/** Open the curve and return the "most common mood" card's row. */
async function summaryRow(curveButton: string, dominantLabel: string) {
  render(<MemoryRouter><MoodDiaryPage /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: curveButton }));
  const label = await screen.findByText(dominantLabel);
  return label.closest('.items-center') as HTMLElement;
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the 30-day curve names one most common mood only when one leads (d3-ko-04)', () => {
  it('Korean, the QA scenario: 고요, 안정, 기쁨 once each — no mood named, no mood glyph, the average stays', async () => {
    await i18n.changeLanguage('ko');
    logged([['calm', 2], ['steady', 3], ['joyful', 4]]);
    const row = await summaryRow('30일 곡선', '가장 자주 나타난 무드');
    for (const mood of ['고요', '안정', '기쁨']) expect(within(row).queryByText(mood)).toBeNull();
    expect(row.querySelector('svg')).toBeNull();
    expect(row).toHaveTextContent('평균 강도: 3.0 / 5');
    // The weekly card above says the same thing in words.
    expect(screen.getByText('여러 무드가 섞인 한 주예요 — 어느 한 무드도 주를 이루지 않았어요.')).toBeInTheDocument();
    // needs the delta: the tie's own word.
    expect(within(row).getByText('섞인 무드')).toBeInTheDocument();
  });

  it('English: a tie at the top (two each of Calm and Joyful) reads Mixed', async () => {
    await i18n.changeLanguage('en');
    logged([['calm', 3], ['joyful', 3], ['calm', 3], ['joyful', 3], ['heavy', 3]]);
    const row = await summaryRow('30-day curve', 'Most common mood');
    expect(within(row).getByText('Mixed')).toBeInTheDocument();
    for (const mood of ['Calm', 'Joyful', 'Heavy']) expect(within(row).queryByText(mood)).toBeNull();
    expect(row).toHaveTextContent('Average intensity: 3.0 / 5');
  });

  it('English: one mood logged most often is still named, with its glyph', async () => {
    await i18n.changeLanguage('en');
    logged([['joyful', 4], ['calm', 2], ['calm', 4]]);
    const row = await summaryRow('30-day curve', 'Most common mood');
    expect(within(row).getByText('Calm')).toBeInTheDocument();
    expect(within(row).queryByText('Mixed')).toBeNull();
    expect(row.querySelector('svg')).not.toBeNull();
  });
});
