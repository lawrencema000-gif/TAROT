import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * The free tier's daily allowance, claimed per account on the server
 * (p12 tarot-09, D08 A). A refusal is the server's; anything that is not an
 * answer (an error, a lost connection, the timeout) is 'unavailable', and the
 * caller falls back to the device's count.
 */

const rpc = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => ({ abortSignal: (s: AbortSignal) => rpc(...a, s) }),
    from: (...a: unknown[]) => {
      from(...a);
      return {
        select: (...b: unknown[]) => {
          select(...b);
          return {
            eq: (...c: unknown[]) => {
              eq(...c);
              return { abortSignal: (s: AbortSignal) => ({ maybeSingle: () => maybeSingle(s) }) };
            },
          };
        },
      };
    },
  },
}));
const captureException = vi.fn();
vi.mock('../utils/telemetry', () => ({ captureException: (...a: unknown[]) => captureException(...a) }));

import { claimFreeReading, usedToday } from './freeReadings';

describe('freeReadings.claimFreeReading', () => {
  beforeEach(() => {
    rpc.mockReset();
    captureException.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('an allowed claim reads the count, the limit and Premium', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: true, used_today: 2, daily_limit: 3, premium: false }], error: null });
    await expect(claimFreeReading('2026-11-15')).resolves.toEqual({ status: 'allowed', used: 2, limit: 3, premium: false });
    expect(rpc).toHaveBeenCalledWith('claim_free_reading', { p_local_date: '2026-11-15' }, expect.any(AbortSignal));
  });

  it('the fourth is refused', async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, used_today: 3, daily_limit: 3, premium: false }], error: null });
    await expect(claimFreeReading('2026-11-15')).resolves.toEqual({ status: 'refused', used: 3, limit: 3 });
  });

  it('a database error is unavailable and reported', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'p_local_date must be within one day of the UTC date' } });
    await expect(claimFreeReading('2026-11-15')).resolves.toEqual({ status: 'unavailable' });
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('a lost connection is unavailable and not reported', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch' } });
    await expect(claimFreeReading('2026-11-15')).resolves.toEqual({ status: 'unavailable' });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('an empty or malformed answer is unavailable', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(claimFreeReading('2026-11-15')).resolves.toEqual({ status: 'unavailable' });
    rpc.mockResolvedValue({ data: [{ used_today: 1 }], error: null });
    await expect(claimFreeReading('2026-11-15')).resolves.toEqual({ status: 'unavailable' });
  });

  it('a slow server times out to unavailable', async () => {
    vi.useFakeTimers();
    rpc.mockImplementation((_n: string, _a: unknown, signal: AbortSignal) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('AbortError')))),
    );
    const out = claimFreeReading('2026-11-15', 20);
    await vi.advanceTimersByTimeAsync(20);
    await expect(out).resolves.toEqual({ status: 'unavailable' });
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe('freeReadings.usedToday', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    eq.mockReset();
    from.mockReset();
  });

  it("reads the day's row", async () => {
    maybeSingle.mockResolvedValue({ data: { used: 2 }, error: null });
    await expect(usedToday('2026-11-15')).resolves.toEqual({ ok: true, data: 2 });
    expect(from).toHaveBeenCalledWith('free_reading_claims');
    expect(eq).toHaveBeenCalledWith('reading_date', '2026-11-15');
  });

  it('no row is 0', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(usedToday('2026-11-15')).resolves.toEqual({ ok: true, data: 0 });
  });

  it('an error is not ok', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(usedToday('2026-11-15')).resolves.toEqual({ ok: false, error: 'boom' });
  });
});
