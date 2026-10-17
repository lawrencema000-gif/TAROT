import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * Every paid entry point FB3 owns, driven through its real page: a second
 * press that lands while the balance gate is still answering is ignored —
 * one gate check, one request, one id — and the request carries the id
 * that makes a retry the server's free replay (p8 F08, F11, O#21, and the
 * siblings: the Companion, the mood letter, the soulmate score and
 * portrait).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f3', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', birthLat: 34.7, birthLon: 135.5, birthTime: '06:45', birthTz: 'Asia/Tokyo', isPremium: false };

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
vi.mock('../../services/tarotCards', () => ({
  getAllTarotCards: async () => [
    { id: 17, name: 'The Star', arcana: 'major', keywords: ['hope'], meaningUpright: 'Hope returns.', meaningReversed: 'Hope delayed.' },
  ],
}));
vi.mock('../../dal/moodEntries', () => ({
  isUnavailable: () => false,
  listForUser: async () => ({
    ok: true,
    data: [
      { date: '2026-10-10', category: 'calm', intensity: 3, savedAt: 1 },
      { date: '2026-10-11', category: 'heavy', intensity: 4, savedAt: 2 },
      { date: '2026-10-12', category: 'joyful', intensity: 5, savedAt: 3 },
    ],
  }),
  upsertMany: async () => ({ ok: true, data: 0 }),
  upsert: async () => ({ ok: false, error: 'offline' }),
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
import { QuickReadingPage } from '../QuickReadingPage';
import { TarotCompanionPage } from '../TarotCompanionPage';
import { AiCompanionPage } from '../AiCompanionPage';
import { MoodDiaryPage } from '../MoodDiaryPage';
import { SoulmateScorePage } from '../SoulmateScorePage';
import { SoulmatePortrait } from '../../components/soulmate/SoulmatePortrait';
import { resetPortraitSession } from '../../components/soulmate/portraitPaint';

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

const later = <T,>(value: T, ms = 40) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const callsTo = (fn: string) => invoke.mock.calls.filter((c) => c[0] === fn);

function mount(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
  // jsdom has no scrolling.
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  invoke.mockReset();
  rpc.mockReset();
  resetPortraitSession();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
});
afterEach(() => cleanup());

describe('a double tap is one gate check, one request and one id', () => {
  it('Quick reading: "Draw and read" twice while the gate answers (F08)', async () => {
    invoke.mockImplementation(() => later({ data: { data: { reading: 'One. Two.\n\nThree.', card: { name: 'The Star', id: 17 }, memoryUsed: false } }, error: null }));
    const { container } = mount(<QuickReadingPage />);
    fireEvent.change(container.querySelector('#quick-reading-question')!, { target: { value: 'Will this week go well?' } });
    const cta = screen.getByRole('button', { name: /Draw and read/ });
    fireEvent.click(cta);
    fireEvent.click(cta);
    await screen.findByText('Ask another', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    const sent = callsTo('ai-quick-reading');
    expect(sent).toHaveLength(1);
    expect((sent[0][1] as { body: { requestId: string } }).body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('Tarot companion: "Read this card" twice (F11), then a follow-up rides the same conversation, ungated (F02/F10)', async () => {
    invoke.mockImplementation(() => later({ data: { data: { reply: 'The Star asks for patience.', charged: true } }, error: null }));
    mount(<TarotCompanionPage />);
    const read = await screen.findByRole('button', { name: /Read this card/ }, { timeout: 3000 });
    fireEvent.click(read);
    fireEvent.click(read);
    await screen.findByText('The Star asks for patience.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-companion-chat')).toHaveLength(1);
    const opener = (callsTo('ai-companion-chat')[0][1] as { body: { conversationId: string; persona: string } }).body;
    expect(opener.persona).toBe('oracle');
    expect(opener.conversationId).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.change(screen.getByPlaceholderText('Ask a follow-up…'), { target: { value: 'What should I do this week?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(callsTo('ai-companion-chat')).toHaveLength(2));
    const followUp = (callsTo('ai-companion-chat')[1][1] as { body: { conversationId: string; history: unknown[] } }).body;
    expect(followUp.conversationId).toBe(opener.conversationId);
    expect(followUp.history).toHaveLength(3);
    // Covered by the opener's charge: no second balance check.
    expect(gateCalls()).toBe(1);
  });

  it('Tarot companion: a follow-up refused for balance (402) puts the question back and re-reads the gate — never "could not reach the oracle"', async () => {
    invoke.mockImplementationOnce(() => later({ data: { data: { reply: 'Opening reply.', charged: true } }, error: null }));
    invoke.mockImplementationOnce(() => later({
      data: null,
      error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code: 'INSUFFICIENT_BALANCE' } }), { status: 402 }) },
    }));
    mount(<TarotCompanionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Read this card/ }, { timeout: 3000 }));
    await screen.findByText('Opening reply.', undefined, { timeout: 3000 });
    const box = screen.getByPlaceholderText('Ask a follow-up…') as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'And next month?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(gateCalls()).toBe(2));
    await waitFor(() => expect(box.value).toBe('And next month?'));
    expect(screen.queryByText('And next month?', { selector: 'div' })).toBeNull();
    expect(screen.queryByText(/reach the oracle/)).toBeNull();
  });

  it('Companion: Enter twice on the first message is one gate check and one message', async () => {
    invoke.mockImplementation(() => later({ data: { data: { reply: 'A calm reply.', charged: true } }, error: null }));
    mount(<AiCompanionPage />);
    const box = screen.getByLabelText('Ask the companion…');
    fireEvent.change(box, { target: { value: 'Hello' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByText('A calm reply.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-companion-chat')).toHaveLength(1);
  });

  it('Mood letter: "Write my letter" twice is one letter, sent with a request id', async () => {
    invoke.mockImplementation(() => later({ data: { data: { letter: 'Dear you.', dominantTheme: 'rest', careSuggestion: 'walk' } }, error: null }));
    mount(<MoodDiaryPage />);
    fireEvent.click(await screen.findByRole('button', { name: '30-day curve' }));
    const write = await screen.findByRole('button', { name: /Write my letter/ }, { timeout: 3000 });
    fireEvent.click(write);
    fireEvent.click(write);
    await screen.findByText('Dear you.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-mood-letter')).toHaveLength(1);
    expect((callsTo('ai-mood-letter')[0][1] as { body: { requestId: string } }).body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('Soulmate score: "Reveal the score" twice is one comparison, sent with a request id', async () => {
    invoke.mockImplementation(() => later({
      data: { data: { crossAspects: [{ partnerPlanet: 'Venus', natalPlanet: 'Sun', type: 'trine', orb: 1 }], hasTime: false } },
      error: null,
    }));
    const { container } = mount(<SoulmateScorePage />);
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '1990-05-05' } });
    const reveal = screen.getByRole('button', { name: /Reveal the score/ });
    fireEvent.click(reveal);
    fireEvent.click(reveal);
    await screen.findByText('Score another', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('astrology-synastry')).toHaveLength(1);
    expect((callsTo('astrology-synastry')[0][1] as { body: { requestId: string } }).body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('Soulmate portrait: "Paint the portrait" twice is one painting', async () => {
    invoke.mockImplementation(() => later({ data: { data: { image: 'AAAA', imageMime: 'image/jpeg', symbolism: [], caption: 'c' } }, error: null }));
    mount(<SoulmatePortrait />);
    const paint = screen.getByRole('button', { name: /Paint the portrait/ });
    fireEvent.click(paint);
    fireEvent.click(paint);
    await screen.findByRole('button', { name: /Save the image/ }, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-soulmate-portrait')).toHaveLength(1);
  });
});

describe('p8 F37 / O#11 — a paid, unfinished portrait is collected on the score page, without a new score', () => {
  it('the pending card is on the score form, and collecting it sends only the portrait request (same id), never a synastry', async () => {
    const requestId = '33333333-3333-4333-8333-333333333333';
    localStorage.setItem(`arcana:soulmate-portrait:pending:${USER.id}`, JSON.stringify({ requestId, vibe: 'electric', at: Date.now() }));
    invoke.mockImplementation(() => later({ data: { data: { image: 'BBBB', imageMime: 'image/jpeg', symbolism: [], caption: 'c' } }, error: null }));
    mount(<SoulmateScorePage />);
    const collect = await screen.findByRole('button', { name: /Show my portrait/ });
    expect(screen.getByRole('button', { name: /Reveal the score/ })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(collect);
    });
    await screen.findByRole('button', { name: /Save the image/ }, { timeout: 3000 });
    expect(callsTo('astrology-synastry')).toHaveLength(0);
    expect(callsTo('ai-soulmate-portrait')).toHaveLength(1);
    expect((callsTo('ai-soulmate-portrait')[0][1] as { body: { requestId: string; vibe: string } }).body).toEqual({ requestId, vibe: 'electric' });
    // Collecting a paid attempt never re-reads the gate (the balance may now be under the cost).
    expect(gateCalls()).toBe(0);
    expect(localStorage.getItem(`arcana:soulmate-portrait:pending:${USER.id}`)).toBeNull();
  });

  it('with nothing pending the score form shows no portrait card', async () => {
    mount(<SoulmateScorePage />);
    await screen.findByRole('button', { name: /Reveal the score/ });
    expect(screen.queryByRole('button', { name: /Show my portrait|Paint the portrait/ })).toBeNull();
  });
});
