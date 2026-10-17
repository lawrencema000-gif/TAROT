import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/*
 * The Bazi AI client returns a stable code and the HTTP status for every
 * failure, so the panel words it in the reader's language. Before, it handed
 * the panel the function's English `error.message` ("Too many requests",
 * "Bazi AI reading requires Premium subscription") or an English sentence of
 * its own, and the panel printed it after "Couldn't generate reading:".
 * The English now goes to the log only.
 */

const getSession = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a) } } }));
const logWarn = vi.fn();
vi.mock('../utils/telemetry', () => ({ logWarn: (...a: unknown[]) => logWarn(...a) }));

import { generateBaziReading, readingFailure, type BaziAIReading } from './baziInterpret';
import { computeBazi, deepenBazi } from '../data/bazi';

const r = computeBazi('1991-03-08', '06:45')!;
const ARGS = { result: r, phase1: deepenBazi(r), deep: null, birthDate: '1991-03-08', birthTime: '06:45', gender: 'female' as const };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const READING = { core_summary: '你的命盘以丁火为中轴。' } as unknown as BaziAIReading;

const fetchMock = vi.fn();
beforeEach(() => {
  getSession.mockReset();
  getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
  logWarn.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('generateBaziReading', () => {
  it('unwraps the handler envelope into the reading', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { ok: true, reading: READING, cached: true }, correlationId: 'c1' }));
    expect(await generateBaziReading(ARGS)).toEqual({ ok: true, reading: READING, cached: true });
    expect(logWarn).not.toHaveBeenCalled();
  });

  it('a function error is its envelope code and status; its English goes to the log only', async () => {
    fetchMock.mockResolvedValue(json(429, { error: { code: 'RATE_LIMITED', message: 'Too many requests', correlationId: 'c2' } }));
    const res = await generateBaziReading(ARGS);
    expect(res).toEqual({ ok: false, code: 'RATE_LIMITED', status: 429, detail: 'Too many requests' });
    expect(readingFailure(res)).toBe('rateLimit');
    expect(logWarn).toHaveBeenCalledWith('bazi-interpret', 'Too many requests', { code: 'RATE_LIMITED', status: 429 });

    fetchMock.mockResolvedValue(json(403, { error: { code: 'PREMIUM_REQUIRED', message: 'Bazi AI reading requires Premium subscription' } }));
    const premium = await generateBaziReading(ARGS);
    expect([premium.code, premium.status, readingFailure(premium)]).toEqual(['PREMIUM_REQUIRED', 403, 'premium']);
  });

  it('a failure with no envelope, no response, no JSON or no reading still has a code', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));
    expect(await generateBaziReading(ARGS)).toMatchObject({ ok: false, code: 'HTTP', status: 502 });

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await generateBaziReading(ARGS)).toMatchObject({ ok: false, code: 'NETWORK' });

    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }));
    expect(await generateBaziReading(ARGS)).toMatchObject({ ok: false, code: 'BAD_RESPONSE', status: 200 });

    fetchMock.mockResolvedValue(json(200, { data: { ok: true }, correlationId: 'c3' }));
    expect(await generateBaziReading(ARGS)).toMatchObject({ ok: false, code: 'EMPTY_READING', status: 200 });

    fetchMock.mockReset();
    getSession.mockResolvedValue({ data: { session: null } });
    const signedOut = await generateBaziReading(ARGS);
    expect(signedOut).toMatchObject({ ok: false, code: 'NOT_SIGNED_IN' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(readingFailure(signedOut)).toBe('signIn');
  });
});

describe('readingFailure', () => {
  it('sorts every code the function, its handler and its AI gate send, by code first and status second', () => {
    const cases: Array<[string | undefined, number | undefined, string]> = [
      ['PREMIUM_REQUIRED', 403, 'premium'],
      ['RATE_LIMITED', 429, 'rateLimit'],
      ['AI_DAILY_LIMIT', 429, 'dailyLimit'],
      ['AI_SOFT_CAP', 429, 'dailyLimit'],
      ['AI_DISABLED', 503, 'unavailable'],
      ['AI_NOT_CONFIGURED', 503, 'unavailable'],
      ['UNAUTHORIZED', 401, 'signIn'],
      ['NOT_SIGNED_IN', undefined, 'signIn'],
      ['AI_FAILED', 502, 'generic'],
      ['MISSING_FIELDS', 400, 'generic'],
      ['INTERNAL', 500, 'generic'],
      ['NETWORK', undefined, 'generic'],
      ['EMPTY_READING', 200, 'generic'],
      ['HTTP', 429, 'rateLimit'],
      ['HTTP', 503, 'unavailable'],
      [undefined, undefined, 'generic'],
    ];
    for (const [code, status, want] of cases) expect([code, status, readingFailure({ code, status })]).toEqual([code, status, want]);
  });
});
