import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, fireEvent, act, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 R11: a double tap on the playing-card reveal's bookmark saved the
 * reading twice. `isSaved` turns true only after the insert returns, so the
 * second tap of a double tap (6–120 ms later) found it false and inserted a
 * second Library row, and ran the XP, the ad check and the rate prompt
 * again. The tarot reveal had the guard; this is its sibling.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000c4', email: 'qa@example.com' };
const insertReturningId = vi.fn();
const updateInterpretation = vi.fn();
const awardXP = vi.fn();
const checkAndShowAd = vi.fn();

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { isPremium: true, isAdFree: true, card_back_url: null, goals: [] }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/GamificationContext', () => ({ useGamification: () => ({ openRatePrompt: vi.fn() }) }));
vi.mock('../../../dal', () => ({
  tarotReadings: {
    insertReturningId: (...a: unknown[]) => insertReturningId(...a),
    updateInterpretation: (...a: unknown[]) => updateInterpretation(...a),
  },
}));
vi.mock('../../../services/offline', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../services/offline')>()),
  getDailyReadingCount: vi.fn().mockResolvedValue(0),
  incrementDailyReadingCount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../services/ads', () => ({ adsService: { checkAndShowAd: (...a: unknown[]) => checkAndShowAd(...a) } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: (...a: unknown[]) => awardXP(...a) }));
vi.mock('../../../services/achievements', () => ({ checkAchievementProgress: vi.fn() }));
vi.mock('../../../services/rewardedAds', () => ({
  rewardedAdsService: { canWatchAd: vi.fn().mockResolvedValue(false), hasTemporaryAccess: vi.fn().mockResolvedValue(false), consumeTemporaryAccess: vi.fn() },
}));
vi.mock('../../../services/ratePrompt', () => ({
  ratePromptService: { incrementPositiveActions: vi.fn().mockResolvedValue(undefined), shouldShowPrompt: vi.fn().mockResolvedValue(false), recordPromptShown: vi.fn() },
}));
vi.mock('../../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: vi.fn(), refund: vi.fn(), EarnSheet: null }) }));
vi.mock('../../premium', () => ({ WatchAdSheet: () => null }));
vi.mock('../../../utils/platform', () => ({ isNative: () => false }));

import i18n from '../../../i18n/config';
import { CartomancySection } from '../CartomancySection';

/** A promise the test settles by hand: the insert is still on its way. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

/** Deep link → focus → shuffle → cut → pick three → reveal → reveal all. */
async function dealAndRevealThree() {
  render(
    <MemoryRouter>
      <CartomancySection onShowPaywall={() => {}} initialSpread="carto-three-timeline" />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Love' }));
  fireEvent.click(screen.getByRole('button', { name: 'Shuffle for this focus' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Shuffle the deck' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cut the deck' }));
  for (const n of [1, 2, 3]) fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^Card ${n} of \\d+$`) }));
  fireEvent.click(screen.getByRole('button', { name: 'Reveal cards' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Reveal all' }));
  return screen.findByRole('button', { name: 'Save this reading' });
}

describe('CartomancySection: save once (p9 R11)', () => {
  beforeEach(async () => {
    cleanup();
    insertReturningId.mockReset();
    updateInterpretation.mockReset();
    awardXP.mockReset().mockResolvedValue(undefined);
    checkAndShowAd.mockReset().mockResolvedValue(undefined);
    await act(async () => { await i18n.changeLanguage('en'); });
  });
  afterAll(() => cleanup());

  it('a double tap while the insert is on its way writes one row and awards once', async () => {
    const insert = deferred<{ ok: true; data: { id: string } }>();
    insertReturningId.mockReturnValue(insert.promise);
    const save = await dealAndRevealThree();

    // Two taps before the insert answers, as a double tap lands.
    fireEvent.click(save);
    fireEvent.click(save);
    expect(insertReturningId).toHaveBeenCalledTimes(1);

    await act(async () => { insert.resolve({ ok: true, data: { id: 'row-1' } }); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeTruthy());
    // A tap on the spent bookmark does nothing either.
    fireEvent.click(screen.getByRole('button', { name: 'Saved' }));
    await act(async () => {});
    expect(insertReturningId).toHaveBeenCalledTimes(1);
    // The reveal's own 'reading_complete' award is separate; the save's runs once.
    expect(awardXP.mock.calls.filter(([, kind]) => kind === 'reading_saved')).toEqual([[USER.id, 'reading_saved']]);
    expect(checkAndShowAd).toHaveBeenCalledTimes(1);
  });

  it('a failed save can be tried again', async () => {
    insertReturningId.mockResolvedValueOnce({ ok: false, error: 'offline' }).mockResolvedValueOnce({ ok: true, data: { id: 'row-2' } });
    const save = await dealAndRevealThree();
    fireEvent.click(save);
    await waitFor(() => expect(insertReturningId).toHaveBeenCalledTimes(1));
    await act(async () => {});
    fireEvent.click(await screen.findByRole('button', { name: 'Save this reading' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toBeTruthy());
    expect(insertReturningId).toHaveBeenCalledTimes(2);
  });
});
