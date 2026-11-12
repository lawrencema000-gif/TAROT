import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';

/*
 * The toast stack sat at z-50 inside #root. Each Sheet sits at 50 + 2 × its
 * order, the trial reminder at z-60, and the leave sheet is drawn on <body>,
 * after #root: "Reading saved" landed under the leave sheet's scrim, and a
 * toast over a sheet opened from another sheet, or over the reminder, was
 * just as hidden. The stack sits above every one of them now.
 *
 * jsdom loads no stylesheet, so a layer's z-index is read where it is
 * written: a Sheet's inline style, a Tailwind class on the reminder and the
 * stack.
 */

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000ab' }, profile: { isPremium: false } }),
}));
vi.mock('../../../services/billing', () => ({
  PRODUCT_IDS: { PREMIUM_YEARLY: 'premium_yearly' },
  getBillingService: () => ({ initialize: async () => {}, getProducts: async () => [] }),
}));
vi.mock('../../premium/PaywallSheet', () => ({ PaywallSheet: () => null }));

import { ToastContainer, toast } from '../Toast';
import { Sheet } from '../Sheet';
import { LeaveReadingSheet } from '../../readings/tarot/TarotRevealView';
import { TrialReminderModal } from '../../premium/TrialReminderModal';

/** A layer's z-index as written: inline (a Sheet's 50 + 2 × order) or a Tailwind class (z-50, z-[60]). */
function zOf(el: Element): number {
  const inline = (el as HTMLElement).style.zIndex;
  if (inline) return Number(inline);
  const m = /(?:^|\s)z-(?:\[(\d+)\]|(\d+))(?=\s|$)/.exec(el.getAttribute('class') ?? '');
  if (!m) throw new Error(`no z-index written on <${el.tagName.toLowerCase()} class="${el.getAttribute('class')}">`);
  return Number(m[1] ?? m[2]);
}

/** The fixed box a toast sits in: the stack. */
const stackOf = (message: string) => screen.getByText(message).closest('.fixed')!;

/** Node 25 ships its own (file-less, broken) storage over jsdom's; give the reminder a real one. */
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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('a toast is never under a sheet or the trial reminder', () => {
  it('above every sheet open: a sheet over another, and the leave sheet drawn on <body>', () => {
    render(
      <>
        <Sheet open onClose={() => {}} title="Settings">
          <p>Menu</p>
        </Sheet>
        <Sheet open onClose={() => {}} title="Premium plans">
          <p>Plans</p>
        </Sheet>
        <LeaveReadingSheet open inLibrary saving={false} onStay={() => {}} onSaveAndLeave={() => {}} onLeave={() => {}} />
        <ToastContainer />
      </>,
    );
    act(() => toast('Reading saved', 'success'));

    const sheets = screen.getAllByRole('dialog');
    expect(sheets).toHaveLength(3);
    const stack = zOf(stackOf('Reading saved'));
    for (const sheet of sheets) expect(stack).toBeGreaterThan(zOf(sheet));
  });

  it('above the trial reminder', () => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', memoryStorage());
    vi.stubGlobal('sessionStorage', memoryStorage());
    // A returning visitor: the reminder shows thirty seconds into the second session.
    localStorage.setItem('trialReminder.sessions.v1', '1');
    render(
      <>
        <TrialReminderModal />
        <ToastContainer />
      </>,
    );
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    const reminder = document.querySelector('[data-back-closes]');
    expect(reminder).not.toBeNull();

    act(() => toast('Reading saved', 'success'));
    expect(zOf(stackOf('Reading saved'))).toBeGreaterThan(zOf(reminder!));
  });
});
