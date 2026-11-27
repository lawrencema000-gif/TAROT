import { describe, it, expect, vi, afterEach } from 'vitest';
import { getPlatformWarning } from './billingGuard';

describe('getPlatformWarning', () => {
  it('warns web user about existing mobile purchase', () => {
    const result = getPlatformWarning('web', 'google');
    expect(result).toContain('mobile app');
  });

  it('warns mobile user about existing web purchase', () => {
    const result = getPlatformWarning('mobile', 'stripe');
    expect(result).toContain('web');
  });

  it('warns mobile user about web provider', () => {
    const result = getPlatformWarning('mobile', 'web');
    expect(result).toContain('web');
  });

  it('returns null for same-platform purchase', () => {
    expect(getPlatformWarning('web', 'stripe')).toBeNull();
    expect(getPlatformWarning('mobile', 'google')).toBeNull();
  });
});

/*
 * p12 FWP-06 (WP-P0-06): once public.subscriptions can hold rows, a member
 * may have two live rows. `.maybeSingle()` with no limit answers an error for
 * two rows; the read takes the newest one instead.
 */
type Answer = { data: unknown; error: unknown };
type Builder = {
  select: () => Builder;
  eq: () => Builder;
  in: () => Builder;
  order: (col: string, o: { ascending: boolean }) => Builder;
  limit: (n: number) => Builder;
  maybeSingle: () => Promise<Answer>;
};

/** A PostgREST-like builder: `subs(limited)` answers the subscriptions read. */
function mockSupabase(subs: (limited: boolean) => Answer, calls: string[] = []) {
  vi.doMock('../lib/supabase', () => ({
    supabase: {
      from(table: string): Builder {
        let limited = false;
        const q: Builder = {
          select: () => q,
          eq: () => q,
          in: () => q,
          order: (col, o) => {
            calls.push(`order:${col}:${o.ascending}`);
            return q;
          },
          limit: (n) => {
            calls.push(`limit:${n}`);
            limited = true;
            return q;
          },
          maybeSingle: async () =>
            table === 'profiles' ? { data: { is_premium: true }, error: null } : subs(limited),
        };
        return q;
      },
    },
  }));
}

describe('checkPurchaseStatus with several subscription rows', () => {
  afterEach(() => {
    vi.doUnmock('../lib/supabase');
    vi.resetModules();
  });

  it('reads the newest row: two active rows → the newest provider, no purchase', async () => {
    vi.resetModules();
    const calls: string[] = [];
    mockSupabase(
      (limited) =>
        // PostgREST: maybeSingle() over two rows is an error.
        limited
          ? { data: { provider: 'stripe', product_id: 'yearly', status: 'active' }, error: null }
          : { data: null, error: { code: 'PGRST116', message: 'multiple rows' } },
      calls,
    );
    const { checkPurchaseStatus } = await import('./billingGuard');
    const res = await checkPurchaseStatus('u1');
    expect(res).toMatchObject({ isPremium: true, provider: 'stripe', canPurchase: false });
    expect(calls).toContain('order:created_at:false');
    expect(calls).toContain('limit:1');
  });

  it('a failed read keeps today’s answer: Premium, provider unknown', async () => {
    vi.resetModules();
    mockSupabase(() => ({ data: null, error: { code: '500', message: 'down' } }));
    const { checkPurchaseStatus } = await import('./billingGuard');
    const res = await checkPurchaseStatus('u1');
    expect(res).toMatchObject({ isPremium: true, provider: null, canPurchase: false });
  });
});
