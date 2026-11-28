/**
 * useVersionCheck asks installed apps to update only when a newer RELEASE is
 * live, not whenever the live commit differs (health-status-23): version.json
 * names the commit of every web deploy now, and most web deploys put nothing
 * new on Google Play.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ native: true }));
vi.mock('../utils/platform', () => ({ isNative: () => platform.native }));

import { isNewerRelease, useVersionCheck } from './useVersionCheck';

const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const LIVE_URL = 'https://tarotlife.app/version.json';
const SHA_A = '843cd0fd7ebe38121220f611bbbb84b2d9f871ae';
const SHA_B = '1175c4caa4946a0ac5480c208df8c906fd17861a';

/** The bundled /version.json and the live one; 'unreachable' = what a missing CORS header looks like to fetch. */
function stubVersions(bundled: Record<string, string>, live: Record<string, string> | 'unreachable') {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === LIVE_URL) {
      if (live === 'unreachable') throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(live), { status: 200 });
    }
    return new Response(JSON.stringify(bundled), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  platform.native = true;
});

describe('isNewerRelease', () => {
  it.each([
    ['1.2.0', '1.3.0', true],
    ['1.3.0', '1.3.0', false],
    ['1.3.0', '1.2.9', false],
    ['1.9.0', '1.10.0', true],
    ['1.10.0', '1.9.0', false],
    ['1.1.10', '1.3.0', true],
    [undefined, '1.3.0', false],
    ['local', '1.3.0', false],
    ['1.3.0', '1.3', false],
  ])('bundled %s, live %s → %s', (bundled, live, want) => {
    expect(isNewerRelease(bundled, live)).toBe(want);
  });
});

describe('useVersionCheck on an installed app', () => {
  it('same release, another commit: not stale, no prompt', async () => {
    const live = { sha: SHA_B, version: '1.3.0', builtAt: ago(1 * DAY) };
    stubVersions({ sha: SHA_A, version: '1.3.0', builtAt: ago(30 * DAY) }, live);
    const { result } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(result.current.liveBuiltAt).toBe(live.builtAt));
    expect(result.current.isStale).toBe(false);
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('a newer release, bundle 30 days old: prompt', async () => {
    stubVersions({ sha: SHA_A, version: '1.2.0', builtAt: ago(30 * DAY) }, { sha: SHA_B, version: '1.3.0', builtAt: ago(1 * DAY) });
    const { result } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(result.current.shouldPrompt).toBe(true));
    expect(result.current.isStale).toBe(true);
  });

  it('a newer release, bundle 2 days old: stale, no prompt yet', async () => {
    stubVersions({ sha: SHA_A, version: '1.2.0', builtAt: ago(2 * DAY) }, { sha: SHA_B, version: '1.3.0', builtAt: ago(1 * DAY) });
    const { result } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(result.current.isStale).toBe(true));
    expect(result.current.shouldPrompt).toBe(false);
  });

  it('live file unreachable: stays at the initial state', async () => {
    const fetchMock = stubVersions({ sha: SHA_A, version: '1.2.0', builtAt: ago(30 * DAY) }, 'unreachable');
    const { result } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(result.current).toEqual({ isStale: false, shouldPrompt: false, liveBuiltAt: null, bundledBuiltAt: null });
  });
});

it('on the web: never fetches', () => {
  platform.native = false;
  const fetchMock = stubVersions({}, {});
  renderHook(() => useVersionCheck());
  expect(fetchMock).not.toHaveBeenCalled();
});
