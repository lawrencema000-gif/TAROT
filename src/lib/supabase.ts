import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

const STORAGE_KEY_PREFIX = 'arcana-auth-';

const nativeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const primary = await Preferences.get({ key: STORAGE_KEY_PREFIX + key });
      if (primary.value != null) return primary.value;
      const legacy = await Preferences.get({ key });
      return legacy.value ?? null;
    } catch (e) {
      console.warn('[Storage] Preferences.get failed:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await Preferences.set({ key: STORAGE_KEY_PREFIX + key, value });
      await Preferences.set({ key, value });
    } catch (e) {
      console.warn('[Storage] Preferences.set failed:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await Preferences.remove({ key: STORAGE_KEY_PREFIX + key });
      await Preferences.remove({ key });
    } catch (e) {
      console.warn('[Storage] Preferences.remove failed:', e);
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
        flowType: 'pkce',
        detectSessionInUrl: !isNative,
        persistSession: true,
        autoRefreshToken: true,
        storage: isNative ? nativeStorage : undefined,
      },
    });
  } catch {
    return null;
  }
}

export const supabase: SupabaseClient = initSupabase() as SupabaseClient;
