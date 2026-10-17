import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Companion and the Tarot companion, driven through their pages:
 *  - p9 R09: the first message's reply is lost after the server charged the
 *    conversation; the resend is answered free ({ charged: false,
 *    conversationPaid: true }). The resend is not held at the balance gate,
 *    the conversation then counts as covered (no price, no gate on later
 *    messages), and the Tarot session is kept across leaving the page.
 *  - p9 R23: a thread stored at 80 messages is sent as a bounded window, so
 *    the eleventh message of a visit no longer goes out with 101 (a 400
 *    before any charge, shown as "check your connection"); a 400 has its
 *    own words.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d9', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };

const invoke = vi.fn();
const rpc = vi.fn();
const toastSpy = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 40 }, error: null });
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
vi.mock('../../services/tarotCards', () => ({
  getAllTarotCards: async () => [
    { id: 17, name: 'The Star', arcana: 'major', keywords: ['hope'], meaningUpright: 'Hope returns.', meaningReversed: 'Hope delayed.' },
  ],
}));
vi.mock('../../components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/ui')>()),
  toast: (...a: unknown[]) => toastSpy(...a),
}));
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
import { AiCompanionPage } from '../AiCompanionPage';
import { TarotCompanionPage } from '../TarotCompanionPage';

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
/** The gate: open while the balance covers 50; the first charge (lost with its reply) leaves 40. */
const gate = { balance: 100 };
const gateAnswer = () => later({
  data: [{ allowed: gate.balance >= 50, balance: gate.balance, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }],
  error: null,
});
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const chats = () => invoke.mock.calls.filter((c) => c[0] === 'ai-companion-chat');
const chatBody = (i: number) => (chats()[i][1] as { body: { conversationId: string; history: Array<{ role: string; content: string }> } }).body;
/** No response at all: the server charged (the balance fell to 40) and the reply was lost. */
const lostAfterCharge = () => {
  gate.balance = 40;
  return later({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } });
};
const paidAlready = (reply: string) => () => later({ data: { data: { reply, charged: false, conversationPaid: true } }, error: null });
const rejected400 = () => later({
  data: null,
  error: {
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify({ error: { code: 'INVALID_REQUEST', message: 'Request body failed validation' } }), { status: 400 }),
  },
});
const toasts = () => toastSpy.mock.calls.map((c) => String(c[0]));

function mount(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  invoke.mockReset();
  rpc.mockReset();
  toastSpy.mockReset();
  gate.balance = 100;
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateAnswer() : later({ data: null, error: null })));
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

const send = async (text: string) => {
  const box = screen.getByLabelText('Ask the companion…') as HTMLTextAreaElement;
  fireEvent.change(box, { target: { value: text } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  return box;
};

describe('p9 R09 — Companion: a lost first reply, then the free retry', () => {
  it('the resend is not gated (40 left), the conversation is covered after it — no price, no gate — and stays so through a reload', async () => {
    invoke.mockImplementationOnce(lostAfterCharge);
    invoke.mockImplementation(paidAlready('Answer.'));
    mount(<AiCompanionPage />);
    const box = await send('Hello');
    await waitFor(() => expect(toasts()).toHaveLength(1)); // the lost send settled
    expect(box.value).toBe('Hello');
    expect(gateCalls()).toBe(1);
    // The resend: the gate would say "You need 50 Moonstones. You have 40" — it is not asked.
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Answer.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(chatBody(1).conversationId).toBe(chatBody(0).conversationId);
    const stored = JSON.parse(localStorage.getItem(`arcana_companion_v2:${USER.id}:sage`)!);
    expect(typeof stored.chargedAt).toBe('number');
    expect(stored.pendingSince).toBeUndefined();
    expect(screen.queryByText(/A conversation uses/)).toBeNull();
    // Later messages ride the same charge: no gate, no Earn sheet.
    await send('Follow-up');
    await waitFor(() => expect(chats()).toHaveLength(3));
    expect(gateCalls()).toBe(1);
    cleanup();
    mount(<AiCompanionPage />);
    await screen.findByText('Answer.');
    expect(screen.queryByText(/A conversation uses/)).toBeNull();
  });

  it('the lost send is remembered through a reload: coming back, the resend is still not gated', async () => {
    invoke.mockImplementationOnce(lostAfterCharge);
    invoke.mockImplementation(paidAlready('Answer.'));
    mount(<AiCompanionPage />);
    const box = await send('Hello');
    await waitFor(() => expect(toasts()).toHaveLength(1)); // the lost send settled
    expect(box.value).toBe('Hello');
    cleanup();
    mount(<AiCompanionPage />);
    await send('Hello');
    await screen.findByText('Answer.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(chatBody(1).conversationId).toBe(chatBody(0).conversationId);
  });

  it('if the lost send was never charged, the server refuses the resend (402): the mark goes and the gate opens the Earn sheet', async () => {
    invoke.mockImplementationOnce(() => {
      gate.balance = 40; // spent elsewhere meanwhile; this send never reached the server
      return later({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } });
    });
    invoke.mockImplementationOnce(() => later({
      data: null,
      error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code: 'INSUFFICIENT_BALANCE' } }), { status: 402 }) },
    }));
    mount(<AiCompanionPage />);
    const box = await send('Hello');
    await waitFor(() => expect(toasts()).toHaveLength(1)); // the lost send settled
    expect(box.value).toBe('Hello');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(gateCalls()).toBe(2));
    await waitFor(() => expect(box.value).toBe('Hello'));
    const stored = JSON.parse(localStorage.getItem(`arcana_companion_v2:${USER.id}:sage`)!);
    expect(stored.pendingSince).toBeUndefined();
    expect(toasts().some((s) => /check your connection/.test(s))).toBe(true); // the first, lost send
  });
});

describe('p9 R09 — Tarot companion: a lost opener', () => {
  it('"Read this card" again is not gated, rides the same conversation, and the paid session is kept across leaving the page', async () => {
    invoke.mockImplementationOnce(lostAfterCharge);
    invoke.mockImplementation(paidAlready('The Star asks for patience.'));
    mount(<TarotCompanionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Read this card/ }, { timeout: 3000 }));
    await waitFor(() => expect(chats()).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Read this card/ })).not.toBeDisabled(), { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: /Read this card/ }));
    await screen.findByText('The Star asks for patience.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(chatBody(1).conversationId).toBe(chatBody(0).conversationId);
    // Follow-ups are covered: no price under the composer, no gate.
    expect(screen.queryByText(/A conversation uses/)).toBeNull();
    cleanup();
    mount(<TarotCompanionPage />);
    await screen.findByText('The Star asks for patience.', undefined, { timeout: 3000 });
    expect(screen.queryByRole('button', { name: /Read this card/ })).toBeNull();
  });

  it('leaving right after the lost opener: coming back finds the same card, and reading it is the same conversation, ungated', async () => {
    invoke.mockImplementationOnce(lostAfterCharge);
    invoke.mockImplementation(paidAlready('Patience.'));
    mount(<TarotCompanionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Read this card/ }, { timeout: 3000 }));
    await waitFor(() => expect(chats()).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /Read this card/ })).not.toBeDisabled(), { timeout: 3000 });
    cleanup();
    mount(<TarotCompanionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Read this card/ }, { timeout: 3000 }));
    await screen.findByText('Patience.', undefined, { timeout: 3000 });
    expect(chatBody(1).conversationId).toBe(chatBody(0).conversationId);
    expect(gateCalls()).toBe(1);
  });
});

describe('p9 R23 — a long thread is sent as a bounded window', () => {
  it('a conversation stored at 80: the eleventh message of the visit goes out with 40, not 101', async () => {
    const msgs = Array.from({ length: 80 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}`, timestamp: Date.now() - 1000 + i }));
    localStorage.setItem(`arcana_companion_v2:${USER.id}:sage`, JSON.stringify({
      conversationId: '11111111-1111-4111-8111-111111111111', messages: msgs, chargedAt: Date.now() - 60_000,
    }));
    invoke.mockImplementation(() => later({ data: { data: { reply: 'ok', charged: false, conversationPaid: true } }, error: null }, 5));
    mount(<AiCompanionPage />);
    for (let i = 1; i <= 11; i++) {
      await send(`Follow-up ${i}`);
      await waitFor(() => expect(chats()).toHaveLength(i));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled());
    }
    const sizes = chats().map((_, i) => chatBody(i).history.length);
    expect(Math.max(...sizes)).toBe(40);
    expect(chatBody(10).history.at(-1)).toEqual({ role: 'user', content: 'Follow-up 11' });
    expect(toasts()).toEqual([]);
  });

  it('a 400 is not "check your connection": its own words, and the message goes back in the box', async () => {
    invoke.mockImplementation(rejected400);
    mount(<AiCompanionPage />);
    const box = await send('Hello');
    await waitFor(() => expect(toasts()).toHaveLength(1)); // the lost send settled
    expect(box.value).toBe('Hello');
    await waitFor(() => expect(toasts()).toEqual(['This message couldn’t be sent. Start a new conversation and send it again.']));
  });

  it('in Japanese, and on the Tarot companion', async () => {
    await i18n.changeLanguage('ja');
    invoke.mockImplementation(rejected400);
    mount(<TarotCompanionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /このカードを読む|カードを読む/ }, { timeout: 3000 }));
    await waitFor(() => expect(toasts()).toContain('この質問は送信できませんでした。新しいカードを引いて、新しい会話を始めてください。'));
    expect(toasts()).toEqual(['この質問は送信できませんでした。新しいカードを引いて、新しい会話を始めてください。']);
  });
});
