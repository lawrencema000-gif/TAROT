// @vitest-environment node
/**
 * advisor-cashout's transfer step (supabase/functions/advisor-cashout/
 * transfer.ts, p8 O#117): the verdict is taken over every HTTP attempt the
 * Stripe SDK made, so an attempt that may have executed — no answer, 2xx,
 * 409, 5xx — keeps the cashout `processing` even when a later attempt is a
 * clean refusal (the lost-then-429 path paid twice). Proved end to end with
 * stripe@14.10.0 against a simulated Stripe in the FC proof (proof-117.mjs).
 */
import { describe, expect, it } from 'vitest';
import {
  attemptMayHaveExecuted,
  MONEY_CLIENT_OPTIONS,
  recordingFetch,
  settleTransfer,
  type StripeAttempt,
} from '../../../supabase/functions/advisor-cashout/transfer';

const connectionError = () => Object.assign(new Error('An error occurred with our connection to Stripe.'), { type: 'StripeConnectionError' });
const rateLimit = () => Object.assign(new Error('Too many requests'), { type: 'StripeRateLimitError', statusCode: 429 });
const invalid = () => Object.assign(new Error('Insufficient funds'), { type: 'StripeInvalidRequestError', statusCode: 400 });
const conflict = () => Object.assign(new Error('in-progress request'), { type: 'StripeIdempotencyError', statusCode: 409 });
const badJson = () => Object.assign(new Error('Invalid JSON received from the Stripe API'), { type: 'StripeAPIError' });

/** A transfer call that answers per call: each entry lists the HTTP statuses its call saw, then throws or returns. */
function scripted(attempts: StripeAttempt[], calls: Array<{ http: Array<number | null>; result: 'transfer' | (() => Error) }>) {
  let n = 0;
  return async () => {
    const step = calls[n++];
    if (!step) throw new Error('no more calls scripted');
    for (const status of step.http) attempts.push({ status });
    if (step.result === 'transfer') return { id: 'tr_1' };
    throw step.result();
  };
}

describe('settleTransfer', () => {
  it('lost answer, then 429: never failed (no refund), retried under the same key', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [
      { http: [null], result: connectionError },
      { http: [429], result: rateLimit },
      { http: [429], result: rateLimit },
    ]);
    const out = await settleTransfer(call, attempts, { tries: 3 });
    expect(out.state).toBe('processing');
  });

  it('lost answer, then 429, then the transfer: paid once', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [
      { http: [null], result: connectionError },
      { http: [429], result: rateLimit },
      { http: [200], result: 'transfer' },
    ]);
    const out = await settleTransfer(call, attempts, { tries: 3 });
    expect(out.state).toBe('paid');
  });

  it('an SDK-internal retry that hid the lost answer (one call, two attempts, last 429) is not a refusal', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [{ http: [null, 429], result: rateLimit }]);
    const out = await settleTransfer(call, attempts, { tries: 1 });
    expect(out.state).toBe('processing');
  });

  it('lost answer, then 400: processing, not failed', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [
      { http: [null], result: connectionError },
      { http: [400], result: invalid },
      { http: [400], result: invalid },
    ]);
    expect((await settleTransfer(call, attempts, { tries: 3 })).state).toBe('processing');
  });

  it('a 200 whose body was lost: the transfer exists — processing, never failed', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [{ http: [200], result: badJson }]);
    expect((await settleTransfer(call, attempts, { tries: 1 })).state).toBe('processing');
  });

  it('a clean refusal on the first attempt fails (refund) without retrying', async () => {
    for (const refusal of [rateLimit, invalid]) {
      const attempts: StripeAttempt[] = [];
      const call = scripted(attempts, [{ http: [refusal === rateLimit ? 429 : 400], result: refusal }]);
      const out = await settleTransfer(call, attempts, { tries: 3 });
      expect(out.state).toBe('failed');
      expect(attempts).toHaveLength(1);
    }
  });

  it('409 in progress, then the transfer: paid', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [
      { http: [409], result: conflict },
      { http: [200], result: 'transfer' },
    ]);
    expect((await settleTransfer(call, attempts, { tries: 3 })).state).toBe('paid');
  });

  it('every answer lost: processing', async () => {
    const attempts: StripeAttempt[] = [];
    const call = scripted(attempts, [
      { http: [null], result: connectionError },
      { http: [null], result: connectionError },
      { http: [null], result: connectionError },
    ]);
    expect((await settleTransfer(call, attempts, { tries: 3 })).state).toBe('processing');
  });
});

describe('attempts and the client', () => {
  it('which attempts may have executed', () => {
    expect([null, 200, 201, 409, 500, 503].map((status) => attemptMayHaveExecuted({ status }))).toEqual([true, true, true, true, true, true]);
    expect([400, 401, 402, 403, 404, 429].map((status) => attemptMayHaveExecuted({ status }))).toEqual([false, false, false, false, false, false]);
  });

  it('recordingFetch records every answer and every unanswered attempt', async () => {
    const attempts: StripeAttempt[] = [];
    let n = 0;
    const base = async () => {
      n += 1;
      if (n === 1) throw new TypeError('fetch failed');
      return new Response('{}', { status: 429 });
    };
    const f = recordingFetch(base, attempts);
    await expect(f('http://x/v1/transfers')).rejects.toThrow('fetch failed');
    expect((await f('http://x/v1/transfers')).status).toBe(429);
    expect(attempts).toEqual([{ status: null }, { status: 429 }]);
  });

  it('the money client never retries behind our back', () => {
    expect(MONEY_CLIENT_OPTIONS.maxNetworkRetries).toBe(0);
  });
});
