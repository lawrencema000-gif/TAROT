import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { StrictMode, createElement, forwardRef, useState, type ReactNode } from 'react';

/*
 * A journal result in the header search opens the Journal with
 * `{ entryId }` (p10 d3-ko-13), but the Journal never read it: from another
 * screen it landed on the newest twenty entries, the one tapped neither
 * open nor on screen when it was older; on the Journal itself the tap only
 * closed the sheet. The entry opens now, as a tap in the list opens it (a
 * locked one still asks for Premium) — from the entries the page holds, or
 * read by id — and the request is spent, so a reload or Back lands on the
 * list.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000da', email: 'qa@example.com' };
let premium = false;

/** `yyyy-mm-dd`, `n` days before 17 Oct 2026 (the test's today). */
const daysAgo = (n: number) => {
  const d = new Date(2026, 9, 17 - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Row = Record<string, unknown> & { id: string; user_id: string; date: string; content: string };

/** Forty entries, newest first. Only #30 — older than the page's first twenty — mentions the lighthouse; #3 the harbour. */
function makeEntries(): Row[] {
  return Array.from({ length: 40 }, (_, i) => {
    const n = i + 1;
    return {
      id: `e${n}`, user_id: USER.id, date: daysAgo(i), title: '', content: `Entry ${n}: an ordinary day.`,
      mood: '', mood_tags: [], tags: [], prompt: null, linked_reading_id: null, is_locked: false,
      word_count: 5, created_at: `${daysAgo(i)}T01:00:00Z`, updated_at: `${daysAgo(i)}T01:00:00Z`,
      ...(n === 30 ? { title: 'The lighthouse', content: 'Walked to the lighthouse at dawn and wrote this down.' } : {}),
      ...(n === 3 ? { content: 'Harbour fog all morning.' } : {}),
    };
  });
}

let entries: Row[] = [];
const listForUser = vi.fn(async (_userId: string, { limit, offset = 0 }: { limit: number; offset?: number }) =>
  ({ ok: true, data: entries.slice(offset, offset + limit) }));
const getById = vi.fn(async (id: string, userId: string): Promise<{ ok: true; data: Row | null } | { ok: false; error: string }> =>
  ({ ok: true, data: entries.find((e) => e.id === id && e.user_id === userId) ?? null }));

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: async () => ({ data: null, error: null }) } } }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: USER,
    profile: { displayName: 'QA Reader', isPremium: premium, streak: 0, totalJournalEntries: 40 },
    refreshProfile: async () => {},
  }),
}));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  journalEntries: {
    listForUser: (userId: string, options: { limit: number; offset?: number }) => listForUser(userId, options),
    getById: (id: string, userId: string) => getById(id, userId),
    listInRange: async (_userId: string, from: string, to: string) => ({ ok: true, data: entries.filter((e) => e.date >= from && e.date <= to) }),
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
    LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { ToastContainer } from '../../components/ui';
import { SearchSheet } from '../../components/overlays/SearchSheet';
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

/** Where the router is: the path, and the route state while there is one. */
function Where() {
  const { pathname, state } = useLocation();
  return <output data-testid="where">{`${pathname}${state ? ` ${JSON.stringify(state)}` : ''}`}</output>;
}

/** The header's magnifier, as the app shell opens the real search sheet over the page on screen; and Back. */
function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open the search</button>
      <button type="button" onClick={() => navigate('/')}>Home</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <SearchSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function mount(path: '/' | '/journal') {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Where />
        <Header />
        <Routes>
          <Route path="/" element={<p>Home page</p>} />
          <Route path="/journal" element={<JournalPage />} />
        </Routes>
        <ToastContainer />
      </MemoryRouter>
    </StrictMode>,
  );
}

const WAIT = { timeout: 3000 };
const tab = (key: 'entries' | 'templates' | 'insights') => screen.getByRole('tab', { name: i18n.t(`app:journal.tabs.${key}`) });
const searchDialog = () => screen.findByRole('dialog', { name: i18n.t('common:nav.search') });
const editor = () => screen.queryByRole('dialog', { name: i18n.t('app:journal.editSheet.editEntry') });

/** Opens the header search, types `query` and taps the journal result named `name`. */
async function openFromSearch(query: string, name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Open the search' }));
  const sheet = await searchDialog();
  fireEvent.change(within(sheet).getByRole('searchbox'), { target: { value: query } });
  fireEvent.click((await within(sheet).findByText(name, {}, WAIT)).closest('button')!);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  entries = makeEntries();
  premium = false;
  listForUser.mockClear();
  getById.mockClear();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('a journal result in the header search opens the entry', { timeout: 20_000 }, () => {
  it('from another screen: the Journal opens with the entry in its editor, read by id when the page has not loaded it', async () => {
    mount('/');
    await openFromSearch('lighthouse', 'The lighthouse');

    const open = await screen.findByRole('dialog', { name: i18n.t('app:journal.editSheet.editEntry') }, WAIT);
    expect(within(open).getByDisplayValue('Walked to the lighthouse at dawn and wrote this down.')).toBeInTheDocument();
    expect(within(open).getByDisplayValue('The lighthouse')).toBeInTheDocument();
    expect(getById).toHaveBeenCalledWith('e30', USER.id);
    expect(tab('entries')).toHaveAttribute('aria-selected', 'true');
    // The page itself still lists its first twenty: #30 came by id.
    expect(listForUser).toHaveBeenCalledWith(USER.id, { limit: 20 });

    // Spent: a reload or Back to the Journal lands on the list.
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/journal$/));
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    await screen.findByText('Home page');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Entry 1: an ordinary day.', {}, WAIT)).toBeInTheDocument();
    await act(async () => {});
    expect(editor()).toBeNull();
    expect(getById).toHaveBeenCalledTimes(1);
  });

  it('on the Journal itself, from its Insights tab: it turns to Entries, opens the entry and closes the sheet', async () => {
    mount('/journal');
    await screen.findByText('Entry 1: an ordinary day.', {}, WAIT);
    fireEvent.click(tab('insights'));
    expect(tab('insights')).toHaveAttribute('aria-selected', 'true');

    await openFromSearch('lighthouse', 'The lighthouse');
    const open = await screen.findByRole('dialog', { name: i18n.t('app:journal.editSheet.editEntry') }, WAIT);
    expect(within(open).getByDisplayValue('Walked to the lighthouse at dawn and wrote this down.')).toBeInTheDocument();
    expect(tab('entries')).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: i18n.t('common:nav.search') })).toBeNull());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/journal$/));
  });

  it('an entry the page has loaded opens from what it holds, with no second read', async () => {
    mount('/journal');
    await screen.findByText('Harbour fog all morning.', {}, WAIT);
    await openFromSearch('harbour', 'Harbour fog all morning.');
    const open = await screen.findByRole('dialog', { name: i18n.t('app:journal.editSheet.editEntry') }, WAIT);
    expect(within(open).getByDisplayValue('Harbour fog all morning.')).toBeInTheDocument();
    expect(getById).not.toHaveBeenCalled();
  });

  it('a locked entry asks for Premium, as a tap in the list does; a Premium member reads it', async () => {
    entries = entries.map((e) => (e.id === 'e30' ? { ...e, is_locked: true } : e));
    mount('/');
    await openFromSearch('lighthouse', 'The lighthouse');
    expect(await screen.findByText(i18n.t('app:journal.toast.unlockPremiumLock'), {}, WAIT)).toBeInTheDocument();
    expect(editor()).toBeNull();
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/journal$/));
    cleanup();

    premium = true;
    mount('/');
    await openFromSearch('lighthouse', 'The lighthouse');
    const open = await screen.findByRole('dialog', { name: i18n.t('app:journal.editSheet.editEntry') }, WAIT);
    expect(within(open).getByDisplayValue('Walked to the lighthouse at dawn and wrote this down.')).toBeInTheDocument();
  });

  it('says so when the entry is gone (deleted on another device) or could not be read, and leaves the list', async () => {
    mount('/journal');
    await screen.findByText('Entry 1: an ordinary day.', {}, WAIT);
    getById.mockResolvedValueOnce({ ok: true, data: null });
    await openFromSearch('lighthouse', 'The lighthouse');
    expect(await screen.findByText(i18n.t('common:errors.notFound'), {}, WAIT)).toBeInTheDocument();
    expect(editor()).toBeNull();

    getById.mockResolvedValueOnce({ ok: false, error: 'offline' });
    await openFromSearch('lighthouse', 'The lighthouse');
    expect(await screen.findByText(i18n.t('common:errors.generic'), {}, WAIT)).toBeInTheDocument();
    expect(editor()).toBeNull();
    expect(tab('entries')).toHaveAttribute('aria-selected', 'true');
  });
});
