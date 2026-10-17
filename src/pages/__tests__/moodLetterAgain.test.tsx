import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 R07 — "Write me another letter" charged 50 for the same letter, word
 * for word: ai-mood-letter caches by entries and context for a day, after
 * the debit, and the button sent the same body under a new request id, with
 * no price beside it. Another letter is now offered only when it would be
 * another letter (the days read have changed, or a day has passed), with its
 * price; and the letter paid for is kept for the account, so coming back to
 * the diary shows it instead of selling it again.
 */

const A = { id: '00000000-0000-4000-8000-0000000000a7', email: 'a@example.com' };
const B = { id: '00000000-0000-4000-8000-0000000000b7', email: 'b@example.com' };
const auth = { user: A };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };

const invoke = vi.fn();
const rpc = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 100 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: auth.user, profile: PROFILE }) }));
vi.mock('../../dal/moodEntries', () => ({
  isUnavailable: () => false,
  // Recent saves: the device cache keeps 90 days by `savedAt`.
  listForUser: async () => ({
    ok: true,
    data: [
      { date: '2026-10-10', category: 'calm', intensity: 3, savedAt: Date.now() - 3 * 86_400_000 },
      { date: '2026-10-11', category: 'heavy', intensity: 4, savedAt: Date.now() - 2 * 86_400_000 },
      { date: '2026-10-12', category: 'joyful', intensity: 5, savedAt: Date.now() - 86_400_000 },
    ],
  }),
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

const later = <T,>(value: T, ms = 30) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const letterCalls = () => invoke.mock.calls.filter((c) => c[0] === 'ai-mood-letter');
const letterBody = (i: number) => (letterCalls()[i][1] as { body: { requestId: string; entries: Array<{ date: string }> } }).body;
const letterReply = (letter: string) => () => later({ data: { data: { letter, dominantTheme: 'rest', careSuggestion: 'walk' } }, error: null });

function mount() {
  return render(<MemoryRouter><MoodDiaryPage /></MemoryRouter>);
}

/** Open the curve and buy the first letter. */
async function firstLetter(text = 'Dear you.') {
  invoke.mockImplementation(letterReply(text));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: '30-day curve' }));
  fireEvent.click(await screen.findByRole('button', { name: /Write my letter/ }, { timeout: 3000 }));
  await screen.findByText(text, undefined, { timeout: 3000 });
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(async () => {
  auth.user = A;
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('p9 R07 — another letter is sold only when it would be another letter', () => {
  it('the same days: no "Write me another letter" (it was the same letter for 50 more) — a line on what writes the next one', async () => {
    await firstLetter();
    expect(screen.queryByRole('button', { name: /Write me another letter/ })).toBeNull();
    expect(screen.getByText('Your next letter will read the moods you log from here.')).toBeInTheDocument();
    expect(letterCalls()).toHaveLength(1);
    expect(gateCalls()).toBe(1);
  });

  it('a mood logged since: another letter is offered with its price, is a new request, and the old letter stays until the new one lands', async () => {
    await firstLetter('Dear you.');
    fireEvent.click(screen.getByRole('button', { name: /Back to log/ }));
    fireEvent.click(await screen.findByRole('radio', { name: /Calm/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save today|Update today/ }));
    fireEvent.click(await screen.findByRole('button', { name: '30-day curve' }));
    const again = await screen.findByRole('button', { name: /Write me another letter/ });
    await waitFor(() => expect(again.parentElement).toHaveTextContent('Each reading uses 50 Moonstones · You have 100'));
    invoke.mockImplementation(letterReply('Dear you, again.'));
    fireEvent.click(again);
    // The letter paid for stays on screen while the next one is written.
    expect(screen.getByText('Dear you.')).toBeInTheDocument();
    await screen.findByText('Dear you, again.', undefined, { timeout: 3000 });
    expect(letterCalls()).toHaveLength(2);
    expect(letterBody(1).requestId).not.toBe(letterBody(0).requestId);
    expect(letterBody(1).entries).toHaveLength(4);
    expect(gateCalls()).toBe(2);
  });

  it('leaving the diary and coming back: the letter paid for is there, and not sold again', async () => {
    await firstLetter();
    cleanup();
    mount();
    fireEvent.click(await screen.findByRole('button', { name: '30-day curve' }));
    await screen.findByText('Dear you.', undefined, { timeout: 3000 });
    expect(screen.queryByRole('button', { name: /Write my letter/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Write me another letter/ })).toBeNull();
    expect(letterCalls()).toHaveLength(1);
  });

  it('a day after it arrived, the same days can have another letter (the function’s day-long cache has lapsed)', async () => {
    await firstLetter();
    const key = `arcana_mood_letter_v1:${A.id}`;
    const kept = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...kept, at: Date.now() - 25 * 60 * 60_000 }));
    cleanup();
    mount();
    fireEvent.click(await screen.findByRole('button', { name: '30-day curve' }));
    const again = await screen.findByRole('button', { name: /Write me another letter/ }, { timeout: 3000 });
    await waitFor(() => expect(again.parentElement).toHaveTextContent('Each reading uses 50 Moonstones'));
  });

  it('another account on this device never sees the letter', async () => {
    await firstLetter();
    cleanup();
    auth.user = B;
    mount();
    fireEvent.click(await screen.findByRole('button', { name: '30-day curve' }));
    await screen.findByRole('button', { name: /Write my letter/ }, { timeout: 3000 });
    expect(screen.queryByText('Dear you.')).toBeNull();
  });

  it('in Japanese', async () => {
    await i18n.changeLanguage('ja');
    invoke.mockImplementation(letterReply('拝啓'));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: '30日間の曲線' }));
    fireEvent.click(await screen.findByRole('button', { name: /手紙を書いてもらう/ }, { timeout: 3000 }));
    await screen.findByText('拝啓', undefined, { timeout: 3000 });
    expect(screen.getByText('次の手紙は、これから記録する気分を読んで書きます。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /別の手紙を書いてもらう/ })).toBeNull();
  });
});
