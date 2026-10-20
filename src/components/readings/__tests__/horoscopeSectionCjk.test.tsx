import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

/*
 * The Readings tab's sun-sign horoscope in Japanese (p9 QU1 R-f, QU2 R3 a):
 *  - the lucky colour sits in a third of the card (grid-cols-3) and was set
 *    as body copy, so a long katakana colour (オブシディアン, バイオレット)
 *    broke inside the word; it keeps its phrases now, as the vibe beside it;
 *  - the card of the day's keywords were joined with a Latin ", " built in
 *    code (「希望, 信頼, 再生」); they are joined as the locale lists
 *    (cardMeaning.listSeparator: 、 in ja and zh).
 */

vi.mock('../../../lib/supabase', () => ({ supabase: {} }));
vi.mock('../../../utils/telemetry', () => ({ captureException: () => {} }));
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: null, profile: { birthDate: '1991-03-08', isPremium: true }, refreshProfile: vi.fn() }),
}));
vi.mock('../../../context/UIContext', () => ({ useUI: () => ({ setActiveTab: () => {} }) }));
vi.mock('../../../hooks/useAstrology', () => ({
  useNatalChart: () => ({ chart: null, loading: false, fetchChart: vi.fn() }),
  useDailyHoroscope: () => ({}),
}));
vi.mock('../../horoscope/birthZone', () => ({ useBirthTzBackfill: () => {} }));
vi.mock('../../horoscope/TodayForYou', () => ({ TodayForYouView: () => null }));
vi.mock('../../../dal', () => ({ savedHighlights: { insert: vi.fn() } }));
vi.mock('../../../services/levelSystem', () => ({ awardXP: vi.fn() }));

import i18n from '../../../i18n/config';
import { cjkBreaking, KEEPS_PHRASES } from '../../../test/cjkCascade';
import { HoroscopeSection } from '../HoroscopeSection';

/** The value under a lucky tile's label ("Color" → the colour). */
function luckyValue(label: string): HTMLElement {
  const tile = screen.getByText(label).parentElement!;
  return tile.querySelectorAll('p')[1] as HTMLElement;
}

/** The card of the day's keyword line. */
function keywordLine(): HTMLElement {
  const block = screen.getByRole('heading', { name: i18n.t('app:horoscope.cardOfTheDay') }).parentElement!;
  return block.querySelector('p.text-meta') as HTMLElement;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 18, 9, 0));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('HoroscopeSection (sun sign) in Japanese, Korean and Chinese', () => {
  it.each(['ja', 'zh', 'ko'] as const)('%s: the lucky colour and the vibe keep their phrases', async (lng) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    render(<HoroscopeSection onShowPaywall={() => {}} />);
    const colour = luckyValue(i18n.t('app:horoscope.luckyLabels.color'));
    expect(colour.textContent?.length).toBeGreaterThan(0);
    expect(cjkBreaking(colour)).toBe(KEEPS_PHRASES[lng]);
    expect(cjkBreaking(luckyValue(i18n.t('app:horoscope.luckyLabels.vibe')))).toBe(KEEPS_PHRASES[lng]);
  });

  it('ja: the keywords are listed with 、, not a Latin comma', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    render(<HoroscopeSection onShowPaywall={() => {}} />);
    const line = keywordLine().textContent ?? '';
    expect(line.split('、')).toHaveLength(3);
    expect(line).not.toMatch(/, /);
  });

  it('en: ", " as before', async () => {
    await act(async () => { await i18n.changeLanguage('en'); });
    render(<HoroscopeSection onShowPaywall={() => {}} />);
    expect((keywordLine().textContent ?? '').split(', ')).toHaveLength(3);
  });
});
