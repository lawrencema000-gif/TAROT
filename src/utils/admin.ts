import { supabase } from '../lib/supabase';

// Client-side heuristic for immediate UI rendering (NOT authoritative).
// Real authorization is enforced server-side via RLS + user_roles table.
// Comma-separated list via VITE_ADMIN_EMAILS env var; falls back to empty.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | undefined | null): boolean {
  const e = email?.toLowerCase();
  if (!e) return false;
  return ADMIN_EMAILS.includes(e);
}

export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email);
}

// Server-verified admin check (authoritative — calls is_admin() via RPC)
export async function verifyAdminStatus(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_is_admin');
    if (error) {
      console.error('Failed to verify admin status:', error.message);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}
