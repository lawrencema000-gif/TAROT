import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * Journal templates in the reader's language (Q21). In zh and ko all twenty
 * templates were English — "Morning Intention Setting · 每日 · 5 MIN · 5 条提示语
 * · Start your day with clarity…" — and picking one titled the entry, walked
 * the prompts and saved the prompt in English.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d3', email: 'qa@example.com' };
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
import { JournalPage } from '../JournalPage';
import { journalTemplates } from '../../data/journalTemplates';
import '@testing-library/jest-dom/vitest';

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
    <MemoryRouter initialEntries={['/journal']}>
      <Routes>
        <Route path="/journal" element={<JournalPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The English a template row or the editor could show. */
const ENGLISH = journalTemplates.flatMap((t) => [t.title, t.description, ...t.prompts]);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 17, 10, 0));
  vi.stubGlobal('localStorage', memoryStorage());
  Object.defineProperty(window, 'localStorage', { value: globalThis.localStorage, configurable: true });
  inserted.length = 0;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('journal templates in Chinese — the QA scenario', { timeout: 20_000 }, () => {
  it('lists, opens, walks and saves a template in Chinese', async () => {
    await i18n.changeLanguage('zh');
    mount();
    fireEvent.click(await screen.findByRole('tab', { name: '模板' }));

    const row = await screen.findByRole('button', { name: /晨间意图设定/ });
    expect(row).toHaveTextContent('每日 · 5 分钟 · 5 条提示语');
    expect(row).toHaveTextContent('设定意图，带着清晰与目标开启新的一天。');
    const listText = document.body.textContent ?? '';
    for (const en of ENGLISH) expect(listText.includes(en), en).toBe(false);
    expect(listText).not.toMatch(/\d+ min\b/);

    fireEvent.click(row);
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getAllByText('晨间意图设定').length).toBeGreaterThan(0);
    expect(within(sheet).getByText('今天你最想完成的一件事是什么？')).toBeInTheDocument();
    expect(within(sheet).getByDisplayValue('晨间意图设定')).toBeInTheDocument();

    // The second prompt, then save: the entry keeps the Chinese title and prompt.
    fireEvent.click(within(sheet).getByRole('button', { name: /下一条/ }));
    expect(within(sheet).getByText('今天结束时，你希望自己有什么样的感受？')).toBeInTheDocument();
    fireEvent.change(within(sheet).getByRole('textbox', { name: '你的想法' }), { target: { value: '写点什么' } });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存这条日记' }));
    await vi.waitFor(() => expect(inserted).toHaveLength(1));
    expect(inserted[0].title).toBe('晨间意图设定');
    expect(String(inserted[0].prompt)).toMatch(/^晨间意图设定: 今天你最想完成的一件事是什么？ \| 今天结束时/);
    for (const en of journalTemplates[0].prompts) expect(String(inserted[0].prompt)).not.toContain(en);
  });
});

describe.each([
  ['ja', 'テンプレート', '朝の意図を決める', 'デイリー · 5分 · プロンプト5件'],
  ['ko', '템플릿', '아침 의도 세우기', '데일리 · 5분 · 프롬프트 5개'],
])('journal templates in %s', (lng, tab, title, meta) => {
  it('lists the templates in the reader’s language', async () => {
    await i18n.changeLanguage(lng);
    mount();
    fireEvent.click(await screen.findByRole('tab', { name: tab }));
    const row = await screen.findByRole('button', { name: new RegExp(title) });
    expect(row).toHaveTextContent(meta);
    const text = document.body.textContent ?? '';
    for (const en of ENGLISH) expect(text.includes(en), en).toBe(false);
  });
});
