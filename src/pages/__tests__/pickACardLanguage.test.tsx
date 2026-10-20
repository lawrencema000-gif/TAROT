import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * Pick a card read the deck once, in the language on screen when the page
 * opened, so after a switch in Settings the card picked today kept its old
 * name, keywords and meaning — Home's daily card had the same cause (p10
 * d1-en-01). The page reads the deck again in the new language now: the
 * same three cards, the pick kept (a card turning when the language
 * changes still lands), named and read in the language on screen.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000da', email: 'qa@example.com' };
const store = new Map<string, string>();
const motion = vi.hoisted(() => ({ reduced: true }));

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: { card_back_url: null } }) }));
// The deck as the service returns it: localized, at the moment it is read, into the language on screen.
vi.mock('../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../data/tarotDeck');
  const { localizeCards } = await import('../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
vi.mock('../../lib/appStorage', () => ({
  appStorage: {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => void store.set(k, v),
  },
}));
vi.mock('../../utils/haptics', () => ({ flipHaptics: () => () => {} }));
vi.mock('../../utils/shareCard', () => ({ shareOrDownloadCard: async () => 'cancelled' }));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  // One component per tag, kept: a new type on every render would remount the
  // fan on each one, and a card found a moment ago would be gone when tapped.
  const tags = new Map<string, unknown>();
  const m = new Proxy({}, {
    get: (_t, tag: string) => {
      if (!tags.has(tag)) {
        tags.set(tag, forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(function M(props, ref) {
          return createElement(tag, { ...strip(props), ref }, props.children as ReactNode);
        }));
      }
      return tags.get(tag);
    },
  });
  return { motion: m, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>, useReducedMotion: () => motion.reduced };
});

import i18n from '../../i18n/config';
import { fullDeck } from '../../data/tarotDeck';
import { localizeCard } from '../../i18n/localizeCard';
import { drawSeededCards } from '../../utils/cardDraw';
import { PickACardPage } from '../PickACardPage';
import '@testing-library/jest-dom/vitest';

const TODAY = '2026-10-20';
/** Today's three cards for this member, as the page deals them (the seed is the member and the day). */
const OPTIONS = drawSeededCards(3, `${USER.id}_pick_${TODAY}`, fullDeck);
const PICK_KEY = `arcana_pick_${TODAY}`;

function mount() {
  return render(
    <MemoryRouter>
      <PickACardPage />
    </MemoryRouter>,
  );
}

/** The language changes under the page, as the Settings sheet changes it. */
const switchTo = async (lng: 'en' | 'ja' | 'ko' | 'zh') => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

/** The picked card's verdict, name and meaning, as the page must show them in `lng`. */
async function expectPickIn(index: number, lng: 'en' | 'ja' | 'ko' | 'zh') {
  const { card: source, reversed } = OPTIONS[index];
  const card = localizeCard(source, lng);
  expect(await screen.findByRole('heading', { level: 2, name: card.name })).toBeInTheDocument();
  for (const k of card.keywords.slice(0, 3)) expect(screen.getByText(k)).toBeInTheDocument();
  // The fan is face up: each card is named in the language on screen.
  for (const opt of OPTIONS) expect(screen.getByRole('button', { name: localizeCard(opt.card, lng).name })).toBeDisabled();
  expect(JSON.parse(store.get(PICK_KEY)!)).toMatchObject({ index, cardId: source.id, reversed });
  return card;
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 20, 12, 0));
  store.clear();
  motion.reduced = true;
  await switchTo('en');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await switchTo('en');
});

describe('Pick a card follows a language change at once (p10 d1-en-01)', { timeout: 20_000 }, () => {
  it('en → ja → en: the card picked today keeps its place and is named and read in the new language', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Card 1' }));
    const en = await expectPickIn(0, 'en');

    await switchTo('ja');
    const ja = await expectPickIn(0, 'ja');
    expect(ja.name).not.toBe(en.name);
    expect(screen.queryByRole('heading', { level: 2, name: en.name })).toBeNull();
    expect(screen.getByText(i18n.t('app:pickACard.subtitlePicked'))).toBeInTheDocument();

    await switchTo('en');
    await expectPickIn(0, 'en');
    expect(screen.queryByRole('heading', { level: 2, name: ja.name })).toBeNull();
  });

  it('a card still turning when the language changes lands as the pick, in the new language', async () => {
    motion.reduced = false;
    await switchTo('ko');
    mount();
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('app:pickACard.optionAria', { n: 2 }) }));
    // Mid-turn: the two others have not turned yet, nothing is stored.
    expect(store.has(PICK_KEY)).toBe(false);
    await switchTo('zh');
    await waitFor(() => expect(store.has(PICK_KEY)).toBe(true), { timeout: 3000 });
    await expectPickIn(1, 'zh');
  });
});
