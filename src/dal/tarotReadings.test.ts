import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The question column ships with migration 20261003000010. Until it is live
 * PostgREST answers PGRST204 (insert) / 42703 (select); the DAL must retry
 * without the column so saving and listing keep working on both sides of
 * the push. These are the error bodies production returned on 2026-10-03.
 */

const calls: { op: string; payload?: unknown; columns?: string }[] = [];
let columnExists = false;

const MISSING_INSERT = { code: 'PGRST204', message: "Could not find the 'question' column of 'tarot_readings' in the schema cache" };
const MISSING_SELECT = { code: '42703', message: 'column tarot_readings.question does not exist' };

function selectChain(columns: string) {
  const result = () =>
    !columnExists && columns.includes('question')
      ? { data: null, error: MISSING_SELECT }
      : { data: [{ id: 'r1', date: '2026-10-03', spread_type: 'single', focus_area: null, cards: [], interpretation: null, created_at: 'x', ...(columnExists ? { question: 'Will it rain?' } : {}) }], error: null };
  const chain: Record<string, unknown> = {};
  for (const m of ['eq', 'order']) chain[m] = () => chain;
  chain.range = () => Promise.resolve(result());
  return chain;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        calls.push({ op: 'insert', payload });
        const res = !columnExists && 'question' in payload ? { data: null, error: MISSING_INSERT } : { data: { id: 'new' }, error: null };
        const p = Promise.resolve(res) as Promise<typeof res> & { select: () => { single: () => Promise<typeof res> } };
        p.select = () => ({ single: () => Promise.resolve(res) });
        return p;
      },
      select: (columns: string) => {
        calls.push({ op: 'select', columns });
        return selectChain(columns);
      },
    }),
  },
}));
vi.mock('../utils/telemetry', () => ({ captureException: vi.fn() }));

const dal = await import('./tarotReadings');

const base = { userId: 'u', date: '2026-10-03', spreadType: 'single', cards: [], saved: true };

describe('tarotReadings question column', () => {
  beforeEach(() => {
    calls.length = 0;
    dal.__resetQuestionColumnProbe();
  });

  it('omits an empty question entirely', async () => {
    columnExists = false;
    const res = await dal.insert({ ...base, question: '   ' });
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).not.toHaveProperty('question');
  });

  it('retries without the question when the column is not there yet', async () => {
    columnExists = false;
    const res = await dal.insert({ ...base, question: ' Will it rain? ' });
    expect(res.ok).toBe(true);
    expect(calls.map((c) => 'question' in (c.payload as object))).toEqual([true, false]);
    // Learned for the session: the next save goes straight to the short row.
    calls.length = 0;
    await dal.insertReturningId({ ...base, question: 'Again?' });
    expect(calls).toHaveLength(1);
    expect(calls[0].payload).not.toHaveProperty('question');
  });

  it('sends the trimmed question once the column exists', async () => {
    columnExists = true;
    const res = await dal.insertReturningId({ ...base, question: ' Will it rain? ' });
    expect(res).toEqual({ ok: true, data: { id: 'new' } });
    expect(calls).toHaveLength(1);
    expect((calls[0].payload as Record<string, unknown>).question).toBe('Will it rain?');
  });

  it('lists saved readings before and after the column exists', async () => {
    columnExists = false;
    const before = await dal.listSaved('u');
    expect(before.ok && before.data[0].question).toBe(null);
    expect(calls.map((c) => c.columns?.includes('question'))).toEqual([true, false]);

    dal.__resetQuestionColumnProbe();
    calls.length = 0;
    columnExists = true;
    const after = await dal.listSaved('u');
    expect(after.ok && after.data[0].question).toBe('Will it rain?');
    expect(calls).toHaveLength(1);
  });
});
