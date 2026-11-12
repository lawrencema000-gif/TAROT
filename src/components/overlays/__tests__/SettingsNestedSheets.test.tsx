import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

/*
 * Settings opens the paywall (a free member) or the subscription sheet (a
 * member) over itself, as a Sheet among its own children. A link opened
 * from outside the app closes the shell's overlay before it is taken
 * (openDeepLink), and Settings closed under the sheet it had opened: the
 * Sheet unmounts its children without their onClose, so the flag that
 * opened them stayed set, and the paywall slid up by itself the next time
 * Settings opened. Closing Settings closes them too now.
 *
 * App.tsx (openDeepLink) loads with two things kept out, as in
 * src/__tests__/androidBack.test.tsx: the shared zod schemas and the
 * Supabase client.
 */

let premium = false;

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u1', email: 'miso@example.com', displayName: 'Miso', isPremium: premium, theme: 'dark', notificationsEnabled: true, notificationTime: '09:00', locale: 'en' },
    user: { id: 'u1', email: 'miso@example.com' },
    signOut: vi.fn(),
    updateProfile: vi.fn(async () => ({ error: null })),
    refreshProfile: vi.fn(),
  }),
}));
vi.mock('../../../context/DiagnosticsContext', () => ({
  useDiagnostics: () => ({ openDiagnostics: vi.fn(), isOpen: false, closeDiagnostics: vi.fn(), errorCount: 0 }),
}));
vi.mock('../../../schema', () => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : { parse: (x: unknown) => x }), has: () => true }));
vi.mock('../../../lib/supabase', () => {
  const inert = (): unknown => new Proxy(function () {}, { get: (_t, k) => (k === 'then' ? undefined : inert()), apply: () => inert() });
  return { supabase: inert(), isSupabaseConfigured: true };
});
// The two sheets Settings opens over itself, as Sheets: their own contents are not the point.
vi.mock('../../premium/PaywallSheet', async () => {
  const { Sheet } = await import('../../ui/Sheet');
  return {
    PaywallSheet: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
      <Sheet open={open} onClose={onClose} title="Premium plans">
        <p>Plans</p>
      </Sheet>
    ),
  };
});
vi.mock('../../premium/SubscriptionSheet', async () => {
  const { Sheet } = await import('../../ui/Sheet');
  return {
    SubscriptionSheet: ({ open, onClose }: { open: boolean; onClose: () => void }) => (
      <Sheet open={open} onClose={onClose} title="Your subscription">
        <p>Manage</p>
      </Sheet>
    ),
  };
});
vi.mock('../../diagnostics', () => ({ DiagnosticsSheet: () => null }));
vi.mock('../../profile/EditProfileForm', () => ({ EditProfileForm: () => null }));
vi.mock('../BlockedMembers', () => ({ BlockedMembers: () => null }));

import i18n from '../../../i18n/config';
import { SettingsSheet } from '../SettingsSheet';
import { UIProvider, useUI } from '../../../context/UIContext';
import { openDeepLink } from '../../../App';

/** App's appUrlOpen listener: a link opened from outside the app goes to openDeepLink with the shell's own hands. */
const appUrlOpen: { listener: ((url: string) => void) | null } = { listener: null };

/** The shell as App wires Settings: the overlay, opened from the header, closed by closeOverlay. */
function Shell() {
  const { activeOverlay, openOverlay, closeOverlay, setActiveTab } = useUI();
  const navigate = useNavigate();
  useEffect(() => {
    appUrlOpen.listener = (url) => openDeepLink(url, { closeOverlay, navigate, setActiveTab });
    return () => {
      appUrlOpen.listener = null;
    };
  }, [closeOverlay, navigate, setActiveTab]);
  return (
    <>
      <button type="button" onClick={() => openOverlay('settings')}>
        Open Settings
      </button>
      <SettingsSheet open={activeOverlay === 'settings'} onClose={closeOverlay} />
    </>
  );
}

const openSettings = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
  return screen.findByRole('dialog', { name: i18n.t('app:settings.title') });
};

beforeEach(async () => {
  cleanup();
  await act(async () => { await i18n.changeLanguage('en'); });
});
afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('Settings closes the sheet it opened when it closes', () => {
  it.each([
    ['a free member: the paywall', false, 'Premium plans'],
    ['a member: the subscription sheet', true, 'Your subscription'],
  ])('%s — a link closes it with Settings, and Settings opens again without it', async (_who, isPremium, nested) => {
    premium = isPremium;
    render(
      <MemoryRouter initialEntries={['/']}>
        <UIProvider>
          <Shell />
        </UIProvider>
      </MemoryRouter>,
    );
    const settings = await openSettings();
    fireEvent.click(within(settings).getByRole('button', { name: new RegExp(`^${i18n.t('app:settings.menu.subscription')}`) }));
    await screen.findByRole('dialog', { name: nested });

    // A link from outside the app: the shell's overlay closes, and the link is taken.
    act(() => appUrlOpen.listener?.('https://tarotlife.app/horoscope/leo'));
    await waitFor(() => expect(screen.queryAllByRole('dialog')).toHaveLength(0));

    // Settings again: it opens on its own menu, and nothing slides up over it.
    await openSettings();
    expect(screen.queryByRole('dialog', { name: nested })).toBeNull();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    // The sheet still opens when it is asked for.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${i18n.t('app:settings.menu.subscription')}`) }));
    await screen.findByRole('dialog', { name: nested });
  });
});

/*
 * Delete account asks for DELETE typed in a box before its button arms.
 * Left by Back or by Settings closing, the page kept what was typed: coming
 * back found DELETE in the box and the destructive button armed. It starts
 * empty every time now.
 */
describe('Delete account: the typed confirmation does not outlive the page', () => {
  const mountShell = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <UIProvider>
          <Shell />
        </UIProvider>
      </MemoryRouter>,
    );
  const toDelete = (settings: HTMLElement) =>
    fireEvent.click(within(settings).getByRole('button', { name: new RegExp(`^${i18n.t('app:settings.menu.deleteAccount')}`) }));
  const deleteButton = () => screen.getByRole('button', { name: i18n.t('app:settings.deleteAccount.deleteMyAccount') });
  const typeDelete = () => fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } });

  it('Back to Settings, then Delete account again: the box is empty and the button is not armed', async () => {
    premium = false;
    mountShell();
    const settings = await openSettings();
    toDelete(settings);
    typeDelete();
    expect(deleteButton()).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:settings.menu.backToSettings') }));
    toDelete(settings);
    expect((screen.getByPlaceholderText('DELETE') as HTMLInputElement).value).toBe('');
    expect(deleteButton()).toBeDisabled();
  });

  it('Settings closed on the page and opened again: the box is empty', async () => {
    premium = false;
    mountShell();
    const settings = await openSettings();
    toDelete(settings);
    typeDelete();
    act(() => appUrlOpen.listener?.('https://tarotlife.app/horoscope/leo'));
    await waitFor(() => expect(screen.queryAllByRole('dialog')).toHaveLength(0));
    const again = await openSettings();
    toDelete(again);
    expect((screen.getByPlaceholderText('DELETE') as HTMLInputElement).value).toBe('');
    expect(deleteButton()).toBeDisabled();
  });
});
