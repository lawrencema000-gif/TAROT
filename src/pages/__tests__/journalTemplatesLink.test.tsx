import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createElement, forwardRef, useState, type ReactNode } from 'react';

/*
 * The header search's "Journal prompts" quick link opens the Journal with
 * `{ tab: 'templates' }` (p10 d3-ko-13), but the Journal read no route state
 * for its tabs: it landed on Entries, from anywhere — and from the Journal
 * itself, where the link does not mount the page again, nothing happened
 * at all but the sheet closing. It opens on Templates now, and the request
 * is spent, so a reload or Back lands on the list as usual.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d9', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA Reader', isPremium: false, streak: 0, totalJournalEntries: 0 };

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: async () => ({ data: null, error: null }) } } }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE, refreshProfile: async () => {} }) }));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  journalEntries: {
    listForUser: async () => ({ ok: true, data: [] }),
    listInRange: async () => ({ ok: true, data: [] }),
    listForInsights: async () => ({ ok: true, data: [] }),
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

/** The header's magnifier, as the app shell opens the real search sheet over the page on screen. */
function HeaderSearch() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open the search</button>
      <SearchSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function mount(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/journal', state }]}>
      <Where />
      <HeaderSearch />
      <Routes>
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const tab = (key: 'entries' | 'templates' | 'insights') => screen.getByRole('tab', { name: i18n.t(`app:journal.tabs.${key}`) });
/** A template row, as the Templates tab lists them (the English corpus here). */
const templateRow = () => screen.findByRole('button', { name: /Morning Intention Setting/ }, { timeout: 3000 });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
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

describe('"Journal prompts" opens the Journal on its Templates tab', { timeout: 20_000 }, () => {
  it('arriving with { tab: "templates" }: Templates is the tab on screen, and the request is spent', async () => {
    mount({ tab: 'templates' });
    expect(tab('templates')).toHaveAttribute('aria-selected', 'true');
    expect(tab('entries')).toHaveAttribute('aria-selected', 'false');
    expect(await templateRow()).toBeInTheDocument();
    // Spent: a reload or Back to this entry lands on the list.
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/journal$/));
    expect(tab('templates')).toHaveAttribute('aria-selected', 'true');
  });

  it('from the Journal itself: the search’s quick link turns the page on screen to Templates and closes the sheet', async () => {
    mount();
    await waitFor(() => expect(tab('entries')).toHaveAttribute('aria-selected', 'true'));
    fireEvent.click(screen.getByRole('button', { name: 'Open the search' }));
    const link = await screen.findByRole('button', { name: i18n.t('app:search.quickLink.journalPrompts') });
    fireEvent.click(link);
    await waitFor(() => expect(tab('templates')).toHaveAttribute('aria-selected', 'true'));
    expect(await templateRow()).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: i18n.t('common:nav.search') })).toBeNull());
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/journal$/));

    // Back on Entries, the same link turns it again.
    fireEvent.click(tab('entries'));
    expect(tab('entries')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Open the search' }));
    fireEvent.click(await screen.findByRole('button', { name: i18n.t('app:search.quickLink.journalPrompts') }));
    await waitFor(() => expect(tab('templates')).toHaveAttribute('aria-selected', 'true'));
  });

  it('a plain visit, or any other state, opens on Entries as before', async () => {
    mount({ compose: 'later' });
    expect(tab('entries')).toHaveAttribute('aria-selected', 'true');
    cleanup();
    mount({ tab: 'nonsense' });
    expect(tab('entries')).toHaveAttribute('aria-selected', 'true');
  });
});
