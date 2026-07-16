// People DAL — saved birth data for friends/family so users can view their
// charts + compatibility (Arcana 2.0 "People", Cece-style). RLS scopes every
// row to the owner; birth_utc is computed by a DB trigger (Sprint-B pipeline).

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type Relationship = 'self' | 'partner' | 'family' | 'friend' | 'other';

export interface Person {
  id: string;
  userId: string;
  name: string;
  relationship: Relationship;
  birthDate: string;
  birthTime: string | null;
  birthTz: string | null;
  birthPlace: string | null;
  birthLat: number | null;
  birthLon: number | null;
  notes: string | null;
  createdAt: string;
}

export interface PersonInput {
  name: string;
  relationship: Relationship;
  birthDate: string;
  birthTime?: string | null;
  birthTz?: string | null;
  birthPlace?: string | null;
  birthLat?: number | null;
  birthLon?: number | null;
  notes?: string | null;
}

function mapRow(r: Record<string, unknown>): Person {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    relationship: (r.relationship as Relationship) ?? 'friend',
    birthDate: r.birth_date as string,
    birthTime: (r.birth_time as string) ?? null,
    birthTz: (r.birth_tz as string) ?? null,
    birthPlace: (r.birth_place as string) ?? null,
    birthLat: (r.birth_lat as number) ?? null,
    birthLon: (r.birth_lon as number) ?? null,
    notes: (r.notes as string) ?? null,
    createdAt: r.created_at as string,
  };
}

const COLS = 'id, user_id, name, relationship, birth_date, birth_time, birth_tz, birth_place, birth_lat, birth_lon, notes, created_at';

export async function listForUser(userId: string): Promise<Result<Person[]>> {
  const { data, error } = await supabase
    .from('people')
    .select(COLS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    captureException('dal.people.listForUser', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map((r) => mapRow(r as Record<string, unknown>)) };
}

export async function getById(id: string): Promise<Result<Person | null>> {
  const { data, error } = await supabase.from('people').select(COLS).eq('id', id).maybeSingle();
  if (error) {
    captureException('dal.people.getById', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ? mapRow(data as Record<string, unknown>) : null };
}

function toRow(userId: string, input: PersonInput): Record<string, unknown> {
  return {
    user_id: userId,
    name: input.name.trim(),
    relationship: input.relationship,
    birth_date: input.birthDate,
    birth_time: input.birthTime || null,
    birth_tz: input.birthTz || null,
    birth_place: input.birthPlace || null,
    birth_lat: input.birthLat ?? null,
    birth_lon: input.birthLon ?? null,
    notes: input.notes || null,
  };
}

export async function create(userId: string, input: PersonInput): Promise<Result<Person>> {
  const { data, error } = await supabase.from('people').insert(toRow(userId, input)).select(COLS).single();
  if (error) {
    captureException('dal.people.create', error, { userId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function update(id: string, input: PersonInput): Promise<Result<Person>> {
  const row = toRow('', input);
  delete (row as { user_id?: unknown }).user_id;
  const { data, error } = await supabase.from('people').update(row).eq('id', id).select(COLS).single();
  if (error) {
    captureException('dal.people.update', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapRow(data as Record<string, unknown>) };
}

export async function remove(id: string): Promise<Result<void>> {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) {
    captureException('dal.people.remove', error, { id });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
