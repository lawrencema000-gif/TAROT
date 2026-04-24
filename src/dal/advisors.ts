// Advisor Marketplace DAL (V1 — directory + interest only)

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export interface AdvisorProfile {
  id: string;
  slug: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string | null;
  specialties: string[];
  languages: string[];
  yearsExperience: number | null;
  hourlyRateCents: number | null;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface CreateInterestInput {
  userId: string;
  advisorId: string;
  topic?: string;
  sessionType?: 'reading' | 'counseling' | 'chart-interpretation' | 'other';
}

function mapProfile(row: Record<string, unknown>): AdvisorProfile {
  return {
    id: row.id as string,
    slug: row.slug as string,
    displayName: row.display_name as string,
    headline: row.headline as string,
    bio: row.bio as string,
    avatarUrl: (row.avatar_url as string) ?? null,
    specialties: (row.specialties as string[]) ?? [],
    languages: (row.languages as string[]) ?? [],
    yearsExperience: (row.years_experience as number) ?? null,
    hourlyRateCents: (row.hourly_rate_cents as number) ?? null,
    ratingAvg: (row.rating_avg as number) ?? null,
    ratingCount: (row.rating_count as number) ?? 0,
  };
}

export async function fetchDirectory(opts?: {
  specialty?: string;
  language?: string;
}): Promise<Result<AdvisorProfile[]>> {
  let query = supabase
    .from('advisor_profiles')
    .select('id, slug, display_name, headline, bio, avatar_url, specialties, languages, years_experience, hourly_rate_cents, rating_avg, rating_count')
    .eq('is_hidden', false)
    .order('rating_avg', { ascending: false, nullsFirst: false })
    .limit(50);

  if (opts?.specialty) {
    query = query.contains('specialties', [opts.specialty]);
  }
  if (opts?.language) {
    query = query.contains('languages', [opts.language]);
  }

  const { data, error } = await query;
  if (error) {
    captureException('dal.advisors.fetchDirectory', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map((r) => mapProfile(r as Record<string, unknown>)) };
}

export async function fetchBySlug(slug: string): Promise<Result<AdvisorProfile | null>> {
  const { data, error } = await supabase
    .from('advisor_profiles')
    .select('id, slug, display_name, headline, bio, avatar_url, specialties, languages, years_experience, hourly_rate_cents, rating_avg, rating_count')
    .eq('slug', slug)
    .eq('is_hidden', false)
    .maybeSingle();

  if (error) {
    captureException('dal.advisors.fetchBySlug', error, { slug });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ? mapProfile(data as Record<string, unknown>) : null };
}

export async function createInterest(input: CreateInterestInput): Promise<Result<void>> {
  const { error } = await supabase.from('advisor_interest').insert({
    user_id: input.userId,
    advisor_id: input.advisorId,
    topic: input.topic ?? null,
    session_type: input.sessionType ?? 'reading',
  });
  if (error) {
    captureException('dal.advisors.createInterest', error, { advisorId: input.advisorId });
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}
