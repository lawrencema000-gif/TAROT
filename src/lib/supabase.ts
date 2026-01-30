import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

const STORAGE_KEY_PREFIX = 'arcana-auth-';

const persistentStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY_PREFIX + key) || localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, value);
      localStorage.setItem(key, value);
    } catch {
      console.warn('[Storage] Failed to persist:', key);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + key);
      localStorage.removeItem(key);
    } catch {
      console.warn('[Storage] Failed to remove:', key);
    }
  },
};

function initSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  try {
    const isNative = Capacitor.isNativePlatform();

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: !isNative,
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        storage: isNative ? persistentStorage : undefined,
      },
    });
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient = initSupabase() as SupabaseClient;
