// Advisor marketplace bookings + in-session chat.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type SessionState = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'no-show';

export interface AdvisorAvailability {
  id: string;
  advisorId: string;
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // '18:00'
  endTime: string;
  timezone: string;
  isActive: boolean;
}

export interface AdvisorSession {
  id: string;
  advisorId: string;
  clientUserId: string;
  scheduledAt: string;
  durationMinutes: number;
  moonstoneCost: number;
  state: SessionState;
  topic: string | null;
  startedAt: string | null;
  endedAt: string | null;
  rating: number | null;
  review: string | null;
  createdAt: string;
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

function mapSession(row: Record<string, unknown>): AdvisorSession {
  return {
    id: row.id as string,
    advisorId: row.advisor_id as string,
    clientUserId: row.client_user_id as string,
    scheduledAt: row.scheduled_at as string,
    durationMinutes: row.duration_minutes as number,
    moonstoneCost: row.moonstone_cost as number,
    state: row.state as SessionState,
    topic: (row.topic as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    endedAt: (row.ended_at as string) ?? null,
    rating: (row.rating as number) ?? null,
    review: (row.review as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function fetchAvailability(advisorId: string): Promise<Result<AdvisorAvailability[]>> {
  const { data, error } = await supabase
    .from('advisor_availability')
    .select('*')
    .eq('advisor_id', advisorId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');
  if (error) {
    captureException('dal.advisorSessions.fetchAvailability', error);
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id as string,
      advisorId: r.advisor_id as string,
      dayOfWeek: r.day_of_week as number,
      startTime: r.start_time as string,
      endTime: r.end_time as string,
      timezone: r.timezone as string,
      isActive: r.is_active as boolean,
    })),
  };
}

export async function setAvailabilitySlots(
  advisorId: string,
  slots: Omit<AdvisorAvailability, 'id' | 'advisorId' | 'isActive'>[],
): Promise<Result<void>> {
  // Replace all active slots in one round trip: delete then insert.
  const { error: delErr } = await supabase
    .from('advisor_availability')
    .delete()
    .eq('advisor_id', advisorId);
  if (delErr) {
    captureException('dal.advisorSessions.setAvailability.delete', delErr);
    return { ok: false, error: delErr.message };
  }
  if (slots.length === 0) return { ok: true, data: undefined };
  const { error: insErr } = await supabase.from('advisor_availability').insert(
    slots.map((s) => ({
      advisor_id: advisorId,
      day_of_week: s.dayOfWeek,
      start_time: s.startTime,
      end_time: s.endTime,
      timezone: s.timezone,
      is_active: true,
    })),
  );
  if (insErr) {
    captureException('dal.advisorSessions.setAvailability.insert', insErr);
    return { ok: false, error: insErr.message };
  }
  return { ok: true, data: undefined };
}

export async function bookSession(params: {
  advisorId: string;
  scheduledAt: Date;
  durationMinutes: 15 | 30 | 45 | 60;
  topic?: string;
}): Promise<Result<{ sessionId: string; moonstonesSpent: number; newBalance: number }>> {
  const { data, error } = await supabase.rpc('advisor_book_session', {
    p_advisor_id: params.advisorId,
    p_scheduled_at: params.scheduledAt.toISOString(),
    p_duration_minutes: params.durationMinutes,
    p_topic: params.topic ?? null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('insufficient moonstones')) return { ok: false, error: 'insufficient-balance' };
    if (msg.includes('already booked'))          return { ok: false, error: 'slot-taken' };
    if (msg.includes('future'))                  return { ok: false, error: 'past-time' };
    captureException('dal.advisorSessions.book', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result' };
  return {
    ok: true,
    data: {
      sessionId: row.session_id as string,
      moonstonesSpent: row.moonstones_spent as number,
      newBalance: row.new_balance as number,
    },
  };
}

export async function fetchSession(sessionId: string): Promise<Result<AdvisorSession | null>> {
  const { data, error } = await supabase
    .from('advisor_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();
  if (error) {
    captureException('dal.advisorSessions.fetch', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ? mapSession(data as Record<string, unknown>) : null };
}

export async function fetchMySessions(opts?: {
  role?: 'client' | 'advisor';
  onlyUpcoming?: boolean;
}): Promise<Result<AdvisorSession[]>> {
  // RLS handles filtering to participant sessions. We just fetch and sort.
  let q = supabase.from('advisor_sessions').select('*').order('scheduled_at', { ascending: true });
  if (opts?.onlyUpcoming) {
    q = q.in('state', ['scheduled', 'active']);
  }
  const { data, error } = await q;
  if (error) {
    captureException('dal.advisorSessions.fetchMine', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data ?? []).map((r) => mapSession(r as Record<string, unknown>)) };
}

export async function startSession(sessionId: string): Promise<Result<void>> {
  const { error } = await supabase.rpc('advisor_session_start', { p_session_id: sessionId });
  if (error) {
    captureException('dal.advisorSessions.start', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function endSession(sessionId: string): Promise<Result<void>> {
  const { error } = await supabase.rpc('advisor_session_end', { p_session_id: sessionId });
  if (error) {
    captureException('dal.advisorSessions.end', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function cancelSession(sessionId: string): Promise<Result<{ refunded: number }>> {
  const { data, error } = await supabase.rpc('advisor_session_cancel', { p_session_id: sessionId });
  if (error) {
    captureException('dal.advisorSessions.cancel', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, data: { refunded: (row?.refunded as number) ?? 0 } };
}

export async function submitRating(
  sessionId: string,
  rating: number,
  review?: string,
): Promise<Result<void>> {
  const { error } = await supabase
    .from('advisor_sessions')
    .update({ rating, review: review ?? null })
    .eq('id', sessionId);
  if (error) {
    captureException('dal.advisorSessions.rate', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: undefined };
}

export async function fetchMessages(sessionId: string): Promise<Result<SessionMessage[]>> {
  const { data, error } = await supabase
    .from('session_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) {
    captureException('dal.advisorSessions.fetchMessages', error);
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: (data ?? []).map((r) => ({
      id: r.id as string,
      sessionId: r.session_id as string,
      senderId: r.sender_id as string,
      content: r.content as string,
      createdAt: r.created_at as string,
    })),
  };
}

export async function sendMessage(
  sessionId: string,
  senderId: string,
  content: string,
): Promise<Result<SessionMessage>> {
  const { data, error } = await supabase
    .from('session_messages')
    .insert({ session_id: sessionId, sender_id: senderId, content })
    .select()
    .single();
  if (error) {
    captureException('dal.advisorSessions.sendMessage', error);
    return { ok: false, error: error.message };
  }
  return {
    ok: true,
    data: {
      id: data.id as string,
      sessionId: data.session_id as string,
      senderId: data.sender_id as string,
      content: data.content as string,
      createdAt: data.created_at as string,
    },
  };
}

export function subscribeToMessages(
  sessionId: string,
  onInsert: (msg: SessionMessage) => void,
) {
  const channel = supabase
    .channel(`session:${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_messages',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        onInsert({
          id: row.id as string,
          sessionId: row.session_id as string,
          senderId: row.sender_id as string,
          content: row.content as string,
          createdAt: row.created_at as string,
        });
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
