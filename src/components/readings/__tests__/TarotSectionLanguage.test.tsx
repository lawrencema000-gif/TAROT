import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * The tarot reading read the deck once, in the language on screen when the
 * Readings tab opened, and kept the cards it dealt from it. After a switch
 * in Settings, the cards on the table — and every card dealt afterwards —
 * kept their old names, keywords and meanings; Home's daily card had the
 * same cause (p10 d1-en-01). The deck is read again in the new language,
 * and the cards on the table are the same cards, by id, where they were:
 * nothing is dealt again and the reading stays on screen.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000db', email: 'qa@example.com' };
const getAllTarotCards = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: true, isAdFree: true, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/RitualContext', () => ({ useRitual: () => ({ tarotRefreshTrigger: 0 }) }));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({ tarotReadings: { insertReturningId: vi.fn(), updateInterpretation: vi.fn() } }));
// The deck as the service returns it: localized, at the moment it is read, into the language on screen.
vi.mock('../../../services/tarotCards', () => ({ getAllTarotCards: (...a: unknown[]) => getAllTarotCards(...a) }));
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

import i18n from '../../../i18n/config';
import { fullDeck } from '../../../data/tarotDeck';
import { localizeCard, localizeCards } from '../../../i18n/localizeCard';
import { TarotSection } from '../TarotSection';

const tt = (key: string, opts?: Record<string, unknown>) => i18n.t(`app:${key}`, opts);

/** The language changes under the reading, as the Settings sheet changes it. */
const switchTo = async (lng: 'en' | 'ja' | 'ko' | 'zh') => {
  await act(async () => {
    await i18n.changeLanguage(lng);
  });
};

/** The daily draw, from the deck to the select step with one card picked (the first of the shuffled deck). */
async function pickOne() {
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
}

/** Deal the picked card and turn it: the reading on the table. Returns the card dealt, by its id. */
async function dealAndTurn(): Promise<number> {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(tt('readings.selectView.revealCards')) }));
  fireEvent.click(await screen.findByRole('button', { name: tt('readings.revealView.revealAll') }));
  const open = await screen.findByRole('button', { name: new RegExp(`^${tt('readings.revealView.openCard', { name: '(.+)' })}$`) });
  const shown = open.getAttribute('aria-label')!;
  const card = fullDeck.find((c) => tt('readings.revealView.openCard', { name: localizeCard(c).name }) === shown);
  expect(card, shown).toBeDefined();
  return card!.id;
}

/** The card on the table, as the reveal must show it in `lng`: its button and its reading. */
function expectOnTable(id: number, lng: 'en' | 'ja' | 'ko' | 'zh') {
  const card = localizeCard(fullDeck.find((c) => c.id === id)!, lng);
  expect(screen.getByRole('button', { name: tt('readings.revealView.openCard', { name: card.name }) })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 3, name: card.name })).toBeInTheDocument();
  return card;
}

// From the deck to a turned card is seven steps: more than the 5 s default under a full parallel run.
describe('TarotSection follows a language change at once (p10 d1-en-01)', { timeout: 20_000 }, () => {
  beforeEach(async () => {
    cleanup();
    getAllTarotCards.mockReset().mockImplementation(async () => localizeCards(fullDeck));
    await switchTo('en');
  });
  afterAll(async () => {
    cleanup();
    await switchTo('en');
  });

  it('a reading on the table: the same card, turned where it lay, named and read in the new language', async () => {
    await pickOne();
    const id = await dealAndTurn();
    const en = expectOnTable(id, 'en');
    const reads = getAllTarotCards.mock.calls.length;

    await switchTo('ja');
    expect(getAllTarotCards.mock.calls.length).toBe(reads + 1);
    const ja = await vi.waitFor(() => expectOnTable(id, 'ja'));
    expect(ja.name).not.toBe(en.name);
    expect(screen.queryByRole('heading', { level: 3, name: en.name })).toBeNull();
    // Still the reading: not dealt again, not sent home.
    expect(screen.queryByRole('button', { name: tt('readings.dailyDraw.title') })).toBeNull();
    expect(screen.queryByRole('button', { name: tt('readings.revealView.revealAll') })).toBeNull();

    await switchTo('en');
    await vi.waitFor(() => expectOnTable(id, 'en'));
    expect(screen.queryByRole('heading', { level: 3, name: ja.name })).toBeNull();
  });

  it('a card picked before the switch is dealt from the deck in the new language', async () => {
    await pickOne();
    await switchTo('ko');
    await vi.waitFor(() => expect(getAllTarotCards).toHaveBeenCalledTimes(2));
    const id = await dealAndTurn();
    expectOnTable(id, 'ko');
    expect(screen.queryByRole('heading', { level: 3, name: localizeCard(fullDeck.find((c) => c.id === id)!, 'en').name })).toBeNull();
  });
});
