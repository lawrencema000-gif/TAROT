// Pure billing mappings shared by revenuecat-webhook and stripe-webhook.
// No imports, so vitest and tsc load it as well as Deno (p12 premium-12,
// WP-P0-06). Every value returned here is inside the CHECK constraints of
// public.subscriptions (20260101111354_add_quiz_definitions_subscriptions_audit.sql):
//   provider ∈ {samsung, google, stripe, apple, web, promo}
//   status   ∈ {active, cancelled, expired, pending, trial, grace_period}

export type LedgerProvider = 'google' | 'apple' | 'stripe' | 'promo';
export type LedgerStatus = 'active' | 'cancelled' | 'expired' | 'pending' | 'trial' | 'grace_period';

/** RevenueCat `event.store` / EntitlementInfo.store → subscriptions.provider; null = no ledger provider (skip the row, keep the entitlement). */
export function providerForStore(store: string | null | undefined): LedgerProvider | null {
  switch ((store ?? '').toUpperCase()) {
    case 'PLAY_STORE': return 'google';
    case 'APP_STORE':
    case 'MAC_APP_STORE': return 'apple';
    case 'STRIPE': return 'stripe';
    case 'PROMOTIONAL': return 'promo';
    default: return null; // AMAZON, RC_BILLING, EXTERNAL, PADDLE, TEST_STORE, UNKNOWN_STORE
  }
}

/**
 * Stripe Subscription.status → subscriptions.status, always inside the CHECK.
 * An `active` subscription with cancel_at_period_end stays `active` (its
 * cancelled_at is recorded instead): `cancelled` would drop it out of the
 * Android reconcile's exemption and downgrade a member who has paid to the
 * end of the period. `unpaid` stays `grace_period` so the card form (portal)
 * stays reachable after Premium has ended (D50 C).
 */
export function stripeLedgerStatus(status: string): LedgerStatus {
  switch (status) {
    case 'trialing': return 'trial';
    case 'active': return 'active';
    case 'past_due':
    case 'unpaid': return 'grace_period';
    case 'canceled': return 'cancelled';
    case 'incomplete_expired': return 'expired';
    default: return 'pending'; // incomplete, paused, and anything Stripe adds later
  }
}

/**
 * Whether a Stripe subscription keeps profiles.is_premium on (D50 C, owner
 * decision of 2026-11-17): `active` and `trialing` do; `past_due` does only
 * while Stripe still has a retry scheduled for the unpaid invoice (its
 * `next_payment_attempt` is set). Premium ends when Stripe cancels the
 * subscription, marks it `unpaid`, pauses it, or has no retry left.
 */
export function stripeKeepsPremium(status: string, nextPaymentAttempt: number | null | undefined): boolean {
  if (status === 'active' || status === 'trialing') return true;
  if (status === 'past_due') return typeof nextPaymentAttempt === 'number' && nextPaymentAttempt > 0;
  return false;
}
