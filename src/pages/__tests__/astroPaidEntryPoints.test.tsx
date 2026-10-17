import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createElement, forwardRef, type ReactNode } from 'react';

/*
 * p8 F20: the paid entry points of People, the Celestial Map and Human
 * Design. The gate check is a round trip, and a second tap that landed while
 * it was in flight used to pass every test, mint its own requestId and be
 * charged as a second reading (−100 or −500 Moonstones for one reading).
 *
 * Both taps are dispatched inside one act(), so React has not re-rendered
 * between them: the button is not disabled yet and only the synchronous
 * in-flight guard can stop the second tap — the case a real double tap hits
 * on a slow phone. Then: the button is disabled while the gate answers, the
 * request carries a requestId, and a retry after a failure re-sends that
 * same id without asking the gate again (the server's free replay).
 */

const USER = { id: '00000000-0000-4000-8000-0000000000e2', email: 'qa@example.com' };
const PROFILE = {
  id: USER.id, displayName: 'QA', birthDate: '1991-03-08', birthTime: '06:45', birthLat: 34.6937, birthLon: 135.5023,
  birthTz: 'Asia/Tokyo', timezone: 'Asia/Tokyo', isPremium: false,
};

const invoke = vi.fn();
const rpc = vi.fn();
const chain: Record<string, unknown> = {};
for (const m of ['select', 'eq', 'order', 'in', 'like', 'limit', 'gte', 'lte', 'neq', 'is', 'filter']) chain[m] = () => chain;
chain.maybeSingle = async () => ({ data: { balance: 500 }, error: null });
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
  useAuth: () => ({ user: USER, profile: PROFILE, updateProfile: async () => ({ error: null }), refreshProfile: async () => {} }),
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
import { PersonAIReading } from '../../components/people/PersonAIReading';
import { CityInsightPanel } from '../../components/celestial/CityInsightPanel';
import { FindYourPlace } from '../../components/celestial/FindYourPlace';
import { HumanDesignPage } from '../HumanDesignPage';
import type { PlanetName, Angle } from '../../utils/astrocartography';

const later = <T,>(value: T, ms = 40) => new Promise<T>((r) => setTimeout(() => r(value), ms));
const gateOpen = () => later({ data: [{ allowed: true, balance: 500, premium_bypass: false, soft_cap_reached: false, reset_at: null, daily_used: 0 }], error: null });
const gateCalls = () => rpc.mock.calls.filter((c) => c[0] === 'action_gate_status').length;
const callsTo = (fn: string) => invoke.mock.calls.filter((c) => c[0] === fn);
const bodyOf = (fn: string, i: number) => (callsTo(fn)[i][1] as { body: Record<string, unknown> }).body;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** No response at all: the debit may have landed, so the retry is the same request. */
const dropped = () => later({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } });

/** Two taps in the same frame: React does not re-render between them. */
function doubleTap(el: HTMLElement) {
  act(() => {
    fireEvent.click(el);
    fireEvent.click(el);
  });
}

type Lines = GeoJSON.FeatureCollection<GeoJSON.LineString, { planet: PlanetName; angle: Angle }>;
/** Two meridian lines through Paris (2.35° E), sampled densely enough that every listed city near them scores. */
function linesThroughParis(): Lines {
  const meridian = (planet: PlanetName, angle: Angle, lon: number): GeoJSON.Feature<GeoJSON.LineString, { planet: PlanetName; angle: Angle }> => ({
    type: 'Feature',
    properties: { planet, angle },
    geometry: { type: 'LineString', coordinates: Array.from({ length: 161 }, (_, i) => [lon, -80 + i] as [number, number]) },
  });
  return { type: 'FeatureCollection', features: [meridian('Venus', 'MC', 2.3522), meridian('Jupiter', 'IC', 2.3522)] };
}

function mount(node: ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeAll(async () => {
  await i18n.changeLanguage('en');
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
});

beforeEach(() => {
  invoke.mockReset();
  rpc.mockReset();
  rpc.mockImplementation((name: string) => (name === 'action_gate_status' ? gateOpen() : later({ data: null, error: null })));
});
afterEach(() => cleanup());

describe('PersonAIReading — "Reveal reading" (50 Moonstones)', () => {
  it('a double tap during the gate check is one gate check, one request, one id; the button is disabled meanwhile', async () => {
    invoke.mockImplementation(() => later({ data: { data: { reading: 'Ann’s chart reads warm.' } }, error: null }));
    mount(<PersonAIReading personId="p-1" personName="Ann" />);
    const btn = screen.getByRole('button', { name: 'Reveal reading' });
    doubleTap(btn);
    // The gate is still answering (40 ms): already disabled, already saying so.
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Reading the stars…');
    await screen.findByText('Ann’s chart reads warm.', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('ai-person-reading')).toHaveLength(1);
    expect(bodyOf('ai-person-reading', 0)).toMatchObject({ personId: 'p-1', focus: 'overview', locale: 'en' });
    expect(bodyOf('ai-person-reading', 0).requestId).toMatch(UUID);
  });

  it('a retry after a dropped response re-sends the same id and skips the gate', async () => {
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementationOnce(() => later({ data: { data: { reading: 'Second time lucky.' } }, error: null }));
    mount(<PersonAIReading personId="p-1" personName="Ann" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal reading' }));
    await waitFor(() => expect(callsTo('ai-person-reading')).toHaveLength(1));
    const retry = await screen.findByRole('button', { name: 'Reveal reading' });
    await waitFor(() => expect(retry).not.toBeDisabled());
    doubleTap(retry);
    await screen.findByText('Second time lucky.', undefined, { timeout: 3000 });
    expect(callsTo('ai-person-reading')).toHaveLength(2);
    expect(bodyOf('ai-person-reading', 1).requestId).toBe(bodyOf('ai-person-reading', 0).requestId);
    expect(gateCalls()).toBe(1);
  });

  it('REQUEST_ALREADY_USED ends that id: the next press is a new, gated request', async () => {
    invoke.mockImplementationOnce(() => later({
      data: null,
      error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code: 'REQUEST_ALREADY_USED' } }), { status: 409 }) },
    }));
    invoke.mockImplementationOnce(() => later({ data: { data: { reading: 'A new reading.' } }, error: null }));
    mount(<PersonAIReading personId="p-1" personName="Ann" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal reading' }));
    await waitFor(() => expect(callsTo('ai-person-reading')).toHaveLength(1));
    const again = await screen.findByRole('button', { name: 'Reveal reading' });
    await waitFor(() => expect(again).not.toBeDisabled());
    fireEvent.click(again);
    await screen.findByText('A new reading.', undefined, { timeout: 3000 });
    expect(bodyOf('ai-person-reading', 1).requestId).not.toBe(bodyOf('ai-person-reading', 0).requestId);
    expect(gateCalls()).toBe(2);
  });
});

describe('CityInsightPanel — "Unlock for 250 Moonstones"', () => {
  const reading = { verdict: 'Paris suits you.', body: 'Venus is high here.', lineNotes: [], cautionsNote: 'Rest.', practice: 'Walk.' };

  function panel(trySpend: () => Promise<boolean>) {
    const lines = linesThroughParis();
    return mount(
      <CityInsightPanel
        open
        onClose={() => {}}
        point={{ lat: 48.8566, lon: 2.3522 }}
        visibleLines={lines}
        allLines={lines}
        isPremium={false}
        birthUtc="1991-03-07T21:45:00.000Z"
        intent="love"
        zodiacSign="pisces"
        locale="ja"
        trySpend={trySpend}
        onUpgrade={() => {}}
      />,
    );
  }

  it('a double tap is one spend gate and one 250-Moonstone request, with an id and the reader’s locale', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementation(() => later({ data: { data: reading }, error: null }));
    panel(trySpend);
    const btn = screen.getByRole('button', { name: /Unlock for 250 Moonstones/ });
    doubleTap(btn);
    expect(btn).toBeDisabled();
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    expect(trySpend).toHaveBeenCalledTimes(1);
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
    const body = bodyOf('celestial-travel-reading', 0);
    expect(body.requestId).toMatch(UUID);
    expect(body).toMatchObject({ intent: 'love', city: { name: 'Paris' }, userContext: { locale: 'ja' } });
  });

  it('a retry after a failure re-sends the same id and does not spend again', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementationOnce(() => later({ data: { data: reading }, error: null }));
    panel(trySpend);
    fireEvent.click(screen.getByRole('button', { name: /Unlock for 250 Moonstones/ }));
    await screen.findByText(/Could not generate the reading/, undefined, { timeout: 3000 });
    const retry = screen.getByRole('button', { name: /Unlock for 250 Moonstones/ });
    await waitFor(() => expect(retry).not.toBeDisabled());
    doubleTap(retry);
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    expect(callsTo('celestial-travel-reading')).toHaveLength(2);
    expect(bodyOf('celestial-travel-reading', 1).requestId).toBe(bodyOf('celestial-travel-reading', 0).requestId);
    expect(trySpend).toHaveBeenCalledTimes(1);
  });

  it('a refused spend sends nothing, and the next press asks the gate again', async () => {
    const trySpend = vi.fn().mockImplementationOnce(() => later(false)).mockImplementation(() => later(true));
    invoke.mockImplementation(() => later({ data: { data: reading }, error: null }));
    panel(trySpend);
    const btn = screen.getByRole('button', { name: /Unlock for 250 Moonstones/ });
    fireEvent.click(btn);
    await waitFor(() => expect(btn).not.toBeDisabled());
    expect(callsTo('celestial-travel-reading')).toHaveLength(0);
    fireEvent.click(btn);
    await screen.findByText('Paris suits you.', undefined, { timeout: 3000 });
    expect(trySpend).toHaveBeenCalledTimes(2);
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
  });
});

describe('FindYourPlace — "Find your destined place" (250 Moonstones)', () => {
  const reading = { verdict: 'Your place.', body: 'Love finds you here.', lineNotes: [], cautionsNote: 'c', practice: 'p', closingBlessing: 'b' };

  function finder(trySpend: () => Promise<boolean>, onReveal = vi.fn()) {
    mount(
      <FindYourPlace
        allLines={linesThroughParis()}
        intent="love"
        birthUtc="1991-03-07T21:45:00.000Z"
        zodiacSign="pisces"
        locale="ko"
        isPremium={false}
        onUpgrade={() => {}}
        trySpend={trySpend}
        onReveal={onReveal}
        onSave={async () => {}}
      />,
    );
    return screen.getByRole('button', { name: /Find your destined place/ });
  }

  it('a double tap is one spend gate and one request with an id', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementation(() => later({ data: { data: reading }, error: null }));
    doubleTap(finder(trySpend));
    // Queried again: the motion stand-in remounts the button on each render.
    expect(screen.getByRole('button', { name: /Find your destined place/ })).toBeDisabled();
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    expect(trySpend).toHaveBeenCalledTimes(1);
    expect(callsTo('celestial-travel-reading')).toHaveLength(1);
    const body = bodyOf('celestial-travel-reading', 0);
    expect(body).toMatchObject({ mode: 'best-place', intent: 'love', userContext: { locale: 'ko' } });
    expect(body.requestId).toMatch(UUID);
  });

  it('"Try the reading again" re-reads the same place with the same id, unpaid — not the next city', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementationOnce(() => later({ data: { data: reading }, error: null }));
    const onReveal = vi.fn();
    finder(trySpend, onReveal);
    fireEvent.click(screen.getByRole('button', { name: /Find your destined place/ }));
    await screen.findByRole('button', { name: /Try the reading again/ }, { timeout: 4000 });
    await waitFor(() => expect(screen.getByRole('button', { name: /Try the reading again/ })).not.toBeDisabled());
    doubleTap(screen.getByRole('button', { name: /Try the reading again/ }));
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    expect(callsTo('celestial-travel-reading')).toHaveLength(2);
    const [first, second] = [bodyOf('celestial-travel-reading', 0), bodyOf('celestial-travel-reading', 1)];
    expect(second.requestId).toBe(first.requestId);
    expect(second.city).toEqual(first.city);
    expect(trySpend).toHaveBeenCalledTimes(1);
  });

  it('"Show me a different place" is a new place, a new id and a new spend — once per double tap', async () => {
    const trySpend = vi.fn(() => later(true));
    invoke.mockImplementation(() => later({ data: { data: reading }, error: null }));
    finder(trySpend);
    fireEvent.click(screen.getByRole('button', { name: /Find your destined place/ }));
    await screen.findByText('Your place.', undefined, { timeout: 4000 });
    doubleTap(screen.getByRole('button', { name: /Show me a different place/ }));
    await waitFor(() => expect(callsTo('celestial-travel-reading')).toHaveLength(2), { timeout: 3000 });
    await waitFor(() => expect(screen.getByRole('button', { name: /Show me a different place/ })).not.toBeDisabled());
    expect(trySpend).toHaveBeenCalledTimes(2);
    const [first, second] = [bodyOf('celestial-travel-reading', 0), bodyOf('celestial-travel-reading', 1)];
    expect(second.requestId).not.toBe(first.requestId);
    expect(second.city).not.toEqual(first.city);
  });
});

describe('HumanDesignPage — "Reveal my design" (50 Moonstones)', () => {
  const chart = {
    type: 'Generator', strategy: 'Respond', notSelfTheme: 'Frustration', signature: 'Satisfaction', authority: 'Sacral',
    authorityExplanation: 'Your gut.', profile: '2/4', profileLines: [2, 4], definedCenters: ['Sacral'], openCenters: [],
    channels: [], definedGates: [], personality: [], design: [],
  };

  it('a double tap is one gate check and one request, with an id and the birth place’s zone', async () => {
    invoke.mockImplementation(() => later({ data: { data: chart }, error: null }));
    mount(<HumanDesignPage />);
    const btn = screen.getByRole('button', { name: 'Reveal my design' });
    doubleTap(btn);
    expect(screen.getByRole('button', { name: /Computing your bodygraph/ })).toBeDisabled();
    await waitFor(() => expect(callsTo('human-design-chart')).toHaveLength(1), { timeout: 3000 });
    await screen.findAllByText('Satisfaction', undefined, { timeout: 3000 });
    expect(gateCalls()).toBe(1);
    expect(callsTo('human-design-chart')).toHaveLength(1);
    const body = bodyOf('human-design-chart', 0);
    expect(body).toMatchObject({ birthDate: '1991-03-08', birthTime: '06:45', timezone: 'Asia/Tokyo' });
    expect(body.requestId).toMatch(UUID);
  });

  it('a retry after a dropped response re-sends the same id and skips the gate', async () => {
    invoke.mockImplementationOnce(dropped);
    invoke.mockImplementationOnce(() => later({ data: { data: chart }, error: null }));
    mount(<HumanDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal my design' }));
    await waitFor(() => expect(callsTo('human-design-chart')).toHaveLength(1));
    const retry = await screen.findByRole('button', { name: 'Reveal my design' }, { timeout: 3000 });
    doubleTap(retry);
    await screen.findAllByText('Satisfaction', undefined, { timeout: 3000 });
    expect(callsTo('human-design-chart')).toHaveLength(2);
    expect(bodyOf('human-design-chart', 1).requestId).toBe(bodyOf('human-design-chart', 0).requestId);
    expect(gateCalls()).toBe(1);
  });

  it('REQUEST_ALREADY_USED ends that id: no retry loop, and the next press is a new, gated request', async () => {
    invoke.mockImplementationOnce(() => later({
      data: null,
      error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code: 'REQUEST_ALREADY_USED' } }), { status: 409 }) },
    }));
    invoke.mockImplementationOnce(() => later({ data: { data: chart }, error: null }));
    mount(<HumanDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal my design' }));
    await waitFor(() => expect(callsTo('human-design-chart')).toHaveLength(1));
    const again = await screen.findByRole('button', { name: 'Reveal my design' }, { timeout: 3000 });
    fireEvent.click(again);
    await screen.findAllByText('Satisfaction', undefined, { timeout: 3000 });
    expect(bodyOf('human-design-chart', 1).requestId).not.toBe(bodyOf('human-design-chart', 0).requestId);
    expect(gateCalls()).toBe(2);
  });

  it('a 402 after the gate (the balance moved) ends the id and re-reads the gate', async () => {
    invoke.mockImplementationOnce(() => later({
      data: null,
      error: { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code: 'INSUFFICIENT_BALANCE' } }), { status: 402 }) },
    }));
    invoke.mockImplementationOnce(() => later({ data: { data: chart }, error: null }));
    mount(<HumanDesignPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal my design' }));
    await waitFor(() => expect(gateCalls()).toBe(2), { timeout: 3000 });
    const again = await screen.findByRole('button', { name: 'Reveal my design' });
    fireEvent.click(again);
    await screen.findAllByText('Satisfaction', undefined, { timeout: 3000 });
    expect(bodyOf('human-design-chart', 1).requestId).not.toBe(bodyOf('human-design-chart', 0).requestId);
    expect(gateCalls()).toBe(3);
  });
});
