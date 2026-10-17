/**
 * The Stripe transfer of one cashout, attempt by attempt (p7 #117, p8 O#117).
 * Pure: no Deno APIs and no npm: specifiers — the caller passes the transfer
 * call and the fetch the Stripe client uses, so this exact code runs against
 * a simulated Stripe from Node (the FC proof) and from the edge function.
 *
 * Why attempts and not errors: the Stripe SDK retries inside one call
 * (maxNetworkRetries, default 1, and ALWAYS once more after a connection
 * reset on its node client), and only the last error reaches the caller. A
 * transfer that executed and lost its answer, then a 429 on the SDK's own
 * same-key retry, looked like a clean refusal: the row failed, the stones
 * came back, and the advisor's next request paid the same stones again
 * (recheck O#117, scenario D). So the client runs with maxNetworkRetries 0,
 * every HTTP attempt is recorded by `recordingFetch`, and a cashout fails
 * (and refunds) only when no attempt Stripe saw could have moved money.
 */
import { isDefinitiveStripeError } from "./stripe-errors.ts";

/** One HTTP attempt at Stripe: the status it answered, or null (no answer: reset, timeout). */
export interface StripeAttempt {
  status: number | null;
}

/**
 * Could this attempt have created the transfer? No answer, a 2xx (created —
 * even if its body was then lost), a 409 (another request under the key is
 * in flight) or a 5xx: yes. A 4xx refusal (400, 401, 402, 403, 404, 429):
 * no — Stripe did not start executing it.
 */
export function attemptMayHaveExecuted(a: StripeAttempt): boolean {
  if (a.status === null) return true;
  if (a.status >= 200 && a.status < 300) return true;
  if (a.status === 409) return true;
  if (a.status >= 500) return true;
  return false;
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** A fetch that records every attempt the Stripe SDK makes through it. */
export function recordingFetch(base: FetchLike, attempts: StripeAttempt[]): FetchLike {
  return async (input, init) => {
    try {
      const res = await base(input, init);
      attempts.push({ status: res.status });
      return res;
    } catch (e) {
      attempts.push({ status: null });
      throw e;
    }
  };
}

/**
 * Options for a Stripe client that moves money: no hidden retries (each try
 * is ours, under the same idempotency key) and a timeout that keeps two tries
 * inside the edge function's wall clock.
 */
export const MONEY_CLIENT_OPTIONS = { maxNetworkRetries: 0, timeout: 30_000 } as const;

/**
 * Calls per cashout, all under its one idempotency key, and the pause before
 * a repeat (Stripe asks for a short wait after a 409 "in progress"). Three
 * calls of at most 30 s each stay inside the edge function's 150 s.
 */
export const CASHOUT_TRANSFER_TRIES = 3;
export const CASHOUT_RETRY_DELAY_MS = 1_000;

export type TransferOutcome<T> =
  | { state: "paid"; transfer: T; attempts: number }
  | { state: "failed"; error: unknown; attempts: number }
  | { state: "processing"; error: unknown; attempts: number };

/**
 * Create the transfer with up to `tries` calls (the caller's createTransfer
 * must use one stable idempotency key, so Stripe answers a repeat with the
 * original transfer). Paid when a call returns it. Failed — the only outcome
 * that may refund — when every attempt Stripe saw was a definitive refusal.
 * Anything else stays `processing`, stones debited, until reconciled.
 */
export async function settleTransfer<T>(
  createTransfer: () => Promise<T>,
  attempts: StripeAttempt[],
  opts: { tries?: number; retryDelayMs?: number; onAmbiguous?: (call: number, err: unknown) => void } = {},
): Promise<TransferOutcome<T>> {
  const tries = Math.max(1, opts.tries ?? CASHOUT_TRANSFER_TRIES);
  const delay = Math.max(0, opts.retryDelayMs ?? 0);
  let lastErr: unknown = null;
  for (let call = 0; call < tries; call++) {
    if (call > 0 && delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const transfer = await createTransfer();
      return { state: "paid", transfer, attempts: attempts.length };
    } catch (e) {
      lastErr = e;
      const ambiguous = attempts.some(attemptMayHaveExecuted);
      // A clean refusal with nothing before it that could have executed:
      // no transfer exists.
      if (!ambiguous && isDefinitiveStripeError(e)) {
        return { state: "failed", error: e, attempts: attempts.length };
      }
      // Otherwise ask again under the same key: Stripe returns the transfer
      // if an earlier attempt made it.
      opts.onAmbiguous?.(call, e);
    }
  }
  return { state: "processing", error: lastErr, attempts: attempts.length };
}
