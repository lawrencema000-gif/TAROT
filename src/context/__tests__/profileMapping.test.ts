import { describe, it, expect, vi } from 'vitest';

/*
 * WP-P1-08 (quizzes-account-03): the Enneagram and Attachment results save
 * profiles.enneagram_type / enneagram_wing / attachment_style, and AuthContext
 * reads the whole row (select('*')), but mapDbToProfile dropped the four quiz
 * columns, so profile.enneagramType and attachmentStyle were always undefined
 * and the saved results reached nothing the member could see.
 */

vi.mock('../../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: {} }));
vi.mock('../../dal/dailyRituals', () => ({ syncStreak: async () => ({ ok: true, data: { streak: 0, lastCompleted: null } }) }));
vi.mock('../../services/storage', () => ({ migrateGuestData: async () => {} }));
vi.mock('../../utils/admin', () => ({ isAdmin: () => false, verifyAdminStatus: async () => false }));
vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: () => {} }), getLaunchUrl: async () => null } }));
vi.mock('@capacitor/browser', () => ({ Browser: { open: async () => {}, close: async () => {} } }));
vi.mock('@codetrix-studio/capacitor-google-auth', () => ({ GoogleAuth: { initialize: () => {}, signIn: async () => ({}) } }));
vi.mock('@sentry/react', () => ({ setUser: () => {} }));

import { mapDbToProfile, type DbProfile } from '../AuthContext';

/** A row with only the fields the mapper read before the quiz columns. */
function row(extra: Record<string, unknown> = {}): DbProfile {
  return {
    id: '00000000-0000-4000-8000-0000000000e1',
    email: 'member@example.com',
    display_name: 'Member',
    birth_date: '1990-05-05',
    timezone: 'UTC',
    goals: [],
    tone_preference: 'gentle',
    notification_time: '09:00',
    notifications_enabled: false,
    onboarding_complete: true,
    is_premium: false,
    is_ad_free: false,
    locale: 'en',
    streak: 0,
    mbti_type: '',
    love_language: '',
    level: 1,
    total_readings: 0,
    total_journal_entries: 0,
    theme: 'dark',
    subscribed_to_newsletter: false,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  } as DbProfile;
}

describe('mapDbToProfile: saved quiz results', () => {
  it('carries the saved Enneagram type, wing and attachment style', () => {
    const p = mapDbToProfile(row({ enneagram_type: 4, enneagram_wing: 5, attachment_style: 'anxious' }));
    expect(p.enneagramType).toBe(4);
    expect(p.enneagramWing).toBe(5);
    expect(p.attachmentStyle).toBe('anxious');
  });

  it('passes every stored style through and maps an empty or NULL style to undefined', () => {
    expect(mapDbToProfile(row({ attachment_style: 'fearful-avoidant' })).attachmentStyle).toBe('fearful-avoidant');
    expect(mapDbToProfile(row({ attachment_style: '' })).attachmentStyle).toBeUndefined();
    expect(mapDbToProfile(row({ attachment_style: null })).attachmentStyle).toBeUndefined();
  });

  it('keeps only whole Enneagram numbers 1-9 (a numeric string too)', () => {
    expect(mapDbToProfile(row({ enneagram_type: '4' })).enneagramType).toBe(4);
    for (const bad of [0, 10, 4.5, 'x', '', null]) {
      expect(mapDbToProfile(row({ enneagram_type: bad })).enneagramType).toBeUndefined();
      expect(mapDbToProfile(row({ enneagram_wing: bad })).enneagramWing).toBeUndefined();
    }
  });

  it('carries the Big Five scores only when all five are numbers', () => {
    const scores = { openness: 72, conscientiousness: 55, extraversion: 40, agreeableness: 61, neuroticism: 33 };
    expect(mapDbToProfile(row({ big_five_scores: scores })).bigFiveScores).toEqual(scores);
    for (const bad of [{ openness: 72 }, { ...scores, neuroticism: 'x' }, 'x', null]) {
      expect(mapDbToProfile(row({ big_five_scores: bad })).bigFiveScores).toBeUndefined();
    }
  });

  it('leaves the quiz fields undefined and the other fields as before for a row without them', () => {
    const p = mapDbToProfile(row());
    expect(p.enneagramType).toBeUndefined();
    expect(p.enneagramWing).toBeUndefined();
    expect(p.attachmentStyle).toBeUndefined();
    expect(p.bigFiveScores).toBeUndefined();
    expect(p.mbtiType).toBe('');
    expect(p.loveLanguage).toBe('');
    expect(p.isAdFree).toBe(false);
    expect(p.subscribedToNewsletter).toBe(false);
    expect(p.birthTime).toBeUndefined();
    expect(p.level).toBe(1);
    expect(p.seekerRank).toBe('Novice Seeker');
  });
});
