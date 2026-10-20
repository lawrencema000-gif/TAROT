import { describe, it, expect, vi, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, within, act } from '@testing-library/react';

/*
 * p9 QU2 R3 f: the Earn sheet's header line is up to three sentences — what
 * the action costs, the balance, the next step — and they were glued with a
 * {' '} in code. Japanese and Chinese set no space after 。, so the line read
 * 「…が必要です。 所持：20個。 下でチェックインして…」. Each combination is
 * now one translated sentence run per locale (Trans), the next step placed
 * by it: no space in ja and zh, one in en and ko.
 */

const checkedIn = false;

vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: '00000000-0000-4000-8000-0000000000f9' }, profile: { isPremium: false } }),
}));
vi.mock('../../utils/platform', () => ({ isNative: () => false }));
vi.mock('../../services/rewardedAds', () => ({
  MOONSTONES_PER_AD: 50,
  rewardedAdsService: { isReady: () => false, showRewardedAd: async () => 'unavailable', getCreditsRemaining: () => 0 },
}));
vi.mock('./useAdCreditsLeft', () => ({ useAdCreditsLeft: () => null }));
vi.mock('../premium/PaywallSheet', () => ({ PaywallSheet: () => null }));
vi.mock('../../dal/moonstoneSpend', () => ({ ACTION_COST: 50 }));
vi.mock('../../dal/moonstones', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../dal/moonstones')>()),
  hasCheckedInToday: async () => ({ ok: true, data: checkedIn }),
  doDailyCheckin: async () => ({ ok: true, data: { alreadyCheckedIn: true, amountAwarded: 0, streakDay: 1 } }),
  getBalance: async () => ({ ok: true, data: 20 }),
}));

import i18n from '../../i18n/config';
import { EarnMoonstonesSheet, type EarnSheetReason } from './EarnMoonstonesSheet';

afterEach(() => cleanup());
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

/** The sheet's header line, once the check-in row has answered. */
async function headerLine(lng: string, reason: EarnSheetReason, balance: number | null): Promise<string> {
  await act(async () => { await i18n.changeLanguage(lng); });
  render(<EarnMoonstonesSheet open onClose={() => {}} reason={reason} balance={balance} resetAt={null} />);
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByText(i18n.t('app:moonstones.earnSheet.checkinTitle'));
  return (dialog.querySelector('div.leading-relaxed') as HTMLElement).textContent ?? '';
}

describe('the Earn sheet’s header reads as one run of sentences in each language (QU2 R3 f)', () => {
  it('ja: no space between the sentences', async () => {
    expect(await headerLine('ja', 'insufficient', 20)).toBe(
      '続けるにはムーンストーン50個が必要です。所持：20個。下でチェックインして今日のムーンストーンを受け取るか、プレミアムにしましょう。',
    );
    cleanup();
    expect(await headerLine('ja', 'browse', null)).toBe(
      'AIリーディング1回につきムーンストーン50個が必要です。下でチェックインして今日のムーンストーンを受け取るか、プレミアムにしましょう。',
    );
  });

  it('zh: no space either', async () => {
    const line = await headerLine('zh', 'insufficient', 20);
    expect(line).toBe('你需要 50 月光石才能继续。你有 20。在下方签到领取今天的月光石，或升级高级版。');
    expect(line).not.toMatch(/。 /);
  });

  it('ko and en: one space after each sentence', async () => {
    expect(await headerLine('ko', 'browse', 20)).toBe(
      'AI 리딩 한 번에 문스톤 50개가 들어요. 보유 20개. 아래에서 체크인하고 오늘의 문스톤을 받거나, 프리미엄을 시작하세요.',
    );
    cleanup();
    expect(await headerLine('en', 'insufficient', 20)).toBe(
      'You need 50 Moonstones to continue. You have 20. Check in below for today’s Moonstones, or go Premium.',
    );
    cleanup();
    expect(await headerLine('en', 'insufficient', null)).toBe(
      'You need 50 Moonstones to continue. Check in below for today’s Moonstones, or go Premium.',
    );
  });

  it('the cost and the balance keep their emphasis', async () => {
    await headerLine('ja', 'insufficient', 20);
    const dialog = screen.getByRole('dialog');
    const line = dialog.querySelector('div.leading-relaxed') as HTMLElement;
    expect(within(line).getByText('ムーンストーン50個').className).toContain('text-gold');
    expect(within(line).getByText('20').className).toContain('font-semibold');
  });
});
