import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

/*
 * The invite and referral sheets' Share button (p8 R4). A share sheet the
 * user closes — or a second tap while the first sheet is still open — is a
 * choice, not a failure: nothing is copied and no "Link copied" appears.
 * A sheet that could not open falls back to copying; no clipboard at all is
 * a failure, never "Copied".
 */

const USER = { id: '00000000-0000-4000-8000-0000000000f9', email: 'qa@example.com', created_at: new Date().toISOString() };
const toastSpy = vi.fn();

vi.mock('../../dal', () => ({
  referrals: {
    getOrIssueCode: async () => ({ ok: true, data: 'ARCANA42' }),
    fetchInvites: async () => ({ ok: true, data: [] }),
    redeemCode: async () => ({ ok: false, error: 'not-found' }),
  },
  compatInvites: {
    createInvite: async () => ({ ok: true, data: { code: 'LOVE1234' } }),
  },
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { displayName: 'QA', mbtiType: 'INFJ', birthDate: '1991-03-08', isPremium: false } }),
}));
vi.mock('../../utils/platform', () => ({ isNative: () => false }));
vi.mock('../ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ui')>()),
  toast: (...a: unknown[]) => toastSpy(...a),
}));

import i18n from '../../i18n/config';
import { ReferralSheet } from './ReferralSheet';
import { InviteFriendSheet } from '../compat/InviteFriendSheet';

const writeText = vi.fn(async () => {});
function stubNavigator(share: unknown, clipboard: unknown) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true, writable: true });
}
const closedWith = (name: string) => vi.fn(async () => { throw new DOMException('closed', name); });

/** The sheet open, its link ready, and its Share button. */
const SHEETS = {
  referral: async () => {
    render(<ReferralSheet open onClose={() => {}} />);
    await screen.findByText('ARCANA42');
    return screen.getByRole('button', { name: /Share my code/ });
  },
  invite: async () => {
    render(<InviteFriendSheet open onClose={() => {}} defaultKind="mbti" />);
    fireEvent.click(screen.getByRole('button', { name: /Generate invite link/ }));
    await screen.findByText('https://tarotlife.app/invite/LOVE1234');
    return screen.getByRole('button', { name: /Share my invite link/ });
  },
} as const;

beforeAll(async () => {
  await i18n.changeLanguage('en');
});
beforeEach(() => {
  toastSpy.mockReset();
  writeText.mockClear();
});
afterEach(() => {
  cleanup();
  stubNavigator(undefined, undefined);
});

describe.each(Object.keys(SHEETS) as (keyof typeof SHEETS)[])('the %s sheet’s Share button (p8 R4)', (sheet) => {
  it.each(['AbortError', 'InvalidStateError'])('a share sheet closed (%s): nothing is copied, nothing is said', async (name) => {
    stubNavigator(closedWith(name), { writeText });
    fireEvent.click(await SHEETS[sheet]());
    await new Promise((r) => setTimeout(r, 50));
    expect(navigator.share).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(toastSpy).not.toHaveBeenCalled();
  });

  it('a share sheet that could not open: the link is copied and the toast says so', async () => {
    stubNavigator(closedWith('NotAllowedError'), { writeText });
    fireEvent.click(await SHEETS[sheet]());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(i18n.t('app:referral.copied'), 'success'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('https://tarotlife.app/invite/'));
  });

  it('no share sheet and no clipboard: a failure toast, never "Link copied"', async () => {
    stubNavigator(undefined, undefined);
    fireEvent.click(await SHEETS[sheet]());
    await waitFor(() => expect(toastSpy).toHaveBeenCalledTimes(1));
    expect(toastSpy.mock.calls[0][1]).toBe('error');
    expect(toastSpy.mock.calls[0][0]).not.toBe(i18n.t('app:referral.copied'));
  });
});
