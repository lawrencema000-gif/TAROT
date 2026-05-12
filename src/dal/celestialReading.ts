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
}

export interface CelestialReadingResponse {
  verdict: string;
  body: string;
  lineNotes: Array<{ planet: string; angle: string; note: string }>;
  cautionsNote: string;
  practice: string;
}

/**
 * Invoke the celestial-travel-reading edge function. Returns the parsed
 * AI response on success, or a Result.err with a `code` the UI can map
 * to a user message ('rate-limited' / 'ai-down' / 'malformed' / etc.).
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
      return { ok: false, error: error.message ?? 'request failed' };
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
