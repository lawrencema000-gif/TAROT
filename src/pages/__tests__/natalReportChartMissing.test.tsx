import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 Q01: neither onboarding casts a natal chart (only the Horoscope tab's
 * setup does), and the natal report never cast a missing one. A new member
 * with complete birth data (Sydney, 1988-11-02 14:10, 400 Moonstones) opened
 * Profile → Full natal chart, tapped "Unlock for 200 Moonstones", was charged
 * (400 → 200), and got only "We could not find your computed natal chart.
 * Please re-enter your birth data in Profile" — no header, and advice that
 * was wrong: the birth data was complete.
 *
 * The page now casts a missing chart itself, as the Horoscope setup does
 * (the birth place's zone, castParamsFor), and offers the report only once a
 * chart exists. These run the real useNatalChart and birthZone against the
 * two edge functions (fetch), in Japanese.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000b1', email: 'qa@example.com' };
const SYDNEY = {
  id: USER.id, displayName: 'QA', birthDate: '1988-11-02', birthTime: '14:10', birthPlace: 'Sydney NSW, Australia',
  birthLat: -33.8688, birthLon: 151.2093, birthTz: 'Australia/Sydney' as string | undefined, timezone: 'UTC', isPremium: false,
};
let profile: Record<string, unknown> = { ...SYDNEY };

const dal = vi.hoisted(() => ({
  isUnlocked: vi.fn(),
  getBalance: vi.fn(),
  unlockWithMoonstones: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'token' } } }),
      refreshSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    functions: { invoke: vi.fn() },
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile, updateProfile: async () => ({ error: null }) }),
}));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: (key: string) => key === 'moonstones' }));
vi.mock('../../components/horoscope/birthZone', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../components/horoscope/birthZone')>()),
  // The recast check is not under test here (it never casts a missing chart).
  useBirthTzBackfill: () => {},
}));
vi.mock('../../dal', () => ({
  reportUnlocks: { isUnlocked: dal.isUnlocked, unlockWithMoonstones: dal.unlockWithMoonstones },
  moonstones: { getBalance: dal.getBalance },
}));
vi.mock('../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: async () => true, refund: vi.fn(), EarnSheet: null }) }));
vi.mock('../../components/chart/ChartWheel', () => ({ ChartWheel: () => null }));
vi.mock('../../components/premium', () => ({ PaywallSheet: () => null, WatchAdSheet: () => null }));
vi.mock('../../components/moonstones/useAdCreditsLeft', () => ({ useCanOfferAd: () => false }));
vi.mock('../../utils/platform', () => ({ isNative: () => false }));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
// The shared zod schemas import `npm:zod` (Deno); the vite build aliases it,
// vitest does not. useNatalChart itself goes through callFn (fetch), not these.
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
import { NatalChartReportPage } from '../NatalChartReportPage';

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
const NO_CHART = { error: 'No chart found', natalChart: null, bigThree: null, dominants: null, aspects: null };

type Answer = { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;
let getChart: Answer[] = [];
let compute: Answer[] = [];
const calls: Array<{ fn: string; body: Record<string, unknown> }> = [];

const json = (status: number, body: unknown) => ({ status, body });
function deferred() {
  let resolve!: (v: { status: number; body: unknown }) => void;
  const promise = new Promise<{ status: number; body: unknown }>((r) => { resolve = r; });
  return { promise, resolve };
}

const fetchStub = vi.fn(async (url: string, init?: { body?: string }) => {
  const fn = url.slice(url.lastIndexOf('/') + 1);
  calls.push({ fn, body: JSON.parse(init?.body ?? '{}') });
  const queue = fn === 'astrology-get-chart' ? getChart : fn === 'astrology-compute-natal' ? compute : [];
  const answer = await (queue.length > 1 ? queue.shift()! : queue[0] ?? json(500, { error: 'unexpected' }));
  return {
    ok: answer.status >= 200 && answer.status < 300,
    status: answer.status,
    json: async () => answer.body,
    text: async () => JSON.stringify(answer.body),
  } as Response;
});

const callsTo = (fn: string) => calls.filter((c) => c.fn === fn);
const unlockButton = () => screen.queryByRole('button', { name: /ムーンストーン200個で解放/ });

function renderPage() {
  return render(
    <MemoryRouter>
      <NatalChartReportPage />
    </MemoryRouter>,
  );
}

describe('Natal report: no chart, no charge (p9 Q01)', () => {
  beforeEach(async () => {
    cleanup();
    vi.stubGlobal('fetch', fetchStub);
    calls.length = 0;
    fetchStub.mockClear();
    profile = { ...SYDNEY };
    getChart = [json(200, NO_CHART)];
    compute = [json(200, CHART)];
    dal.isUnlocked.mockReset().mockResolvedValue({ ok: true, data: false });
    dal.getBalance.mockReset().mockResolvedValue({ ok: true, data: 400 });
    dal.unlockWithMoonstones.mockReset().mockResolvedValue({ ok: true, data: { unlocked: true, newBalance: 200 } });
    // A language change empties useAstrology's session chart cache.
    await act(async () => { await i18n.changeLanguage('en'); await i18n.changeLanguage('ja'); });
  });
  afterAll(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await i18n.changeLanguage('en');
  });

  it('casts the missing chart in the birth place’s zone, and offers the unlock only once it exists', async () => {
    const cast = deferred();
    compute = [cast.promise];
    renderPage();

    // Casting: the page and its title, a status line, and nothing to buy.
    expect(await screen.findByRole('status')).toHaveTextContent('チャートを計算しています…');
    expect(screen.getByRole('heading', { name: '完全なネイタルチャート' })).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
    await waitFor(() => expect(callsTo('astrology-compute-natal')).toHaveLength(1));
    expect(callsTo('astrology-compute-natal')[0].body).toEqual({
      birthDate: '1988-11-02', birthTime: '14:10', lat: -33.8688, lon: 151.2093,
      timezone: 'Australia/Sydney', chartMode: 'exact', locale: 'ja',
    });
    expect(dal.unlockWithMoonstones).not.toHaveBeenCalled();

    await act(async () => { cast.resolve(json(200, CHART)); });
    const unlock = await screen.findByRole('button', { name: /ムーンストーン200個で解放/ });
    expect(unlock).toBeEnabled();
    fireEvent.click(unlock);
    await waitFor(() => expect(dal.unlockWithMoonstones).toHaveBeenCalledTimes(1));
    expect(dal.unlockWithMoonstones).toHaveBeenCalledWith('natal-chart-pdf', '1988-11-02', 200);
    // What was paid for is delivered.
    expect(await screen.findByText('ビッグスリー')).toBeInTheDocument();
    expect(screen.queryByText(/再入力/)).toBeNull();
  });

  it('reads the zone from the coordinates when the profile has none (an OAuth account’s timezone is the signup UTC)', async () => {
    profile = { ...SYDNEY, birthTz: undefined, timezone: 'UTC' };
    renderPage();
    await screen.findByRole('button', { name: /ムーンストーン200個で解放/ });
    expect(callsTo('astrology-compute-natal')[0].body.timezone).toBe('Australia/Sydney');
  });

  it('a member who already paid with no chart gets the report, not the old dead end', async () => {
    dal.isUnlocked.mockResolvedValue({ ok: true, data: true });
    renderPage();
    expect(await screen.findByText('ビッグスリー')).toBeInTheDocument();
    expect(callsTo('astrology-compute-natal')).toHaveLength(1);
    expect(dal.unlockWithMoonstones).not.toHaveBeenCalled();
  });

  it('a failed cast: the page header, a retry and no unlock; Try again reloads and casts again', async () => {
    compute = [json(500, { error: 'boom' }), json(200, CHART)];
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('出生図を作成できませんでした。接続を確認して、もう一度お試しください。');
    expect(screen.getByRole('heading', { name: '完全なネイタルチャート' })).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
    expect(callsTo('astrology-compute-natal')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'もう一度' }));
    await screen.findByRole('button', { name: /ムーンストーン200個で解放/ });
    expect(callsTo('astrology-get-chart')).toHaveLength(2);
    expect(callsTo('astrology-compute-natal')).toHaveLength(2);
    expect(dal.unlockWithMoonstones).not.toHaveBeenCalled();
  });

  it('a chart that cannot be read is retried, not recast', async () => {
    getChart = [json(503, { error: 'unavailable' }), json(200, CHART)];
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('出生図を作成できませんでした');
    expect(unlockButton()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'もう一度' }));
    await screen.findByRole('button', { name: /ムーンストーン200個で解放/ });
    expect(callsTo('astrology-compute-natal')).toHaveLength(0);
  });

  it('an unlock the server refuses for want of a chart recasts it and offers the unlock again', async () => {
    getChart = [json(200, CHART), json(200, NO_CHART)];
    dal.unlockWithMoonstones.mockResolvedValueOnce({ ok: false, error: 'chart-missing' });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /ムーンストーン200個で解放/ }));
    await waitFor(() => expect(callsTo('astrology-compute-natal')).toHaveLength(1));
    const again = await screen.findByRole('button', { name: /ムーンストーン200個で解放/ });
    expect(screen.queryByText('ビッグスリー')).toBeNull();
    fireEvent.click(again);
    expect(await screen.findByText('ビッグスリー')).toBeInTheDocument();
    expect(dal.unlockWithMoonstones).toHaveBeenCalledTimes(2);
  });

  it('no birth place: nothing is cast and nothing is sold; it asks for the place', async () => {
    profile = { ...SYDNEY, birthPlace: undefined, birthLat: undefined, birthLon: undefined, birthTz: undefined };
    renderPage();
    expect(await screen.findByText('出生地を追加してください')).toBeInTheDocument();
    expect(screen.getByText(/プロフィール → プロフィールを編集 で出生地を選んで/)).toBeInTheDocument();
    expect(unlockButton()).toBeNull();
    expect(callsTo('astrology-compute-natal')).toHaveLength(0);
    expect(dal.unlockWithMoonstones).not.toHaveBeenCalled();
  });
});
