import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

/*
 * p9 Q05: every new account, email or OAuth, reaches the onboarding with the
 * row handle_new_user inserts (20260112113637), birth_date '2000-01-01'. The
 * page seeded the required field from it: "Birth date *" showed 01/01/2000,
 * Continue was live, and Continue → Continue → Finish saved the member as a
 * Capricorn born that day. The field now starts empty and Continue waits.
 */

const updateProfile = vi.fn<(updates: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null }));
let profile: Record<string, unknown>;

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'miso@example.com' }, profile, updateProfile }),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }) },
}));
vi.mock('../../hooks/useAstrology', () => ({
  useGeocode: () => ({ results: [], loading: false, error: null, search: vi.fn(), usedFallback: false }),
}));

import i18n from '../../i18n/config';
import { OAuthOnboardingPage, SIGNUP_PLACEHOLDER_BIRTH_DATE } from '../OAuthOnboardingPage';

/** The profile row the sign-up trigger writes, as AuthContext maps it. */
function signupRow(over: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    email: 'miso@example.com',
    displayName: 'miso',
    birthDate: '2000-01-01',
    timezone: 'UTC',
    goals: [],
    tonePreference: 'gentle',
    notificationTime: '09:00',
    notificationsEnabled: true,
    onboardingComplete: false,
    ...over,
  };
}

const next = () => screen.getByRole('button', { name: i18n.t('onboarding:oauth.next') });
const birthDateField = () => screen.getByLabelText(new RegExp(i18n.t('onboarding:oauth.basics.birthDate'))) as HTMLInputElement;

beforeEach(async () => {
  updateProfile.mockClear();
  profile = signupRow();
  await i18n.changeLanguage('ja');
});
afterEach(() => cleanup());

describe('OAuthOnboardingPage birth date (p9 Q05)', () => {
  it('matches the trigger’s placeholder', () => {
    expect(SIGNUP_PLACEHOLDER_BIRTH_DATE).toBe('2000-01-01');
  });

  it('starts the required birth date empty, with Continue off until a date is given', async () => {
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:profile.goals.love') }));
    fireEvent.click(next());

    const field = birthDateField();
    expect(field.value).toBe('');
    expect(field).toBeRequired();
    expect(next()).toBeDisabled();

    fireEvent.change(field, { target: { value: '1991-03-08' } });
    expect(next()).toBeEnabled();
  });

  it('saves the date the member entered, never the placeholder, and reveals its sign', async () => {
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('app:profile.goals.love') }));
    fireEvent.click(next());
    fireEvent.change(birthDateField(), { target: { value: '1991-03-08' } });
    fireEvent.click(next()); // tone
    fireEvent.click(next()); // reminders
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding:oauth.finish') }));
    });

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile.mock.calls[0][0]).toMatchObject({ birthDate: '1991-03-08', goals: ['love'] });
    for (const [update] of updateProfile.mock.calls) expect(update.birthDate).not.toBe('2000-01-01');
    // 1991-03-08 is a Pisces (魚座), not the placeholder's Capricorn (山羊座).
    expect(screen.getByRole('heading', { name: '魚座' })).toBeInTheDocument();
    expect(screen.queryByText('山羊座')).not.toBeInTheDocument();
  });

  it('resumes at the birth date step, empty, when the goals were saved but no date was', () => {
    profile = signupRow({ goals: ['career'] });
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    expect(screen.getByRole('heading', { name: i18n.t('onboarding:oauth.basics.heading') })).toBeInTheDocument();
    expect(birthDateField().value).toBe('');
    expect(next()).toBeDisabled();
  });

  it('keeps a date the member gave when an onboarding resumes, and one-tap Finish still works', () => {
    profile = signupRow({ goals: ['career'], birthDate: '1991-03-08' });
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    // Both answers are on the row: the stepper resumes at the last step.
    expect(screen.getByRole('heading', { name: i18n.t('onboarding:oauth.notifications.heading') })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding:oauth.back') }));
    fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding:oauth.back') }));
    expect(birthDateField().value).toBe('1991-03-08');
  });
});
