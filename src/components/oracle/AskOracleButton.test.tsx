import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';

/*
 * The Oracle sheet (ExtraResult, the I Ching and the card pages), driven
 * through the real component (p8 R3, R4). Opening the sheet asks nothing;
 * the paid reading starts only from "Draw and read", behind the balance
 * gate, once per press, with a request id that a retry sends again — even
 * after the sheet was closed and the page left. A cancelled share copies
 * nothing and says nothing.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f7', email: 'qa@example.com' };
let profile: Record<string, unknown> = {};

const invoke = vi.fn();
const rpc = vi.fn();
const toastSpy = vi.fn();
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
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile }) }));
vi.mock('../../utils/platform', () => ({ isNative: () => false }));
vi.mock('../ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ui')>()),
  toast: (...a: unknown[]) => toastSpy(...a),
}));

import i18n from '../../i18n/config';
import { AskOracleButton } from './AskOracleButton';

const later = <T,>(value: T, ms = 40) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const GATE_OPEN = { data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null };
const GATE_SHORT = { data: [{ allowed: false, balance: 20, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null };
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const calls = () => invoke.mock.calls.filter((c) => c[0] === 'ai-quick-reading');
const bodyOf = (i: number) => (calls()[i][1] as { body: Record<string, unknown> }).body;

const httpError = (status: number, code: string) => ({
  data: null,
  error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code } }), { status }) },
});
const lost = () => ({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function', context: {} } });
const READING = {
  reading: 'The Tower clears what was built on sand.\n\nWhat would you rebuild first?',
  card: { name: 'The Tower', meaning: 'Sudden change.' },
  memoryUsed: false,
};
const answered = () => later({ data: { data: READING }, error: null });

const LABEL = 'Read this card for me';
/** Each test asks its own question: the module keeps unanswered ids across mounts, by design. */
function mountOracle(context: string) {
  return render(<AskOracleButton variant="card" context={context} label={LABEL} />);
}
const openSheet = () => fireEvent.click(screen.getByRole('button', { name: LABEL }));
const drawButton = () => screen.getByRole('button', { name: /Draw and read/ });
/** Two taps in one tick, before React renders the first: only the synchronous guard can stop the second. */
const doubleTap = (el: HTMLElement) => act(() => { el.click(); el.click(); });

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  profile = { displayName: null, birthDate: '1991-03-08', mbtiType: null, isPremium: false };
  invoke.mockReset();
  rpc.mockReset();
  toastSpy.mockReset();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? later(GATE_OPEN) : later({ data: null, error: null })));
});
afterEach(() => cleanup());

describe('the Oracle sheet asks only when asked (p8 R3)', () => {
  it('opening it sends nothing: no gate, no request; it shows the question, the price and Draw and read', async () => {
    mountOracle('the meaning of The Tower tarot card for me (open)');
    openSheet();
    expect(await screen.findByText('the meaning of The Tower tarot card for me (open)')).toBeInTheDocument();
    expect(screen.getByText(/Each reading uses/)).toBeInTheDocument();
    expect(drawButton()).toBeEnabled();
    await new Promise((r) => setTimeout(r, 120));
    expect(gateCalls()).toBe(0);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('Draw and read twice in one tick is one gate check, one request and one id; the body has no nulls and fits 500', async () => {
    invoke.mockImplementation(answered);
    const long = `my Dark triad result: ${'x'.repeat(600)}`;
    mountOracle(long);
    openSheet();
    await doubleTap(drawButton());
    await screen.findByText('The Tower clears what was built on sand.', { exact: false }, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(calls()).toHaveLength(1);
    const body = bodyOf(0);
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect((body.question as string).length).toBeLessThanOrEqual(500);
    const ctx = body.userContext as Record<string, unknown>;
    // null in the profile used to reach the schema (z.string().optional()) as null: a 400 for everyone without an MBTI type.
    expect('mbtiType' in ctx && ctx.mbtiType === null).toBe(false);
    expect(ctx.displayName ?? undefined).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('null');
    expect(ctx.zodiacSign).toBe('Pisces');
  });

  it('a lost answer: the copy never says nothing was charged, and asking again is the same request, ungated', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(answered);
    mountOracle('hexagram 29 — The Abysmal — for my situation (lost)');
    openSheet();
    fireEvent.click(drawButton());
    expect(await screen.findByText(/If you were charged, asking again returns the same reading at no extra cost/, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText(/Nothing was charged/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ask the Oracle again/ }));
    await screen.findByText('The Tower clears what was built on sand.', { exact: false }, { timeout: 3000 });
    expect(calls()).toHaveLength(2);
    expect(bodyOf(1)).toEqual(bodyOf(0));
    expect(gateCalls()).toBe(1);
  });

  it('the id outlives the sheet: after leaving the page and coming back, reading again is the same request', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(answered);
    const context = 'my Attachment result: Secure (steady) (remount)';
    const first = mountOracle(context);
    openSheet();
    fireEvent.click(drawButton());
    await screen.findByRole('button', { name: /Ask the Oracle again/ }, { timeout: 3000 });
    first.unmount();
    mountOracle(context);
    openSheet();
    fireEvent.click(drawButton());
    await screen.findByText('The Tower clears what was built on sand.', { exact: false }, { timeout: 3000 });
    expect(bodyOf(1).requestId).toBe(bodyOf(0).requestId);
    expect(gateCalls()).toBe(1);
  });

  it('REQUEST_ALREADY_USED: says it cannot be shown again, and the next press is a new id behind the gate', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(() => later(httpError(409, 'REQUEST_ALREADY_USED')));
    invoke.mockImplementationOnce(answered);
    mountOracle('the meaning of The Star tarot card for me (spent)');
    openSheet();
    fireEvent.click(drawButton());
    fireEvent.click(await screen.findByRole('button', { name: /Ask the Oracle again/ }, { timeout: 3000 }));
    expect(await screen.findByText(/already read once, and that reading can’t be shown again/, undefined, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText(/Draw and read starts a new reading, charged as usual/)).toBeInTheDocument();
    fireEvent.click(drawButton());
    await screen.findByText('The Tower clears what was built on sand.', { exact: false }, { timeout: 3000 });
    expect(gateCalls()).toBe(2);
    expect(bodyOf(2).requestId).not.toBe(bodyOf(1).requestId);
  });

  it('under the price: the gate opens the Earn sheet and nothing is sent', async () => {
    rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? later(GATE_SHORT) : later({ data: null, error: null })));
    mountOracle('the meaning of The Moon tarot card for me (short)');
    openSheet();
    fireEvent.click(drawButton());
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(2));
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.queryByText(/Couldn’t reach the Oracle/)).toBeNull();
  });

  it('402 from the server: the id is dropped and the gate is read again (the Earn sheet), no error panel', async () => {
    rpc
      .mockImplementationOnce(() => later(GATE_OPEN))
      .mockImplementation((name: string) => (name === 'action_gate_status' ? later(GATE_SHORT) : later({ data: null, error: null })));
    invoke.mockImplementation(() => later(httpError(402, 'INSUFFICIENT_BALANCE')));
    mountOracle('the meaning of The Sun tarot card for me (402)');
    openSheet();
    fireEvent.click(drawButton());
    await waitFor(() => expect(gateCalls()).toBe(2));
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(2));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Premium: no price line', async () => {
    profile = { ...profile, isPremium: true };
    mountOracle('the meaning of The World tarot card for me (premium)');
    openSheet();
    expect(await screen.findByRole('button', { name: /Draw and read/ })).toBeInTheDocument();
    expect(screen.queryByText(/Each reading uses/)).toBeNull();
  });

  it('another card on the same screen is another question: the reading for the last one is not shown under it', async () => {
    invoke.mockImplementation(answered);
    const view = mountOracle('the meaning of Death tarot card for me (switch)');
    openSheet();
    fireEvent.click(drawButton());
    await screen.findByText('The Tower clears what was built on sand.', { exact: false }, { timeout: 3000 });
    view.rerender(<AskOracleButton variant="card" context="the meaning of Temperance tarot card for me (switch)" label={LABEL} />);
    await waitFor(() => expect(screen.queryByText('The Tower clears what was built on sand.', { exact: false })).toBeNull());
    expect(drawButton()).toBeEnabled();
  });
});

describe('sharing an Oracle reading (p8 R4)', () => {
  const writeText = vi.fn(async () => {});
  async function readingOnScreen(context: string) {
    invoke.mockImplementation(answered);
    mountOracle(context);
    openSheet();
    fireEvent.click(drawButton());
    return screen.findByRole('button', { name: /Share this reading/ }, { timeout: 3000 });
  }
  function stubNavigator(share: unknown, clipboard: unknown) {
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true, writable: true });
  }
  afterEach(() => {
    stubNavigator(undefined, undefined);
    writeText.mockClear();
  });

  it.each(['AbortError', 'InvalidStateError'])('a share sheet closed (%s): nothing is copied and nothing is said', async (name) => {
    stubNavigator(vi.fn(async () => { throw new DOMException('closed', name); }), { writeText });
    fireEvent.click(await readingOnScreen(`share ${name}`));
    await new Promise((r) => setTimeout(r, 50));
    expect(navigator.share).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('a share sheet that could not open: the reading is copied and the toast says so', async () => {
    stubNavigator(vi.fn(async () => { throw new DOMException('no activation', 'NotAllowedError'); }), { writeText });
    fireEvent.click(await readingOnScreen('share NotAllowedError'));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(i18n.t('common:actions.copied'), 'success'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('The Tower clears what was built on sand.'));
  });

  it('no share sheet and no clipboard: a failure toast, never "Copied"', async () => {
    stubNavigator(undefined, undefined);
    fireEvent.click(await readingOnScreen('share nothing'));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
    expect(toastSpy.mock.calls[0][1]).toBe('error');
    expect(toastSpy.mock.calls[0][0]).toBe(i18n.t('common:actions.shareFailed'));
  });
});
