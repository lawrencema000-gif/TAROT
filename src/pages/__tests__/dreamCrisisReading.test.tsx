import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 QZ-1: ai-dream-interpret answers a dream told with self-harm or suicide
 * in it with the app's crisis reading (supabase/functions/ai-dream-interpret/
 * reply.ts), not "988 in the US" from the model. The page is unchanged, so
 * the reading must come in the shape it already draws: here the function's
 * own Japanese reading goes through the real page, which shows the Japanese
 * lines as a reading — not the symbol dictionary and its "Try again".
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f7', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', birthTime: '06:45', isPremium: false };

const invoke = vi.fn();
const rpc = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 100 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: (...a: unknown[]) => rpc(...a),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void layout; void variants;
    return rest;
  };
  const motion = new Proxy({}, {
    get: (_t, tag: string) => forwardRef<HTMLElement, Record<string, unknown>>(function M(props, ref) {
      const { children, ...rest } = props as { children?: ReactNode } & Record<string, unknown>;
      return createElement(tag, { ...strip(rest), ref }, children);
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
import { DreamInterpreterPage } from '../DreamInterpreterPage';
import { CRISIS_LINES } from '../../../supabase/functions/_shared/crisis';
import { dreamCrisis, dreamCrisisReading } from '../../../supabase/functions/ai-dream-interpret/reply';

const later = <T,>(value: T, ms = 20) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 100, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });

const DREAM_JA = '夢の中で暗い海辺に立っていて、家に帰る道が見つかりませんでした。目が覚めてからも、もう消えたいと思っています。';

beforeAll(async () => {
  await i18n.changeLanguage('ja');
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});
afterEach(() => cleanup());

describe('the Dream Interpreter’s crisis reading on the page (p9 QZ-1)', () => {
  it('ja: the function’s reading is drawn as a reading, with the Japanese lines and no US number', async () => {
    expect(dreamCrisis(DREAM_JA)).toBe(true);
    rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
    invoke.mockImplementation(() => later({ data: { data: dreamCrisisReading('ja') }, error: null }));

    const { container } = render(<MemoryRouter><DreamInterpreterPage /></MemoryRouter>);
    fireEvent.change(container.querySelector('#dream-text')!, { target: { value: DREAM_JA } });
    fireEvent.click(screen.getByRole('button', { name: /夢を読み解く/ }));

    await screen.findByRole('button', { name: /別の夢を読み解く/ }, { timeout: 3000 });
    const page = container.textContent ?? '';
    const lines = CRISIS_LINES.ja;
    expect(page).toContain('ひとりで抱える必要はありません');
    expect(page).toContain(lines.phone.title);
    expect(page).toContain(lines.phone.number);
    expect(page).toContain(lines.text.number);
    expect(page).toContain(lines.footer);
    expect(page).toContain('findahelpline.com');
    // The two sections the page always draws hold the person to reach.
    expect(page).toContain('いま連絡できる、あなたを大切に思っている人はいますか？');
    expect(page).toContain('今日、あなたを大切に思っている人に、電話かメッセージで連絡してみてください。');
    expect(page).not.toMatch(/988|741741|in the US/);
    // Not the symbol dictionary standing in for a lost answer.
    expect(screen.queryByRole('button', { name: 'もう一度試す' })).toBeNull();
    expect(page).not.toContain('象徴辞典をもとにしています');
    expect(invoke).toHaveBeenCalledTimes(1);
    // The crisis banner opens over the reply (p9 QZ request a), with nothing
    // to share and no "shadow question" heading on a caring question.
    expect(screen.getAllByRole('dialog').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /この解釈をシェア/ })).toBeNull();
    expect(page).not.toContain('シャドウへの問い');
  });
});
