import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';

/*
 * The Earn sheet once today's check-in is claimed (p8 F56). The check-in
 * and the ad credits reset at UTC midnight: 9:00 the same morning in
 * Tokyo, 5:00 PM the same afternoon in Los Angeles. The sheet said
 * "Your next check-in opens tomorrow", "Come back tomorrow for your
 * check-in" and, at the ad cap, "Come back tomorrow" — beside Home's widget
 * naming the hour. It now names it as the widget does.
 */

let native = false;
let checkedIn = true;
let adOutcome = 'daily-cap';

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000f8' }, profile: { isPremium: false } }),
}));
vi.mock('../../utils/platform', () => ({ isNative: () => native }));
vi.mock('../../services/rewardedAds', () => ({
  MOONSTONES_PER_AD: 50,
  rewardedAdsService: { isReady: () => true, showRewardedAd: async () => adOutcome, getCreditsRemaining: () => 3 },
}));
vi.mock('./useAdCreditsLeft', () => ({ useAdCreditsLeft: () => (native ? 3 : null) }));
vi.mock('../premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../dal/moonstoneSpend', () => ({ ACTION_COST: 50 }));
// The real nextCheckinOpensAt (the next UTC midnight); only the reads are stubbed.
vi.mock('../../dal/moonstones', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../dal/moonstones')>()),
  hasCheckedInToday: async () => ({ ok: true, data: checkedIn }),
  doDailyCheckin: async () => ({ ok: true, data: { alreadyCheckedIn: true, amountAwarded: 0, streakDay: 1 } }),
  getBalance: async () => ({ ok: true, data: 100 }),
}));

import i18n from '../../i18n/config';
import { EarnMoonstonesSheet } from './EarnMoonstonesSheet';

const ORIGINAL_TZ = process.env.TZ;

/** The sheet as Home's widget opens it, at `iso` on the clock of `timeZone`. */
async function openAt(lng: string, timeZone: string, iso: string) {
  process.env.TZ = timeZone;
  vi.setSystemTime(new Date(iso));
  await i18n.changeLanguage(lng);
  render(<EarnMoonstonesSheet open onClose={() => {}} reason="browse" balance={100} resetAt={null} />);
  const dialog = await screen.findByRole('dialog');
  // The claimed row appears once hasCheckedInToday answers.
  await within(dialog).findByText(i18n.t('app:moonstones.earnSheet.checkinClaimed'));
  return dialog;
}

beforeEach(() => {
  native = false;
  checkedIn = true;
  adOutcome = 'daily-cap';
  // Only the clock is fake: the sheet's effects and the queries keep real timers.
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the Earn sheet names when the next check-in opens', () => {
  it('Tokyo, 8:30 in the morning: today at 9:00, in the row and in the header', async () => {
    const dialog = await openAt('ja', 'Asia/Tokyo', '2026-10-16T23:30:00Z');
    expect(within(dialog).getByText('次は9:00から受け取れます')).toBeTruthy();
    expect(dialog.textContent).toContain('9:00以降にまたチェックインしに来るか、プレミアムにしましょう。');
    expect(dialog.textContent).not.toMatch(/明日/);
  });

  it('Tokyo, 5:30 in the afternoon: tomorrow at 9:00', async () => {
    const dialog = await openAt('ja', 'Asia/Tokyo', '2026-10-17T08:30:00Z');
    expect(within(dialog).getByText('次は明日の9:00から受け取れます')).toBeTruthy();
    expect(dialog.textContent).toContain('明日の9:00以降にまたチェックインしに来るか、プレミアムにしましょう。');
  });

  it('Los Angeles, 8:30 in the morning: today at 5:00 PM, not "tomorrow"', async () => {
    const dialog = await openAt('en', 'America/Los_Angeles', '2026-10-17T15:30:00Z');
    expect(within(dialog).getByText('Next claim at 5:00 PM')).toBeTruthy();
    expect(dialog.textContent).toContain('Come back at 5:00 PM for your next check-in, or go Premium.');
    expect(dialog.textContent).not.toMatch(/tomorrow/i);
  });

  it('ko and zh name the hour in their own words', async () => {
    let dialog = await openAt('ko', 'America/Los_Angeles', '2026-10-17T15:30:00Z');
    expect(within(dialog).getByText('오후 5:00부터 다시 받을 수 있어요')).toBeTruthy();
    expect(dialog.textContent).toContain('오후 5:00 이후에 다시 와서 체크인하거나, 프리미엄을 시작하세요.');
    cleanup();
    dialog = await openAt('zh', 'Asia/Shanghai', '2026-10-17T08:30:00Z');
    expect(within(dialog).getByText('明天 8:00 起可再次领取')).toBeTruthy();
    expect(dialog.textContent).toContain('明天 8:00 起可以再次签到，或升级高级版。');
  });

  it('where the next UTC day starts at the reader’s own midnight, “tomorrow” says it all', async () => {
    const dialog = await openAt('en', 'Africa/Abidjan', '2026-10-17T15:30:00Z');
    expect(within(dialog).getByText('Come back tomorrow')).toBeTruthy();
    expect(dialog.textContent).toContain('Come back tomorrow for your check-in, or go Premium.');
  });

  it('at the ad cap, the line names when ads earn again', async () => {
    native = true;
    const dialog = await openAt('en', 'America/Los_Angeles', '2026-10-17T15:30:00Z');
    fireEvent.click(within(dialog).getByText('Watch a short video'));
    expect(await within(dialog).findByText('You’ve watched today’s ads. Ads earn again at 5:00 PM.')).toBeTruthy();
  });

  it('at the ad cap in Tokyo after 9:00, ads earn again tomorrow at 9:00', async () => {
    native = true;
    const dialog = await openAt('ja', 'Asia/Tokyo', '2026-10-17T08:30:00Z');
    fireEvent.click(within(dialog).getByText(i18n.t('app:moonstones.earnSheet.watchAdTitle')));
    expect(await within(dialog).findByText('今日の分の広告はすべて視聴しました。明日の9:00から、また広告で貯められます。')).toBeTruthy();
  });
});
