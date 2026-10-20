/**
 * The soulmate portrait's paint attempts: what a tap sends, what it waits
 * for, and what it came to — kept apart from the card (SoulmatePortrait)
 * so the attempt logic is testable on its own and shared by every card
 * that shows it (the score form's pending card, the result's card).
 */
import { supabase } from '../../lib/supabase';

export interface Symbolism { label: string; value: string; meaning: string }
export interface PortraitData { image: string; imageMime?: string; symbolism: Symbolism[]; caption: string }
export type Vibe = 'romantic' | 'grounded' | 'electric' | 'soulful';

/** How long one tap keeps collecting an in-flight portrait before handing back to the user. */
export const COLLECT_FOR_MS = 3 * 60_000;
/**
 * Requests one tap may send. ai-soulmate-portrait allows 5 per caller in 5
 * minutes, and the paint itself is one of them; each "still painting"
 * answer is held ~20 s server-side. Three sends collect for about a minute
 * and leave room under the limit for the next tap (p8 F38).
 */
export const MAX_SENDS_PER_TAP = 3;
/** A paint attempt the server may still hold a portrait for (its replay store keeps two days). */
const PENDING_TTL_MS = 24 * 60 * 60_000;

/** A paint attempt in progress: the same requestId makes a retry free (server replay, p7 #11/#31). */
export interface PendingPaint { requestId: string; vibe: Vibe; at: number }

const pendingKey = (uid: string) => `arcana:soulmate-portrait:pending:${uid}`;
/** This account's paint attempt that has not brought a portrait back yet, if any. */
export function loadPendingPortrait(uid: string | undefined): PendingPaint | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(pendingKey(uid));
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPaint;
    if (!p?.requestId || Date.now() - p.at > PENDING_TTL_MS) {
      localStorage.removeItem(pendingKey(uid));
      return null;
    }
    return p;
  } catch {
    return null;
  }
}
export function savePending(uid: string | undefined, p: PendingPaint | null): void {
  if (!uid) return;
  try {
    if (p) localStorage.setItem(pendingKey(uid), JSON.stringify(p));
    else localStorage.removeItem(pendingKey(uid));
  } catch {
    /* storage unavailable: the attempt simply is not resumable */
  }
}
export function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/**
 * The edge envelope's `{ status, code, details }`; null when the request got
 * no readable answer (network, or a gateway page that is not the function's
 * envelope) — then the painting may still be running.
 */
async function errorEnvelope(error: unknown): Promise<{ status: number; code: string; details?: Record<string, unknown> } | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).clone !== 'function') return null;
  const status = typeof (ctx as Response).status === 'number' ? (ctx as Response).status : 0;
  try {
    const body = (await (ctx as Response).clone().json()) as { error?: { code?: unknown; details?: Record<string, unknown> } };
    const code = body?.error?.code;
    return typeof code === 'string' ? { status, code, details: body.error?.details } : null;
  } catch {
    return null;
  }
}

/**
 * Refusals that come before the spend step (rate limit, AI paused, the AI
 * daily ceiling, the Premium soft cap, an expired session): they charge
 * nothing — and say nothing about an earlier charge of the same attempt.
 */
const BEFORE_SPEND = new Set(['RATE_LIMITED', 'AI_DISABLED', 'AI_DAILY_LIMIT', 'AI_SOFT_CAP', 'UNAUTHORIZED']);

/** What one tap on Paint / Show my portrait came to. */
export type PaintOutcome =
  /** The portrait. */
  | { kind: 'painted'; data: PortraitData }
  /** The server is still painting it after this tap's sends: kept, collected free later. */
  | { kind: 'in-flight' }
  /** No answer: the painting may still be running. Kept. */
  | { kind: 'dropped' }
  /** Refused before the spend while this attempt may already be paid for: kept, nothing new charged. */
  | { kind: 'held' }
  /** A new attempt refused before the spend: nothing was charged. */
  | { kind: 'refused'; code: string }
  /** A new attempt refused for its balance: nothing was charged. */
  | { kind: 'insufficient' }
  /** Painted once, and no longer replayable. */
  | { kind: 'expired' }
  /** The run failed after the debit: the server refunded it. */
  | { kind: 'failed' };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** The server's `retryAfterMs`, kept within 1–10 s; 3 s when it sends none. */
function retryWaitMs(retryAfterMs: unknown): number {
  const ms = Number(retryAfterMs);
  return Number.isFinite(ms) ? Math.min(10_000, Math.max(1_000, ms)) : 3_000;
}

/**
 * Paint — or collect — one attempt. The same requestId is sent again while
 * the server answers REQUEST_IN_FLIGHT, waiting as long as it asks between
 * sends and never more than MAX_SENDS_PER_TAP. `resumed`: the attempt was
 * sent before (an earlier tap), so it may already be paid for — a refusal
 * before the spend step then keeps it instead of reporting "not charged".
 * Exported for tests.
 */
export async function runPaintAttempt(
  attempt: PendingPaint,
  resumed: boolean,
  invoke: (body: { vibe: Vibe; requestId: string }) => Promise<{ data: unknown; error: unknown }> = (body) =>
    supabase.functions.invoke('ai-soulmate-portrait', { body }),
  wait: (ms: number) => Promise<unknown> = sleep,
  now: () => number = Date.now,
): Promise<PaintOutcome> {
  const started = now();
  let paidMaybe = resumed;
  for (let sends = 1; ; sends++) {
    const { data, error } = await invoke({ vibe: attempt.vibe, requestId: attempt.requestId });
    if (!error) {
      const payload = ((data as { data?: unknown } | null)?.data ?? data) as PortraitData | null;
      return payload?.image ? { kind: 'painted', data: payload } : { kind: 'failed' };
    }
    const env = await errorEnvelope(error);
    if (!env) return { kind: 'dropped' };
    if (env.code === 'REQUEST_IN_FLIGHT') {
      // The server holds this attempt's charge and is still painting.
      paidMaybe = true;
      if (sends >= MAX_SENDS_PER_TAP || now() - started >= COLLECT_FOR_MS) return { kind: 'in-flight' };
      await wait(retryWaitMs(env.details?.retryAfterMs));
      continue;
    }
    if (BEFORE_SPEND.has(env.code) || env.status === 429) {
      return paidMaybe ? { kind: 'held' } : { kind: 'refused', code: env.code };
    }
    if (env.code === 'INSUFFICIENT_BALANCE' || env.status === 402) return { kind: 'insufficient' };
    if (env.code === 'REQUEST_ALREADY_USED') return { kind: 'expired' };
    // Thrown inside the run (the image model failed, no birth date): refunded.
    return { kind: 'failed' };
  }
}

/**
 * Attempts being painted or collected in this session, by requestId. A
 * card that mounts again — "Score another", leaving the page and coming
 * back — waits on the same request instead of sending another, and a
 * portrait that arrived while no card was on screen is shown from here
 * without a request.
 */
export const running = new Map<string, Promise<PaintOutcome>>();
/** The portrait this session last showed each account, so a remount shows it again. */
export const shown = new Map<string, PortraitData>();

/** Forget this session's attempts and portraits (tests; a session starts empty). */
export function resetPortraitSession(): void {
  running.clear();
  shown.clear();
}

export function runShared(attempt: PendingPaint, resumed: boolean): Promise<PaintOutcome> {
  let work = running.get(attempt.requestId);
  if (!work) {
    work = runPaintAttempt(attempt, resumed);
    running.set(attempt.requestId, work);
  }
  return work;
}
