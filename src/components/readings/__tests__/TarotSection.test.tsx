import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 R13: a card shared from the reading's detail sheet sent text in the
 * reader's language and a card page link with no language
 * (「悪魔——影の自己。Arcanaでこのカードを読む：https://tarotlife.app/tarot-meanings/the-devil」),
 * which a signed-out friend opened in English. A reading's link names its
 * language (`?hl=`, p8 F76); the card's now does too.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000b7', email: 'qa@example.com' };
const shareOrDownloadCard = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: true, isAdFree: true, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/RitualContext', () => ({ useRitual: () => ({ tarotRefreshTrigger: 0 }) }));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({ tarotReadings: { insertReturningId: vi.fn(), updateInterpretation: vi.fn() } }));
vi.mock('../../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../../data/tarotDeck');
  const { localizeCards } = await import('../../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
vi.mock('../../../utils/shareCard', () => ({ shareOrDownloadCard: (...a: unknown[]) => shareOrDownloadCard(...a) }));
vi.mock('../../../i18n/contentOverlay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../i18n/contentOverlay')>()),
  loadContentOverlay: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: vi.fn().mockResolvedValue(0),
  incrementDailyReadingCount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../services/ads', () => ({ adsService: { checkAndShowAd: vi.fn() } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/achievements', () => ({ checkAchievementProgress: vi.fn(), checkSpecificCardAchievement: vi.fn() }));
vi.mock('../../../services/rewardedAds', () => ({
  rewardedAdsService: { canWatchAd: vi.fn().mockResolvedValue(false), hasTemporaryAccess: vi.fn().mockResolvedValue(false), consumeTemporaryAccess: vi.fn() },
}));
vi.mock('../../../services/ratePrompt', () => ({
  ratePromptService: { incrementPositiveActions: vi.fn(), shouldShowPrompt: vi.fn().mockResolvedValue(false), recordPromptShown: vi.fn() },
}));
vi.mock('../../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: vi.fn(), refund: vi.fn(), EarnSheet: null }) }));
vi.mock('../../premium', () => ({ WatchAdSheet: () => null }));
vi.mock('../../../utils/platform', () => ({ isNative: () => false }));

import i18n, { getLocale } from '../../../i18n/config';
import { TarotSection } from '../TarotSection';

async function shareTheDevil(): Promise<string> {
  render(
    <MemoryRouter>
      <TarotSection onShowPaywall={() => {}} />
    </MemoryRouter>,
  );
  const allCards = i18n.t('app:readings.browse.allCards');
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(allCards) }));
  // The deck's buttons are named by the card, in the reader's language.
  fireEvent.click(await screen.findByRole('button', { name: getLocale() === 'ja' ? '悪魔' : 'The Devil' }));
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('app:tarot.detail.share', { defaultValue: 'Share this card' }) }));
  await waitFor(() => expect(shareOrDownloadCard).toHaveBeenCalledTimes(1));
  return shareOrDownloadCard.mock.calls[0][2] as string;
}

// The deck library draws 78 faces: about 3 s alone, past the 5 s default under a full parallel run.
describe('TarotSection: a shared card names its language (p9 R13)', { timeout: 20_000 }, () => {
  beforeEach(() => {
    cleanup();
    shareOrDownloadCard.mockReset().mockResolvedValue('shared');
  });
  afterAll(async () => {
    cleanup();
    await i18n.changeLanguage('en');
  });

  it('ja: the card page link carries ?hl=ja under the Japanese text', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    const text = await shareTheDevil();
    expect(text).toContain('悪魔');
    expect(text).toContain('https://tarotlife.app/tarot-meanings/the-devil?hl=ja');
  });

  it('en: no parameter, as before', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    const text = await shareTheDevil();
    expect(text).toMatch(/https:\/\/tarotlife\.app\/tarot-meanings\/the-devil$/);
  });
});
