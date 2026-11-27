import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * A member's own journal entries always open (WP-P0-07, premium-18 and
 * gap-3-23). Locking a new entry is Premium-only, but an entry locked while
 * Premium used to stop opening when Premium ended: every tap only showed
 * "Unlock premium to view locked entries" (in Korean even an instruction to
 * cancel Premium), so the member could no longer read, edit, unlock or
 * delete it. Now every member opens it, sees "Save and unlock" and "Delete
 * this entry"; "Save and lock" is offered only to Premium, on unlocked
 * entries; and "Save this entry" keeps the lock as it was (D03 B: the lock
 * is a label, not a passcode).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d7', email: 'qa@example.com' };
let premium = false;

let entries: Record<string, unknown>[] = [];
const updateById = vi.fn(async (_id: string, _input: Record<string, unknown>) => ({ ok: true, data: undefined }));
const deleteById = vi.fn(async (_id: string, _userId: string) => ({ ok: true, data: undefined }));

vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: async () => ({ data: null, error: null }) } } }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: USER,
    profile: { displayName: 'QA Reader', isPremium: premium, streak: 0, totalJournalEntries: 2 },
    refreshProfile: async () => {},
  }),
}));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../dal', () => ({
  journalEntries: {
    listForUser: async () => ({ ok: true, data: entries }),
    listInRange: async () => ({ ok: true, data: entries }),
    listForInsights: async () => ({ ok: true, data: entries }),
    insert: async () => ({ ok: true, data: undefined }),
    updateById: (id: string, input: Record<string, unknown>) => updateById(id, input),
    deleteById: (id: string, userId: string) => deleteById(id, userId),
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
      <ToastContainer />
    </MemoryRouter>,
  );
}

const entry = (over: Record<string, unknown>) => ({
  id: 'e1', user_id: USER.id, date: '2026-10-17', title: '', content: 'Already written today.', mood: '', mood_tags: [], tags: [],
  prompt: null, linked_reading_id: null, is_locked: false, word_count: 3,
  created_at: '2026-10-17T01:00:00Z', updated_at: '2026-10-17T01:00:00Z', ...over,
});

const LOCKED_TEXT = 'Words I locked while Premium.';
const LOCK_OUT = 'Unlock premium to view locked entries';
const WAIT = { timeout: 3000 };

const editorDialog = () => screen.findByRole('dialog', { name: 'Edit entry' }, WAIT);
const button = (scope: HTMLElement, name: string) => within(scope).queryByRole('button', { name });

/** Taps the list row titled `title` and returns the editor it opens. */
async function tapRow(title: string) {
  fireEvent.click(await screen.findByText(title, {}, WAIT));
  return editorDialog();
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  entries = [
    entry({ id: 'e1', date: '2026-10-17', title: 'Locked thoughts', content: LOCKED_TEXT, is_locked: true }),
    entry({
      id: 'e2', date: '2026-10-16', title: 'Open thoughts', content: 'An ordinary unlocked day.',
      created_at: '2026-10-16T01:00:00Z', updated_at: '2026-10-16T01:00:00Z',
    }),
  ];
  premium = false;
  updateById.mockClear();
  deleteById.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('a member whose Premium ended opens their locked entries', { timeout: 20_000 }, () => {
  it('a tap in the list opens the locked entry with its full text, and the lock-out toast never appears', async () => {
    mount();
    const dialog = await tapRow('Locked thoughts');
    expect(within(dialog).getByDisplayValue(LOCKED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(LOCK_OUT)).toBeNull();
  });

  it('offers "Save and unlock" and no "Save and lock"; "Save and unlock" clears the lock', async () => {
    mount();
    const dialog = await tapRow('Locked thoughts');
    expect(button(dialog, 'Save and lock')).toBeNull();
    fireEvent.click(button(dialog, 'Save and unlock')!);
    await waitFor(() => expect(updateById).toHaveBeenCalledWith('e1', expect.objectContaining({ isLocked: false })));
    expect(await screen.findByText('Entry saved and unlocked', {}, WAIT)).toBeInTheDocument();
  });

  it('"Save this entry" keeps the entry locked', async () => {
    mount();
    const dialog = await tapRow('Locked thoughts');
    fireEvent.click(button(dialog, 'Save this entry')!);
    await waitFor(() => expect(updateById).toHaveBeenCalledWith('e1', expect.objectContaining({ isLocked: true })));
  });

  it('"Delete this entry", then "Delete", deletes it', async () => {
    mount();
    const dialog = await tapRow('Locked thoughts');
    fireEvent.click(button(dialog, 'Delete this entry')!);
    const confirm = await screen.findByRole('dialog', { name: 'Delete this entry?' }, WAIT);
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteById).toHaveBeenCalledWith('e1', USER.id));
  });

  it('Home’s "Write" ({ compose: "today" }) opens the editor on today’s locked entry', async () => {
    mount({ compose: 'today' });
    const dialog = await editorDialog();
    expect(within(dialog).getByDisplayValue(LOCKED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(LOCK_OUT)).toBeNull();
  });

  it('"Write today" and today in the week strip open it too', async () => {
    mount();
    await screen.findByText('Locked thoughts', {}, WAIT);
    const today = screen.getAllByRole('button').find((b) => b.getAttribute('aria-current') === 'date')!;
    fireEvent.click(today);
    let dialog = await editorDialog();
    expect(within(dialog).getByDisplayValue(LOCKED_TEXT)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit entry' })).toBeNull());

    // The gold button above the list writes today, or opens today's entry.
    const gold = screen.getAllByRole('button').find((b) => b.className.includes('gold') && b.closest('[role="dialog"]') === null
      && /today/i.test(b.textContent ?? ''))!;
    fireEvent.click(gold);
    dialog = await editorDialog();
    expect(within(dialog).getByDisplayValue(LOCKED_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(LOCK_OUT)).toBeNull();
  });

  it('on an unlocked entry neither "Save and lock" nor "Save and unlock" shows', async () => {
    mount();
    const dialog = await tapRow('Open thoughts');
    expect(button(dialog, 'Save and lock')).toBeNull();
    expect(button(dialog, 'Save and unlock')).toBeNull();
    expect(button(dialog, 'Delete this entry')).not.toBeNull();
  });
});

describe('a Premium member', { timeout: 20_000 }, () => {
  it('locks an unlocked entry, and unlocks a locked one', async () => {
    premium = true;
    mount();
    let dialog = await tapRow('Open thoughts');
    expect(button(dialog, 'Save and lock')).not.toBeNull();
    expect(button(dialog, 'Save and unlock')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit entry' })).toBeNull());

    dialog = await tapRow('Locked thoughts');
    expect(button(dialog, 'Save and unlock')).not.toBeNull();
    expect(button(dialog, 'Save and lock')).toBeNull();
  });
});
