import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p10 d2-ja-14: the I Ching result numbered the hexagram '第 46' — the label
 * 第, a space, the number, and no 卦 — under the name, on both hexagram
 * glyphs (第 18 for the changing one) and as the share card's subtitle. The
 * number sits inside the language's own template now (iching.hexagramNumber):
 * 第46卦 in Japanese and Chinese, 제46괘 in Korean, Hexagram 46 in English.
 * The ja / ko / zh cases need the p10 'pages' delta merged.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000e4', email: 'qa@example.com' };
const PROFILE = { id: USER.id, displayName: 'QA', birthDate: '1991-03-08', timezone: 'Asia/Tokyo', isPremium: false };

const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 500 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    rpc: async () => ({ data: null, error: null }),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: PROFILE, updateProfile: async () => ({ error: null }), refreshProfile: async () => {} }),
}));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
const share = vi.hoisted(() => ({ card: vi.fn() }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: (data: unknown) => { share.card(data); return Promise.resolve(new Blob(['png'])); },
  shareOrDownload: () => Promise.resolve('shared'),
}));
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
// 7 7 8 9 8 8: hexagram 54 (帰妹), its fourth line changing to 19 (臨).
vi.mock('../../data/ichingHexagrams', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../data/ichingHexagrams')>();
  return { ...mod, castReading: () => mod.castFromLineValues([7, 7, 8, 9, 8, 8])! };
});

import i18n from '../../i18n/config';
import { IChingPage } from '../IChingPage';

/** Cast (with a question, when given) and wait for the reading. */
async function cast(question?: string) {
  const { container } = render(<MemoryRouter><IChingPage /></MemoryRouter>);
  if (question) fireEvent.change(container.querySelector('#iching-question')!, { target: { value: question } });
  vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00'), shouldAdvanceTime: true });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('app:iching.castButton')) }));
  await act(async () => { await vi.advanceTimersByTimeAsync(6500); });
  vi.useRealTimers();
  await screen.findByRole('button', { name: new RegExp(i18n.t('app:iching.share')) }, { timeout: 5000 });
  return container;
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => share.card.mockReset());
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe.each([
  ['ja', '第54卦', '第19卦'],
  ['zh', '第54卦', '第19卦'],
  ['ko', '제54괘', '제19괘'],
  ['en', 'Hexagram 54', 'Hexagram 19'],
] as const)('the hexagram number in %s (d2-ja-14)', (lng, primary, changed) => {
  it(`reads ${primary} under the glyph, on both glyphs (${changed} for the changing one) and on the share card`, async () => {
    await i18n.changeLanguage(lng);
    const container = await cast();
    expect(screen.getByText(primary)).toBeInTheDocument();
    // The header glyph sits in ResultSheet's aria-hidden slot (the eyebrow
    // carries the number in words); its label is held to the same form.
    expect(container.querySelector(`svg[role="img"][aria-label="${primary}"]`)).not.toBeNull();
    expect(screen.getByRole('img', { name: changed })).toBeInTheDocument();
    // The old form — a bare 第 / 제, a space, the number — nowhere.
    expect(container.textContent).not.toMatch(/(第|제) \d/);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('app:iching.share')) }));
    await waitFor(() => expect(share.card).toHaveBeenCalledTimes(1));
    expect(share.card).toHaveBeenCalledWith(expect.objectContaining({ subtitle: primary }));
  });

  it(`with a question, the line under it reads ${primary}`, async () => {
    await i18n.changeLanguage(lng);
    await cast('What should I tend to?');
    // The eyebrow is "Your question", so the number moves to its own line.
    expect(screen.getByText(primary).tagName).toBe('P');
  });
});
