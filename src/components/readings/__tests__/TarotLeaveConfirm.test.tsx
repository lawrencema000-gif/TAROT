import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, waitFor, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 QU1 R-c: an AI interpretation bought for a reading on the table was
 * thrown away by one tap on "Start a new reading" or Back when the reading
 * had not been saved — 50 Moonstones for a free reader, and no word about
 * it. Leaving such a reveal now asks first, and says where the text is:
 * generate-reading files every interpretation it charges for under the
 * Library's AI readings (p9 Q02; cache hits too since p9 QZ-6). The client
 * still treats a cached answer as unfiled — an older deployed function did
 * not file it — so for that one the sheet says it would go, and offers to
 * save the reading with it.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000b8', email: 'qa@example.com' };
const insertReturningId = vi.fn();
const updateInterpretation = vi.fn();
const generatePremiumReading = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: true, isAdFree: true, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/RitualContext', () => ({ useRitual: () => ({ tarotRefreshTrigger: 0 }) }));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({
  tarotReadings: {
    insertReturningId: (...a: unknown[]) => insertReturningId(...a),
    updateInterpretation: (...a: unknown[]) => updateInterpretation(...a),
  },
}));
vi.mock('../../../services/tarotCards', async () => {
  const { fullDeck } = await import('../../../data/tarotDeck');
  const { localizeCards } = await import('../../../i18n/localizeCard');
  return { getAllTarotCards: async () => localizeCards(fullDeck) };
});
vi.mock('../../../services/readingInterpretation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/readingInterpretation')>()),
  generatePremiumReading: (...a: unknown[]) => generatePremiumReading(...a),
}));
vi.mock('../../../utils/shareCard', () => ({ shareOrDownloadCard: vi.fn() }));
vi.mock('../../../i18n/contentOverlay', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../i18n/contentOverlay')>()),
  loadContentOverlay: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: vi.fn().mockResolvedValue(0),
  incrementDailyReadingCount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../services/ads', () => ({ adsService: { checkAndShowAd: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../services/achievements', () => ({ checkAchievementProgress: vi.fn(), checkSpecificCardAchievement: vi.fn() }));
vi.mock('../../../services/rewardedAds', () => ({
  rewardedAdsService: { canWatchAd: vi.fn().mockResolvedValue(false), hasTemporaryAccess: vi.fn().mockResolvedValue(false), consumeTemporaryAccess: vi.fn() },
}));
vi.mock('../../../services/ratePrompt', () => ({
  ratePromptService: { incrementPositiveActions: vi.fn(), shouldShowPrompt: vi.fn().mockResolvedValue(false), recordPromptShown: vi.fn() },
}));
// A premium reader: the spend is allowed, and the earn sheet never opens.
vi.mock('../../../hooks/useMoonstoneSpend', () => ({
  useMoonstoneSpend: () => ({ tryConsume: vi.fn().mockResolvedValue(true), refund: vi.fn(), EarnSheet: null }),
}));
vi.mock('../../premium', () => ({ WatchAdSheet: () => null }));
vi.mock('../../../utils/platform', () => ({ isNative: () => false }));

import i18n from '../../../i18n/config';
import { TarotSection } from '../TarotSection';

const tt = (key: string, opts?: Record<string, unknown>) => i18n.t(`app:${key}`, opts);
const AI_TEXT = '1) 概要\n道が開けつつあります。\n\n2) 結び\n落ち着いて進みましょう。';

/** The daily draw, dealt and turned, with its AI interpretation bought: the reveal, unsaved. */
async function revealWithAi({ cached = false, buy = true } = {}) {
  generatePremiumReading.mockResolvedValue({ interpretation: AI_TEXT, usedLlm: true, cardCount: 1, ...(cached ? { cached: true } : {}) });
  render(
    <MemoryRouter>
      <TarotSection onShowPaywall={() => {}} />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.dailyDraw.title') }));
  fireEvent.click(screen.getByRole('button', { name: tt('readings.focusAreas.general') }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.focusView.continue')) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.shuffleView.shuffleDeck')) }));
  fireEvent.click(screen.getByRole('button', { name: tt('readings.shuffleView.cutDeck') }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.selectView.cardOf', { n: 1, total: 78 }) }));
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.selectView.revealCards')) }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') }));
  if (buy) {
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(tt('readings.revealView.getAIInsight')) }));
    await screen.findByText('道が開けつつあります。');
  }
}

const startOver = () => fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.newReading') }));
const leaveSheet = () => screen.queryByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
const onHome = () => screen.queryByRole('button', { name: tt('readings.dailyDraw.title') });

// Seven steps from the deck to a bought interpretation: more than the 5 s default under a full parallel run.
describe('TarotSection: leaving a reveal with a bought AI interpretation asks first (QU1 R-c)', { timeout: 20_000 }, () => {
  beforeEach(async () => {
    cleanup();
    insertReturningId.mockReset().mockResolvedValue({ ok: true, data: { id: 'saved-1' } });
    updateInterpretation.mockReset().mockResolvedValue({ ok: true, data: null });
    generatePremiumReading.mockReset();
    await act(async () => { await i18n.changeLanguage('ja'); });
  });
  afterAll(async () => {
    cleanup();
    await act(async () => { await i18n.changeLanguage('en'); });
  });

  it('"Start a new reading": the sheet says the AI text is in the Library; Leave goes home without saving', async () => {
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: '保存せずに終えますか？' });
    expect(sheet.textContent).toContain('このリーディングはまだ保存されていません。AI解釈は、ライブラリの「AIリーディング」からいつでも読めます。');
    expect(onHome()).toBeNull();
    fireEvent.click(within(sheet).getByRole('button', { name: '保存せずに終える' }));
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(insertReturningId).not.toHaveBeenCalled();
  });

  it('Back asks the same; closing the sheet keeps the reading on the table', async () => {
    await revealWithAi();
    fireEvent.click(screen.getByRole('button', { name: tt('readings.back') }));
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: i18n.t('common:actions.close') }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(onHome()).toBeNull();
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
  });

  it('"Save and leave" saves the reading with its interpretation, then goes home', async () => {
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存して終える' }));
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    expect(insertReturningId.mock.calls[0][0]).toMatchObject({ interpretation: AI_TEXT, saved: true });
  });

  it('a save that fails stays on the reading, so nothing is lost', async () => {
    insertReturningId.mockResolvedValue({ ok: false, error: 'offline' });
    await revealWithAi();
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    fireEvent.click(within(sheet).getByRole('button', { name: '保存して終える' }));
    await waitFor(() => expect(leaveSheet()).toBeNull());
    expect(onHome()).toBeNull();
    expect(screen.getByText('道が開けつつあります。')).toBeInTheDocument();
  });

  it('an interpretation served from the cache is not in the Library: the sheet says it would go', async () => {
    await revealWithAi({ cached: true });
    startOver();
    const sheet = await screen.findByRole('dialog', { name: tt('readings.revealView.leaveConfirm.title') });
    expect(sheet.textContent).toContain('このリーディングはまだ保存されていません。このまま終えると、AI解釈も消えてしまいます。残すには保存してください。');
    expect(sheet.textContent).not.toContain('ライブラリ');
  });

  it('saved first: no question, straight home', async () => {
    await revealWithAi();
    fireEvent.click(screen.getByRole('button', { name: tt('readings.revealView.save') }));
    await screen.findByRole('button', { name: tt('readings.revealView.saved') });
    startOver();
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(leaveSheet()).toBeNull();
  });

  it('no AI interpretation bought: no question, as before', async () => {
    await revealWithAi({ buy: false });
    startOver();
    await waitFor(() => expect(onHome()).not.toBeNull());
    expect(leaveSheet()).toBeNull();
  });
});
