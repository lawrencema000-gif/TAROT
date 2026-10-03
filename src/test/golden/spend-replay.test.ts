// @vitest-environment node
/**
 * The handler's spend keys (supabase/functions/_shared/spend-replay.ts):
 * a replayed request maps to the key that was already charged — so it is
 * served the stored response, never re-run and never refunded (p7 #31) —
 * and a companion conversation is charged once per 24 h (session keys).
 */
import { describe, expect, it } from 'vitest';
import {
  chargedByThisCall,
  extractRequestId,
  isStoredResponse,
  replayStoreKey,
  requestKeyAfterRefunds,
  requestKeyBase,
  sessionKeyBase,
  sessionKeyFromLedger,
  type SpendLedgerRow,
} from '../../../supabase/functions/_shared/spend-replay';

const RID = '3f1c2a9e-8b7d-4c6e-9f0a-1b2c3d4e5f60';

describe('extractRequestId', () => {
  it('accepts a UUID and lower-cases it', () => {
    expect(extractRequestId({ requestId: RID.toUpperCase() })).toBe(RID);
  });
  it('ignores anything that is not a UUID', () => {
    expect(extractRequestId({ requestId: 'abc' })).toBeNull();
    expect(extractRequestId({ requestId: 42 })).toBeNull();
    expect(extractRequestId(null)).toBeNull();
    expect(extractRequestId([RID])).toBeNull();
  });
});

describe('request keys', () => {
  it('the same request maps to the same key, whatever the key order', async () => {
    const a = await requestKeyBase(RID, 'ai-person-reading', 'person-reading', { personId: 'p1', requestId: RID });
    const b = await requestKeyBase(RID, 'ai-person-reading', 'person-reading', { requestId: RID, personId: 'p1' });
    expect(a).toBe(b);
    expect(a.startsWith(`rq:${RID}:`)).toBe(true);
  });
  it('a schema that strips requestId hashes like one that keeps it', async () => {
    const kept = await requestKeyBase(RID, 'fn', 'act', { vibe: 'romantic', requestId: RID });
    const stripped = await requestKeyBase(RID, 'fn', 'act', { vibe: 'romantic' });
    expect(kept).toBe(stripped);
  });
  it('another body under the same id is another request', async () => {
    const a = await requestKeyBase(RID, 'generate-reading', 'tarot-ai-interpret', { cards: [1] });
    const b = await requestKeyBase(RID, 'generate-reading', 'tarot-ai-interpret', { cards: [2] });
    expect(a).not.toBe(b);
  });
  it('after n refunded attempts the retry is the n-th suffix', () => {
    expect(requestKeyAfterRefunds('rq:x:y', 0)).toBe('rq:x:y');
    expect(requestKeyAfterRefunds('rq:x:y', 2)).toBe('rq:x:y:2');
  });
});

describe('chargedByThisCall', () => {
  it('trusts the RPC column when it is there', () => {
    expect(chargedByThisCall({ allowed: true, charged: false }, false)).toBe(false);
    expect(chargedByThisCall({ allowed: true, charged: true }, true)).toBe(true);
  });
  it('without the column, a key the ledger already held is a duplicate', () => {
    expect(chargedByThisCall({ allowed: true }, true)).toBe(false);
    expect(chargedByThisCall({ allowed: true }, false)).toBe(true);
    expect(chargedByThisCall(null, false)).toBe(true);
  });
});

describe('session keys (companion: one charge per conversation)', () => {
  const base = sessionKeyBase('ai-companion-chat', `sage:${RID}`);
  const now = Date.parse('2026-10-03T12:00:00Z');
  const DAY = 24 * 3600_000;
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();

  it('keeps the scope free of LIKE wildcards', () => {
    expect(sessionKeyBase('f', 'a%b_c*d')).toBe('ss:f:ab_cd');
  });
  it('first message: the base key, not continuing (charged)', () => {
    expect(sessionKeyFromLedger(base, [], now, DAY)).toEqual({ key: base, continuing: false });
  });
  it('later message inside 24 h: same key, continuing (free)', () => {
    const rows: SpendLedgerRow[] = [{ key: base, kind: 'charge', at: at(3600_000) }];
    expect(sessionKeyFromLedger(base, rows, now, DAY)).toEqual({ key: base, continuing: true });
  });
  it('after 24 h: a new charge under the next suffix', () => {
    const rows: SpendLedgerRow[] = [{ key: base, kind: 'charge', at: at(DAY + 1) }];
    expect(sessionKeyFromLedger(base, rows, now, DAY)).toEqual({ key: `${base}:1`, continuing: false });
  });
  it('a refunded first message does not open a free session', () => {
    const rows: SpendLedgerRow[] = [
      { key: base, kind: 'charge', at: at(60_000) },
      { key: base, kind: 'refund', at: at(59_000) },
    ];
    expect(sessionKeyFromLedger(base, rows, now, DAY)).toEqual({ key: `${base}:1`, continuing: false });
  });
  it('follows the latest suffix', () => {
    const rows: SpendLedgerRow[] = [
      { key: base, kind: 'charge', at: at(3 * DAY) },
      { key: `${base}:1`, kind: 'charge', at: at(2 * DAY) },
      { key: `${base}:2`, kind: 'charge', at: at(60_000) },
    ];
    expect(sessionKeyFromLedger(base, rows, now, DAY)).toEqual({ key: `${base}:2`, continuing: true });
  });
  it('ignores keys of other conversations that share a prefix', () => {
    const rows: SpendLedgerRow[] = [{ key: `${base}0`, kind: 'charge', at: at(60_000) }];
    expect(sessionKeyFromLedger(base, rows, now, DAY)).toEqual({ key: base, continuing: false });
  });
});

describe('replay store', () => {
  it('is per user and per key', async () => {
    const a = await replayStoreKey('u1', 'rq:a');
    expect(a).toMatch(/^spend-replay:[0-9a-f]{64}$/);
    expect(await replayStoreKey('u2', 'rq:a')).not.toBe(a);
    expect(await replayStoreKey('u1', 'rq:b')).not.toBe(a);
  });
  it('recognises both stored shapes and nothing else', () => {
    expect(isStoredResponse({ kind: 'data', value: { reading: 'x' } })).toBe(true);
    expect(isStoredResponse({ kind: 'data', value: null })).toBe(true);
    expect(isStoredResponse({ kind: 'raw', status: 200, contentType: 'application/json', body: '{}' })).toBe(true);
    expect(isStoredResponse('a cached reading')).toBe(false);
    expect(isStoredResponse({ kind: 'raw', status: '200', body: '{}' })).toBe(false);
    expect(isStoredResponse(null)).toBe(false);
  });
});
