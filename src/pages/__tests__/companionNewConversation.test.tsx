import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 Q06: a conversation is paid once and covered for 24 hours, kept for the
 * account and restored on return. "New card" (Tarot companion) and "New
 * conversation" (Companion) threw it away with one tap — clearTarotSession /
 * an overwritten persona conversation — with nothing to get it back. Now
 * both ask first, say what the next conversation costs while this one is
 * still paid for, and keep it on "Keep this conversation".
 */

const USER = { id: '00000000-0000-4000-8000-0000000000e6', email: 'qa@example.com' };
const PROFILE: { displayName: string; birthDate: string; isPremium: boolean } = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };

const invoke = vi.fn();
const rpc = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 120 }, error: null });
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
    { id: 4, name: 'The Emperor', arcana: 'major', keywords: ['order'], meaningUpright: 'Structure holds.', meaningReversed: 'Rigid rule.' },
  ],
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

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const PAID_ID = '22222222-2222-4222-8222-222222222222';
const TAROT_KEY = `arcana_tarot_companion_v1:${USER.id}`;
const SAGE_KEY = `arcana_companion_v2:${USER.id}:sage`;
const thread = [
  { role: 'user', content: 'I just drew The Emperor.', timestamp: Date.now() - 31 * 60_000 },
  { role: 'assistant', content: 'Structure is asking for your attention.', timestamp: Date.now() - 30 * 60_000 },
];
/** A conversation bought half an hour ago: covered for the rest of its 24 hours. */
const paidTarotSession = (chargedAt = Date.now() - 30 * 60_000) =>
  JSON.stringify({ cardId: 4, reversed: false, conversation: { conversationId: PAID_ID, messages: thread, chargedAt } });

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
  rpc.mockImplementation(async () => ({ data: null, error: null }));
  PROFILE.isPremium = false;
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('p9 Q06 — Tarot companion: "New card" never throws a paid conversation away with one tap', () => {
  it('asks first, names the price of the next conversation, and "Keep this conversation" keeps it', async () => {
    localStorage.setItem(TAROT_KEY, paidTarotSession());
    mount(<TarotCompanionPage />);
    await screen.findByText('Structure is asking for your attention.');

    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    const dialog = await screen.findByRole('dialog', { name: 'Draw a new card?' });
    expect(dialog.textContent).toContain('Your conversation about The Emperor will close, and you can’t come back to it.');
    expect(dialog.textContent).toContain('which uses 50 Moonstones');
    // Nothing is gone while it asks.
    expect(JSON.parse(localStorage.getItem(TAROT_KEY)!).conversation.conversationId).toBe(PAID_ID);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep this conversation' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Draw a new card?' })).toBeNull());
    expect(screen.getByText('Structure is asking for your attention.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(TAROT_KEY)!).conversation.conversationId).toBe(PAID_ID);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('"Draw a new card" in the sheet is the one way to close it: the session goes and a fresh card is drawn', async () => {
    localStorage.setItem(TAROT_KEY, paidTarotSession());
    mount(<TarotCompanionPage />);
    await screen.findByText('Structure is asking for your attention.');
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    const dialog = await screen.findByRole('dialog', { name: 'Draw a new card?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Draw a new card' }));
    await waitFor(() => expect(screen.queryByText('Structure is asking for your attention.')).toBeNull(), { timeout: 3000 });
    expect(localStorage.getItem(TAROT_KEY)).toBeNull();
    expect(await screen.findByRole('button', { name: /Read this card/ })).toBeInTheDocument();
  });

  it('with no conversation on screen (a card, nothing asked) a new card is drawn at once', async () => {
    mount(<TarotCompanionPage />);
    await screen.findByRole('button', { name: /Read this card/ });
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    expect(screen.queryByRole('dialog', { name: 'Draw a new card?' })).toBeNull();
    await screen.findByText('Drawing…');
  });

  it('Premium pays nothing: it still asks (the conversation closes for good) but names no price', async () => {
    localStorage.setItem(TAROT_KEY, JSON.stringify({
      cardId: 4, reversed: false,
      // a send went out 2 h ago and its reply never came: it may have been paid, so it is kept
      conversation: { conversationId: PAID_ID, messages: thread, pendingSince: Date.now() - 2 * 3_600_000 },
    }));
    PROFILE.isPremium = true;
    mount(<TarotCompanionPage />);
    await screen.findByText('Structure is asking for your attention.');
    fireEvent.click(screen.getByRole('button', { name: 'New card' }));
    const dialog = await screen.findByRole('dialog', { name: 'Draw a new card?' });
    expect(dialog.textContent).toContain('Your conversation about The Emperor will close, and you can’t come back to it.');
    expect(dialog.textContent).not.toMatch(/Moonstones/);
  });

  it('ja: the sheet speaks Japanese', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    try {
      localStorage.setItem(TAROT_KEY, paidTarotSession());
      mount(<TarotCompanionPage />);
      await screen.findByText('Structure is asking for your attention.');
      fireEvent.click(screen.getByRole('button', { name: '新しいカード' }));
      const dialog = await screen.findByRole('dialog', { name: '新しいカードを引きますか？' });
      expect(dialog.textContent).toContain('The Emperorについての会話は終了し、あとから戻ることはできません。');
      expect(dialog.textContent).toContain('ムーンストーン50個を使います。');
      expect(within(dialog).getByRole('button', { name: 'この会話を続ける' })).toBeInTheDocument();
    } finally {
      await act(async () => { await i18n.changeLanguage('en'); });
    }
  });
});

describe('p9 Q06 — Companion: "New conversation" asks before it replaces the persona’s conversation', () => {
  it('asks, keeps it on "Keep this conversation", and replaces it only from the sheet', async () => {
    localStorage.setItem(SAGE_KEY, JSON.stringify({ conversationId: PAID_ID, messages: thread, chargedAt: Date.now() - 30 * 60_000 }));
    mount(<AiCompanionPage />);
    await screen.findByText('Structure is asking for your attention.');

    fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    let dialog = await screen.findByRole('dialog', { name: 'Start a new conversation?' });
    expect(dialog.textContent).toContain('This conversation will close, and you can’t come back to it.');
    expect(dialog.textContent).toContain('which uses 50 Moonstones');
    expect(JSON.parse(localStorage.getItem(SAGE_KEY)!).conversationId).toBe(PAID_ID);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep this conversation' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Start a new conversation?' })).toBeNull());
    expect(screen.getByText('Structure is asking for your attention.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(SAGE_KEY)!).conversationId).toBe(PAID_ID);

    fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));
    dialog = await screen.findByRole('dialog', { name: 'Start a new conversation?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Start a new conversation' }));
    await waitFor(() => expect(screen.queryByText('Structure is asking for your attention.')).toBeNull());
    const saved = JSON.parse(localStorage.getItem(SAGE_KEY)!);
    expect(saved.conversationId).not.toBe(PAID_ID);
    expect(saved.messages).toEqual([]);
  });
});

/*
 * p9 Q11: after the first reply the card, the 50vh reply box and the
 * composer were taller than the screen, so the follow-up box sat under the
 * fixed bottom nav (input top 810 px, nav top 749 px at 390 × 844) until the
 * page was scrolled. jsdom lays nothing out; what decides it is checked: the
 * composer (and the price line beside it) is a sticky dock whose offset is
 * the shell's own clearance for the nav (.pb-nav), it drops to the bottom
 * edge when the keyboard hides the nav, it has a fill, and nothing between
 * it and the page clips it (an overflow ancestor would make sticky inert).
 */
describe('p9 Q11 — the Tarot companion composer is never under the nav', () => {
  const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8');
  const navClearance = /\.pb-nav\s*\{\s*padding-bottom:\s*([^;]+);/.exec(css)![1].replace(/\s+/g, '');

  it('the input, Send and the price ride in a sticky dock offset by the nav’s clearance', async () => {
    // Not covered (a send whose reply never came), so the price line shows too.
    localStorage.setItem(TAROT_KEY, JSON.stringify({
      cardId: 4, reversed: false,
      conversation: { conversationId: PAID_ID, messages: thread, pendingSince: Date.now() - 60_000 },
    }));
    const { container } = mount(<TarotCompanionPage />);
    await screen.findByText('Structure is asking for your attention.');
    const input = screen.getByPlaceholderText('Ask a follow-up…');
    const dock = input.closest('.sticky') as HTMLElement;
    expect(dock).toBeTruthy();
    const c = dock.className.split(/\s+/);
    const bottom = c.find((k) => k.startsWith('bottom-['))!;
    expect(bottom.slice('bottom-['.length, -1).replace(/_/g, '')).toBe(navClearance);
    expect(c).toContain('[body.keyboard-open_&]:bottom-0');
    expect(c).toContain('bg-mystic-850');
    expect(within(dock).getByRole('button', { name: 'Send' })).toBeInTheDocument();
    expect(dock.textContent).toMatch(/A conversation uses 50 Moonstones/);
    for (let el = dock.parentElement; el && el !== container; el = el.parentElement) {
      expect(el.className, 'an ancestor that clips makes sticky inert').not.toMatch(/\boverflow-(?:hidden|auto|scroll|x-|y-|clip)/);
    }
    // The input can shrink in a narrow row (a text input keeps ~150 px as a flex item otherwise).
    expect(input.className.split(/\s+/)).toEqual(expect.arrayContaining(['flex-1', 'min-w-0']));
  });
});
