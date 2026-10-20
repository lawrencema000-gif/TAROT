import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Journal, driven through the real page (p8):
 *  - F54/F88: arriving from Home's ritual "Write" ({ compose: 'today' })
 *    opens the editor on today's prompt — or today's entry when there is
 *    one — instead of the list;
 *  - F49: "Link a reading" names each reading by its spread, its day and
 *    its cards, in the reader's language — not "three card spread",
 *    "Oct 6 · , …" and a "CAR" tag.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d2', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA Reader', isPremium: false, streak: 0, totalJournalEntries: 0 };

let entries: Record<string, unknown>[] = [];
let readings: Record<string, unknown>[] = [];

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: async () => ({ data: null, error: null }) } } }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE, refreshProfile: async () => {} }) }));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  journalEntries: {
    listForUser: async () => ({ ok: true, data: entries }),
    listInRange: async () => ({ ok: true, data: entries }),
    listForInsights: async () => ({ ok: true, data: entries }),
    insert: async () => ({ ok: true, data: undefined }),
    updateById: async () => ({ ok: true, data: undefined }),
    deleteById: async () => ({ ok: true, data: undefined }),
  },
  tarotReadings: {
    listRecent: async () => ({ ok: true, data: readings }),
  },
}));
vi.mock('../../services/ads', () => ({ adsService: { checkAndShowAd: async () => {} } }));
vi.mock('../../services/levelSystem', () => ({ awardXP: async () => null }));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown> & { children?: ReactNode }>(function M(props, ref) {
      return createElement(tag, { ...strip(props), ref }, props.children as ReactNode);
    }),
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { getDailyPrompt } from '../../data/dailyPrompts';
import { JournalPage } from '../JournalPage';
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

function mount(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/journal', state }]}>
      <Routes>
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const entry = (over: Record<string, unknown>) => ({
  id: 'e1', user_id: USER.id, date: '2026-10-17', title: '', content: 'Already written today.', mood: '', mood_tags: [], tags: [],
  is_locked: false, word_count: 3, created_at: '2026-10-17T01:00:00Z', updated_at: '2026-10-17T01:00:00Z', ...over,
});

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  entries = [];
  readings = [];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Home’s "Write" opens the editor (F54/F88)', () => {
  it('on today’s prompt when nothing is written today', async () => {
    mount({ compose: 'today' });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New entry')).toBeInTheDocument();
    expect(within(dialog).getByText('Today’s prompt')).toBeInTheDocument();
    expect(within(dialog).getByText(getDailyPrompt('2026-10-17'))).toBeInTheDocument();
  });

  it('on today’s entry when there is one, so it is not written twice', async () => {
    entries = [entry({})];
    mount({ compose: 'today' });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit entry')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Already written today.')).toBeInTheDocument();
  });

  it('a plain visit lists the entries', async () => {
    mount();
    expect(await screen.findByRole('button', { name: /Write today/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// created_at at local noon: the picker shows the reader's calendar day, so a
// UTC timestamp would land on another day west of UTC or at UTC+13/+14 (p9 R22).
const localNoon = (y: number, m: number, d: number) => new Date(y, m, d, 12).toISOString();

describe('Link a reading names the readings (F49)', () => {
  it('by spread, day and cards — tarot by id, legacy rows by name, playing cards from their deck', async () => {
    readings = [
      {
        id: 'r1', date: '2026-10-17', spread_type: 'three-card', created_at: localNoon(2026, 9, 17),
        cards: [
          { cardId: 26, cardName: 'Five of Wands', reversed: false, position: 'Past' },
          { cardId: 40, cardName: 'Five of Cups', reversed: true, position: 'Present' },
          { cardId: 21, cardName: 'The World', reversed: false, position: 'Future' },
        ],
      },
      {
        id: 'r2', date: '2026-10-16', spread_type: 'carto-three-timeline', created_at: localNoon(2026, 9, 16),
        cards: [
          { cardId: 108, cardName: 'Nine of Hearts', reversed: false, position: 'Past', deck: 'playing' },
          { cardId: 139, cardName: 'Ace of Spades', reversed: false, position: 'Present', deck: 'playing' },
        ],
      },
      // A row from before ids (cards carry `name`) whose `date` held the UTC day: dated by created_at.
      { id: 'r3', date: '2026-10-10', spread_type: 'three-card', created_at: localNoon(2026, 9, 12), cards: [{ name: 'The Fool' }, { name: 'Wheel of Fortune' }] },
      // No created_at in the list query: the date column.
      { id: 'r4', date: '2026-10-09', spread_type: 'celtic-cross', cards: [{ cardId: 0, cardName: 'The Fool' }] },
    ];
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /Write today/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Link a reading' }));
    const picker = (await screen.findAllByRole('dialog')).at(-1)!;
    const rows = (await within(picker).findAllByRole('button')).map((b) => b.textContent ?? '').filter((s) => s.includes('·'));
    expect(rows).toEqual([
      'Past/Present/FutureOct 17 · Five of Wands, Five of Cups…',
      'Three Cards: Past, Present, FutureOct 16 · Nine of Hearts, Ace of Spades',
      'Past/Present/FutureOct 12 · The Fool, The Wheel of Fortune',
      'Celtic CrossOct 9 · The Fool',
    ]);
    const text = picker.textContent ?? '';
    expect(text).not.toMatch(/three card spread|carto|, …|CAR|III/);
  });
});
