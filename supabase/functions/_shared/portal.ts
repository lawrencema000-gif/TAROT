// Which public.subscriptions rows create-portal-session serves (p12
// premium-12, WP-P0-06). No imports, so vitest can load it.

/** A trialing or past-due (grace period) customer needs the portal as much as an active one. */
export const PORTAL_STATUSES = ['active', 'trial', 'grace_period'] as const;

/**
 * A lifetime purchase is a one-off PaymentIntent, not a subscription:
 * stripe-webhook stores `session.payment_intent` as its transaction_id, so
 * `stripe.subscriptions.retrieve` on it throws and the function answered 500.
 * Such a row has nothing to manage in the portal.
 */
export const PORTAL_EXCLUDED_PERIOD = 'lifetime';
