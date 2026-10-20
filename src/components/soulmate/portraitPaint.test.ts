import { describe, it, expect, vi } from 'vitest';

// The module's default invoke is never used here: every test passes its own.
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));

import { runPaintAttempt, type PendingPaint } from './portraitPaint';

/** A function's error the way supabase-js hands it over: the Response on `context`. */
function httpError(status: number, code: string, details?: Record<string, unknown>) {
  return { name: 'FunctionsHttpError', context: new Response(JSON.stringify({ error: { code, message: code, details } }), { status }) };
}
const inFlight = () => ({ data: null, error: httpError(409, 'REQUEST_IN_FLIGHT', { retryAfterMs: 3000 }) });
const rateLimited = () => ({ data: null, error: httpError(429, 'RATE_LIMITED') });
const painted = () => ({ data: { data: { image: 'AAAA', imageMime: 'image/jpeg', symbolism: [], caption: 'c' } }, error: null });

const attempt: PendingPaint = { requestId: '22222222-2222-4222-8222-222222222222', vibe: 'soulful', at: 0 };

/** A scripted function: one answer per call, recording what was sent and the waits between sends. */
function script(answers: Array<() => { data: unknown; error: unknown }>) {
  const sent: unknown[] = [];
  const waits: number[] = [];
  let i = 0;
  return {
    sent,
    waits,
    invoke: async (body: unknown) => {
      sent.push(body);
      const next = answers[Math.min(i++, answers.length - 1)];
      return next();
    },
    wait: async (ms: number) => { waits.push(ms); },
  };
}

describe('p8 F38 — collecting a paid portrait never runs into the rate limit and forgets it', () => {
  it('a paid attempt refused by the rate limit is HELD (kept, nothing said about refunds), not "not charged"', async () => {
    const s = script([inFlight, rateLimited]);
    const outcome = await runPaintAttempt(attempt, true, s.invoke, s.wait);
    expect(outcome).toEqual({ kind: 'held' });
  });

  it('an attempt that saw "still painting" is paid for, even on its first tap: a later 429 holds it', async () => {
    const s = script([inFlight, rateLimited]);
    expect(await runPaintAttempt(attempt, false, s.invoke, s.wait)).toEqual({ kind: 'held' });
  });

  it('a NEW attempt refused before the spend was not charged: it is dropped and says so', async () => {
    const s = script([rateLimited]);
    expect(await runPaintAttempt(attempt, false, s.invoke, s.wait)).toEqual({ kind: 'refused', code: 'RATE_LIMITED' });
    const paused = script([() => ({ data: null, error: httpError(503, 'AI_DISABLED') })]);
    expect(await runPaintAttempt(attempt, true, paused.invoke, paused.wait)).toEqual({ kind: 'held' });
  });

  it('waits between collects as long as the server asks, sends the same id and body, and stops within the rate limit', async () => {
    const s = script([inFlight, inFlight, inFlight, inFlight, inFlight, inFlight]);
    const outcome = await runPaintAttempt(attempt, true, s.invoke, s.wait);
    expect(outcome).toEqual({ kind: 'in-flight' });
    // Three sends per tap: with the paint itself that is four of the five the function allows in five minutes.
    expect(s.sent).toHaveLength(3);
    expect(new Set(s.sent.map((b) => JSON.stringify(b)))).toEqual(new Set([JSON.stringify({ vibe: 'soulful', requestId: attempt.requestId })]));
    expect(s.waits).toEqual([3000, 3000]);
  });

  it('collects the portrait once it is there', async () => {
    const s = script([inFlight, painted]);
    const outcome = await runPaintAttempt(attempt, true, s.invoke, s.wait);
    expect(outcome.kind).toBe('painted');
    expect(s.sent).toHaveLength(2);
  });

  it('no answer, or a gateway page that is not the function’s envelope, keeps the attempt (it may be painting)', async () => {
    const network = script([() => ({ data: null, error: { name: 'FunctionsFetchError', context: undefined } })]);
    expect(await runPaintAttempt(attempt, false, network.invoke, network.wait)).toEqual({ kind: 'dropped' });
    const gateway = script([() => ({ data: null, error: { name: 'FunctionsHttpError', context: new Response('<html>504</html>', { status: 504 }) } })]);
    expect(await runPaintAttempt(attempt, true, gateway.invoke, gateway.wait)).toEqual({ kind: 'dropped' });
  });

  it('only a failure inside the run (refunded by the server) or a spent id ends a paid attempt', async () => {
    const failed = script([() => ({ data: null, error: httpError(503, 'IMAGE_UNAVAILABLE') })]);
    expect(await runPaintAttempt(attempt, true, failed.invoke, failed.wait)).toEqual({ kind: 'failed' });
    const spent = script([() => ({ data: null, error: httpError(409, 'REQUEST_ALREADY_USED') })]);
    expect(await runPaintAttempt(attempt, true, spent.invoke, spent.wait)).toEqual({ kind: 'expired' });
    const broke = script([() => ({ data: null, error: httpError(402, 'INSUFFICIENT_BALANCE') })]);
    expect(await runPaintAttempt(attempt, false, broke.invoke, broke.wait)).toEqual({ kind: 'insufficient' });
  });
});
