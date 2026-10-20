/**
 * Which Stripe failures prove that no transfer was made (p7 #117). Only those
 * may fail a cashout and give the Moonstones back; anything else — a
 * connection reset, a timeout, a 5xx, an idempotency conflict (a transfer
 * under that key already exists) — may have moved the money. Pure, tested
 * from Node by src/test/golden/stripe-errors.test.ts.
 */

const DEFINITIVE_STRIPE_ERRORS = new Set([
  "StripeCardError",
  "StripeInvalidRequestError",
  "StripeAuthenticationError",
  "StripePermissionError",
  "StripeRateLimitError",
]);

export function isDefinitiveStripeError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const err = e as { type?: string; statusCode?: number };
  if (err.type === "StripeIdempotencyError" || err.statusCode === 409) return false;
  if (err.type && DEFINITIVE_STRIPE_ERRORS.has(err.type)) return true;
  // A 4xx answer is a refusal; a 5xx, a timeout or no answer is not.
  return typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500;
}
