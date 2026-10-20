import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Tarot companion holds the card it drew as it was read from the deck,
 * in the language on screen at the time. After a switch in Settings the
 * card kept its old name and meaning until a new one was drawn — Home's
 * daily card had the same cause (p10 d1-en-01) — and drawing again is no
 * fix here: a new card is a new conversation, and the one on screen may be
 * paid for. The same card is put back by id in the new language now: the
 * orientation and the conversation stay, nothing is drawn or sent.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000dc', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', isPremium: false };

const invoke = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 120 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: async () => ({ data: null, error: null }),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
// The deck as the service returns it: localized, at the moment it is read, into the language on screen.
vi.mock('../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../data/tarotDeck');
  const { localizeCards } = await import('../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
// A new card is The Emperor, reversed; each draw is counted.
const draws = vi.fn();
vi.mock('../../utils/cardDraw', () => ({
  drawSeededCards: (_n: number, seed: string, cards: Array<{ id: number }>) => {
    draws(seed);
    return [{ card: cards.find((c) => c.id === 4), reversed: true }];
  },
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
import { fullDeck } from '../../data/tarotDeck';
import { localizeCard } from '../../i18n/localizeCard';
import { TarotCompanionPage } from '../TarotCompanionPage';
import '@testing-library/jest-dom/vitest';

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

const EMPEROR = fullDeck.find((c) => c.id === 4)!;
const PAID_ID = '33333333-3333-4333-8333-333333333333';
const TAROT_KEY = `arcana_tarot_companion_v1:${USER.id}`;
const thread = [
  { role: 'user', content: 'I just drew The Emperor.', timestamp: Date.now() - 31 * 60_000 },
  { role: 'assistant', content: 'Structure is asking for your attention.', timestamp: Date.now() - 30 * 60_000 },
];

/** The language changes under the page, as the Settings sheet changes it. */
const switchTo = async (lng: 'en' | 'ja' | 'ko' | 'zh') => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

/** The card on screen, as it must read in `lng`: its name, and its meaning for the orientation it was drawn in. */
async function expectCardIn(lng: 'en' | 'ja' | 'ko' | 'zh', reversed: boolean) {
  const card = localizeCard(EMPEROR, lng);
  expect(await screen.findByRole('heading', { level: 2, name: card.name }, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByText(reversed ? card.meaningReversed : card.meaningUpright)).toBeInTheDocument();
  return card;
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(async () => {
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  invoke.mockReset();
  draws.mockReset();
  await switchTo('en');
});
afterEach(() => cleanup());
afterAll(async () => {
  await switchTo('en');
});

describe('the Tarot companion’s card follows a language change at once (p10 d1-en-01)', { timeout: 20_000 }, () => {
  it('a conversation on screen: the same card, upright as drawn, in Japanese — the conversation kept, nothing drawn or sent', async () => {
    localStorage.setItem(TAROT_KEY, JSON.stringify({ cardId: 4, reversed: false, conversation: { conversationId: PAID_ID, messages: thread, chargedAt: Date.now() - 30 * 60_000 } }));
    render(<MemoryRouter><TarotCompanionPage /></MemoryRouter>);
    const en = await expectCardIn('en', false);
    await screen.findByText('Structure is asking for your attention.');

    await switchTo('ja');
    const ja = await expectCardIn('ja', false);
    expect(ja.name).not.toBe(en.name);
    expect(screen.queryByRole('heading', { level: 2, name: en.name })).toBeNull();
    expect(screen.getByText('Structure is asking for your attention.')).toBeInTheDocument();
    expect(draws).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(TAROT_KEY)!)).toMatchObject({ cardId: 4, reversed: false, conversation: { conversationId: PAID_ID } });
  });

  it('a card just drawn: the same card in the new language, not a second draw', async () => {
    render(<MemoryRouter><TarotCompanionPage /></MemoryRouter>);
    await expectCardIn('en', true);
    expect(draws).toHaveBeenCalledTimes(1);

    await switchTo('zh');
    await expectCardIn('zh', true);
    await switchTo('ko');
    await expectCardIn('ko', true);
    expect(draws).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: i18n.t('app:tarotCompanion.readCta') })).toBeEnabled();
  });
});
