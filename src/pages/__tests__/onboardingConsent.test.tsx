import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/*
 * p9 Q12: the sign-up's two consent boxes (the marketing opt-in and the
 * age/Terms confirmation) were <button>s around a drawn box: a screen reader
 * heard two buttons and never whether either was on. They are checkboxes
 * now, named by their sentences, and their state reaches the profile.
 */

const signUp = vi.fn<(creds: { email: string; password: string }) => Promise<{ data: { user: { id: string } }; error: null }>>(async () => ({ data: { user: { id: 'u1' } }, error: null }));
const upsert = vi.fn<(row: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ signInWithGoogle: vi.fn(), signInWithApple: vi.fn() }),
}));
vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signUp: (c: { email: string; password: string }) => signUp(c) }, from: () => ({ upsert: (r: Record<string, unknown>) => upsert(r) }) },
}));
vi.mock('../../services/analytics', () => ({
  trackOnboardingStepViewed: vi.fn(),
  trackOnboardingStepCompleted: vi.fn(),
  trackOnboardingComplete: vi.fn(),
  trackSignUp: vi.fn(),
}));

import i18n from '../../i18n/config';
import { OnboardingPage } from '../OnboardingPage';

async function openCreateAccount(onComplete = vi.fn()) {
  render(<OnboardingPage onComplete={onComplete} onSwitchToSignIn={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding:language.cta') }));
  fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding:welcome.cta') }));
  return onComplete;
}
const newsletter = () => screen.getByRole('checkbox', { name: i18n.t('onboarding:createAccount.newsletter') });
const age = () => screen.getByRole('checkbox', { name: i18n.t('onboarding:createAccount.ageConfirm') });
const submit = () => screen.getByRole('button', { name: i18n.t('onboarding:createAccount.submit') });

beforeEach(async () => {
  signUp.mockClear();
  upsert.mockClear();
  await i18n.changeLanguage('ja');
});
afterEach(() => cleanup());

describe('OnboardingPage consent boxes (p9 Q12)', { timeout: 20_000 }, () => {
  it('are checkboxes named by their sentences, both off to begin with', async () => {
    await openCreateAccount();
    expect(newsletter()).not.toBeChecked();
    expect(age()).not.toBeChecked();
    // Two checkboxes, and no button that only looks like one.
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: i18n.t('onboarding:createAccount.ageConfirm') })).toBeNull();
  });

  it('say when they are on, by tap and by keyboard', async () => {
    const user = userEvent.setup();
    await openCreateAccount();
    await user.click(screen.getByText(i18n.t('onboarding:createAccount.ageConfirm')));
    expect(age()).toBeChecked();
    newsletter().focus();
    await user.keyboard(' ');
    expect(newsletter()).toBeChecked();
    await user.keyboard(' ');
    expect(newsletter()).not.toBeChecked();
  });

  it('holds Create my account until the age/Terms box is ticked', async () => {
    const user = userEvent.setup();
    await openCreateAccount();
    await user.type(screen.getByPlaceholderText(i18n.t('onboarding:createAccount.emailPlaceholder')), 'miso@example.com');
    await user.type(screen.getByPlaceholderText(i18n.t('onboarding:createAccount.passwordPlaceholderShort')), 'catnap2019');
    expect(submit()).toBeDisabled();
    await user.click(age());
    expect(submit()).toBeEnabled();
  });

  it('saves the opt-in only when its box is ticked', async () => {
    const user = userEvent.setup();
    for (const tick of [false, true]) {
      upsert.mockClear();
      const onComplete = await openCreateAccount();
      await user.type(screen.getByPlaceholderText(i18n.t('onboarding:createAccount.emailPlaceholder')), 'miso@example.com');
      await user.type(screen.getByPlaceholderText(i18n.t('onboarding:createAccount.passwordPlaceholderShort')), 'catnap2019');
      await user.click(age());
      if (tick) await user.click(newsletter());
      await act(async () => { await user.click(submit()); });
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      expect(upsert.mock.calls[0][0]).toMatchObject({ subscribed_to_newsletter: tick });
      cleanup();
    }
  });
});
