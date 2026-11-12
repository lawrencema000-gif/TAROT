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

import i18n from '../../../i18n/config';
import { androidBack, type AndroidBackShell } from '../../../App';
import { TrialReminderModal } from '../TrialReminderModal';
import { LeaveReadingSheet } from '../../readings/tarot/TarotRevealView';

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

/*
 * The reminder appears only on a free surface, but a dialog can open while it
 * is up: a link opened from outside the app asks before it leaves a reading
 * with a bought AI interpretation that is not saved. The question opened
 * beneath the reminder (z-60, above every sheet) with its focus trap on top,
 * and the first Android Back answered Stay to a question the member could not
 * see. The reminder yields now: another dialog taking the top closes it.
 */
describe('the trial reminder yields to a question about the member’s reading', () => {
  const reminderUp = () => screen.queryByRole('dialog', { name: i18n.t('app:premium.trialReminder.noTrial.title') }) !== null;
  const question = () => screen.queryByRole('dialog', { name: i18n.t('app:readings.revealView.leaveConfirm.title') });
  /** The reminder beside a reveal's leave sheet, as App mounts them; `asking` is the reveal asking (a link from outside). */
  const screenWith = (asking: boolean, onStay: () => void) => (
    <>
      <LeaveReadingSheet open={asking} inLibrary saving={false} onStay={onStay} onSaveAndLeave={() => {}} onLeave={() => {}} />
      <TrialReminderModal />
    </>
  );

  it('the leave sheet opens over the reminder: the reminder closes, and Android Back answers the question on screen', () => {
    const onStay = vi.fn();
    const { rerender } = render(screenWith(false, onStay));
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(reminderUp()).toBe(true);
    // Up on its own, it stays up: a trap not yet on duty has lost nothing.
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(reminderUp()).toBe(true);

    rerender(screenWith(true, onStay));
    expect(question()).not.toBeNull();
    expect(reminderUp()).toBe(false);
    expect(document.querySelector('[data-back-closes]')).toBeNull();

    // Back reaches the question the member can see: Stay, and nothing else.
    const shell = shellOn('/readings');
    act(() => androidBack(shell));
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(shell.goHome).not.toHaveBeenCalled();
    expect(shell.navigateBack).not.toHaveBeenCalled();
    expect(shell.exitApp).not.toHaveBeenCalled();
  });
});
