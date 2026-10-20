import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Journal's personal insight named a winner even where there was none.
 * It took the first of the weekdays, moods and themes counted most, so a
 * journal kept on six different days, with three moods logged twice each,
 * read "You write most often on Monday. Your most common mood is Happy
 * (2 of 6 entries), and you return to Love more than any other theme." —
 * three claims, none of them true: the mood curve's tie (p10 d3-ko-04) in
 * another sentence. A tie now makes no claim, by the rule of the mood
 * diary's dominant(): the weekday and the theme are left out, and the
 * moods are said to be mixed. A single winner is still named.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d7', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA Reader', isPremium: false, streak: 0, totalJournalEntries: 0 };

let entries: Record<string, unknown>[] = [];

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
  tarotReadings: { listRecent: async () => ({ ok: true, data: [] }) },
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

let n = 0;
/** An entry on `date` (a local calendar day) with a mood and tags. */
const entry = (date: string, mood: string, tags: string[] = []) => ({
  id: `e${++n}`, user_id: USER.id, date, title: '', content: 'A few words for the day.', mood, mood_tags: mood ? [mood] : [], tags,
  is_locked: false, word_count: 6, created_at: `${date}T09:00:00Z`, updated_at: `${date}T09:00:00Z`,
});

/**
 * The QA shape: six entries on six different days (Mon 12 – Sat 17 Oct),
 * Happy, Calm and Tired twice each, Love and Growth twice each. Nothing
 * comes first in any of the three.
 */
const ALL_TIED = () => [
  entry('2026-10-12', 'happy', ['love']),
  entry('2026-10-13', 'calm', ['growth']),
  entry('2026-10-14', 'happy'),
  entry('2026-10-15', 'calm', ['love']),
  entry('2026-10-16', 'tired', ['growth']),
  entry('2026-10-17', 'tired'),
];

/** One weekday (Monday, twice), one mood (Calm, 3 of 5) and one theme (Love, 3×) each come first alone. */
const ALL_SINGLE = () => [
  entry('2026-10-05', 'calm', ['love']),
  entry('2026-10-12', 'calm', ['love']),
  entry('2026-10-13', 'happy', ['growth']),
  entry('2026-10-14', 'calm', ['love']),
  entry('2026-10-16', 'tired'),
];

/** Monday comes first and so does Love; Happy and Calm are logged twice each (a fifth entry has no mood). */
const MOOD_TIED = () => [
  entry('2026-10-05', 'calm', ['love']),
  entry('2026-10-12', 'happy', ['love']),
  entry('2026-10-13', 'happy'),
  entry('2026-10-14', 'calm', ['growth']),
  entry('2026-10-15', ''),
];

function mount() {
  return render(
    <MemoryRouter initialEntries={['/journal']}>
      <Routes>
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const inLanguage = async (lng: string) => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

/** The Insights tab's personal insight, once the entries are in and it says `expected`. */
async function insightReads(expected: string) {
  fireEvent.click(await screen.findByRole('tab', { name: i18n.t('app:journal.tabs.insights') }));
  const heading = await screen.findByRole('heading', { name: i18n.t('app:journal.personalInsight') });
  const paragraph = heading.closest('section')!.querySelector('p')!;
  await waitFor(() => expect(paragraph.textContent).toBe(expected));
  return paragraph.textContent ?? '';
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  entries = [];
  await inLanguage('en');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the Journal’s insight names no winner on a tie', { timeout: 20_000 }, () => {
  it('six days, three moods twice each, two themes twice each: no day, mood or theme is named', async () => {
    entries = ALL_TIED();
    mount();
    const text = await insightReads('Your moods are mixed — no single one comes up most often.');
    expect(text).not.toMatch(/most often on|most common mood is|more than any other theme/);
    for (const name of ['Monday', 'Happy', 'Love']) expect(text).not.toContain(name);
  });

  it('a mood tie with a busiest day and a top theme: the day and the theme are named, the moods are mixed', async () => {
    entries = MOOD_TIED();
    mount();
    await insightReads(
      'You write most often on Monday. Your moods are mixed — no single one comes up most often. You return to Love more than any other theme.',
    );
  });

  it('a single winner in each is still named, with its count', async () => {
    entries = ALL_SINGLE();
    mount();
    await insightReads('You write most often on Monday. Your most common mood is Calm (3 of 5 entries). You return to Love more than any other theme.');
  });

  it('too few entries still says so, as before', async () => {
    entries = ALL_TIED().slice(0, 4);
    mount();
    await insightReads('Write a few more entries — a pattern shows here once there are five with more than one mood or theme.');
  });
});

/*
 * Each language says it in its own words (the locale delta of this fix):
 * the tie as a sentence of its own, and a single winner's three sentences
 * set as the script sets them — run on after 。 in ja and zh, a space after
 * the full stop in ko.
 */
describe.each([
  ['ja', '気分はまちまちで、特に多いものはありません。', 'あなたがいちばんよく書くのは月曜日です。最も多い気分は「穏やか」です（5件中3件）。ほかのどのテーマよりも「恋愛」に立ち返っています。'],
  ['ko', '기분이 고루 섞여 있어요 — 특별히 자주 기록한 기분은 없어요.', '월요일에 가장 자주 써요. 가장 자주 기록한 기분은 차분함, 전체 5개 중 3개예요. 다른 어떤 주제보다 사랑 이야기로 자주 돌아와요.'],
  ['zh', '你的心情多种多样，没有哪一种特别突出。', '你最常在星期一写日记。你最常见的心情是平静（5 条中有 3 条）。爱情是你最常回到的主题。'],
])('%s', (lng, tie, single) => {
  it('a tie names nothing; the moods are mixed', { timeout: 20_000 }, async () => {
    await inLanguage(lng);
    entries = ALL_TIED();
    mount();
    await insightReads(tie);
  });

  it('single winners: the day, the mood and the theme, one sentence each', { timeout: 20_000 }, async () => {
    await inLanguage(lng);
    entries = ALL_SINGLE();
    mount();
    await insightReads(single);
  });
});
