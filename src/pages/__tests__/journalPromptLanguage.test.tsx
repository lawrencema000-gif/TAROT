import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Journal's "today's prompt" kept the language it was first read in:
 * it was set once, from an effect keyed on the day, so after a switch in
 * Settings the Japanese Journal opened its editor on "What lesson has life
 * been teaching you lately?" and saved that English prompt with the entry —
 * Home's prompt had the same cause (p10 d1-en-01, d3-ko-05). It is read in
 * the language on screen now, at once.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d8', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA Reader', isPremium: false, streak: 0, totalJournalEntries: 0 };
const inserted: Record<string, unknown>[] = [];

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
    insert: async (input: Record<string, unknown>) => {
      inserted.push(input);
      return { ok: true, data: undefined };
    },
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

const TODAY = '2026-10-17';

function mount() {
  return render(
    <MemoryRouter initialEntries={['/journal']}>
      <Routes>
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The language changes under a Journal that stays on screen, as the Settings sheet changes it. */
const switchTo = async (lng: string) => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

/** "Write today", in the language on screen (the one under the search; the empty list offers it too): the editor, on today's prompt. */
async function openToday() {
  fireEvent.click((await screen.findAllByRole('button', { name: new RegExp(i18n.t('app:journal.writeToday')) }))[0]);
  return screen.findByRole('dialog');
}

const closeEditor = (dialog: HTMLElement) =>
  fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('app:journal.editor.cancel', { defaultValue: 'Cancel' }) }));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  inserted.length = 0;
  await switchTo('en');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the Journal’s prompt follows a language change at once', { timeout: 20_000 }, () => {
  it('en → ja → en: the editor shows the day’s prompt in the language on screen, and saves it so', async () => {
    mount();
    let dialog = await openToday();
    const en = getDailyPrompt(TODAY);
    expect(within(dialog).getByText(en)).toBeInTheDocument();
    closeEditor(dialog);

    await switchTo('ja');
    dialog = await openToday();
    const ja = getDailyPrompt(TODAY);
    expect(ja).not.toBe(en);
    expect(within(dialog).getByText(ja)).toBeInTheDocument();
    expect(within(dialog).queryByText(en)).toBeNull();

    // Saved with the entry in the language it was shown in.
    fireEvent.change(within(dialog).getByRole('textbox', { name: i18n.t('app:journal.editSheet.yourThoughts') }), { target: { value: '今日のこと' } });
    fireEvent.click(within(dialog).getByRole('button', { name: i18n.t('app:journal.saveEntry') }));
    await vi.waitFor(() => expect(inserted).toHaveLength(1));
    expect(inserted[0].prompt).toBe(ja);

    // And back: no Japanese left in the English Journal.
    await switchTo('en');
    dialog = await openToday();
    expect(within(dialog).getByText(en)).toBeInTheDocument();
    expect(within(dialog).queryByText(ja)).toBeNull();
  });

  it('ko → zh', async () => {
    await switchTo('ko');
    mount();
    let dialog = await openToday();
    const ko = getDailyPrompt(TODAY);
    expect(within(dialog).getByText(ko)).toBeInTheDocument();
    closeEditor(dialog);

    await switchTo('zh');
    dialog = await openToday();
    expect(within(dialog).getByText(getDailyPrompt(TODAY))).toBeInTheDocument();
    expect(within(dialog).queryByText(ko)).toBeNull();
  });
});
