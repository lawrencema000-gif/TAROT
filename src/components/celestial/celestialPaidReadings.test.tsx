import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * The Celestial Map's two 250-Moonstone readings (p9 R04, R05, R08, R31):
 *  - R04 Find Your Place names its price before the tap, on the card and
 *    beside "Show me a different place" (it said "Premium" and charged 250);
 *  - R05 its result is a sheet that hides the bottom nav, so the last row
 *    ("Save this place", "Show me a different place", "Try the reading
 *    again") is never under a nav tab;
 *  - R08 a reading paid for is shown again, not sold again: reopening the
 *    city, running Find Your Place again, and a lost reply retried after
 *    the sheet was closed (the same request, so the server's free replay);
 *  - R31 a place picked from the search is the place named and read, not
 *    the nearest of the listed cities; a remote spot is read as itself.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000c9', email: 'qa@example.com' };
const auth = { premium: false };

const invoke = vi.fn();
const rpc = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 300 }, error: null });
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
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: USER,
    profile: { id: USER.id, displayName: 'QA', birthDate: '1991-03-08', birthTime: '06:45', isPremium: auth.premium },
  }),
}));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
// Motion is not under test: plain elements, no animation props.
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
import { CityInsightPanel } from './CityInsightPanel';
import { FindYourPlace } from './FindYourPlace';
import type { PlanetName, Angle } from '../../utils/astrocartography';
import type { City } from '../../utils/celestialGeo';

const later = <T,>(value: T, ms = 30) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const callsTo = (fn: string) => invoke.mock.calls.filter((c) => c[0] === fn);
const bodyOf = (fn: string, i: number) => (callsTo(fn)[i][1] as { body: Record<string, unknown> }).body;
/** No response at all: the debit may have landed, so the retry must be the same request. */
const dropped = () => later({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } });
/** A non-2xx answer as supabase-js gives it: a generic message, the envelope on `context`. */
const httpError = (status: number, code: string) => later({
  data: null,
  error: {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify({ error: { code, message: 'server text' } }), { status }),
  },
});

type Lines = GeoJSON.FeatureCollection<GeoJSON.LineString, { planet: PlanetName; angle: Angle }>;
/** Two meridian lines at `lon`, sampled densely enough that every listed city near them scores. */
function meridians(lon: number): Lines {
  const line = (planet: PlanetName, angle: Angle): GeoJSON.Feature<GeoJSON.LineString, { planet: PlanetName; angle: Angle }> => ({
    type: 'Feature',
    properties: { planet, angle },
    geometry: { type: 'LineString', coordinates: Array.from({ length: 161 }, (_, i) => [lon, -80 + i] as [number, number]) },
  });
  return { type: 'FeatureCollection', features: [line('Venus', 'MC'), line('Jupiter', 'IC')] };
}

function mount(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeAll(async () => {
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(async () => {
  auth.premium = false;
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockImplementation(() => later({ data: null, error: null }));
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  document.body.classList.remove('sheet-open');
  document.body.style.overflow = '';
});

// ── Find Your Place ──────────────────────────────────────────────────────

const placeReading = { verdict: 'Your place.', body: 'Love finds you here.', lineNotes: [], cautionsNote: 'c', practice: 'p', closingBlessing: 'b' };

function finder(trySpend: () => Promise<boolean>, opts: { isPremium?: boolean } = {}) {
  return mount(
    <main className="relative z-10">
      <FindYourPlace
        allLines={meridians(2.3522)}
        intent="love"
        birthUtc="1991-03-07T21:45:00.000Z"
        zodiacSign="pisces"
        locale="en"
        isPremium={opts.isPremium ?? false}
        onUpgrade={() => {}}
        trySpend={trySpend}
        onReveal={() => {}}
        onSave={async () => {}}
      />
    </main>,
  );
}
const card = () => screen.getByRole('button', { name: /Find your destined place/ });

describe('R04 — Find Your Place names its 250-Moonstone price before the tap', () => {
  it('the card shows the price and the balance to a free reader, and no "Premium" badge', async () => {
    finder(vi.fn(() => later(true)));
    await waitFor(() => expect(card()).toHaveTextContent('Each reading uses 250 Moonstones · You have 300'));
    expect(within(card()).queryByText('Premium')).toBeNull();
  });

  it('in Japanese too', async () => {
    await i18n.changeLanguage('ja');
    finder(vi.fn(() => later(true)));
    await waitFor(() => expect(screen.getByRole('button', { name: /運命の場所を見つける/ })).toHaveTextContent('リーディング1回につきムーンストーン250個 · 所持：300個'));
  });

  it('a Premium reader is shown no price', async () => {
    auth.premium = true;
    finder(vi.fn(() => later(true)), { isPremium: true });
    await act(async () => { await later(null, 60); });
    expect(card()).not.toHaveTextContent('Moonstones');
  });

  it('"Show me a different place" carries the price of the new reading', async () => {
    invoke.mockImplementation(() => later({ data: { data: placeReading }, error: null }));
    finder(vi.fn(() => later(true)));
    fireEvent.click(card());
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    const reroll = screen.getByRole('button', { name: /Show me a different place/ });
    // Under the row the re-roll leads (saving is free).
    await waitFor(() => expect(reroll.parentElement?.parentElement).toHaveTextContent('Each reading uses 250 Moonstones · You have 300'));
  });
});

describe('R05 — the result is a sheet: the bottom nav is hidden while it is up', () => {
  it('result and error alike set body.sheet-open (which hides nav[data-main-nav]), and closing clears it', async () => {
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementation(() => later({ data: { data: placeReading }, error: null }));
    finder(vi.fn(() => later(true)));
    fireEvent.click(card());
    const retry = await screen.findByRole('button', { name: /Try the reading again/ }, { timeout: 4000 });
    expect(document.body.classList.contains('sheet-open')).toBe(true);
    expect(screen.getByRole('dialog')).toContainElement(retry);
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /Save this place/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Show me a different place/ })).toBeInTheDocument();
    expect(document.body.classList.contains('sheet-open')).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.body.classList.contains('sheet-open')).toBe(false));
  });
});

describe('R08 — a reading paid for is shown again, not sold again', () => {
  it('Find Your Place: closed, then run again — the same reading, no gate, no request; the card shows no price meanwhile', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementation(() => later({ data: { data: placeReading }, error: null }));
    finder(trySpend);
    fireEvent.click(card());
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Your place.')).toBeNull());
    // The next tap shows what is already paid for: the card does not ask for 250.
    expect(card()).not.toHaveTextContent('250 Moonstones');
    fireEvent.click(card());
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
    expect(trySpend).toHaveBeenCalledTimes(1);
  });
});

// ── City Insight Panel ───────────────────────────────────────────────────

const cityReading = { verdict: 'Paris suits you.', body: 'Venus is high here.', lineNotes: [], cautionsNote: 'Rest.', practice: 'Walk.' };
const PARIS = { lat: 48.8566, lon: 2.3522 };

function panelAt(point: { lat: number; lon: number }, trySpend: () => Promise<boolean>, extra: { place?: City | null; open?: boolean } = {}) {
  const lines = meridians(point.lon);
  const el = (open: boolean, place = extra.place) => (
    <MemoryRouter>
      <CityInsightPanel
        open={open}
        onClose={() => {}}
        point={point}
        {...({ place } as Record<string, unknown>)}
        visibleLines={lines}
        allLines={lines}
        isPremium={false}
        birthUtc="1991-03-07T21:45:00.000Z"
        intent="love"
        zodiacSign="pisces"
        locale="en"
        trySpend={trySpend}
        onUpgrade={() => {}}
      />
    </MemoryRouter>
  );
  const view = render(el(extra.open ?? true));
  return { ...view, setOpen: (open: boolean) => view.rerender(el(open)) };
}

describe('R08 — the City Insight Panel keeps the reading it sold', () => {
  it('closed and reopened at the same city: the reading is there, not "Unlock for 250 Moonstones"', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementation(() => later({ data: { data: cityReading }, error: null }));
    const p = panelAt(PARIS, trySpend);
    fireEvent.click(screen.getByRole('button', { name: /Unlock for 250 Moonstones/ }));
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    p.setOpen(false);
    await waitFor(() => expect(screen.queryByText('Paris suits you.')).toBeNull());
    p.setOpen(true);
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    expect(screen.queryByRole('button', { name: /Unlock for 250 Moonstones/ })).toBeNull();
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
    expect(trySpend).toHaveBeenCalledTimes(1);
  });

  it('a reply lost, the sheet closed and reopened: the retry is the same request (same id) and is not gated again', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementation(() => later({ data: { data: cityReading }, error: null }));
    const p = panelAt(PARIS, trySpend);
    fireEvent.click(screen.getByRole('button', { name: /Unlock for 250 Moonstones/ }));
    await screen.findByText(/Could not generate the reading/, undefined, { timeout: 3000 });
    p.setOpen(false);
    p.setOpen(true);
    const retry = await screen.findByRole('button', { name: /Unlock for 250 Moonstones/ });
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    expect(callsTo('celestial-travel-reading')).toHaveLength(2);
    expect(bodyOf('celestial-travel-reading', 1).requestId).toBe(bodyOf('celestial-travel-reading', 0).requestId);
    expect(trySpend).toHaveBeenCalledTimes(1);
  });
});

describe('R31 — the panel names and reads the place that was picked', () => {
  const FUKUOKA: City = { name: 'Fukuoka', country: 'Japan', cc: '', lat: 33.5902, lon: 130.4017, pop: 0 };

  it('a search pick (Fukuoka, not on the list) is the panel’s place and the reading’s city — not Busan, and no "km from tap"', async () => {
    invoke.mockImplementation(() => later({ data: { data: cityReading }, error: null }));
    panelAt({ lat: FUKUOKA.lat, lon: FUKUOKA.lon }, vi.fn(() => later(true)), { place: FUKUOKA });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Fukuoka');
    expect(screen.queryByText(/Busan/)).toBeNull();
    expect(screen.queryByText(/from tap/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Unlock for 250 Moonstones/ }));
    await waitFor(() => expect(callsTo('celestial-travel-reading')).toHaveLength(1));
    expect(bodyOf('celestial-travel-reading', 0).city).toEqual({ name: 'Fukuoka', country: 'Japan', lat: FUKUOKA.lat, lon: FUKUOKA.lon });
  });

  it('a pick the search gave no country is sent with its name as the country (the function requires one)', async () => {
    invoke.mockImplementation(() => later({ data: { data: cityReading }, error: null }));
    const bare: City = { ...FUKUOKA, name: '福岡', country: '' };
    panelAt({ lat: bare.lat, lon: bare.lon }, vi.fn(() => later(true)), { place: bare });
    fireEvent.click(screen.getByRole('button', { name: /Unlock for 250 Moonstones/ }));
    await waitFor(() => expect(callsTo('celestial-travel-reading')).toHaveLength(1));
    expect(bodyOf('celestial-travel-reading', 0).city).toMatchObject({ name: '福岡', country: '福岡' });
  });

  it('a map tap near a listed city still names that city, with its distance from the tap', () => {
    panelAt({ lat: FUKUOKA.lat, lon: FUKUOKA.lon }, vi.fn(() => later(true)));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Busan');
    expect(screen.getByText(/km from tap/)).toBeInTheDocument();
  });

  it('a remote tap (Qingdao’s sea, 550 km from Shanghai) is read as the spot itself — never as the far nearest city', async () => {
    invoke.mockImplementation(() => later({ data: { data: cityReading }, error: null }));
    await i18n.changeLanguage('zh');
    const spot = { lat: 36.07, lon: 120.38 };
    panelAt(spot, vi.fn(() => later(true)));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('远洋 / 偏远地区');
    fireEvent.click(screen.getByRole('button', { name: /250/ }));
    await waitFor(() => expect(callsTo('celestial-travel-reading')).toHaveLength(1));
    const city = bodyOf('celestial-travel-reading', 0).city as { name: string; country: string; lat: number; lon: number };
    expect(city).toMatchObject({ lat: spot.lat, lon: spot.lon });
    expect(city.name).not.toBe('Shanghai');
    expect(`${city.name} ${city.country}`).toContain('远洋 / 偏远地区');
  });
});

/*
 * RQA-2: an id the server can no longer replay (409 REQUEST_ALREADY_USED —
 * charged, and its answer gone) is dropped, and the member is told: the next
 * press is a new reading at the usual price, behind the gate. The DAL used to
 * return the generic FunctionsHttpError message, so the check never matched:
 * the spent id went out again on every press and the place could not be read
 * again for the rest of the visit. A 402 drops the id too (nothing was
 * charged), so the next press goes through the gate and its Earn sheet.
 */
describe('RQA-2 — a spent request id is dropped, and the next press is a new, priced request', () => {
  it('City Insight Panel: lost reply, then REQUEST_ALREADY_USED on the free retry — says so; the next press is a new id, gated', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementationOnce(() => httpError(409, 'REQUEST_ALREADY_USED'));
    invoke.mockImplementation(() => later({ data: { data: cityReading }, error: null }));
    panelAt(PARIS, trySpend);
    const unlock = () => screen.getByRole('button', { name: /Unlock for 250 Moonstones/ });
    fireEvent.click(unlock());
    await screen.findByText(/Could not generate the reading/, undefined, { timeout: 3000 });
    await waitFor(() => expect(unlock()).not.toBeDisabled());
    fireEvent.click(unlock());
    await screen.findByText(/already given once and can’t be shown again/, undefined, { timeout: 3000 });
    expect(screen.getByText(/starts a new one, charged as usual/)).toBeInTheDocument();
    await waitFor(() => expect(unlock()).not.toBeDisabled());
    fireEvent.click(unlock());
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    const ids = callsTo('celestial-travel-reading').map((_, i) => bodyOf('celestial-travel-reading', i).requestId);
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
    expect(trySpend).toHaveBeenCalledTimes(2);
  });

  it('in Japanese too', async () => {
    await i18n.changeLanguage('ja');
    invoke.mockImplementationOnce(() => httpError(409, 'REQUEST_ALREADY_USED'));
    panelAt(PARIS, vi.fn(() => later(true)));
    fireEvent.click(screen.getByRole('button', { name: /ムーンストーン250個で解放する/ }));
    expect(await screen.findByText('このリーディングはすでに一度お届けしたため、もう一度表示することはできません。下のボタンを押すと新しいリーディングが始まり、通常どおり料金がかかります。', undefined, { timeout: 3000 })).toBeInTheDocument();
  });

  it('City Insight Panel: 402 INSUFFICIENT_BALANCE drops the id — the next press goes through the gate, and nothing is sent when it says no', async () => {
    const trySpend = vi.fn<() => Promise<boolean>>().mockImplementationOnce(() => later(true)).mockImplementation(() => later(false));
    invoke.mockImplementation(() => httpError(402, 'INSUFFICIENT_BALANCE'));
    panelAt(PARIS, trySpend);
    const unlock = () => screen.getByRole('button', { name: /Unlock for 250 Moonstones/ });
    fireEvent.click(unlock());
    await screen.findByText(/Could not generate the reading/, undefined, { timeout: 3000 });
    await waitFor(() => expect(unlock()).not.toBeDisabled());
    fireEvent.click(unlock());
    await waitFor(() => expect(trySpend).toHaveBeenCalledTimes(2));
    await act(async () => { await later(null, 60); });
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
  });

  it('Find Your Place: lost reply, then REQUEST_ALREADY_USED — says so, prices "Try the reading again", and that press is a new id, gated', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementationOnce(() => httpError(409, 'REQUEST_ALREADY_USED'));
    invoke.mockImplementation(() => later({ data: { data: placeReading }, error: null }));
    finder(trySpend);
    fireEvent.click(card());
    const retry = await screen.findByRole('button', { name: /Try the reading again/ }, { timeout: 4000 });
    // The first failure is a free retry of the same request: no price beside it.
    expect(screen.getByRole('dialog')).not.toHaveTextContent('250 Moonstones');
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await screen.findByText(/already given once and can’t be shown again/, undefined, { timeout: 4000 });
    const again = screen.getByRole('button', { name: /Try the reading again/ });
    await waitFor(() => expect(again.parentElement).toHaveTextContent('Each reading uses 250 Moonstones · You have 300'));
    await waitFor(() => expect(again).not.toBeDisabled());
    fireEvent.click(again);
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    const ids = callsTo('celestial-travel-reading').map((_, i) => bodyOf('celestial-travel-reading', i).requestId);
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
    expect(trySpend).toHaveBeenCalledTimes(2);
  });

  it('Find Your Place: 402 INSUFFICIENT_BALANCE — "Try the reading again" is priced and goes through the gate', async () => {
    const trySpend = vi.fn<() => Promise<boolean>>().mockImplementationOnce(() => later(true)).mockImplementation(() => later(false));
    invoke.mockImplementation(() => httpError(402, 'INSUFFICIENT_BALANCE'));
    finder(trySpend);
    fireEvent.click(card());
    const retry = await screen.findByRole('button', { name: /Try the reading again/ }, { timeout: 4000 });
    await waitFor(() => expect(retry.parentElement).toHaveTextContent('Each reading uses 250 Moonstones'));
    await waitFor(() => expect(retry).not.toBeDisabled());
    fireEvent.click(retry);
    await waitFor(() => expect(trySpend).toHaveBeenCalledTimes(2));
    await act(async () => { await later(null, 60); });
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
  });
});
