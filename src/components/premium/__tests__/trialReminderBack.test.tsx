import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

/*
 * The trial reminder sits above everything at z-60 and is no Sheet, so
 * body.sheet-open stays unset while it is up. Android Back (androidBack)
 * could not see it: it left the page under the reminder, or opened the leave
 * sheet beneath it. The reminder carries data-back-closes now, so Back sends
 * it Escape and it closes, as a sheet would.
 *
 * App.tsx loads here for androidBack with two things kept out, as in
 * src/__tests__/androidBack.test.tsx: the shared zod schemas and the
 * Supabase client.
 */
vi.mock('../../../schema', () => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : { parse: (x: unknown) => x }), has: () => true }));
vi.mock('../../../lib/supabase', () => {
  const inert = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : inert()), apply: () => inert() });
  return { supabase: inert(), isSupabaseConfigured: true };
});
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000aa' }, profile: { isPremium: false } }),
}));
vi.mock('../../../services/billing', () => ({
  PRODUCT_IDS: { PREMIUM_YEARLY: 'premium_yearly' },
  getBillingService: () => ({ initialize: async () => {}, getProducts: async () => [] }),
}));
vi.mock('../PaywallSheet', () => ({ PaywallSheet: () => null }));

import { androidBack, type AndroidBackShell } from '../../../App';
import { TrialReminderModal } from '../TrialReminderModal';

/** Node 25 ships its own (file-less, broken) storage over jsdom's; give the code a real one. */
function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  } as Storage;
}

function shellOn(pathname: string): AndroidBackShell {
  return {
    activeOverlay: null,
    closeOverlay: vi.fn(),
    pathname,
    navigateBack: vi.fn(),
    activeTab: 'readings',
    goHome: vi.fn(),
    exitApp: vi.fn(),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
  // A returning visitor: this is their second session.
  localStorage.setItem('trialReminder.sessions.v1', '1');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Android Back closes the trial reminder first', () => {
  it('the reminder is on top: Back closes it and leaves nothing; the next Back goes on', () => {
    render(<TrialReminderModal />);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole('dialog')).toBeTruthy();

    const shell = shellOn('/readings');
    act(() => androidBack(shell));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(shell.navigateBack).not.toHaveBeenCalled();

    act(() => androidBack(shell));
    expect(shell.goHome).toHaveBeenCalledTimes(1);
  });
});
