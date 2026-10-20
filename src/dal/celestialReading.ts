/**
 * Celestial Travel Reading — DAL wrapper around the
 * `celestial-travel-reading` edge function.
 *
 * Caller pays Moonstones (or is premium) BEFORE invoking — see
 * `useMoonstoneSpend('celestial-travel-reading')`. This function only
 * handles the AI request/response; spend reconciliation is upstream.
 */

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { PlanetName, Angle } from '../utils/astrocartography';
import type { Result } from './dailyRituals';

export type LifeIntent = 'love' | 'career' | 'travel' | 'healing' | 'home' | 'growth' | 'all';

export interface CelestialReadingRequest {
  /** Reading mode — "travel" (default, tap-anywhere) or "best-place"
   *  (richer narrative for the headline "Find Your Place" feature). */
  mode?: 'travel' | 'best-place';
  city: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  intent: LifeIntent;
  lines: Array<{
    planet: PlanetName;
    angle: Angle;
    distanceKm: number;
  }>;
  birth: { utc: string };
  userContext?: {
    zodiacSign?: string;
    mbtiType?: string;
    locale?: string;
  };
  /**
   * One id per paid attempt, kept across retries of the same request: the
   * shared edge handler debits once per (requestId, body) and replays the
   * stored reading to a retry (p8 F20). Optional: a client without one is
   * charged per request, as before.
   */
  requestId?: string;
}

export interface CelestialReadingResponse {
  verdict: string;
  body: string;
  lineNotes: Array<{ planet: string; angle: string; note: string }>;
  cautionsNote: string;
  practice: string;
  /** Only present in best-place mode — a short poetic closing line. */
  closingBlessing?: string;
}

/**
 * The `error.code` of the function's JSON envelope (`{ error: { code } }`),
 * read from a copy of the Response a FunctionsHttpError keeps on `context`;
 * null when the error carries no envelope (no response at all, or a body
 * that is not one).
 */
async function envelopeCode(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).clone !== 'function') return null;
  try {
    const body = (await (ctx as Response).clone().json()) as { error?: { code?: unknown } };
    return typeof body?.error?.code === 'string' ? body.error.code : null;
  } catch {
    return null;
  }
}

/**
 * Invoke the celestial-travel-reading edge function. Returns the parsed
 * AI response on success, or a Result.err whose `error` is the server's
 * code when it answered with one — REQUEST_ALREADY_USED (this requestId was
 * answered once and can no longer be replayed: the next press is a new
 * request), REQUEST_IN_FLIGHT (its first send is still being read: the same
 * request again is free), INSUFFICIENT_BALANCE (refused before the debit) —
 * else the error's message. A FunctionsHttpError's message is the same
 * sentence for every status, so the callers' check for REQUEST_ALREADY_USED
 * never matched and the spent id was sent again on every press (p9 RQA-2).
 */
export async function generateCelestialReading(
  req: CelestialReadingRequest,
): Promise<Result<CelestialReadingResponse>> {
  try {
    const { data, error } = await supabase.functions.invoke('celestial-travel-reading', {
      body: req,
    });
    if (error) {
      captureException('celestial-travel-reading', error);
      return { ok: false, error: (await envelopeCode(error)) ?? error.message ?? 'request failed' };
    }
    // Edge handler returns `{ data, correlationId }` envelope.
    const payload = (data as { data?: CelestialReadingResponse })?.data
      ?? (data as CelestialReadingResponse);
    if (!payload || typeof payload.body !== 'string' || typeof payload.verdict !== 'string') {
      return { ok: false, error: 'AI response missing fields' };
    }
    return { ok: true, data: payload };
  } catch (err) {
    captureException('celestial-travel-reading', err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}
