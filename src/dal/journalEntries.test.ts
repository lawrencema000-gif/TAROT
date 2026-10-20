import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The header search opens an entry older than the journal's first page by
 * its id (p10 d3-ko-13). The read is bound to the member, as updateById and
 * deleteById are: an id alone never reads another member's entry, were RLS
 * ever to regress.
 */

type Row = { id: string; user_id: string; content: string };
const rows: Row[] = [
  { id: 'e1', user_id: 'user-1', content: 'Mine.' },
  { id: 'e2', user_id: 'user-2', content: 'Someone else’s.' },
];
const filters: [string, string][] = [];
let failWith: { message: string } | null = null;
const captureException = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'journal_entries') throw new Error(`unexpected table ${table}`);
      const applied: [string, string][] = [];
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          applied.push([column, value]);
          filters.push([column, value]);
          return query;
        },
        maybeSingle: async () =>
          failWith
            ? { data: null, error: failWith }
            : { data: rows.find((r) => applied.every(([c, v]) => r[c as keyof Row] === v)) ?? null, error: null },
      };
      return query;
    },
  },
}));
vi.mock('../utils/telemetry', () => ({ captureException: (...a: unknown[]) => captureException(...a) }));

const journalEntries = await import('./journalEntries');

beforeEach(() => {
  filters.length = 0;
  failWith = null;
  captureException.mockClear();
});

describe('journalEntries.getById', () => {
  it('reads the member’s own entry by its id, bound to the member', async () => {
    const res = await journalEntries.getById('e1', 'user-1');
    expect(res).toEqual({ ok: true, data: rows[0] });
    expect(filters).toEqual([['id', 'e1'], ['user_id', 'user-1']]);
  });

  it('another member’s entry, or one deleted since, is none', async () => {
    expect(await journalEntries.getById('e2', 'user-1')).toEqual({ ok: true, data: null });
    expect(await journalEntries.getById('e9', 'user-1')).toEqual({ ok: true, data: null });
  });

  it('a read that fails says so, and is reported', async () => {
    failWith = { message: 'Failed to fetch' };
    expect(await journalEntries.getById('e1', 'user-1')).toEqual({ ok: false, error: 'Failed to fetch' });
    expect(captureException).toHaveBeenCalledWith('dal.journalEntries.getById', failWith, { id: 'e1', userId: 'user-1' });
  });
});
