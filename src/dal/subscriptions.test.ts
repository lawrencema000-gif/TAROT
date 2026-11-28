import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * The member's own subscription row decides what the Premium sheet says
 * about billing (p12 premium-12, WP-P0-06). The read never asks for
 * transaction_id or receipt_data, and a `cancelled` row counts only while its
 * paid period still runs.
 */

const calls: Array<[string, unknown[]]> = [];
let answer: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock('../lib/supabase', () => {
  const builder: Record<string, (...a: unknown[]) => unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order']) {
    builder[m] = (...a: unknown[]) => {
      calls.push([m, a]);
      return builder;
    };
  }
  builder.limit = (...a: unknown[]) => {
    calls.push(['limit', a]);
    return Promise.resolve(answer);
  };
  return {
    supabase: {
      from: (t: string) => {
        calls.push(['from', [t]]);
        return builder;
      },
    },
  };
});
const captureException = vi.fn();
vi.mock('../utils/telemetry', () => ({ captureException: (...a: unknown[]) => captureException(...a) }));

import { pickLiveSubscription, getCurrentForUser, type SubscriptionRow } from './subscriptions';

const NOW = Date.UTC(2026, 10, 15);
const row = (r: Partial<SubscriptionRow>): SubscriptionRow => ({
  provider: 'stripe',
  status: 'active',
  period: 'monthly',
  product_id: 'p',
  expires_at: null,
  cancelled_at: null,
  ...r,
});

beforeEach(() => {
  calls.length = 0;
  answer = { data: [], error: null };
  captureException.mockReset();
});

describe('pickLiveSubscription', () => {
  it('no rows → null', () => {
    expect(pickLiveSubscription([], NOW)).toBeNull();
  });

  it('skips a Stripe row that has ended and takes the next live one', () => {
    const got = pickLiveSubscription(
      [
        row({ provider: 'stripe', status: 'cancelled', expires_at: '2026-11-10T00:00:00Z' }),
        row({ provider: 'google', status: 'active', product_id: 'g' }),
      ],
      NOW,
    );
    expect(got?.provider).toBe('google');
    expect(got?.productId).toBe('g');
  });

  it('a cancelled row whose paid period still runs is live', () => {
    const got = pickLiveSubscription(
      [row({ provider: 'google', status: 'cancelled', expires_at: '2026-12-01T00:00:00Z' })],
      NOW,
    );
    expect(got).toMatchObject({ provider: 'google', status: 'cancelled', expiresAt: '2026-12-01T00:00:00Z' });
  });

  it('a cancelled row with no expiry is not live', () => {
    expect(pickLiveSubscription([row({ status: 'cancelled', expires_at: null })], NOW)).toBeNull();
  });

  it('a missing product id becomes an empty string', () => {
    expect(pickLiveSubscription([row({ status: 'trial', product_id: null })], NOW)?.productId).toBe('');
  });

  it('a pending row is not live', () => {
    expect(pickLiveSubscription([row({ status: 'pending' })], NOW)).toBeNull();
  });
});

describe('getCurrentForUser', () => {
  it('reads only safe columns, the member’s own rows, newest first, five at most', async () => {
    answer = { data: [row({ provider: 'google' })], error: null };
    const res = await getCurrentForUser('u1');
    expect(res).toEqual({
      ok: true,
      data: { provider: 'google', status: 'active', period: 'monthly', productId: 'p', expiresAt: null, cancelledAt: null },
    });
    const select = calls.find(([m]) => m === 'select')?.[1][0] as string;
    expect(select).not.toContain('transaction_id');
    expect(select).not.toContain('receipt_data');
    expect(calls).toContainEqual(['from', ['subscriptions']]);
    expect(calls).toContainEqual(['eq', ['user_id', 'u1']]);
    expect(calls).toContainEqual(['order', ['updated_at', { ascending: false }]]);
    expect(calls).toContainEqual(['limit', [5]]);
  });

  it('no rows → ok with null (Premium with no subscription)', async () => {
    expect(await getCurrentForUser('u1')).toEqual({ ok: true, data: null });
  });

  it('a PostgREST error → not ok, reported', async () => {
    answer = { data: null, error: { message: 'boom', code: '500' } };
    const res = await getCurrentForUser('u1');
    expect(res).toEqual({ ok: false, error: 'boom' });
    expect(captureException).toHaveBeenCalledWith('dal.subscriptions.getCurrentForUser', expect.anything());
  });
});
