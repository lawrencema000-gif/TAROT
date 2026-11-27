// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p12 premium-13 / D05 (WP-P0-09). The Dream page tells members their dream
 * "is not stored server-side". ai-dream-interpret used to keep every reading,
 * which quotes the dream, in the AI cache shared by all members for 7 days,
 * keyed on the dream text. Under D05 (own option) the shared copy stops and
 * its stored rows are deleted; the member's own retry copy (model
 * 'spend-replay', written by _shared/handler.ts) keeps today's two days, and
 * WP-P0-13 rewrites `dream.privacy` to say so. _shared/handler.ts is untouched.
 */

const ROOT = join(__dirname, '..', '..', '..');
const FUNCTIONS = join(ROOT, 'supabase', 'functions');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

/** The source without // and /* *\/ comments, so a comment that names a call does not count. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** SQL without -- comments. */
function sql(src: string): string {
  return src.replace(/--.*$/gm, '');
}

const dreamIndex = code(readFileSync(join(FUNCTIONS, 'ai-dream-interpret', 'index.ts'), 'utf8'));
const handlerSrc = code(readFileSync(join(FUNCTIONS, '_shared', 'handler.ts'), 'utf8'));
const migrations = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((name) => ({ name, body: sql(readFileSync(join(MIGRATIONS, name), 'utf8')) }));

describe('ai-dream-interpret keeps no shared copy of a dream reading (D05)', () => {
  it('neither reads nor writes the shared AI cache', () => {
    for (const banned of ['aiCacheGet(', 'aiCacheStore(', 'aiCacheKey(', 'CACHE_MODEL_TAG', 'ai-gate.ts']) {
      expect(dreamIndex, banned).not.toContain(banned);
    }
  });

  it('keeps the shared default retry copy: no replayTtlMinutes of its own', () => {
    expect(dreamIndex).not.toContain('replayTtlMinutes');
    expect(dreamIndex).toMatch(/spend:\s*\{\s*actionKey:\s*"dream-interpret",\s*cost:\s*50\s*\}/);
  });

  it("the member's retry copy is still the handler's two-day ai_cache_set copy", () => {
    expect(handlerSrc).toMatch(/const REPLAY_TTL_DAYS = 2;/);
    expect(handlerSrc).toMatch(/rpc\("ai_cache_set",[\s\S]{0,200}p_model: "spend-replay"[\s\S]{0,120}p_ttl_days: REPLAY_TTL_DAYS/);
  });
});

describe('the stored dream readings are deleted and the prune runs hourly (D05)', () => {
  const purge = migrations.filter((m) =>
    /DELETE\s+FROM\s+public\.ai_response_cache[\s\S]*?function_name\s*=\s*'ai-dream-interpret'/i.test(m.body),
  );

  it('a migration deletes the shared ai-dream-interpret cache rows', () => {
    expect(purge.length).toBeGreaterThan(0);
  });

  it('the purge leaves the spend-claim and spend-replay rows alone', () => {
    for (const m of purge) {
      const stmt = m.body.match(/DELETE\s+FROM\s+public\.ai_response_cache[^;]*function_name\s*=\s*'ai-dream-interpret'[^;]*;/i)?.[0] ?? '';
      expect(stmt, m.name).toMatch(/model\s+NOT\s+IN\s*\(\s*'spend-claim'\s*,\s*'spend-replay'\s*\)/i);
    }
  });

  it('the newest migration that schedules ai-cache-prune runs it hourly, with the same DELETE', () => {
    const scheduling = migrations.filter((m) => /cron\.schedule\(\s*'ai-cache-prune'/.test(m.body));
    const newest = scheduling[scheduling.length - 1];
    expect(newest).toBeDefined();
    const call = newest.body.match(/cron\.schedule\(\s*'ai-cache-prune'\s*,\s*'([^']+)'\s*,\s*\$\$([\s\S]*?)\$\$/);
    expect(call, newest.name).not.toBeNull();
    const fields = call![1].trim().split(/\s+/);
    expect(fields).toHaveLength(5);
    expect(fields[0]).toMatch(/^\d{1,2}$/);
    expect(Number(fields[0])).toBeLessThanOrEqual(59);
    expect(fields.slice(1)).toEqual(['*', '*', '*', '*']);
    expect(call![2].trim()).toBe('DELETE FROM public.ai_response_cache WHERE expires_at < now();');
  });
});

describe('the Dream page note names the two-day retry copy (D05 wording)', () => {
  // `dream.privacy` (four locales) and the page default belong to WP-P0-13,
  // which ships them only after this package's function and migration are live.
  it.todo('dream.privacy says the reading is kept up to two days for Try again (WP-P0-13)');
});
