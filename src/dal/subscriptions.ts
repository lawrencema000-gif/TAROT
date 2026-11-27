// The member's own subscription ledger rows (public.subscriptions).
// RLS lets a member SELECT their own rows and write none; the payment
// webhooks write them (p12 premium-12, WP-P0-06).

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type SubscriptionProvider = 'stripe' | 'google' | 'apple' | 'samsung' | 'web' | 'promo';
export type LiveSubscriptionStatus = 'active' | 'trial' | 'grace_period' | 'cancelled';
export type SubscriptionPeriod = 'weekly' | 'monthly' | 'yearly' | 'lifetime';

export interface OwnSubscription {
  provider: SubscriptionProvider;
  status: LiveSubscriptionStatus;
  period: SubscriptionPeriod;
  productId: string;
  expiresAt: string | null;
  cancelledAt: string | null;
}

/** A row as read — never transaction_id or receipt_data. */
export interface SubscriptionRow {
  provider: string;
  status: string;
  period: string;
  product_id: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
}

export const LIVE_STATUSES: LiveSubscriptionStatus[] = ['active', 'trial', 'grace_period', 'cancelled'];

/**
 * The newest row that can stand behind Premium now. A `cancelled` row is live
 * only while its paid period runs (RevenueCat: auto-renew off); stripe-webhook's
 * `cancelled` (ended, expires_at in the past) is not.
 */
export function pickLiveSubscription(rows: SubscriptionRow[], nowMs: number): OwnSubscription | null {
  for (const r of rows) {
    if (!(LIVE_STATUSES as string[]).includes(r.status)) continue;
    if (r.status === 'cancelled' && !(r.expires_at && Date.parse(r.expires_at) > nowMs)) continue;
    return {
      provider: r.provider as SubscriptionProvider,
      status: r.status as LiveSubscriptionStatus,
      period: r.period as SubscriptionPeriod,
      productId: r.product_id ?? '',
      expiresAt: r.expires_at,
      cancelledAt: r.cancelled_at,
    };
  }
  return null;
}

/** The member's own live subscription, or null when Premium has none (a grant). */
export async function getCurrentForUser(userId: string): Promise<Result<OwnSubscription | null>> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('provider, status, period, product_id, expires_at, cancelled_at')
    .eq('user_id', userId)
    .in('status', LIVE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(5);
  if (error) {
    captureException('dal.subscriptions.getCurrentForUser', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: pickLiveSubscription((data ?? []) as SubscriptionRow[], Date.now()) };
}
