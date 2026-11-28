import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * WP-P5-03: Settings › Notifications has a switch for the welcome email
 * (D35 D: the opt-in promises what is sent, one welcome email). Nothing
 * after onboarding wrote subscribedToNewsletter, so a member could neither
 * opt out nor opt in. The switch writes it; the database stamps the consent
 * time and queues the one welcome.
 */

const toastSpy = vi.fn();
const updateProfile = vi.fn(async (update: unknown) => ({ error: null, update }));
const refreshProfile = vi.fn(async () => {});

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u1', email: 'miso@example.com', displayName: 'Miso', isPremium: false, theme: 'dark', notificationsEnabled: true, notificationTime: '09:00', locale: 'en', subscribedToNewsletter: true },
    user: { id: 'u1', email: 'miso@example.com' },
    signOut: vi.fn(),
    updateProfile,
    refreshProfile,
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
vi.mock('../../ui/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../ui/Toast')>()),
  toast: (...args: unknown[]) => toastSpy(...args),
}));
vi.mock('../../premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../premium/SubscriptionSheet', () => ({ SubscriptionSheet: () => null }));
vi.mock('../../diagnostics', () => ({ DiagnosticsSheet: () => null }));
vi.mock('../../profile/EditProfileForm', () => ({ EditProfileForm: () => null }));
vi.mock('../BlockedMembers', () => ({ BlockedMembers: () => null }));

import i18n from '../../../i18n/config';
import { SettingsSheet } from '../SettingsSheet';

async function openNotifications() {
  render(<MemoryRouter><SettingsSheet open onClose={() => {}} /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${i18n.t('app:settings.sections.notifications')}`) }));
  return screen.findByRole('dialog', { name: i18n.t('app:settings.sections.notifications') });
}

beforeEach(async () => {
  cleanup();
  toastSpy.mockClear();
  updateProfile.mockClear();
  refreshProfile.mockClear();
  await act(async () => { await i18n.changeLanguage('en'); });
});
afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('Settings › Notifications: the welcome email switch', () => {
  it('shows a switch named "Welcome email", on for a subscribed member', async () => {
    const sheet = await openNotifications();
    const sw = within(sheet).getByRole('switch', { name: 'Welcome email' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(within(sheet).getByText('One email with tips for getting started')).toBeInTheDocument();
  });

  it('switching it off writes subscribedToNewsletter, refreshes the profile and confirms', async () => {
    const sheet = await openNotifications();
    fireEvent.click(within(sheet).getByRole('switch', { name: 'Welcome email' }));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith('Welcome email off', 'success'));
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith({ subscribedToNewsletter: false });
    expect(refreshProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile.mock.invocationCallOrder[0]).toBeLessThan(refreshProfile.mock.invocationCallOrder[0]);
  });

  it('in Japanese the switch reads ウェルカムメール', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    const sheet = await openNotifications();
    expect(within(sheet).getByRole('switch', { name: 'ウェルカムメール' })).toBeInTheDocument();
  });
});
