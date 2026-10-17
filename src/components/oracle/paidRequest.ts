/**
 * One paid request, sent the way the server's spend replay expects it.
 *
 * The edge handler debits once per (requestId, body): the same request sent
 * again — a retry after a dropped connection — is never charged twice and
 * answers with the first run's response (see supabase/functions/_shared/
 * spend-replay.ts). Three things every paid screen has to do with that, and
 * the Dream interpreter, Partner compatibility and the Oracle sheet each
 * did none of (p8 R1, R3):
 *
 *  - keep the request's id with its exact body, and send that id again when
 *    the same body is sent again (a different body is a new request);
 *  - while the server says an earlier send of this very request is still
 *    being read (409 REQUEST_IN_FLIGHT), wait and send it again;
 *  - tell "answered once and no longer replayable" (409
 *    REQUEST_ALREADY_USED: the next press is a new, charged request) apart
 *    from every other failure.
 *
 * The `supabase.functions.invoke` call stays with the caller (`send`).
 */

import { aiFailureOf, type AiFailure } from '../reports/aiReading';

/** How many times a request the server is still reading (409 REQUEST_IN_FLIGHT) is sent again. */
export const MAX_IN_FLIGHT_RETRIES = 3;

/** The server's `retryAfterMs`, kept within 1–10 s; 3 s when it sends none. */
export function inFlightWaitMs(retryAfterMs: unknown): number {
  const ms = Number(retryAfterMs);
  return Number.isFinite(ms) && ms > 0 ? Math.min(10_000, Math.max(1_000, ms)) : 3_000;
}

/** The `{ code, details }` of a function's error envelope (a FunctionsHttpError keeps the Response on `context`). */
export async function errorEnvelopeOf(error: unknown): Promise<{ code?: string; details?: Record<string, unknown> } | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).clone !== 'function') return null;
  try {
    const body = (await (ctx as Response).clone().json()) as { error?: unknown };
    const e = body?.error;
    return e && typeof e === 'object' ? (e as { code?: string; details?: Record<string, unknown> }) : null;
  } catch {
    return null;
  }
}

/**
 * Why a paid request brought nothing back: one of `AiFailure`, or `spent` —
 * the server answered this id once already and can no longer show that
 * answer, so pressing again is a new request, charged as usual.
 */
export type PaidFailure = AiFailure | 'spent';

export async function paidFailureOf(error: unknown): Promise<PaidFailure> {
  if ((await errorEnvelopeOf(error))?.code === 'REQUEST_ALREADY_USED') return 'spent';
  return aiFailureOf(error);
}

/**
 * Send a paid request, and send it again (same id, same body) for as long
 * as the server says an earlier send of it is still being read — it then
 * answers with that reading, charged once. Resolves null when `live()`
 * turns false while waiting: the screen has moved on and nothing is shown.
 */
export async function sendPaid<R extends { error: unknown }>(
  send: () => Promise<R>,
  { live = () => true, onStillReading }: { live?: () => boolean; onStillReading?: () => void } = {},
): Promise<R | null> {
  let res = await send();
  for (let retry = 0; retry < MAX_IN_FLIGHT_RETRIES && res.error; retry++) {
    const envelope = await errorEnvelopeOf(res.error);
    if (envelope?.code !== 'REQUEST_IN_FLIGHT') break;
    if (!live()) return null;
    onStillReading?.();
    await new Promise((r) => setTimeout(r, inFlightWaitMs(envelope.details?.retryAfterMs)));
    if (!live()) return null;
    res = await send();
  }
  return live() ? res : null;
}
