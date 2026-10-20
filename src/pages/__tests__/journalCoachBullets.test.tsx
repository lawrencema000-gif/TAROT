import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p10 d1-en-05: the journal coach's "Sit with these" prompts read
 * "—When you paused…": the violet em dash, about 13 px wide at the list's
 * 13 px text, hung in a 12 px indent (pl-3) and touched the first letter.
 * The indent is in ems now, half an em wider than the dash, so the gap
 * holds at every reading size and in every script.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d7', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA Reader', isPremium: false, streak: 0, totalJournalEntries: 0 };
const REPLY = {
  crisis: false,
  observation: 'You keep coming back to the river.',
  prompts: ['When you paused on the bridge, what were you listening for?', 'What about the river walk felt like yours alone?'],
};

vi.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: async () => ({ data: { data: REPLY }, error: null }) } },
}));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE, refreshProfile: async () => {} }) }));
vi.mock('../../context/GamificationContext', () => ({ useGamification: () => ({ triggerLevelUp: () => {} }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: (flag: string) => flag === 'journal-coach' }));
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
  return { motion, AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>, useReducedMotion: () => true };
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

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 20, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the journal coach’s prompts (p10 d1-en-05)', () => {
  it('each dash bullet sits in an indent half an em wider than itself', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/journal', state: { compose: 'today' } }]}>
        <Routes>
          <Route path="/journal" element={<JournalPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const editor = await screen.findByRole('dialog');
    fireEvent.change(within(editor).getByLabelText('Your thoughts'), { target: { value: 'A long walk by the river after work, and a pause on the bridge.' } });
    fireEvent.click(within(editor).getByRole('button', { name: 'Ask the journal coach' }));

    for (const prompt of REPLY.prompts) {
      const item = (await within(editor).findByText(prompt)).closest('li')!;
      const classes = item.className.split(/\s+/);
      // The dash: an em dash, an em wide, at the start of the indent.
      expect(classes).toContain("before:content-['—']");
      expect(classes).toContain('before:left-0');
      // The indent: in ems, at least 1.5 — the dash and half an em of air.
      const indent = classes.map((c) => /^pl-\[(\d+(?:\.\d+)?)em\]$/.exec(c)).find(Boolean);
      expect(indent, item.className).toBeTruthy();
      expect(Number(indent![1])).toBeGreaterThanOrEqual(1.5);
    }
  });
});
