import { supabase } from '../lib/supabase';

// Client-side heuristic for immediate UI rendering (NOT authoritative).
// Real authorization is enforced server-side via RLS + user_roles table.
const ADMIN_EMAIL = 'lawrence.ma000@gmail.com';

export function isAdminEmail(email: string | undefined | null): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
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
