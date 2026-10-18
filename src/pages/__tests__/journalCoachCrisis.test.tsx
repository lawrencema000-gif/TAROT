import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 QS R-4: the journal coach answers an entry about self-harm with
 * `crisis: true` and the member's own lines in its reply (ai-journal-coach,
 * reply.ts). The Journal showed that reply as "An observation" and never
 * opened the crisis banner Community opens. Now it does, over the editor,
 * and the reply stays on screen under it and after it.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d3', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA Reader', isPremium: false, streak: 0, totalJournalEntries: 0 };

let coachReply: Record<string, unknown> | null = null;
const invoked: string[] = [];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: async (name: string) => {
        invoked.push(name);
        return { data: { data: coachReply }, error: null };
      },
    },
  },
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

function mount() {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/journal', state: { compose: 'today' } }]}>
      <Routes>
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const ENTRY = 'I keep thinking everyone would be better off without me.';

/** Open today's editor, write the entry and ask the coach. Returns the editor sheet. */
async function askCoach(labels: { thoughts: string; ask: string }) {
  mount();
  const editor = await screen.findByRole('dialog');
  fireEvent.change(within(editor).getByLabelText(labels.thoughts), { target: { value: ENTRY } });
  fireEvent.click(within(editor).getByRole('button', { name: labels.ask }));
  return editor;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  coachReply = null;
  invoked.length = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the journal coach’s crisis reply (QS R-4)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('opens the crisis banner over the editor and keeps the reply', async () => {
    coachReply = {
      crisis: true,
      observation: 'What you’ve written is serious, and you do not have to carry it alone.',
      prompts: ['Would you be willing to reach out to the 988 Suicide & Crisis Lifeline now?', 'Who is one person who cares about you that you could call or text right now?'],
    };
    const editor = await askCoach({ thoughts: 'Your thoughts', ask: 'Ask the journal coach' });

    const banner = await screen.findByRole('dialog', { name: 'You are not alone' });
    expect(invoked).toEqual(['ai-journal-coach']);
    expect(within(banner).getByRole('link', { name: /Call/ })).toHaveAttribute('href', 'tel:988');
    // The editor and the member's words are still there underneath.
    expect(within(editor).getByLabelText('Your thoughts')).toHaveValue(ENTRY);
    expect(within(editor).getByText(coachReply.observation as string)).toBeInTheDocument();

    fireEvent.click(within(banner).getByRole('button', { name: 'I’m okay for now' }));
    expect(screen.queryByRole('dialog', { name: 'You are not alone' })).not.toBeInTheDocument();
    // The reply stays: its lines are the member's own.
    expect(within(editor).getByText(coachReply.observation as string)).toBeInTheDocument();
    for (const p of coachReply.prompts as string[]) expect(within(editor).getByText(p)).toBeInTheDocument();
  });

  it('Escape closes the banner only: the editor and the entry stay open beneath it', async () => {
    coachReply = { crisis: true, observation: 'What you’ve written is serious.', prompts: ['Who could you call right now?'] };
    const editor = await askCoach({ thoughts: 'Your thoughts', ask: 'Ask the journal coach' });
    await screen.findByRole('dialog', { name: 'You are not alone' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'You are not alone' })).not.toBeInTheDocument();
    expect(editor).toBeInTheDocument();
    expect(within(editor).getByLabelText('Your thoughts')).toHaveValue(ENTRY);
    expect(within(editor).getByText('What you’ve written is serious.')).toBeInTheDocument();
  });

  it('a reply without crisis: true opens nothing', async () => {
    coachReply = { observation: 'There is a tiredness under this.', prompts: ['What would rest look like this week?'] };
    const editor = await askCoach({ thoughts: 'Your thoughts', ask: 'Ask the journal coach' });
    expect(await within(editor).findByText('There is a tiredness under this.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'You are not alone' })).not.toBeInTheDocument();
  });
});

describe('in Japanese', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ja');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('opens the Japanese banner and keeps the Japanese reply', async () => {
    coachReply = {
      crisis: true,
      observation: 'あなたが書いたことはとても深刻で、ひとりで抱える必要はありません。',
      prompts: ['いま連絡できる、あなたを大切に思っている人はいますか？'],
    };
    const editor = await askCoach({ thoughts: 'あなたの思い', ask: 'ジャーナルコーチに聞く' });
    const banner = await screen.findByRole('dialog', { name: 'あなたはひとりではありません' });
    fireEvent.click(within(banner).getByRole('button', { name: '今は大丈夫です' }));
    expect(screen.queryByRole('dialog', { name: 'あなたはひとりではありません' })).not.toBeInTheDocument();
    expect(within(editor).getByText(coachReply.observation as string)).toBeInTheDocument();
    expect(within(editor).getByText((coachReply.prompts as string[])[0])).toBeInTheDocument();
  });
});
