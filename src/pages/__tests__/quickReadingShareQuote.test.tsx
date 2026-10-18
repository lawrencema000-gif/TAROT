import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 QU2 R3 c: Quick reading's share text quoted the question in straight
 * ASCII quotes built in code: "\"今週はうまくいきますか？\"\n\n…". It is
 * quoted as the locale quotes (spreadDetail.quoted): 「…」 in ja, “…” in en.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000ea', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };

const invoke = vi.fn();
const rpc = vi.fn();
const writeText = vi.fn(async (text: string) => { void text; });
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

const later = <T,>(value: T, ms = 10) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const reading = () => later({ data: { data: { reading: 'One. Two.\n\nThree.', card: { name: 'The Star', id: 17 }, memoryUsed: false } }, error: null });

/** Ask `question`, wait for the reading, press Share; the text that was copied. */
async function askAndShare(question: string): Promise<string> {
  const { container } = render(<MemoryRouter><QuickReadingPage /></MemoryRouter>);
  fireEvent.change(container.querySelector('#quick-reading-question') as HTMLTextAreaElement, { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('app:quickReading.draw')) }));
  await screen.findByText(i18n.t('app:quickReading.askAnother', { defaultValue: 'Ask another' }), undefined, { timeout: 3000 });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('app:quickReading.share', { defaultValue: 'Share' }) }));
  await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  return writeText.mock.calls[0][0] as string;
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  vi.stubGlobal('navigator', { ...globalThis.navigator, share: undefined, clipboard: { writeText } });
  writeText.mockClear();
  invoke.mockReset().mockImplementation(reading);
  rpc.mockReset().mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('Quick reading: the shared question is quoted as the locale quotes (QU2 R3 c)', { timeout: 20_000 }, () => {
  it('ja: 「…」, not ASCII quotes', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    const text = await askAndShare('今週はうまくいきますか？');
    expect(text.startsWith('「今週はうまくいきますか？」\n\n')).toBe(true);
    expect(text).not.toContain('"');
  });

  it('en: curly quotes; the question trimmed, the reading and the card after it', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    const text = await askAndShare('  Will this week go well?  ');
    expect(text.startsWith('“Will this week go well?”\n\nOne. Two.')).toBe(true);
    expect(text).not.toContain('"');
  });
});
