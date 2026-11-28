import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

/*
 * gap-1-12: the goals and the birth details were written only together, at
 * the last collecting step, so a member who closed the tab on the goals or
 * the birth step came back to "What do you want help with?" with nothing
 * selected. Each answer is now saved as it is given, through one ordered
 * queue the stepper never waits on, and a remount resumes from the row.
 */

type Update = Record<string, unknown>;
type Result = { error: Error | null };

let profile: Record<string, unknown>;
/** When set, every step save (a call without `tonePreference`) fails. */
let failStepSaves = false;
const updateProfile = vi.fn<(updates: Update) => Promise<Result>>(async (updates) => {
  if (failStepSaves && !('tonePreference' in updates && 'notificationsEnabled' in updates)) {
    return { error: new Error('network') };
  }
  // The row as AuthContext keeps it: each saved patch is merged in, so a
  // remount reads what was saved.
  profile = { ...profile, ...updates };
  return { error: null };
});

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
import { OAuthOnboardingPage, birthPatch, goalsPatch, tonePatch, remindersPatch } from '../OAuthOnboardingPage';
import { fallbackZone } from '../../components/horoscope/birthZone';

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
const back = () => screen.getByRole('button', { name: i18n.t('onboarding:oauth.back') });
const finishButton = () => screen.getByRole('button', { name: i18n.t('onboarding:oauth.finish') });
const chip = (goal: string) => screen.getByRole('button', { name: i18n.t(`app:profile.goals.${goal}`) });
const birthDateField = () => screen.getByLabelText(new RegExp(i18n.t('onboarding:oauth.basics.birthDate'))) as HTMLInputElement;
const heading = (key: string) => screen.getByRole('heading', { name: i18n.t(`onboarding:${key}`) });

/** Lets the save queue run: each link awaits a promise or two. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

function pickGoalsAndContinue() {
  fireEvent.click(chip('career'));
  fireEvent.click(chip('focus'));
  fireEvent.click(next());
}

beforeEach(async () => {
  updateProfile.mockClear();
  failStepSaves = false;
  profile = signupRow();
  await i18n.changeLanguage('en');
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('OAuthOnboardingPage saves each answer as it is given (gap-1-12)', () => {
  it('(a) saves exactly the goals when Continue is tapped on the goals step', async () => {
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    await flush();
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile.mock.calls[0][0]).toEqual({ goals: ['career', 'focus'] });
    expect(heading('oauth.basics.heading')).toBeInTheDocument();
  });

  it('(b) saves a valid typed birth date after 600 ms without Continue, never an invalid one', async () => {
    vi.useFakeTimers();
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    updateProfile.mockClear();

    fireEvent.change(birthDateField(), { target: { value: '0002-04-21' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(updateProfile).not.toHaveBeenCalled();

    fireEvent.change(birthDateField(), { target: { value: '1993-04-21' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(599); });
    expect(updateProfile).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile.mock.calls[0][0]).toMatchObject({ birthDate: '1993-04-21' });
    for (const [update] of updateProfile.mock.calls) expect(update.birthDate).not.toBe('0002-04-21');
  });

  it('flushes a pending date save when the page is hidden', async () => {
    vi.useFakeTimers();
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    updateProfile.mockClear();

    fireEvent.change(birthDateField(), { target: { value: '1993-04-21' } });
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile.mock.calls[0][0]).toMatchObject({ birthDate: '1993-04-21' });
    // The flushed debounce does not fire a second time.
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(updateProfile).toHaveBeenCalledTimes(1);
  });

  it('(c) a remount after the goals opens the birth step, and Back shows both chips pressed', async () => {
    const first = render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    await flush();
    first.unmount();

    render(<OAuthOnboardingPage onComplete={() => {}} />);
    expect(heading('oauth.basics.heading')).toBeInTheDocument();
    expect(birthDateField().value).toBe('');
    fireEvent.click(back());
    expect(chip('career')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('focus')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('love')).toHaveAttribute('aria-pressed', 'false');
  });

  it('(c) a remount after the goals and a typed date opens the reminders step, and two Backs show the date', async () => {
    vi.useFakeTimers();
    const first = render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    fireEvent.change(birthDateField(), { target: { value: '1993-04-21' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    first.unmount();
    vi.useRealTimers();

    render(<OAuthOnboardingPage onComplete={() => {}} />);
    expect(heading('oauth.notifications.heading')).toBeInTheDocument();
    fireEvent.click(back());
    fireEvent.click(back());
    expect(birthDateField().value).toBe('1993-04-21');
    fireEvent.click(back());
    expect(chip('career')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('focus')).toHaveAttribute('aria-pressed', 'true');
  });

  it('(d) no save before the reveal carries onboardingComplete; the Finish call carries every answer', async () => {
    const onComplete = vi.fn();
    render(<OAuthOnboardingPage onComplete={onComplete} />);
    pickGoalsAndContinue();
    fireEvent.change(birthDateField(), { target: { value: '1993-04-21' } });
    fireEvent.click(next()); // tone
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('onboarding:oauth.tone.direct.label')) }));
    fireEvent.click(next()); // reminders
    await flush();
    await act(async () => { fireEvent.click(finishButton()); });
    await flush();

    expect(screen.getByRole('button', { name: i18n.t('onboarding:oauth.reveal.cta') })).toBeInTheDocument();
    for (const [update] of updateProfile.mock.calls) expect(update).not.toHaveProperty('onboardingComplete');
    expect(updateProfile.mock.calls.at(-1)![0]).toEqual({
      goals: ['career', 'focus'],
      birthDate: '1993-04-21',
      birthTime: null,
      birthPlace: null,
      timezone: fallbackZone(signupRow()),
      birthLat: null,
      birthLon: null,
      birthTz: null,
      tonePreference: 'direct',
      notificationsEnabled: true,
      notificationTime: '09:00',
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: i18n.t('onboarding:oauth.reveal.cta') }));
    });
    await flush();
    expect(updateProfile.mock.calls.at(-1)![0]).toEqual({ onboardingComplete: true });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('(e) a failed step save does not stop the stepper, and Finish still writes everything', async () => {
    failStepSaves = true;
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    await flush();
    expect(heading('oauth.basics.heading')).toBeInTheDocument();
    fireEvent.change(birthDateField(), { target: { value: '1993-04-21' } });
    fireEvent.click(next());
    await flush();
    expect(heading('oauth.tone.heading')).toBeInTheDocument();
    fireEvent.click(next());
    await flush();
    expect(heading('oauth.notifications.heading')).toBeInTheDocument();
    await act(async () => { fireEvent.click(finishButton()); });
    await flush();

    expect(updateProfile.mock.calls.at(-1)![0]).toMatchObject({
      goals: ['career', 'focus'],
      birthDate: '1993-04-21',
      tonePreference: 'gentle',
      notificationsEnabled: true,
    });
    expect(screen.getByRole('button', { name: i18n.t('onboarding:oauth.reveal.cta') })).toBeInTheDocument();
  });

  it('(f) a profile update arriving while the member types does not clear the field', async () => {
    const view = render(<OAuthOnboardingPage onComplete={() => {}} />);
    pickGoalsAndContinue();
    await flush();
    fireEvent.change(birthDateField(), { target: { value: '1993-04-21' } });
    // A step save (or any other write) hands the page a new profile object.
    profile = { ...profile, goals: ['career', 'focus'], birthDate: '2000-01-01', timezone: 'Asia/Tokyo' };
    view.rerender(<OAuthOnboardingPage onComplete={() => {}} />);
    expect(birthDateField().value).toBe('1993-04-21');
    expect(heading('oauth.basics.heading')).toBeInTheDocument();
  });

  it('saves the tone when Continue is tapped on the tone step', async () => {
    profile = signupRow({ goals: ['love'], birthDate: '1991-03-08' });
    render(<OAuthOnboardingPage onComplete={() => {}} />);
    fireEvent.click(back()); // tone
    fireEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('onboarding:oauth.tone.playful.label')) }));
    fireEvent.click(next());
    await flush();
    expect(updateProfile.mock.calls.at(-1)![0]).toEqual({ tonePreference: 'playful' });
  });
});

describe('onboarding patch builders', () => {
  const base = {
    goals: ['love' as const],
    birthDate: '1993-04-21',
    birthTime: '',
    birthPlace: '  ',
    birthLat: undefined,
    birthLon: undefined,
    tonePreference: 'gentle' as const,
    notificationsEnabled: false,
    notificationTime: '08:30',
  };

  it('goalsPatch, tonePatch and remindersPatch carry only their step', () => {
    expect(goalsPatch(base)).toEqual({ goals: ['love'] });
    expect(tonePatch(base)).toEqual({ tonePreference: 'gentle' });
    expect(remindersPatch(base)).toEqual({ notificationsEnabled: false, notificationTime: '08:30' });
  });

  it('birthPatch without coordinates clears the place fields and an empty time', async () => {
    const derive = vi.fn(async () => 'Asia/Tokyo');
    const patch = await birthPatch(base, { timezone: 'UTC' }, derive);
    expect(patch).toEqual({
      birthDate: '1993-04-21',
      birthTime: null,
      birthPlace: null,
      timezone: fallbackZone({ timezone: 'UTC' }),
      birthLat: null,
      birthLon: null,
      birthTz: null,
    });
    expect(derive).not.toHaveBeenCalled();
  });

  it('birthPatch with coordinates writes them with the place’s own zone', async () => {
    const derive = vi.fn(async () => 'Asia/Tokyo');
    const patch = await birthPatch(
      { ...base, birthTime: '06:45', birthPlace: ' Osaka, Japan ', birthLat: 34.69, birthLon: 135.5 },
      { timezone: 'UTC' },
      derive,
    );
    expect(patch).toEqual({
      birthDate: '1993-04-21',
      birthTime: '06:45',
      birthPlace: 'Osaka, Japan',
      timezone: fallbackZone({ timezone: 'UTC' }),
      birthLat: 34.69,
      birthLon: 135.5,
      birthTz: 'Asia/Tokyo',
    });
    expect(derive).toHaveBeenCalledWith(34.69, 135.5);
  });

  it('birthPatch timezone is the device zone', async () => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const patch = await birthPatch(base, { timezone: 'UTC' }, async () => null);
    expect(patch.timezone).toBe(device || 'UTC');
  });
});
