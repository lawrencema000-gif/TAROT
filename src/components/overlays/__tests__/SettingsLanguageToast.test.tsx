import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p10 d1-en-02, d3-ko-06: Settings › Language confirmed a change in the
 * language just left — "Language changed." over a sheet already reading
 * 言語 / 設定に戻る, 「言語を変更しました。」 on the English Home, a Korean
 * toast over the Chinese sheet. The handler ran after the switch with the
 * `t` of the render before it. It says it in the language chosen now.
 */

const toastSpy = vi.fn();
const profileUpdates: unknown[] = [];

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'u1', email: 'miso@example.com', displayName: 'Miso', isPremium: false, theme: 'dark', notificationsEnabled: true, notificationTime: '09:00', locale: 'en' },
    user: { id: 'u1', email: 'miso@example.com' },
    signOut: vi.fn(),
    updateProfile: vi.fn(async () => ({ error: null })),
    refreshProfile: vi.fn(),
  }),
}));
vi.mock('../../../context/DiagnosticsContext', () => ({
  useDiagnostics: () => ({ openDiagnostics: vi.fn(), isOpen: false, closeDiagnostics: vi.fn(), errorCount: 0 }),
}));
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (row: unknown) => ({
        eq: async () => {
          profileUpdates.push(row);
          return { error: null };
        },
      }),
    }),
  },
}));
vi.mock('../../ui/Toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../ui/Toast')>()),
  toast: (...args: unknown[]) => toastSpy(...args),
}));
vi.mock('../../premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../premium/SubscriptionSheet', () => ({ SubscriptionSheet: () => null }));
vi.mock('../../diagnostics', () => ({ DiagnosticsSheet: () => null }));
vi.mock('../../profile/EditProfileForm', () => ({ EditProfileForm: () => null }));
vi.mock('../BlockedMembers', () => ({ BlockedMembers: () => null }));

import i18n, { getLocale } from '../../../i18n/config';
import { SettingsSheet } from '../SettingsSheet';

type Lng = 'en' | 'ja' | 'ko' | 'zh';
const CODES: Record<Lng, string> = { en: 'EN', ja: 'JA', ko: 'KO', zh: 'ZH' };

/** The confirmation as each locale file writes it — not as i18next is asked for it. */
function confirmationIn(lng: Lng): string {
  const common = JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'common.json'), 'utf8'));
  return common.toast.languageChanged as string;
}

/** Settings › Language, open on the language on screen. */
async function openLanguages() {
  render(<MemoryRouter><SettingsSheet open onClose={() => {}} /></MemoryRouter>);
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${i18n.t('common:labels.language')}`) }));
}

/** Pick a language in the open sheet; the toast that confirmed it. */
async function pick(lng: Lng): Promise<string> {
  toastSpy.mockClear();
  fireEvent.click(await screen.findByRole('radio', { name: new RegExp(`\\(${CODES[lng]}\\)$`) }));
  await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
  return toastSpy.mock.calls[0][0] as string;
}

beforeEach(() => {
  profileUpdates.length = 0;
});
afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('Settings › Language confirms in the language just chosen (p10 d1-en-02, d3-ko-06)', { timeout: 20_000 }, () => {
  it('en → ja → en', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    await openLanguages();

    expect(await pick('ja')).toBe(confirmationIn('ja'));
    expect(getLocale()).toBe('ja');
    // The sheet behind it reads Japanese too; the toast is no longer the odd one out.
    expect(await pick('en')).toBe(confirmationIn('en'));
    expect(profileUpdates).toEqual([{ locale: 'ja' }, { locale: 'en' }]);
  });

  it('ko → zh → ko', async () => {
    await act(async () => { await i18n.changeLanguage('ko'); });
    await openLanguages();

    expect(await pick('zh')).toBe(confirmationIn('zh'));
    expect(await pick('ko')).toBe(confirmationIn('ko'));
  });

  it('the four confirmations differ, so the language each is in is the language chosen', () => {
    const all = (['en', 'ja', 'ko', 'zh'] as const).map(confirmationIn);
    expect(new Set(all).size).toBe(4);
  });
});
