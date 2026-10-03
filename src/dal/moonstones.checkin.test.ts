/**
 * p7 #115: a repeat daily check-in (second tab, second device, a widget left
 * open since before the claim) must read as "already checked in" — 0 credited
 * — never as a fresh "+100". The DAL answers from today's row without calling
 * the RPC, whose pre-20261003000012 repeat branch returned the earlier amount.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
let todayRow: { streak_day: number } | null = null;

vi.mock('../lib/supabase', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: todayRow, error: null }),
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => chain,
      rpc: (...a: unknown[]) => rpc(...a),
    },
  };
});
vi.mock('../utils/telemetry', () => ({ captureException: () => {} }));

beforeEach(() => {
  rpc.mockReset();
  todayRow = null;
});

describe('doDailyCheckin', () => {
  it('already checked in today: 0 credited, no RPC call', async () => {
    todayRow = { streak_day: 1 };
    const { doDailyCheckin } = await import('./moonstones');
    const res = await doDailyCheckin();
    expect(res).toEqual({ ok: true, data: { amountAwarded: 0, streakDay: 1, isStreakContinuation: false, alreadyCheckedIn: true } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('a first check-in still credits through the RPC', async () => {
    rpc.mockResolvedValueOnce({ data: [{ amount_awarded: 100, streak_day: 1, is_streak_continuation: false }], error: null });
    const { doDailyCheckin } = await import('./moonstones');
    const res = await doDailyCheckin();
    expect(rpc).toHaveBeenCalledWith('moonstone_daily_checkin');
    expect(res.ok && res.data.amountAwarded).toBe(100);
    expect(res.ok && res.data.alreadyCheckedIn).toBe(false);
  });

  it("a race the pre-check missed: the RPC's 0 still reads as already checked in", async () => {
    rpc.mockResolvedValueOnce({ data: [{ amount_awarded: 0, streak_day: 3, is_streak_continuation: true }], error: null });
    const { doDailyCheckin } = await import('./moonstones');
    const res = await doDailyCheckin();
    expect(res.ok && res.data.alreadyCheckedIn).toBe(true);
  });
});
