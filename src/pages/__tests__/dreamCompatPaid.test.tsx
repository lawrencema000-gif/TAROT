import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Dream interpreter and Partner compatibility, driven through their
 * real pages (p8 R1): a second press that lands while the balance gate is
 * still answering is ignored — one gate check, one request, one id — and
 * the request carries the id that makes a retry the server's free replay.
 * A retry of the same body sends the same id without a second gate check;
 * an id the server can no longer replay (REQUEST_ALREADY_USED) is dropped
 * and the screen says the next press is a new, charged reading.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f6', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', birthTime: '06:45', isPremium: false };

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
import { DreamInterpreterPage } from '../DreamInterpreterPage';
import { PartnerCompatPage } from '../PartnerCompatPage';

const later = <T,>(value: T, ms = 40) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const gateShort = () => later({ data: [{ allowed: false, balance: 20, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const callsTo = (fn: string) => invoke.mock.calls.filter((c) => c[0] === fn);
const bodyOf = (fn: string, i: number) => (callsTo(fn)[i][1] as { body: Record<string, unknown> }).body;

/** A function error whose Response carries the envelope `{ error: { code } }`. */
const httpError = (status: number, code: string) => ({
  data: null,
  error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code } }), { status }) },
});
/** No response at all: the debit may have landed. */
const lost = () => ({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function', context: {} } });

const DREAM = 'I was standing by a dark ocean and could not find my way home. A bird flew overhead.';
const AI_DREAM = {
  coreTheme: 'A homecoming the dreamer has not allowed.',
  emotionalTone: 'longing',
  archetypes: ['The Seeker'],
  symbols: [{ text: 'ocean', meaning: 'The unconscious.', reflection: 'What waits at its edge?' }],
  shadowPrompt: 'What are you not letting yourself want?',
  integrationSuggestion: 'Walk by water this week.',
};
const SYNASTRY = {
  me: [], partner: [],
  crossAspects: [{ myPlanet: 'Sun', partnerPlanet: 'Venus', type: 'trine', flavour: 'harmonious', orb: 1.2, interpretation: 'Natural enjoyment of each other.' }],
  overallScore: 77, harmoniousCount: 1, challengingCount: 0, intenseCount: 0,
  elementalBlend: { fire: 25, earth: 25, air: 25, water: 25 },
};

function mount(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
});
afterEach(() => cleanup());

function typeDream(container: HTMLElement, text = DREAM) {
  fireEvent.change(container.querySelector('#dream-text')!, { target: { value: text } });
}

describe('Dream interpreter (p8 R1)', () => {
  it('"Interpret my dream" twice while the gate answers is one gate check, one request and one id', async () => {
    invoke.mockImplementation(() => later({ data: { data: AI_DREAM }, error: null }));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    const cta = screen.getByRole('button', { name: /Interpret my dream/ });
    // Two taps in one tick, before React renders the first: only the
    // synchronous guard stops the second. Then a third once it has
    // rendered: the button is disabled.
    await act(async () => { cta.click(); cta.click(); });
    fireEvent.click(cta);
    await screen.findByText('A homecoming the dreamer has not allowed.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-dream-interpret')).toHaveLength(1);
    expect(bodyOf('ai-dream-interpret', 0).requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(bodyOf('ai-dream-interpret', 0).dreamText).toBe(DREAM);
  });

  it('the button is disabled from the press, before the gate answers', async () => {
    // The gate answers only when released, so "before" is not a race.
    let release: () => void = () => {};
    rpc.mockImplementation((name: string) =>
      name === 'action_gate_status'
        ? new Promise((resolve) => {
            release = () => resolve({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
          })
        : later({ data: null, error: null }),
    );
    invoke.mockImplementation(() => later({ data: { data: AI_DREAM }, error: null }));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    expect(screen.getByRole('button', { name: /Reading the dream/ })).toBeDisabled();
    expect(container.querySelector('#dream-text')).toBeDisabled();
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-dream-interpret')).toHaveLength(0);
    release();
    await screen.findByText('A homecoming the dreamer has not allowed.', undefined, { timeout: 3000 });
    expect(callsTo('ai-dream-interpret')).toHaveLength(1);
  });

  it('a lost answer: the dictionary reading says a charge may have landed, and Try again is the same request, ungated', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(() => later({ data: { data: AI_DREAM }, error: null }));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    const notice = await screen.findByText(/If you were charged for the full interpretation/, undefined, { timeout: 3000 });
    expect(notice.textContent).not.toMatch(/No Moonstones were taken/);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('A homecoming the dreamer has not allowed.', undefined, { timeout: 3000 });
    expect(callsTo('ai-dream-interpret')).toHaveLength(2);
    expect(bodyOf('ai-dream-interpret', 1)).toEqual(bodyOf('ai-dream-interpret', 0));
    expect(gateCalls()).toBe(1);
  });

  it('refused before the debit (rate limit): the dictionary reading, and "No Moonstones were taken" is true', async () => {
    invoke.mockImplementation(() => later(httpError(429, 'RATE_LIMITED')));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    await screen.findByRole('button', { name: /Interpret another dream/ }, { timeout: 3000 });
    expect(screen.queryByText(/If you were charged/)).toBeNull();
  });

  it('REQUEST_ALREADY_USED: stays on the dream, says it cannot be shown again, and the next press is a new request behind the gate', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(() => later(httpError(409, 'REQUEST_ALREADY_USED')));
    invoke.mockImplementationOnce(() => later({ data: { data: AI_DREAM }, error: null }));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }, { timeout: 3000 }));
    await screen.findByText(/already read once, and that reading can’t be shown again/, undefined, { timeout: 3000 });
    expect(screen.getByText(/starts a new reading, charged as usual/)).toBeInTheDocument();
    expect((container.querySelector('#dream-text') as HTMLTextAreaElement).value).toBe(DREAM);
    expect(gateCalls()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    await screen.findByText('A homecoming the dreamer has not allowed.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(2);
    expect(bodyOf('ai-dream-interpret', 2).requestId).not.toBe(bodyOf('ai-dream-interpret', 1).requestId);
  });

  it('after a lost answer, "Interpret another dream" with the same dream is still the same request; another dream is new', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementation(() => later({ data: { data: AI_DREAM }, error: null }));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Interpret another dream/ }, { timeout: 3000 }));
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    await screen.findByText('A homecoming the dreamer has not allowed.', undefined, { timeout: 3000 });
    expect(bodyOf('ai-dream-interpret', 1)).toEqual(bodyOf('ai-dream-interpret', 0));
    expect(gateCalls()).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: /Interpret another dream/ }));
    typeDream(container, `${DREAM} A second, different dream.`);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    await screen.findByText('A homecoming the dreamer has not allowed.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(2);
    expect(bodyOf('ai-dream-interpret', 2).requestId).not.toBe(bodyOf('ai-dream-interpret', 0).requestId);
  });

  it('a changed dream clears the spent notice', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(() => later(httpError(409, 'REQUEST_ALREADY_USED')));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }, { timeout: 3000 }));
    await screen.findByText(/already read once/, undefined, { timeout: 3000 });
    typeDream(container, `${DREAM} Then the tide came in.`);
    expect(screen.queryByText(/already read once/)).toBeNull();
  });

  it('402 from the server: the gate is read again (it opens the Earn sheet), no dictionary reading', async () => {
    rpc.mockImplementationOnce(() => gateOpen()).mockImplementationOnce(() => gateShort());
    invoke.mockImplementation(() => later(httpError(402, 'INSUFFICIENT_BALANCE')));
    const { container } = mount(<DreamInterpreterPage />);
    typeDream(container);
    fireEvent.click(screen.getByRole('button', { name: /Interpret my dream/ }));
    await waitFor(() => expect(gateCalls()).toBe(2));
    await waitFor(() => expect(screen.getByRole('button', { name: /Interpret my dream/ })).not.toBeDisabled());
    expect(screen.queryByRole('button', { name: /Interpret another dream/ })).toBeNull();
  });
});

function fillPartnerBirth(container: HTMLElement, value = '1990-05-05') {
  const dates = container.querySelectorAll('input[type="date"]');
  fireEvent.change(dates[1], { target: { value } });
}

describe('Partner compatibility (p8 R1)', () => {
  it('"Reveal our compatibility" twice while the gate answers is one gate check, one request and one id', async () => {
    invoke.mockImplementation(() => later({ data: { data: SYNASTRY }, error: null }));
    const { container } = mount(<PartnerCompatPage />);
    await waitFor(() => expect((container.querySelectorAll('input[type="date"]')[0] as HTMLInputElement).value).toBe('1991-03-08'));
    fillPartnerBirth(container);
    const cta = screen.getByRole('button', { name: /Reveal our compatibility/ });
    // Two taps in one tick, before React renders the first: only the
    // synchronous guard stops the second. Then a third once it has
    // rendered: the button is disabled.
    await act(async () => { cta.click(); cta.click(); });
    fireEvent.click(cta);
    await screen.findByRole('button', { name: /Share this match/ }, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('partner-synastry-adhoc')).toHaveLength(1);
    expect(bodyOf('partner-synastry-adhoc', 0).requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('a lost answer: an error that says the retry is free, and Try again is the same request, ungated — never a silent partial result', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(() => later({ data: { data: SYNASTRY }, error: null }));
    const { container } = mount(<PartnerCompatPage />);
    await waitFor(() => expect((container.querySelectorAll('input[type="date"]')[0] as HTMLInputElement).value).toBe('1991-03-08'));
    fillPartnerBirth(container);
    fireEvent.click(screen.getByRole('button', { name: /Reveal our compatibility/ }));
    await screen.findByText(/If you were charged, Try again returns the same reading at no extra cost/, undefined, { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    await screen.findByRole('button', { name: /Share this match/ }, { timeout: 3000 });
    expect(callsTo('partner-synastry-adhoc')).toHaveLength(2);
    expect(bodyOf('partner-synastry-adhoc', 1)).toEqual(bodyOf('partner-synastry-adhoc', 0));
    expect(gateCalls()).toBe(1);
  });

  it('REQUEST_ALREADY_USED: says the reading cannot be shown again; the next press is a new id behind the gate', async () => {
    invoke.mockImplementationOnce(() => later(lost()));
    invoke.mockImplementationOnce(() => later(httpError(409, 'REQUEST_ALREADY_USED')));
    invoke.mockImplementationOnce(() => later({ data: { data: SYNASTRY }, error: null }));
    const { container } = mount(<PartnerCompatPage />);
    await waitFor(() => expect((container.querySelectorAll('input[type="date"]')[0] as HTMLInputElement).value).toBe('1991-03-08'));
    fillPartnerBirth(container);
    fireEvent.click(screen.getByRole('button', { name: /Reveal our compatibility/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Try again/ }, { timeout: 3000 }));
    await screen.findByText(/already read once, and that reading can’t be shown again/, undefined, { timeout: 3000 });
    expect(screen.getByText(/Reveal our compatibility starts a new reading, charged as usual/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Reveal our compatibility/ }));
    await screen.findByRole('button', { name: /Share this match/ }, { timeout: 3000 });
    expect(gateCalls()).toBe(2);
    expect(bodyOf('partner-synastry-adhoc', 2).requestId).not.toBe(bodyOf('partner-synastry-adhoc', 1).requestId);
  });

  it('MBTI on both sides, no partner birth date: computed here, free — no gate, no request', async () => {
    const { container } = mount(<PartnerCompatPage />);
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'INFJ' } });
    fireEvent.change(selects[1], { target: { value: 'ENFP' } });
    fireEvent.click(screen.getByRole('button', { name: /Reveal our compatibility/ }));
    await screen.findByRole('button', { name: /Share this match/ }, { timeout: 3000 });
    expect(gateCalls()).toBe(0);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('the price shows only for the paid synastry, and a cleared profile field stays clear', async () => {
    const { container } = mount(<PartnerCompatPage />);
    const myDate = () => container.querySelectorAll('input[type="date"]')[0] as HTMLInputElement;
    await waitFor(() => expect(myDate().value).toBe('1991-03-08'));
    expect(screen.queryByText(/Each reading uses/)).toBeNull();
    fillPartnerBirth(container);
    expect(await screen.findByText(/Each reading uses/)).toBeInTheDocument();
    fireEvent.change(myDate(), { target: { value: '' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(myDate().value).toBe('');
    expect(screen.queryByText(/Each reading uses/)).toBeNull();
  });

  it('no matching pair (a birth date on one side, an MBTI type on the other): says what is needed, no gate, no request', async () => {
    const { container } = mount(<PartnerCompatPage />);
    await waitFor(() => expect((container.querySelectorAll('input[type="date"]')[0] as HTMLInputElement).value).toBe('1991-03-08'));
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'ENFP' } });
    fireEvent.click(screen.getByRole('button', { name: /Reveal our compatibility/ }));
    await new Promise((r) => setTimeout(r, 120));
    expect(gateCalls()).toBe(0);
    expect(invoke).not.toHaveBeenCalled();
  });
});
