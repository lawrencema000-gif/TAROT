import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

// Unified storage that uses @capacitor/preferences on native (survives
// OS memory pressure) and localStorage on web.

const native = Capacitor.isNativePlatform();

export const appStorage = {
  async get(key: string): Promise<string | null> {
    try {
      if (native) {
        const { value } = await Preferences.get({ key });
        return value ?? null;
      }
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (native) {
        await Preferences.set({ key, value });
      } else {
        localStorage.setItem(key, value);
      }
    } catch {
      // silent
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (native) {
        await Preferences.remove({ key });
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      // silent
    }
  },

  async keys(): Promise<string[]> {
    try {
      if (native) {
        const { keys } = await Preferences.keys();
        return keys;
      }
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
};
