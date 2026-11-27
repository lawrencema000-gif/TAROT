import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type React from 'react';

/*
 * p12 charts-06 (WP-P0-11 Part A). The Year Ahead card sold "2026 — 12
 * monthly briefings" with a January–December preview, while the report
 * covered the next 12 months. The card title, the paywall preview, the
 * report's eyebrow and its month headers now come from one month list
 * (src/lib/yearAheadMonths.ts, the server's months.ts), in the reader's
 * language, and the term the unlock buys is stated.
 *
 * The clock is 2026-11-14T12:00Z: the same calendar day from UTC−11 to UTC+11.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000c4', email: 'qa@example.com' };
const PROFILE = {
  id: USER.id, displayName: 'QA', birthDate: '1988-11-02', birthTime: '14:10', birthPlace: 'Sydney NSW, Australia',
  birthLat: -33.8688, birthLon: 151.2093, birthTz: 'Australia/Sydney', timezone: 'UTC', isPremium: false,
};
let profile: Record<string, unknown> = { ...PROFILE };

const dal = vi.hoisted(() => ({
  isUnlocked: vi.fn(),
  getBalance: vi.fn(),
  unlockWithMoonstones: vi.fn(),
}));
const invoke = vi.hoisted(() => vi.fn());

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token' } } }),
      refreshSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile, updateProfile: async () => ({ error: null }) }),
}));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: (key: string) => key === 'moonstones' }));
vi.mock('../../components/horoscope/birthZone', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/horoscope/birthZone')>()),
  useBirthTzBackfill: () => {},
}));
vi.mock('../../dal', () => ({
  reportUnlocks: { isUnlocked: dal.isUnlocked, unlockWithMoonstones: dal.unlockWithMoonstones },
  moonstones: { getBalance: dal.getBalance },
}));
vi.mock('../../components/premium', () => ({
  PaywallSheet: ({ open, preview }: { open: boolean; preview?: React.ReactNode }) =>
    (open ? <div data-testid="paywall">{preview}</div> : null),
  WatchAdSheet: () => null,
}));
vi.mock('../../components/moonstones/useAdCreditsLeft', () => ({ useCanOfferAd: () => false }));
vi.mock('../../utils/platform', () => ({ isNative: () => false }));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('../../schema', () => ({ DailyResponse: {}, WeeklyResponse: {}, MonthlyResponse: {}, TransitCalendarResponse: {} }));
vi.mock('../../lib/apiClient', () => ({
  apiCall: vi.fn(),
  ApiError: class ApiError extends Error {},
  ApiContractError: class ApiContractError extends Error {},
  handleSessionExpired: vi.fn(),
}));
vi.mock('../../i18n/contentOverlay', () => ({ useContentOverlay: () => null }));
vi.mock('../../data/interpretations/localize', () => ({ withOverlay: (x: unknown) => x }));

import i18n from '../../i18n/config';
import { YearAheadReportPage } from '../YearAheadReportPage';

const NATAL = {
  planets: [
    { planet: 'Sun', sign: 'Scorpio', degree: 10.2, longitude: 220.2, house: 9 },
    { planet: 'Moon', sign: 'Gemini', degree: 4.1, longitude: 64.1, house: 4 },
  ],
  houses: [],
  ascendant: 330.5,
  bigThree: { sun: { sign: 'Scorpio', degree: 10.2, house: 9 }, moon: { sign: 'Gemini', degree: 4.1, house: 4 }, rising: { sign: 'Pisces', degree: 0.5 } },
  aspects: [],
  dominants: { elements: { Fire: 0, Earth: 0, Air: 1, Water: 1 }, modalities: { Cardinal: 0, Fixed: 1, Mutable: 1 }, chartRuler: 'Neptune', dominantPlanets: [] },
  chartMode: 'exact',
};
const CHART = { natalChart: NATAL, bigThree: NATAL.bigThree, dominants: NATAL.dominants, aspects: NATAL.aspects };

const MONTHS = [
  '2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04',
  '2027-05', '2027-06', '2027-07', '2027-08', '2027-09', '2027-10',
];
const EN_LONG = [
  'November 2026', 'December 2026', 'January 2027', 'February 2027', 'March 2027', 'April 2027',
  'May 2027', 'June 2027', 'July 2027', 'August 2027', 'September 2027', 'October 2027',
];
const JA_LONG = [
  '2026年11月', '2026年12月', '2027年1月', '2027年2月', '2027年3月', '2027年4月',
  '2027年5月', '2027年6月', '2027年7月', '2027年8月', '2027年9月', '2027年10月',
];
function forecast(withRange: boolean) {
  return {
    generatedAt: '2026-11-14T12:00:00Z',
    monthsCovered: 12,
    months: MONTHS.map((monthIso) => ({ monthIso, monthLabel: 'IGNORED', events: [], theme: `theme ${monthIso}` })),
    summary: 'A balanced year.',
    ...(withRange ? { range: { from: '2026-11', to: '2027-10' } } : {}),
  };
}

const fetchStub = vi.fn(async (url: string) => {
  const fn = url.slice(url.lastIndexOf('/') + 1);
  const body = fn === 'astrology-get-chart' ? CHART : { error: 'unexpected' };
  const status = fn === 'astrology-get-chart' ? 200 : 500;
  return {
    ok: status === 200, status, json: async () => body, text: async () => JSON.stringify(body),
  } as Response;
});

const yearAheadCalls = () => invoke.mock.calls.filter((c) => c[0] === 'astrology-year-ahead');

function renderPage() {
  return render(
    <MemoryRouter>
      <YearAheadReportPage />
    </MemoryRouter>,
  );
}

async function setLang(lang: string) {
  // A language change empties useAstrology's session chart cache.
  await act(async () => { await i18n.changeLanguage(lang === 'en' ? 'ja' : 'en'); await i18n.changeLanguage(lang); });
}

/** The rows of the paywall preview, "Overall arc" first (the preview is aria-hidden). */
function previewItems(): string[] {
  return within(screen.getByTestId('paywall')).getAllByRole('listitem', { hidden: true }).map((li) => li.textContent ?? '');
}

describe('Year Ahead sells the months it contains (p12 charts-06)', () => {
  let forecastBody: ReturnType<typeof forecast> = forecast(true);

  beforeEach(async () => {
    cleanup();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T12:00:00Z'));
    vi.stubGlobal('fetch', fetchStub);
    profile = { ...PROFILE };
    forecastBody = forecast(true);
    invoke.mockReset().mockImplementation(async (fn: string) => {
      if (fn !== 'astrology-year-ahead') throw new Error(`unexpected ${fn}`);
      return { data: { data: forecastBody }, error: null };
    });
    dal.isUnlocked.mockReset().mockResolvedValue({ ok: true, data: false });
    dal.getBalance.mockReset().mockResolvedValue({ ok: true, data: 400 });
    dal.unlockWithMoonstones.mockReset().mockResolvedValue({ ok: true, data: { unlocked: true, newBalance: 100 } });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  afterAll(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage('en');
  });

  it('en, locked: the card names the twelve months and the term; the preview lists them', async () => {
    await setLang('en');
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Nov 2026 – Oct 2027 · 12 monthly briefings' })).toBeInTheDocument();
    expect(screen.getByText('Unlocking opens it until December 31, 2026.')).toBeInTheDocument();
    expect(screen.queryByText(/2026 — 12 monthly briefings/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'See Premium plans' }));
    const items = previewItems();
    expect(items).toEqual(['Overall arc', ...EN_LONG]);
    expect(items).not.toContain('January 2026');
    expect(items).not.toContain('January');
  });

  it('ja, locked: the title and the preview in Japanese', async () => {
    await setLang('ja');
    renderPage();
    expect(await screen.findByRole('heading', { name: '2026年11月〜2027年10月・月次ブリーフ12本' })).toBeInTheDocument();
    expect(screen.getByText('解放すると2026年12月31日まで読めます。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'プレミアムを見る' }));
    expect(previewItems()[1]).toBe('2026年11月');
    expect(previewItems()[12]).toBe('2027年10月');
  });

  it('unlocking buys the calendar year’s reference and asks for the forecast from the reader’s month', async () => {
    await setLang('en');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Unlock for 300 Moonstones/ }));
    await waitFor(() => expect(dal.unlockWithMoonstones).toHaveBeenCalledTimes(1));
    expect(dal.unlockWithMoonstones).toHaveBeenCalledWith('year-ahead', '2026', 300);
    await waitFor(() => expect(yearAheadCalls()).toHaveLength(1));
    expect(yearAheadCalls()[0][1]).toEqual({ body: { year: 2026, from: '2026-11' } });
  });

  it('unlocked: the eyebrow is the span and the month rows are the server’s months in the reader’s language', async () => {
    dal.isUnlocked.mockResolvedValue({ ok: true, data: true });
    await setLang('en');
    const { container } = renderPage();
    expect(await screen.findByText('The shape of your year')).toBeInTheDocument();
    expect(screen.getByText('Nov 2026 – Oct 2027')).toBeInTheDocument();
    expect(screen.getByText('Your unlock opens it until December 31, 2026.')).toBeInTheDocument();
    const text = container.textContent ?? '';
    let at = -1;
    for (const label of EN_LONG) {
      const next = text.indexOf(label, at + 1);
      expect(next, label).toBeGreaterThan(at);
      at = next;
    }
    for (const label of EN_LONG) expect(screen.getByText(label)).toBeInTheDocument();
    expect(text).not.toContain('IGNORED');
  });

  it('unlocked, ja: the month rows in Japanese', async () => {
    dal.isUnlocked.mockResolvedValue({ ok: true, data: true });
    await setLang('ja');
    const { container } = renderPage();
    expect(await screen.findByText('あなたの一年のかたち')).toBeInTheDocument();
    expect(screen.getByText('2026年11月〜2027年10月')).toBeInTheDocument();
    for (const label of JA_LONG) expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.textContent).not.toContain('IGNORED');
  });

  it('a server without `range`: the eyebrow comes from the first and last month', async () => {
    dal.isUnlocked.mockResolvedValue({ ok: true, data: true });
    forecastBody = forecast(false);
    await setLang('en');
    renderPage();
    expect(await screen.findByText('The shape of your year')).toBeInTheDocument();
    expect(screen.getByText('Nov 2026 – Oct 2027')).toBeInTheDocument();
  });

  it('Premium: no unlock term in the report', async () => {
    profile = { ...PROFILE, isPremium: true };
    await setLang('en');
    renderPage();
    expect(await screen.findByText('The shape of your year')).toBeInTheDocument();
    expect(screen.queryByText(/Your unlock opens it until/)).toBeNull();
  });
});
