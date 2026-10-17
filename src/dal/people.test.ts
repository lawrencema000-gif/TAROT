import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * p8 F23: a pet's species makes the round trip. The DAL's select list had no
 * `species`, so every read (list, detail, and the row create/update hand
 * back) came back as an unspecified companion: the detail page never showed
 * the species lens, and the edit sheet then saved its default chip (Dog)
 * over a stored Cat.
 *
 * The table below answers like PostgREST: a row holds every column, but a
 * response carries only the columns the select names. It also enforces the
 * real column CHECK (migration 20260817030000_people_pets.sql).
 */

const SPECIES = ['dog', 'cat', 'bird', 'rabbit', 'horse', 'reptile', 'fish', 'smallPet', 'other'];
const rows = new Map<string, Record<string, unknown>>();
const selects: string[] = [];
let seq = 0;

function pick(row: Record<string, unknown>, columns: string) {
  selects.push(columns);
  return Object.fromEntries(columns.split(',').map((c) => c.trim()).filter(Boolean).map((c) => [c, row[c] ?? null]));
}

function checkSpecies(row: Record<string, unknown>) {
  const s = row.species;
  return s === null || s === undefined || SPECIES.includes(s as string)
    ? null
    : { code: '23514', message: 'new row for relation "people" violates check constraint "people_species_check"' };
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table !== 'people') throw new Error(`unexpected table ${table}`);
      return {
        insert: (row: Record<string, unknown>) => ({
          select: (columns: string) => ({
            single: async () => {
              const err = checkSpecies(row);
              if (err) return { data: null, error: err };
              const id = `person-${++seq}`;
              const stored = { id, created_at: `2026-10-17T00:00:0${seq}Z`, birth_utc: null, ...row };
              rows.set(id, stored);
              return { data: pick(stored, columns), error: null };
            },
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: (_col: 'id', id: string) => ({
            select: (columns: string) => ({
              single: async () => {
                const err = checkSpecies(patch);
                if (err) return { data: null, error: err };
                const stored = { ...rows.get(id)!, ...patch };
                rows.set(id, stored);
                return { data: pick(stored, columns), error: null };
              },
            }),
          }),
        }),
        select: (columns: string) => ({
          eq: (col: string, value: string) => ({
            maybeSingle: async () => {
              const row = [...rows.values()].find((r) => r[col] === value);
              return { data: row ? pick(row, columns) : null, error: null };
            },
            order: async () => ({
              data: [...rows.values()].filter((r) => r[col] === value).reverse().map((r) => pick(r, columns)),
              error: null,
            }),
          }),
        }),
      };
    },
  },
}));
vi.mock('../utils/telemetry', () => ({ captureException: vi.fn() }));

const people = await import('./people');

const CAT = { name: 'QA Cat', relationship: 'pet' as const, species: 'cat' as const, birthDate: '2020-05-01' };

beforeEach(() => {
  rows.clear();
  selects.length = 0;
});

describe('people DAL: species round trip (F23)', () => {
  it('a pet saved as a cat reads back as a cat — from create, getById and listForUser', async () => {
    const created = await people.create('user-1', CAT);
    expect(created.ok && created.data.species).toBe('cat');
    const id = created.ok ? created.data.id : '';
    const got = await people.getById(id);
    expect(got.ok && got.data?.species).toBe('cat');
    const list = await people.listForUser('user-1');
    expect(list.ok && list.data.map((p) => [p.name, p.species])).toEqual([['QA Cat', 'cat']]);
    // Every read names the column.
    expect(selects.every((s) => s.split(',').map((c) => c.trim()).includes('species'))).toBe(true);
  });

  it('editing only the birth date keeps the stored species', async () => {
    const created = await people.create('user-1', CAT);
    const id = created.ok ? created.data.id : '';
    const before = await people.getById(id);
    const p = before.ok ? before.data! : null;
    // What the edit sheet sends: the species it was opened with.
    const res = await people.update(id, { name: p!.name, relationship: p!.relationship, species: p!.species, birthDate: '2020-06-01' });
    expect(res.ok && [res.data.species, res.data.birthDate]).toEqual(['cat', '2020-06-01']);
    expect(rows.get(id)!.species).toBe('cat');
  });

  it('every species value the form offers is one the column accepts', async () => {
    for (const species of SPECIES) {
      const res = await people.create('user-1', { ...CAT, name: species, species: species as typeof CAT.species });
      expect(res.ok && res.data.species).toBe(species);
    }
  });

  it('an unspecified companion stays unspecified, and a person never carries a species', async () => {
    const pet = await people.create('user-1', { ...CAT, species: null });
    expect(pet.ok && pet.data.species).toBeNull();
    const friend = await people.create('user-1', { ...CAT, name: 'Ann', relationship: 'friend' });
    expect(friend.ok && friend.data.species).toBeNull();
    expect(rows.get(friend.ok ? friend.data.id : '')!.species).toBeNull();
  });

  it('setBirthTz writes only the zone and hands back the whole person, species included', async () => {
    const created = await people.create('user-1', { ...CAT, relationship: 'pet' });
    const id = created.ok ? created.data.id : '';
    const res = await people.setBirthTz(id, 'Asia/Tokyo');
    expect(res.ok && [res.data.birthTz, res.data.species, res.data.name]).toEqual(['Asia/Tokyo', 'cat', 'QA Cat']);
  });
});
