// @vitest-environment node
/**
 * advisor-cashout refunds only when Stripe definitively refused (p7 #117):
 * an ambiguous failure may have paid, and a refund then lets the advisor be
 * paid twice for the same Moonstones.
 */
import { describe, expect, it } from 'vitest';
import { isDefinitiveStripeError } from '../../../supabase/functions/advisor-cashout/stripe-errors';

describe('isDefinitiveStripeError', () => {
  it('refusals: nothing was created', () => {
    expect(isDefinitiveStripeError({ type: 'StripeInvalidRequestError', statusCode: 400 })).toBe(true);
    expect(isDefinitiveStripeError({ type: 'StripeCardError', statusCode: 402 })).toBe(true);
    expect(isDefinitiveStripeError({ type: 'StripePermissionError', statusCode: 403 })).toBe(true);
    expect(isDefinitiveStripeError({ type: 'StripeRateLimitError', statusCode: 429 })).toBe(true);
    expect(isDefinitiveStripeError({ statusCode: 404 })).toBe(true);
  });
  it('ambiguous: the transfer may exist — never refund', () => {
    expect(isDefinitiveStripeError({ type: 'StripeConnectionError' })).toBe(false);
    expect(isDefinitiveStripeError({ type: 'StripeAPIError', statusCode: 500 })).toBe(false);
    expect(isDefinitiveStripeError({ type: 'StripeIdempotencyError', statusCode: 400 })).toBe(false);
    expect(isDefinitiveStripeError({ statusCode: 409 })).toBe(false);
    expect(isDefinitiveStripeError(new Error('The operation was aborted due to timeout'))).toBe(false);
    expect(isDefinitiveStripeError(null)).toBe(false);
  });
});
