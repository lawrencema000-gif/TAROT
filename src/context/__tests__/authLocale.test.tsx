import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor, cleanup } from '@testing-library/react';

/*
 * p9 RQB-1: a member signing in on a new device had their language written
 * over with English. The language detector stores the language it settles
 * on, so a first visit stored 'en' in `arcana_locale` though nobody chose
 * it, and AuthContext read any stored language as the member's own choice:
 * a member whose account reads Japanese signed in on a new phone, the
 * account was set to English, and so was every other device of theirs.
 *
 * The real i18n module and its real detector run here, on a browser storage
 * that starts empty, as a new device's does; the Supabase client is a fake
 * that keeps one profile row and records every write to it.
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
  // In place before the i18n module loads: the detector tests the storage
  // once, on its first read, and keeps the answer.
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true, enumerable: true });
  return {
    store,
    member: { id: '00000000-0000-4000-8000-0000000000e1', email: 'member@example.com' },
    session: null as null | { user: { id: string; email: string }; access_token: string },
    /** profiles.locale of the member's row. */
    profileLocale: 'ja' as string | null,
    /** Every update written to the row. */
    updates: [] as Array<Record<string, unknown>>,
    /** Every OAuth hand-off: where the provider is asked to send the person back. */
    oauthRedirects: [] as string[],
    listener: null as null | ((event: string, session: unknown) => void),
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
    locale: h.profileLocale,
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
      update: (values: Record<string, unknown>) => ({
        eq: async () => {
          h.updates.push(values);
          if (typeof values.locale === 'string') h.profileLocale = values.locale;
          return { error: null };
        },
      }),
    };
    return query;
  };
  const channel = { on: () => channel, subscribe: () => channel };
  const signedIn = () => {
    h.session = { user: h.member, access_token: 'token' };
    h.listener?.('SIGNED_IN', h.session);
    return { data: { session: h.session, user: h.member }, error: null };
  };
  return {
    isSupabaseConfigured: true,
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: h.session }, error: null }),
        onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
          h.listener = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signInWithPassword: async () => signedIn(),
        // Email confirmation off: the account and its session at once. The
        // profiles row is the trigger's, with the column default 'en'.
        signUp: async () => {
          h.profileLocale = 'en';
          return signedIn();
        },
        signInWithOAuth: async ({ options }: { options: { redirectTo: string } }) => {
          h.oauthRedirects.push(options.redirectTo);
          return { data: { url: null }, error: null };
        },
        signOut: async () => {
          h.session = null;
          h.listener?.('SIGNED_OUT', null);
          return { error: null };
        },
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

import i18n, { chosenLocale, getLocale, setLocale, LOCALE_STORAGE_KEY } from '../../i18n/config';
import { endVisit, keepVisitLanguage, showVisitIn } from '../../services/shareableReadings';
import { AuthProvider, useAuth } from '../AuthContext';

type Auth = ReturnType<typeof useAuth>;

/** What the first visit of a new device left in storage, before anyone chose anything. */
const FIRST_VISIT = new Map(h.store);

const NAMESPACES = ['common', 'app', 'onboarding', 'landing', 'tarot'];
/** A locale's bundles in the store, so changing to it needs no lazy chunk (the strings are not under test). */
function stubBundles(lng: string) {
  for (const ns of NAMESPACES) i18n.addResourceBundle(lng, ns, { _: lng }, true, true);
}

let auth: Auth | null = null;
function Probe() {
  auth = useAuth();
  return null;
}

async function mountSignedOut() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(auth?.loading).toBe(false));
}

async function signIn() {
  await act(async () => {
    await auth!.signIn(h.member.email, 'a-password');
  });
  await waitFor(() => expect(auth?.profile).not.toBeNull());
  // The locale sync runs after the profile lands: let it finish.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}

beforeAll(() => {
  for (const lng of ['ja', 'ko', 'zh']) stubBundles(lng);
});

beforeEach(() => {
  h.store.clear();
  for (const [k, v] of FIRST_VISIT) h.store.set(k, v);
  h.session = null;
  h.profileLocale = 'ja';
  h.updates.length = 0;
  h.oauthRedirects.length = 0;
  auth = null;
});

afterEach(async () => {
  cleanup();
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

// These sign-ins load the account's language bundle lazily; under a loaded
// parallel run that has taken longer than the 5 s default (p9 gate run).
describe('signing in on a new device keeps the account its language (p9 RQB-1)', { timeout: 20_000 }, () => {
  it('the first visit stores the default English, though nobody chose it', () => {
    expect(FIRST_VISIT.get(LOCALE_STORAGE_KEY)).toBe('en');
    expect(getLocale()).toBe('en');
    expect(chosenLocale()).toBeNull();
  });

  it('a member whose account reads Japanese signs in: the account stays ja and the app turns to ja', async () => {
    await mountSignedOut();
    await signIn();
    // It used to write { locale: 'en' } here.
    expect(h.updates).toEqual([]);
    expect(h.profileLocale).toBe('ja');
    await waitFor(() => expect(getLocale()).toBe('ja'));
  });

  it('the language taken from the account is not a choice made here: changed on another device, this one follows', async () => {
    await mountSignedOut();
    await signIn();
    await waitFor(() => expect(getLocale()).toBe('ja'));
    // Opens in Japanese from now on, and holds no choice of its own.
    expect(h.store.get(LOCALE_STORAGE_KEY)).toBe('ja');
    expect(chosenLocale()).toBeNull();
    // The member switches to Chinese on their laptop.
    h.profileLocale = 'zh';
    await act(async () => {
      await auth!.refreshProfile();
    });
    await waitFor(() => expect(getLocale()).toBe('zh'));
    expect(h.updates).toEqual([]);
    expect(h.profileLocale).toBe('zh');
  });

  it('a language picked on this device before signing in is a choice: the account takes it', async () => {
    await act(async () => {
      await setLocale('ko');
    });
    expect(chosenLocale()).toBe('ko');
    await mountSignedOut();
    await signIn();
    await waitFor(() => expect(h.updates).toEqual([{ locale: 'ko' }]));
    expect(getLocale()).toBe('ko');
  });
});

describe('a new account saves the language the visitor was reading in', () => {
  it('a visitor who picked Japanese signs up: the new account reads Japanese', async () => {
    await act(async () => {
      await setLocale('ja');
    });
    await mountSignedOut();
    await act(async () => {
      await auth!.signUp('new@example.com', 'a-password');
    });
    await waitFor(() => expect(h.updates).toEqual([{ locale: 'ja' }]));
    expect(getLocale()).toBe('ja');
  });

  it('a visitor reading the default English signs up: the account keeps English, and nothing is written', async () => {
    await mountSignedOut();
    await act(async () => {
      await auth!.signUp('new@example.com', 'a-password');
    });
    await waitFor(() => expect(auth?.profile).not.toBeNull());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(h.updates).toEqual([]);
    expect(h.profileLocale).toBe('en');
    expect(getLocale()).toBe('en');
  });
});

describe('a shared reading shown in its language is not the visitor’s choice (p8 F76)', () => {
  it('shown in Japanese and left: a member signing in after gets their own language, and nothing is written', async () => {
    h.profileLocale = 'ko';
    await act(async () => {
      await showVisitIn('ja');
    });
    expect(getLocale()).toBe('ja');
    await act(async () => {
      await endVisit();
    });
    expect(getLocale()).toBe('en');
    await mountSignedOut();
    await signIn();
    await waitFor(() => expect(getLocale()).toBe('ko'));
    expect(h.updates).toEqual([]);
  });

  it('taken into the app ("Get your own reading"): that is a choice, and the account takes it', async () => {
    h.profileLocale = 'en';
    await act(async () => {
      await showVisitIn('ja');
      await keepVisitLanguage();
    });
    await mountSignedOut();
    await signIn();
    await waitFor(() => expect(h.updates).toEqual([{ locale: 'ja' }]));
    expect(getLocale()).toBe('ja');
  });
});

describe('what a device brings to its boot (p9 RQB-1)', () => {
  /**
   * A cold start on this storage, at this URL: the i18n module (and its
   * detector) and AuthContext load afresh, then the member signs in.
   */
  async function bootAndSignIn(url: string, stored: Record<string, string>) {
    cleanup();
    h.store.clear();
    for (const [k, v] of Object.entries(stored)) h.store.set(k, v);
    window.history.replaceState(null, '', url);
    vi.resetModules();
    const config = await import('../../i18n/config');
    await config.i18nReady;
    const { AuthProvider: FreshProvider, useAuth: useFreshAuth } = await import('../AuthContext');
    let fresh: Auth | null = null;
    const FreshProbe = () => {
      fresh = useFreshAuth();
      return null;
    };
    render(
      <FreshProvider>
        <FreshProbe />
      </FreshProvider>,
    );
    await waitFor(() => expect(fresh?.loading).toBe(false));
    await act(async () => {
      await fresh!.signIn(h.member.email, 'a-password');
    });
    await waitFor(() => expect(fresh?.profile).not.toBeNull());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    return config;
  }

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('the English an earlier build stored on every first visit is no choice: the account keeps Japanese', async () => {
    const config = await bootAndSignIn('/', { arcana_locale: 'en' });
    expect(h.updates).toEqual([]);
    await waitFor(() => expect(config.getLocale()).toBe('ja'));
  });

  it('a language an earlier build stored other than English was picked, and stays a choice', async () => {
    const config = await bootAndSignIn('/', { arcana_locale: 'ko' });
    await waitFor(() => expect(h.updates).toEqual([{ locale: 'ko' }]));
    expect(config.getLocale()).toBe('ko');
  });

  it('a ?lang=zh link chooses Chinese: the account takes it', async () => {
    const config = await bootAndSignIn('/?lang=zh', {});
    await waitFor(() => expect(h.updates).toEqual([{ locale: 'zh' }]));
    expect(config.getLocale()).toBe('zh');
  });

  it('a ?lang=en link chooses nothing (the app’s own redirects carried the default that way): the account keeps Japanese', async () => {
    // The password-reset link of a member who asked for it on a new device.
    const config = await bootAndSignIn('/reset-password?lang=en', {});
    expect(h.updates).toEqual([]);
    await waitFor(() => expect(config.getLocale()).toBe('ja'));
  });

  it('a ?lang=en link on a device that chose Korean shows English, and signing in brings the account’s language back', async () => {
    const config = await bootAndSignIn('/?lang=en', { arcana_locale: 'ko', arcana_locale_choice: 'ko' });
    expect(h.updates).toEqual([]);
    await waitFor(() => expect(config.getLocale()).toBe('ja'));
  });
});

describe('the OAuth round trip carries a choice, never the default (p9 RQB-1)', () => {
  it('Google and Apple come back with no ?lang= for a visitor who chose nothing', async () => {
    await mountSignedOut();
    await act(async () => {
      await auth!.signInWithGoogle();
      await auth!.signInWithApple();
    });
    expect(h.oauthRedirects).toHaveLength(2);
    for (const url of h.oauthRedirects) expect(url).not.toMatch(/[?&]lang=/);
  });

  it('and with the language a visitor picked', async () => {
    await act(async () => {
      await setLocale('ko');
    });
    await mountSignedOut();
    await act(async () => {
      await auth!.signInWithGoogle();
      await auth!.signInWithApple();
    });
    expect(h.oauthRedirects).toHaveLength(2);
    for (const url of h.oauthRedirects) expect(new URL(url).searchParams.get('lang')).toBe('ko');
  });
});
