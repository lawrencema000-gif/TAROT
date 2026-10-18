import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';

/*
 * p9 QZ-2: AuthContext read a profile whose subscribed_to_newsletter is NULL
 * (or not in the row at all) as "subscribed" (`?? true`). Consent is never
 * assumed: 20261003000020 makes the column default false and leaves the
 * opt-in to the sign-up's box. The real AuthProvider runs here over a fake
 * Supabase client that keeps one profiles row and records every upsert:
 *  - an unset flag reads as false; a stored true or false reads as itself;
 *  - a profile read back and saved whole never writes an opt-in nobody gave.
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
  const member = { id: '00000000-0000-4000-8000-0000000000e3', email: 'member@example.com' };
  return {
    member,
    session: { user: member, access_token: 'token' },
    /** profiles.subscribed_to_newsletter of the row; 'absent': the row has no such key. */
    newsletter: null as boolean | null | 'absent',
    upserts: [] as Array<Record<string, unknown>>,
  };
});

vi.mock('../../lib/supabase', () => {
  const row = () => ({
    id: h.member.id,
    email: h.member.email,
    display_name: 'Member',
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
    ...(h.newsletter === 'absent' ? {} : { subscribed_to_newsletter: h.newsletter }),
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
            if ('subscribed_to_newsletter' in values) h.newsletter = values.subscribed_to_newsletter as boolean | null;
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
  h.newsletter = null;
  h.upserts.length = 0;
  auth = null;
});
afterEach(() => cleanup());

describe('profiles.subscribed_to_newsletter in the account: consent is never assumed (p9 QZ-2)', { timeout: 20_000 }, () => {
  it.each([
    ['NULL', null],
    ['not in the row', 'absent'],
  ] as const)('a flag that is %s reads as not subscribed', async (_label, stored) => {
    h.newsletter = stored;
    await mountSignedIn();
    expect(auth!.profile!.subscribedToNewsletter).toBe(false);
  });

  it.each([true, false])('a stored %s reads as itself', async (stored) => {
    h.newsletter = stored;
    await mountSignedIn();
    expect(auth!.profile!.subscribedToNewsletter).toBe(stored);
  });

  it('a profile read back and saved whole never writes an opt-in nobody gave', async () => {
    await mountSignedIn();
    await act(async () => {
      await auth!.updateProfile({ ...auth!.profile!, theme: 'midnight' });
    });
    expect(h.upserts.at(-1)).toMatchObject({ theme: 'midnight' });
    expect(h.upserts.at(-1)!.subscribed_to_newsletter).not.toBe(true);
    expect(h.newsletter).not.toBe(true);
    expect(auth!.profile!.subscribedToNewsletter).toBe(false);
  });

  it('a member who ticked the box stays subscribed through a whole-profile save', async () => {
    h.newsletter = true;
    await mountSignedIn();
    await act(async () => {
      await auth!.updateProfile({ ...auth!.profile!, theme: 'midnight' });
    });
    expect(h.newsletter).toBe(true);
    expect(auth!.profile!.subscribedToNewsletter).toBe(true);
  });
});
