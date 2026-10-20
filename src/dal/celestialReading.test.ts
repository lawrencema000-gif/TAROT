import { describe, it, expect, vi, beforeEach } from 'vitest';

/*
 * The celestial readings' DAL returns the function's error code (p9 RQA-2).
 * A FunctionsHttpError's message is the same generic sentence for every
 * status ("Edge Function returned a non-2xx status code"), so the callers'
 * check for REQUEST_ALREADY_USED — a requestId the server can no longer
 * replay — never matched, the spent id was sent again on every press, and
 * the place could not be read again for the rest of the visit.
 */

const invoke = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock('../utils/telemetry', () => ({ captureException: vi.fn() }));

import { generateCelestialReading, type CelestialReadingRequest } from './celestialReading';

const REQ: CelestialReadingRequest = {
  city: { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  intent: 'love',
  lines: [{ planet: 'Venus', angle: 'MC', distanceKm: 12 }],
  birth: { utc: '1991-03-07T21:45:00.000Z' },
  requestId: '6f0c2a52-3d1e-4c4b-9a55-1f2e3d4c5b6a',
};
const GENERIC = 'Edge Function returned a non-2xx status code';
/** What supabase-js gives back for a non-2xx answer: the Response on `context`. */
function httpError(status: number, body: unknown) {
  return {
    data: null,
    error: {
      name: 'FunctionsHttpError',
      message: GENERIC,
      context: new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    },
  };
}
const envelope = (code: string, extra: Record<string, unknown> = {}) => ({ error: { code, message: 'server text', correlationId: 'c1', ...extra } });
const reading = { verdict: 'Paris suits you.', body: 'Venus is high here.', lineNotes: [], cautionsNote: 'Rest.', practice: 'Walk.' };

beforeEach(() => invoke.mockReset());

describe('generateCelestialReading: the error is the envelope’s code', () => {
  it.each([
    [409, 'REQUEST_ALREADY_USED'],
    [409, 'REQUEST_IN_FLIGHT'],
    [402, 'INSUFFICIENT_BALANCE'],
    [429, 'AI_SOFT_CAP'],
    [429, 'RATE_LIMITED'],
  ])('%i %s', async (status, code) => {
    invoke.mockResolvedValueOnce(httpError(status, envelope(code, code === 'REQUEST_IN_FLIGHT' ? { details: { retryAfterMs: 3000 } } : {})));
    expect(await generateCelestialReading(REQ)).toEqual({ ok: false, error: code });
  });

  it('the code is read from a copy: the Response stays readable for anyone after', async () => {
    const res = httpError(409, envelope('REQUEST_ALREADY_USED'));
    invoke.mockResolvedValueOnce(res);
    await generateCelestialReading(REQ);
    expect(((await (res.error.context as Response).json()) as { error: { code: string } }).error.code).toBe('REQUEST_ALREADY_USED');
  });

  it('a body without an envelope, or no response at all, is the error’s message', async () => {
    invoke.mockResolvedValueOnce(httpError(502, 'Bad gateway'));
    expect(await generateCelestialReading(REQ)).toEqual({ ok: false, error: GENERIC });
    invoke.mockResolvedValueOnce({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request to the Edge Function' } });
    expect(await generateCelestialReading(REQ)).toEqual({ ok: false, error: 'Failed to send a request to the Edge Function' });
  });

  it('a reading comes back from the handler’s { data } envelope, a replay’s included', async () => {
    invoke.mockResolvedValueOnce({ data: { data: reading, correlationId: 'c2', replayed: true }, error: null });
    expect(await generateCelestialReading(REQ)).toEqual({ ok: true, data: reading });
    expect(invoke).toHaveBeenCalledWith('celestial-travel-reading', { body: REQ });
  });
});
