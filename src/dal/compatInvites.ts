// Compatibility invite DAL.

import { supabase } from '../lib/supabase';
import { captureException } from '../utils/telemetry';
import type { Result } from './dailyRituals';

export type CompatKind =
  | 'mbti'
  | 'love-language'
  | 'attachment'
  | 'big-five'
  | 'enneagram'
  | 'zodiac'
  | 'element';

export interface CompatInvitePublic {
  id: string;
  code: string;
  kind: CompatKind;
  inviter_name: string | null;
  inviter_user_id: string;
  created_at: string;
  expires_at: string;
}

export async function createInvite(
  kind: CompatKind,
  result: unknown,
  inviterName?: string | null,
): Promise<Result<{ code: string }>> {
  const { data, error } = await supabase.rpc('compat_invite_create', {
    p_kind: kind,
    p_result: result,
    p_inviter_name: inviterName ?? null,
  });
  if (error) {
    captureException('dal.compatInvites.create', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.code) return { ok: false, error: 'No code returned' };
  return { ok: true, data: { code: row.code as string } };
}

/** Resolve invite metadata from a code (no inviter_result leaked). */
export async function fetchPublicByCode(code: string): Promise<Result<CompatInvitePublic | null>> {
  const { data, error } = await supabase
    .from('compat_invite_public')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();
  if (error) {
    captureException('dal.compatInvites.fetchPublic', error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: (data as CompatInvitePublic | null) ?? null };
}

export interface CompatJointResult {
  kind: CompatKind;
  inviter_result: unknown;
  responder_result: unknown;
  inviter_name: string | null;
  responder_name: string | null;
}

export async function respond(
  code: string,
  result: unknown,
  responderName?: string | null,
): Promise<Result<CompatJointResult>> {
  const { data, error } = await supabase.rpc('compat_invite_respond', {
    p_code: code.toUpperCase(),
    p_result: result,
    p_responder_name: responderName ?? null,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('own invite')) return { ok: false, error: 'self-invite' };
    if (msg.includes('expired'))    return { ok: false, error: 'expired' };
    if (msg.includes('unknown'))    return { ok: false, error: 'not-found' };
    captureException('dal.compatInvites.respond', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result from RPC' };
  return {
    ok: true,
    data: {
      kind: row.kind as CompatKind,
      inviter_result: row.inviter_result,
      responder_result: row.responder_result,
      inviter_name: (row.inviter_name as string | null) ?? null,
      responder_name: (row.responder_name as string | null) ?? null,
    },
  };
}

/** Inviter-side: pull merged result after the responder has submitted. */
export async function fetchInviteResult(code: string): Promise<
  Result<CompatJointResult & { responded_at: string | null }>
> {
  const { data, error } = await supabase.rpc('compat_invite_fetch_result', {
    p_code: code.toUpperCase(),
  });
  if (error) {
    captureException('dal.compatInvites.fetchResult', error);
    return { ok: false, error: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'No result' };
  return {
    ok: true,
    data: {
      kind: row.kind as CompatKind,
      inviter_result: row.inviter_result,
      responder_result: row.responder_result,
      inviter_name: (row.inviter_name as string | null) ?? null,
      responder_name: (row.responder_name as string | null) ?? null,
      responded_at: (row.responded_at as string | null) ?? null,
    },
  };
}
