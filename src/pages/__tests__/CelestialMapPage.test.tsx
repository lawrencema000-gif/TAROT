import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p9 R31 (RQA-1): the Celestial Map page names and reads the place the
 * member picked. A place picked from the search (any town the place search
 * knows — every ja/ko/zh search goes there) opened the panel, and sold the
 * 250-Moonstone reading, for the nearest of the 205 listed cities: 福岡 was
 * named and read as Busan, 213 km away. The panel takes the picked place
 * since the last round; the page now hands it over (search, a listed city,
 * the destined place), drops it on a map tap, and the paywall's preview
 * names it too.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000d1', email: 'qa@example.com' };
type Dp = { city: { name: string; country: string; cc: string; lat: number; lon: number }; intent: 'love'; savedAt: string };
const auth: { destinedPlace: Dp | null } = { destinedPlace: null };

const FUKUOKA = { lat: 33.5902, lon: 130.4017 };
const FUKUOKA_ROW = { lat: FUKUOKA.lat, lon: FUKUOKA.lon, displayName: '福岡市, 福岡県, 日本' };
/** Where the stubbed map canvas is tapped. */
const tap = { lon: FUKUOKA.lon, lat: FUKUOKA.lat };

const invoke = vi.fn();
const trySpend = vi.fn(async () => true);
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 300 }, error: null });
chain.single = async () => ({ data: null, error: null });
chain.then = (resolve: (v: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    rpc: async () => ({ data: null, error: null }),
    from: () => chain,
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
    removeChannel: () => {},
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: USER,
    profile: {
      id: USER.id,
      displayName: 'QA',
      birthDate: '1991-03-08',
      birthTime: '06:45',
      birthUtc: '1991-03-07T21:45:00.000Z',
      isPremium: false,
      destinedPlace: auth.destinedPlace ?? undefined,
    },
    refreshProfile: async () => {},
    updateProfile: async () => ({ error: null }),
  }),
}));
vi.mock('../../utils/telemetry', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: trySpend, EarnSheet: null }) }));
vi.mock('../../components/horoscope/birthZone', () => ({ useBirthTzBackfill: () => {} }));
// The place search: 福岡 is answered by the geocoder, not the listed cities.
vi.mock('../../hooks/useAstrology', async () => {
  const React = await import('react');
  return {
    useGeocode: () => {
      const [state, setState] = React.useState<{ results: typeof FUKUOKA_ROW[]; query: string; loading: boolean }>({ results: [], query: '', loading: false });
      const search = React.useCallback(async (q: string) => {
        setState((s) => ({ ...s, loading: true }));
        await new Promise((r) => setTimeout(r, 10));
        setState({ results: q === '福岡' ? [FUKUOKA_ROW] : [], query: q, loading: false });
      }, []);
      return { ...state, error: null, search, usedFallback: false, regionMissed: false };
    },
  };
});
// Three meridians through Fukuoka: the Sun line a free reader sees, two locked ones.
vi.mock('../../utils/astrocartography', async (orig) => {
  const real = await orig<Record<string, unknown>>();
  const line = (planet: string, angle: string) => ({
    type: 'Feature',
    properties: { planet, angle },
    geometry: { type: 'LineString', coordinates: Array.from({ length: 161 }, (_, i) => [130.4017, -80 + i]) },
  });
  return {
    ...real,
    computeCelestialLines: () => ({ type: 'FeatureCollection', features: [line('Sun', 'MC'), line('Venus', 'MC'), line('Jupiter', 'IC')] }),
  };
});
// The map canvas (SVG + d3-zoom) is not under test: a tap on it is a button.
vi.mock('../../components/celestial/CelestialMapView', () => ({
  CelestialMapView: ({ onMapClick }: { onMapClick?: (lonLat: [number, number]) => void }) => (
    <button type="button" onClick={() => onMapClick?.([tap.lon, tap.lat])}>map-tap</button>
  ),
}));
vi.mock('../../components/celestial/CelestialMapIntroLoader', () => ({ CelestialMapIntroLoader: () => null }));
// The paywall: only the preview the page hands it is under test.
vi.mock('../../components/premium/PaywallSheet', () => ({
  PaywallSheet: ({ open, preview }: { open: boolean; preview?: ReactNode }) => (open ? <div data-testid="paywall">{preview}</div> : null),
}));
vi.mock('framer-motion', () => {
  const strip = ({ initial, animate, exit, transition, whileTap, whileHover, whileInView, viewport, layout, variants, ...rest }: Record<string, unknown>) => {
    void initial; void animate; void exit; void transition; void whileTap; void whileHover; void whileInView; void viewport; void layout; void variants;
    return rest;
  };
  // One component per tag, so a re-render does not remount what is inside it.
  const cache = new Map<string, unknown>();
  const motion = new Proxy({}, {
    get: (_t, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, forwardRef<HTMLElement, Record<string, unknown>>(function M(props, ref) {
          const { children, ...rest } = props as { children?: ReactNode } & Record<string, unknown>;
          return createElement(tag, { ...strip(rest), ref }, children);
        }));
      }
      return cache.get(tag);
    },
  });
  return {
    motion,
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    LayoutGroup: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => true,
  };
});

import i18n from '../../i18n/config';
import { CelestialMapPage } from '../CelestialMapPage';

const reading = { verdict: '福岡はあなたに合います。', body: '金星が高く昇ります。', lineNotes: [], cautionsNote: '休んで。', practice: '歩いて。' };
const readingCalls = () => invoke.mock.calls.filter((c) => c[0] === 'celestial-travel-reading');

function mountPage() {
  return render(<MemoryRouter><CelestialMapPage /></MemoryRouter>);
}

/** Type 福岡 into the city search and pick the place the place search answers. */
async function pickFukuokaFromSearch() {
  fireEvent.change(screen.getByRole('textbox', { name: '都市を検索' }), { target: { value: '福岡' } });
  fireEvent.click(await screen.findByRole('button', { name: /福岡市/ }, { timeout: 3000 }));
}

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});
beforeEach(async () => {
  auth.destinedPlace = null;
  tap.lon = FUKUOKA.lon;
  tap.lat = FUKUOKA.lat;
  invoke.mockReset();
  invoke.mockImplementation(async () => ({ data: { data: reading }, error: null }));
  trySpend.mockClear();
  await i18n.changeLanguage('ja');
});
afterEach(() => {
  cleanup();
  document.body.classList.remove('sheet-open');
  document.body.style.overflow = '';
});

describe('Celestial Map: the panel names and reads the place the member picked (p9 R31)', { timeout: 20_000 }, () => {
  it('a place picked from the search opens the panel for it, and the 250-Moonstone reading is about it — not Busan', async () => {
    mountPage();
    await pickFukuokaFromSearch();
    const panel = await screen.findByRole('dialog', { name: '福岡市' });
    expect(within(panel).getByRole('heading', { level: 2 })).toHaveTextContent('福岡市');
    expect(within(panel).queryByText(/Busan/)).toBeNull();
    expect(within(panel).queryByText(/タップした地点から/)).toBeNull();
    fireEvent.click(within(panel).getByRole('button', { name: /ムーンストーン250個で解放する/ }));
    await waitFor(() => expect(readingCalls()).toHaveLength(1));
    const body = readingCalls()[0][1].body as { city: unknown };
    expect(body.city).toEqual({ name: '福岡市', country: '福岡県, 日本', lat: FUKUOKA.lat, lon: FUKUOKA.lon });
  });

  it('the paywall opened from that panel counts the locked lines through the picked place, by its name', async () => {
    mountPage();
    await pickFukuokaFromSearch();
    const panel = await screen.findByRole('dialog', { name: '福岡市' });
    fireEvent.click(within(panel).getByRole('button', { name: /ほかに2本の惑星ラインがここを通っています/ }));
    expect(await screen.findByTestId('paywall')).toHaveTextContent('ほかに2本のラインが福岡市を通っています');
  });

  it('a tap on the map after a pick is a tap again: the nearest listed city, with its distance from the tap', async () => {
    mountPage();
    await pickFukuokaFromSearch();
    await screen.findByRole('dialog', { name: '福岡市' });
    // The very spot the pick was at: only the tap, not the place, says what it is now.
    fireEvent.click(screen.getByRole('button', { name: 'map-tap' }));
    const panel = await screen.findByRole('dialog', { name: 'Busan' });
    expect(within(panel).getByText(/タップした地点から\d+km/)).toBeInTheDocument();
  });

  it('the destined place revisited is the saved place, not a tap near it', async () => {
    auth.destinedPlace = {
      city: { name: 'Paris', country: 'France', cc: 'FR', lat: 48.8566, lon: 2.3522 },
      intent: 'love',
      savedAt: '2026-10-01T00:00:00.000Z',
    };
    mountPage();
    fireEvent.click(screen.getByRole('button', { name: /あなたの運命の場所/ }));
    const panel = await screen.findByRole('dialog', { name: 'Paris' });
    expect(within(panel).queryByText(/タップした地点から/)).toBeNull();
  });
});
