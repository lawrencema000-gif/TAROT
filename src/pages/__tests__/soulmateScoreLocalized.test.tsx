import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Soulmate score, as the p10 QA account read it in Korean.
 *
 *  - d3-ko-01: the aspect rows named the planets in English beside Korean
 *    aspect names: "Venus Venus 육분", "Mars Sun 대립".
 *  - d3-ko-11: the eyebrows above the fields were not their labels. The name
 *    field was announced by its placeholder (선택 사항) and the date and time
 *    fields by nothing at all.
 *  - d2-ja-08: "Share score" sent friends to arcana.app, which is not the
 *    app, in every language. The link is the app's own page, last in the
 *    text, never written against a word ("arcana.app에서").
 *
 * The share cases read the locale files, so they need the p10 'pages' delta
 * (soulmate.shareText with {{url}}) merged.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d3', email: 'qa@example.com' };
const PROFILE = { displayName: 'QA', birthDate: '1991-03-08', birthLat: 37.57, birthLon: 126.98, birthTime: '06:45', isPremium: false };

const invoke = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 500 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: async (name: string) => (name === 'action_gate_status'
      ? { data: [{ allowed: true, balance: 500, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null }
      : { data: null, error: null }),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: USER, profile: PROFILE }) }));
// The portrait has its own tests; the score is under test here.
vi.mock('../../components/soulmate/SoulmatePortrait', () => ({ SoulmatePortrait: () => null }));
const shared = vi.hoisted(() => ({ texts: [] as string[] }));
vi.mock('../../utils/shareCard', () => ({
  shareOrDownloadCard: async (_card: unknown, _file: string, text: string) => {
    shared.texts.push(text);
    return 'shared';
  },
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

import i18n from '../../i18n/config';
import { SoulmateScorePage } from '../SoulmateScorePage';

/** The cast from the QA run: two harmonies, two frictions. */
const ASPECTS = [
  { partnerPlanet: 'Venus', natalPlanet: 'Venus', type: 'sextile', orb: 0.4 },
  { partnerPlanet: 'Mercury', natalPlanet: 'Sun', type: 'trine', orb: 1.2 },
  { partnerPlanet: 'Mars', natalPlanet: 'Sun', type: 'opposition', orb: 0.8 },
  { partnerPlanet: 'Venus', natalPlanet: 'Sun', type: 'square', orb: 2.1 },
];
const ENGLISH_PLANETS = /\b(Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)\b/;

function mount() {
  return render(<MemoryRouter><SoulmateScorePage /></MemoryRouter>);
}

/**
 * Fill the date, reveal, and wait for the score (its "Score another" button).
 * The field is found by its type, not its label, so the aspect and share
 * cases stand apart from the label case.
 */
async function reveal(container: HTMLElement) {
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '1993-07-21' } });
  fireEvent.click(screen.getByRole('button', { name: i18n.t('app:soulmate.calculateCta') }));
  await screen.findByRole('button', { name: i18n.t('app:soulmate.tryAnother') }, { timeout: 3000 });
}

beforeAll(() => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(() => {
  shared.texts.length = 0;
  invoke.mockReset();
  invoke.mockImplementation(async () => ({ data: { data: { crossAspects: ASPECTS, hasTime: true } }, error: null }));
});
afterEach(() => cleanup());
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Soulmate score form: each field is labelled by its eyebrow (d3-ko-11)', () => {
  it('Korean: name, birth date and birth time are found by their labels, not by a placeholder', async () => {
    await i18n.changeLanguage('ko');
    mount();
    expect(screen.getByLabelText('상대방 이름')).toHaveAttribute('placeholder', '선택 사항');
    expect(screen.getByRole('textbox', { name: '상대방 이름' })).toBeInTheDocument();
    expect(screen.getByLabelText('생년월일')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('출생 시간 (선택 — 스코어가 더 정확해져요)')).toHaveAttribute('type', 'time');
  });

  it('English: the same three labels', async () => {
    await i18n.changeLanguage('en');
    mount();
    expect(screen.getByRole('textbox', { name: 'Partner’s name' })).toBeInTheDocument();
    expect(screen.getByLabelText('Birth date')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Birth time (optional — sharpens the score)')).toHaveAttribute('type', 'time');
  });
});

describe('Soulmate score aspects name the planets in the reader’s language (d3-ko-01)', () => {
  it('Korean: 금성 ✶ 금성 육분, 화성 ☍ 태양 대립 — no English planet in any row', async () => {
    await i18n.changeLanguage('ko');
    await reveal(mount().container);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.textContent ?? '').not.toMatch(ENGLISH_PLANETS);
    // Each row: partner planet, natal planet, aspect.
    expect(rows.map((r) => [...r.querySelectorAll('span.truncate')].map((s) => s.textContent).concat(r.lastElementChild?.textContent ?? ''))).toEqual([
      ['금성', '금성', '육분'],
      ['수성', '태양', '삼각'],
      ['화성', '태양', '대립'],
      ['금성', '태양', '직각'],
    ]);
  });

  it('Japanese: 金星 / 太陽, beside the Japanese aspect names', async () => {
    await i18n.changeLanguage('ja');
    await reveal(mount().container);
    const text = screen.getAllByRole('listitem').map((r) => r.textContent).join(' ');
    expect(text).not.toMatch(ENGLISH_PLANETS);
    for (const name of ['金星', '水星', '火星', '太陽']) expect(text).toContain(name);
  });

  it('English still reads the English names', async () => {
    await i18n.changeLanguage('en');
    await reveal(mount().container);
    expect(screen.getAllByRole('listitem')[0].textContent).toBe('VenusVenussextile');
  });
});

describe('Shared scores link to the app (d2-ja-08; needs the p10 pages locale delta)', () => {
  for (const lng of ['en', 'ja', 'ko', 'zh'] as const) {
    it(`${lng}: the share text ends with https://tarotlife.app/soulmate-score and names no other host`, async () => {
      await i18n.changeLanguage(lng);
      await reveal(mount().container);
      fireEvent.click(screen.getByRole('button', { name: i18n.t('app:soulmate.share') }));
      await waitFor(() => expect(shared.texts).toHaveLength(1));
      const [text] = shared.texts;
      expect(text).not.toContain('arcana.app');
      expect(text.endsWith(' https://tarotlife.app/soulmate-score') || text.endsWith('：https://tarotlife.app/soulmate-score')).toBe(true);
      expect(text).not.toContain('{{');
    });
  }
});
