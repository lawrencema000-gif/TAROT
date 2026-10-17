import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 R10 — Quick reading: after a lost reply the panel promises "If you were
 * charged, Try again returns the same reading at no extra cost". Editing the
 * question (or the lens, or the deck) used to keep that promise and the "Try
 * again" label on screen, while the press then sent a new, gated, charged
 * request and forgot the first. The panel now speaks only for the request it
 * is about: edited, it goes and the button reads "Draw and read" above the
 * price; edited back, the free retry of the unanswered request returns.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000e9', email: 'qa@example.com' };
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
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
// Motion is not under test: plain elements, no animation props.
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

const later = <T,>(value: T, ms = 20) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const reads = () => invoke.mock.calls.filter((c) => c[0] === 'ai-quick-reading');
const readBody = (i: number) => (reads()[i][1] as { body: { requestId: string; question: string; deck: string } }).body;
/** No response at all: the debit may have landed, so "Try again" is the same request. */
const dropped = () => later({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } });
const reading = () => later({ data: { data: { reading: 'One. Two.\n\nThree.', card: { name: 'The Star', id: 17 }, memoryUsed: false } }, error: null });

const FREE_RETRY = /Try again returns the same reading at no extra cost/;

function mount() {
  return render(<MemoryRouter><QuickReadingPage /></MemoryRouter>);
}
const questionBox = (c: HTMLElement) => c.querySelector('#quick-reading-question') as HTMLTextAreaElement;

/** Ask once and lose the reply: the panel with its free-retry promise is up. */
async function askAndLose(container: HTMLElement, question = 'Will this week go well?') {
  invoke.mockImplementationOnce(dropped);
  invoke.mockImplementation(reading);
  fireEvent.change(questionBox(container), { target: { value: question } });
  fireEvent.click(screen.getByRole('button', { name: /Draw and read/ }));
  await screen.findByText(FREE_RETRY, undefined, { timeout: 3000 });
  await waitFor(() => expect(screen.getByRole('button', { name: /Try again/ })).not.toBeDisabled());
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('p9 R10 — the "Try again" promise is bound to the unanswered question', () => {
  it('the question edited: the panel and "Try again" go; the button reads "Draw and read" and is a new, gated request', async () => {
    const { container } = mount();
    await askAndLose(container);
    fireEvent.change(questionBox(container), { target: { value: 'Will this year go well?' } });
    expect(screen.queryByText(FREE_RETRY)).toBeNull();
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Draw and read/ }));
    await screen.findByText('Ask another', undefined, { timeout: 3000 });
    expect(reads()).toHaveLength(2);
    expect(readBody(1).requestId).not.toBe(readBody(0).requestId);
    expect(readBody(1).question).toBe('Will this year go well?');
    expect(gateCalls()).toBe(2);
  });

  it('edited back to the unanswered question: the free retry is back — the same request, not gated', async () => {
    const { container } = mount();
    await askAndLose(container);
    fireEvent.change(questionBox(container), { target: { value: 'Will this year go well?' } });
    expect(screen.queryByText(FREE_RETRY)).toBeNull();
    fireEvent.change(questionBox(container), { target: { value: 'Will this week go well?' } });
    expect(screen.getByText(FREE_RETRY)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    await screen.findByText('Ask another', undefined, { timeout: 3000 });
    expect(readBody(1).requestId).toBe(readBody(0).requestId);
    expect(gateCalls()).toBe(1);
  });

  it('a lens or a deck changed is a new reading too', async () => {
    const { container } = mount();
    await askAndLose(container);
    fireEvent.click(screen.getByRole('button', { name: 'Love' }));
    expect(screen.queryByText(FREE_RETRY)).toBeNull();
    expect(screen.getByRole('button', { name: /Draw and read/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Anything' }));
    expect(screen.getByText(FREE_RETRY)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Playing cards/ }));
    expect(screen.queryByText(FREE_RETRY)).toBeNull();
    expect(screen.getByRole('button', { name: /Draw and read/ })).toBeInTheDocument();
  });

  it('in Japanese: edited, 「もう一度試す」 gives way to 「引いて読む」', async () => {
    await i18n.changeLanguage('ja');
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementation(reading);
    const { container } = mount();
    fireEvent.change(questionBox(container), { target: { value: '今週はうまくいきますか？' } });
    fireEvent.click(screen.getByRole('button', { name: /引いて読む/ }));
    await screen.findByText(/追加料金なしで同じリーディングが表示されます/, undefined, { timeout: 3000 });
    expect(screen.getByRole('button', { name: /もう一度試す/ })).toBeInTheDocument();
    fireEvent.change(questionBox(container), { target: { value: '今年はうまくいきますか？' } });
    expect(screen.queryByText(/追加料金なしで同じリーディングが表示されます/)).toBeNull();
    expect(screen.queryByRole('button', { name: /もう一度試す/ })).toBeNull();
    expect(screen.getByRole('button', { name: /引いて読む/ })).toBeInTheDocument();
  });
});
