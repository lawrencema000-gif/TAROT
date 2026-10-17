import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import '../../../i18n/config';
import { lazyWithReload, __resetStaleChunkProbe } from '../staleChunk';
import { ErrorBoundary } from '../../error/ErrorBoundary';

/*
 * p9 R24: a screen whose chunk failed to load while the network was down
 * stayed broken for the rest of the session. lazyWithReload rethrew the
 * failure (no reload while offline, p8 F44), React.lazy kept that rejection,
 * and React 18 never calls a rejected lazy component's factory again: the
 * route card's "Reload this screen" re-rendered the same error, and so did
 * leaving the tab and coming back. Only a full reload brought the screen
 * back. The screen now waits for the connection and loads then.
 */

const ORIGIN = 'http://localhost:3000';
const CHROME = `Failed to fetch dynamically imported module: ${ORIGIN}/assets/QuizzesPage-CE2makJ8.js`;

let online = false;
let serverUp = false;
const fetchProbe = vi.fn(() => (serverUp ? Promise.resolve(new Response('', { status: 200 })) : Promise.reject(new TypeError('Failed to fetch'))));
const reload = vi.fn();
const origLocation = window.location;
const onLineDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

function goOnline() {
  online = true;
  serverUp = true;
  window.dispatchEvent(new Event('online'));
}

/** A screen whose first import fails as Chrome reports a fetch that never reached a server. */
function flakyScreen(firstError: Error = new TypeError(CHROME)) {
  const factory = vi.fn((): Promise<{ default: () => JSX.Element }> =>
    factory.mock.calls.length === 1 ? Promise.reject(firstError) : Promise.resolve({ default: () => <p>quizzes-screen</p> }),
  );
  return { Screen: lazyWithReload(factory), factory };
}

function renderRoute(Screen: ReturnType<typeof flakyScreen>['Screen']) {
  return render(
    <ErrorBoundary>
      <Suspense fallback={<p>screen-loading</p>}>
        <Screen />
      </Suspense>
    </ErrorBoundary>,
  );
}

describe('lazyWithReload: a screen that failed offline loads when the connection is back (p9 R24)', () => {
  beforeEach(() => {
    cleanup();
    online = false;
    serverUp = false;
    fetchProbe.mockClear();
    reload.mockClear();
    sessionStorage.clear();
    __resetStaleChunkProbe();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
    vi.stubGlobal('fetch', fetchProbe);
    Object.defineProperty(window, 'location', { configurable: true, value: { ...origLocation, origin: ORIGIN, reload } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete (navigator as unknown as Record<string, unknown>).onLine;
    if (onLineDescriptor) Object.defineProperty(Navigator.prototype, 'onLine', onLineDescriptor);
    Object.defineProperty(window, 'location', { configurable: true, value: origLocation });
  });

  it('back online, the screen loads in place: no reload, and the factory is asked again', async () => {
    const { Screen, factory } = flakyScreen();
    renderRoute(Screen);
    await act(async () => {});
    expect(factory).toHaveBeenCalledTimes(1);

    await act(async () => { goOnline(); });
    // The card's own retry, should the card be up (the old behaviour): it must not be needed.
    const retry = screen.queryByRole('button', { name: 'Reload this screen' });
    if (retry) fireEvent.click(retry);
    expect(await screen.findByText('quizzes-screen')).toBeTruthy();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.queryByText('This screen stopped')).toBeNull();
  });

  it('a connection that is down without saying so is probed again until the server answers', async () => {
    vi.useFakeTimers();
    online = true; // the browser believes it is online; the probe does not get through
    const { Screen, factory } = flakyScreen();
    renderRoute(Screen);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('screen-loading')).toBeTruthy();
    const probesSoFar = fetchProbe.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(fetchProbe.mock.calls.length).toBeGreaterThan(probesSoFar);
    expect(factory).toHaveBeenCalledTimes(1);

    serverUp = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(31_000); });
    vi.useRealTimers();
    expect(await screen.findByText('quizzes-screen')).toBeTruthy();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
  });

  it('a browser that kept the failed module answers again with the error: then the page reloads, now that it can land', async () => {
    const factory = vi.fn((): Promise<{ default: () => JSX.Element }> => Promise.reject(new TypeError(CHROME)));
    const Screen = lazyWithReload(factory);
    renderRoute(Screen);
    await act(async () => {});
    expect(reload).not.toHaveBeenCalled();
    await act(async () => { goOnline(); });
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('a stale deploy still reloads at once when the server answers', async () => {
    online = true;
    serverUp = true;
    const { Screen } = flakyScreen(new TypeError("'text/html' is not a valid JavaScript MIME type."));
    renderRoute(Screen);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.getByText('screen-loading')).toBeTruthy();
  });

  it('a module that loads but throws is an error, shown at once', async () => {
    online = true;
    serverUp = true;
    const { Screen } = flakyScreen(new Error('x is undefined'));
    renderRoute(Screen);
    expect(await screen.findByText('This screen stopped')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });
});
