import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

function initSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient = initSupabase() as SupabaseClient;
