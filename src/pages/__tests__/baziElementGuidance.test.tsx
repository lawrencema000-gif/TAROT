import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * WP-P2-12 (premium-02): the Bazi "Element guidance" lines named the wrong
 * element in all four languages — the weak element's child instead of its
 * producer, and what the excess controls instead of what controls it. The page
 * is driven through its real form: type the birth, press cast, read the lines.
 * Mocks as in baziLocalized.test.tsx.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000c9', email: 'qa@example.com' };
const PROFILE = { id: USER.id, displayName: 'QA', birthDate: null, birthTime: null, isPremium: true };

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    rpc: vi.fn(),
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: PROFILE, updateProfile: async () => ({ error: null }), refreshProfile: async () => {} }),
}));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => true }));
vi.mock('../../components/premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn(), logWarn: vi.fn() }));
vi.mock('../../utils/shareableResultCard', () => ({
  renderShareCard: () => Promise.resolve(new Blob(['png'])),
  shareOrDownload: () => Promise.resolve('shared'),
}));
const ai = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock('../../services/baziInterpret', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../services/baziInterpret')>();
  return { ...real, generateBaziReading: (...a: unknown[]) => ai.generate(...a) };
});
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
import { BaziPage } from '../BaziPage';

type Lng = 'en' | 'ja' | 'ko' | 'zh';
const CAST: Record<Lng, string> = { en: 'Cast the four pillars', zh: '起四柱', ko: '사주 뽑기', ja: '四柱を立てる' };

async function cast(lng: Lng, date: string, time: string): Promise<string> {
  await i18n.changeLanguage(lng);
  const { container } = render(<MemoryRouter><BaziPage /></MemoryRouter>);
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: date } });
  fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: time } });
  fireEvent.click(screen.getByRole('button', { name: CAST[lng] }));
  // Wait for the chart (its Day Master heading) to render.
  await waitFor(() => expect(container.querySelector('article h1')).not.toBeNull(), { timeout: 5000 });
  return container.textContent ?? '';
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  ai.generate.mockReset();
  ai.generate.mockReturnValue(new Promise(() => {}));
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Bazi element guidance names the right element', () => {
  describe('1991-03-08 06:45 — weak Fire, fed by Wood', () => {
    it('en', async () => {
      const text = await cast('en', '1991-03-08', '06:45');
      expect(text).toContain('To build Fire, surround yourself with Wood (which produces Fire).');
      expect(text).not.toContain('with Earth (which produces Fire)');
    });
    it('zh', async () => {
      expect(await cast('zh', '1991-03-08', '06:45')).toContain('要增强火，多接触木（它生火）。');
    });
    it('ja', async () => {
      expect(await cast('ja', '1991-03-08', '06:45')).toContain('火を育てるには、火を生む木を身のまわりに置いてください。');
    });
    it('ko', async () => {
      expect(await cast('ko', '1991-03-08', '06:45')).toContain('화를 키우려면 화를 낳는 목을 곁에 두세요.');
    });
  });

  describe('1985-02-04 10:00 — excess Earth, controlled by Wood; weak Metal fed by Earth', () => {
    it('en', async () => {
      const text = await cast('en', '1985-02-04', '10:00');
      expect(text).toContain('balance with Wood (which controls Earth).');
      expect(text).toContain('To build Metal, surround yourself with Earth (which produces Metal).');
    });
    it('zh', async () => {
      expect(await cast('zh', '1985-02-04', '10:00')).toContain('并用木来平衡（它克土）。');
    });
    it('ja', async () => {
      expect(await cast('ja', '1985-02-04', '10:00')).toContain('土を制する木でバランスをとってください。');
    });
    it('ko', async () => {
      expect(await cast('ko', '1985-02-04', '10:00')).toContain('토를 다스리는 목으로 균형을 잡으세요.');
    });
  });
});
