import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { version } from '../../../../package.json';

/*
 * p9 Q16: the Settings footer read "Version 1.0.0" on the 1.2.0 app, from a
 * hard-coded constant; support and members were handed the wrong build. It
 * reads package.json's version now, the one version.json is built from.
 */

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u1', email: 'miso@example.com', displayName: 'Miso', isPremium: false, theme: 'dark', notificationsEnabled: true, notificationTime: '09:00', locale: 'ja' },
    user: { id: 'u1', email: 'miso@example.com' },
    signOut: vi.fn(),
    updateProfile: vi.fn(async () => ({ error: null })),
    refreshProfile: vi.fn(),
  }),
}));
vi.mock('../../../context/DiagnosticsContext', () => ({
  useDiagnostics: () => ({ openDiagnostics: vi.fn(), isOpen: false, closeDiagnostics: vi.fn(), errorCount: 0 }),
}));
vi.mock('../../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../premium/SubscriptionSheet', () => ({ SubscriptionSheet: () => null }));
vi.mock('../../diagnostics', () => ({ DiagnosticsSheet: () => null }));
vi.mock('../../profile/EditProfileForm', () => ({ EditProfileForm: () => null }));
vi.mock('../BlockedMembers', () => ({ BlockedMembers: () => null }));

import i18n from '../../../i18n/config';
import { SettingsSheet } from '../SettingsSheet';

afterEach(() => cleanup());
afterAll(async () => { await i18n.changeLanguage('en'); });

describe('Settings shows the release’s version (p9 Q16)', () => {
  for (const lng of ['ja', 'en'] as const) {
    it(`${lng}: the footer names package.json’s version`, async () => {
      await i18n.changeLanguage(lng);
      render(<MemoryRouter><SettingsSheet open onClose={() => {}} /></MemoryRouter>);
      const footer = await screen.findByRole('button', { name: i18n.t('app:settings.version', { v: version }) });
      expect(footer).toBeInTheDocument();
      expect(version).not.toBe('1.0.0');
      expect(screen.queryByText(/1\.0\.0/)).toBeNull();
    });
  }
});
