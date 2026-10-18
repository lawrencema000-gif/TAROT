import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';

/*
 * p9 QS R-1, the account side: profiles.community_name (20261003000014) is
 * the name Community shows. The real AuthProvider runs here over a fake
 * Supabase client that keeps one profiles row and records every upsert:
 *  - the column reads into profile.communityName, and an unset one reads as
 *    undefined, never null, so a profile handed back to updateProfile cannot
 *    write the column;
 *  - updateProfile({ communityName }) writes community_name, and null clears it;
 *  - before 014 the column is not there: the save of a name fails with the
 *    server's error and changes nothing, and other saves never name it.
 */

const h = vi.hoisted(() => {
  const store = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true, enumerable: true });
  const member = { id: '00000000-0000-4000-8000-0000000000e2', email: 'jane.doe1990@gmail.com' };
  return {
    member,
    session: { user: member, access_token: 'token' } as null | { user: typeof member; access_token: string },
    /** false: the database before 014, without the column. */
    hasColumn: true,
    communityName: null as string | null,
    upserts: [] as Array<Record<string, unknown>>,
  };
});

vi.mock('../../lib/supabase', () => {
  const row = () => ({
    id: h.member.id,
    email: h.member.email,
    display_name: 'Jane Doe',
    ...(h.hasColumn ? { community_name: h.communityName } : {}),
    birth_date: '1990-05-05',
    timezone: 'UTC',
    goals: [],
    tone_preference: 'gentle',
    notification_time: '09:00',
    notifications_enabled: false,
    onboarding_complete: true,
    is_premium: false,
    is_ad_free: false,
    locale: null,
    streak: 0,
    level: 1,
    total_readings: 0,
    total_journal_entries: 0,
    theme: 'dark',
    subscribed_to_newsletter: false,
    created_at: '2026-01-01T00:00:00Z',
  });
  const profiles = () => {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({ data: row(), error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      upsert: (values: Record<string, unknown>) => ({
        select: () => ({
          maybeSingle: async () => {
            h.upserts.push(values);
            if ('community_name' in values && !h.hasColumn) {
              return { data: null, error: { code: 'PGRST204', message: "Could not find the 'community_name' column of 'profiles' in the schema cache" } };
            }
            if ('community_name' in values) h.communityName = values.community_name as string | null;
            return { data: row(), error: null };
          },
        }),
      }),
    };
    return query;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: h.session }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
      },
      from: () => profiles(),
      channel: () => channel,
      removeChannel: () => {},
      rpc: async () => ({ data: false, error: null }),
      functions: { invoke: async () => ({ data: null, error: null }) },
    },
  };
});
vi.mock('../../dal/dailyRituals', () => ({ syncStreak: async () => ({ ok: true, data: { streak: 0, lastCompleted: null } }) }));
vi.mock('../../services/storage', () => ({ migrateGuestData: async () => {} }));
vi.mock('../../utils/admin', () => ({ isAdmin: () => false, verifyAdminStatus: async () => false }));
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: () => {} }), getLaunchUrl: async () => null } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: async () => {}, close: async () => {} } }));
vi.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: { initialize: () => {}, signIn: async () => ({}) } }));
vi.mock('@sentry/react', () => ({ setUser: () => {} }));

import '../../i18n/config';
import { AuthProvider, useAuth } from '../AuthContext';

type Auth = ReturnType<typeof useAuth>;
let auth: Auth | null = null;
function Probe() {
  auth = useAuth();
  return null;
}

async function mountSignedIn() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(auth?.profile).not.toBeNull());
}

beforeEach(() => {
  h.hasColumn = true;
  h.communityName = null;
  h.upserts.length = 0;
  auth = null;
});
afterEach(() => cleanup());

describe('profiles.community_name in the account (QS R-1)', { timeout: 20_000 }, () => {
  it('an unset name reads as undefined, never null, and is not the display name or the email', async () => {
    await mountSignedIn();
    expect(auth!.profile!.communityName).toBeUndefined();
    expect('communityName' in auth!.profile! && auth!.profile!.communityName === null).toBe(false);
  });

  it('a chosen name reads into profile.communityName', async () => {
    h.communityName = 'Moon Child';
    await mountSignedIn();
    expect(auth!.profile!.communityName).toBe('Moon Child');
  });

  it('updateProfile writes community_name, and null clears it', async () => {
    await mountSignedIn();
    await act(async () => {
      expect((await auth!.updateProfile({ communityName: 'Moon Child' })).error).toBeNull();
    });
    expect(h.upserts.at(-1)).toMatchObject({ id: h.member.id, community_name: 'Moon Child' });
    expect(auth!.profile!.communityName).toBe('Moon Child');

    await act(async () => {
      expect((await auth!.updateProfile({ communityName: null })).error).toBeNull();
    });
    expect(h.upserts.at(-1)).toMatchObject({ community_name: null });
    expect(auth!.profile!.communityName).toBeUndefined();
  });

  it('a profile read back and saved whole does not write the column', async () => {
    await mountSignedIn();
    await act(async () => {
      await auth!.updateProfile({ ...auth!.profile!, theme: 'midnight' });
    });
    expect(h.upserts.at(-1)).not.toHaveProperty('community_name');
  });

  it('before 014: saving a name fails with the server’s error and changes nothing; other saves still work', async () => {
    h.hasColumn = false;
    await mountSignedIn();
    expect(auth!.profile!.communityName).toBeUndefined();
    let result: { error: Error | null } | null = null;
    await act(async () => {
      result = await auth!.updateProfile({ communityName: 'Moon Child' });
    });
    expect(result!.error?.message).toMatch(/community_name/);
    expect(auth!.profile!.communityName).toBeUndefined();

    await act(async () => {
      expect((await auth!.updateProfile({ theme: 'midnight' })).error).toBeNull();
    });
    expect(h.upserts.at(-1)).not.toHaveProperty('community_name');
  });
});
