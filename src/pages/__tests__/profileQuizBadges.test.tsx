import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UserProfile } from '../../types';
import '@testing-library/jest-dom/vitest';

/*
 * WP-P1-08 (quizzes-account-03): "Save to my profile" on the Enneagram and
 * Attachment results wrote the profile, answered "Saved to your profile", and
 * Profile still showed only the MBTI and love-language badges. Profile now
 * shows "Enneagram 4w5" and the saved attachment style's name, in the
 * member's language. The style names live with the quiz route's strings, so
 * Profile fetches them only when a style is saved, and shows the name once
 * they are in (never an English name first in ja/ko/zh).
 */

const h = vi.hoisted(() => {
  function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }
  return {
    deferred,
    profile: {} as Partial<UserProfile>,
    ready: false,
    load: deferred(),
  };
});

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: h.profile }) }));
vi.mock('../../context/UIContext', () => ({ useUI: () => ({ openOverlay: vi.fn() }) }));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: () => false }));
vi.mock('../../services/levelSystem', () => ({
  getLevelThresholds: async () => [],
  getXPProgress: () => ({ current: 0, required: 100, percentage: 0 }),
}));
vi.mock('../../components/profile/EditProfileForm', () => ({ EditProfileSheet: () => null }));
vi.mock('../../components/premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../components/referral/ReferralSheet', () => ({ ReferralSheet: () => null }));
vi.mock('../../components/compat/InviteFriendSheet', () => ({ InviteFriendSheet: () => null }));
vi.mock('../../components/profile/CosmicProfileSection', () => ({ CosmicProfileSection: () => null }));
vi.mock('../../i18n/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../i18n/config')>();
  return {
    ...actual,
    ensureRouteStrings: vi.fn(() => h.load.promise),
    routeStringsReady: () => h.ready,
  };
});

import i18n, { ensureRouteStrings } from '../../i18n/config';
import { ProfilePage } from '../ProfilePage';

const BASE: Partial<UserProfile> = {
  id: 'u1',
  email: 'member@example.com',
  displayName: 'Member',
  level: 1,
  xp: 0,
  streak: 0,
  totalReadings: 0,
  totalJournalEntries: 0,
  mbtiType: '',
  loveLanguage: '',
};

async function mount(profile: Partial<UserProfile>) {
  h.profile = { ...BASE, ...profile };
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
  // Let the level-threshold effect settle.
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  h.ready = false;
  h.load = h.deferred();
  vi.mocked(ensureRouteStrings).mockClear();
});
afterEach(cleanup);
afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Profile: saved quiz results as personality badges', () => {
  it('(a) en: shows the Enneagram badge at once and the attachment name once the quiz strings load', async () => {
    await mount({ mbtiType: 'INFJ', loveLanguage: 'words', enneagramType: 4, enneagramWing: 5, attachmentStyle: 'fearful-avoidant' });
    expect(screen.getByRole('heading', { name: 'Personality badges' })).toBeInTheDocument();
    expect(screen.getByText('INFJ')).toBeInTheDocument();
    expect(screen.getByText('Words of Affirmation')).toBeInTheDocument();
    expect(screen.getByText('Enneagram 4w5')).toBeInTheDocument();
    expect(screen.queryByText('Fearful-Avoidant Attachment')).toBeNull();
    expect(ensureRouteStrings).toHaveBeenCalledWith('quizzes', 'en');

    await act(async () => {
      h.ready = true;
      h.load.resolve();
      await h.load.promise;
    });
    expect(await screen.findByText('Fearful-Avoidant Attachment')).toBeInTheDocument();
  });

  it('(b) ja: both badges in Japanese', async () => {
    await act(async () => {
      await i18n.changeLanguage('ja');
    });
    h.ready = true;
    await mount({ enneagramType: 4, enneagramWing: 5, attachmentStyle: 'secure' });
    expect(await screen.findByRole('heading', { name: 'パーソナリティバッジ' })).toBeInTheDocument();
    expect(screen.getByText('エニアグラム 4w5')).toBeInTheDocument();
    expect(screen.getByText('安定型アタッチメント')).toBeInTheDocument();
    expect(ensureRouteStrings).not.toHaveBeenCalled();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('(c) a type without a wing or a style: "Enneagram 9", no quiz strings fetched', async () => {
    await mount({ enneagramType: 9 });
    expect(screen.getByText('Enneagram 9')).toBeInTheDocument();
    expect(ensureRouteStrings).not.toHaveBeenCalled();
  });

  it('(d) an unknown style alone: no badges section, nothing fetched', async () => {
    await mount({ attachmentStyle: 'unknown-style' });
    expect(screen.queryByRole('heading', { name: 'Personality badges' })).toBeNull();
    expect(ensureRouteStrings).not.toHaveBeenCalled();
  });

  it('(e) no quiz results: no badges section', async () => {
    await mount({});
    expect(screen.queryByRole('heading', { name: 'Personality badges' })).toBeNull();
    expect(ensureRouteStrings).not.toHaveBeenCalled();
  });
});
