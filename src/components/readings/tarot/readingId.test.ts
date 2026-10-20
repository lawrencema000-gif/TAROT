import { describe, it, expect, vi, afterEach } from 'vitest';
import { newReadingId } from './readingId';

// The shape generate-reading accepts as a requestId (supabase/functions/_shared/spend-replay.ts).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('newReadingId (p8 F09)', () => {
  it('is a UUID the server takes as a requestId, new for every reading', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newReadingId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(UUID_RE);
  });

  it('still makes a v4 UUID where randomUUID is missing (WebViews before Chrome 92)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (b: Uint8Array) => b.fill(0xab) });
    const id = newReadingId();
    expect(id).toMatch(UUID_RE);
    expect(id[14]).toBe('4');
    expect('89ab').toContain(id[19]);
    vi.stubGlobal('crypto', undefined);
    expect(newReadingId()).toMatch(UUID_RE);
  });
});
