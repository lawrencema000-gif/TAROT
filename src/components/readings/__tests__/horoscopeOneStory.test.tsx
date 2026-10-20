import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/*
 * p10 d2-ja-12: a member without a chart (Pisces, 2026-10-20, ja) read one
 * card that scored the day 2/5, called it 内省 — and then gave 今日のムード as
 * 「活気があって人を惹きつける」. Its 今日のカード was another card than the
 * one Home had just turned over for them.
 *  - The mood is drawn for the score on the card now.
 *  - The card stays the sign's (the whole reading is the sign's, and Home's
 *    card is the member's own, face down until they turn it), and its
 *    heading says so: horoscope.cardOfTheDay is "Your sign’s card today"
 *    (星座の今日のカード), not a second "today's card".
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
import { HoroscopeSection } from '../HoroscopeSection';
import '@testing-library/jest-dom/vitest';

type Lng = 'en' | 'ja' | 'ko' | 'zh';
const app = (lng: Lng) => JSON.parse(readFileSync(join(process.cwd(), 'src/i18n/locales', lng, 'app.json'), 'utf8'));

/** Each mood's band (1–2 low, 3 mid, 4–5 high), by the English mood at its place in the list. */
const BAND_OF_EN: Record<string, 'low' | 'mid' | 'high'> = {
  'Quietly powerful': 'low', 'Tender and raw': 'low', 'Contemplative and wise': 'low', 'Emotionally honest': 'low', 'Resilient and recovering': 'low',
  'Open and receptive': 'mid', 'Grounded and resolute': 'mid', 'Hopeful and forward-looking': 'mid', 'Patient and steady': 'mid',
  'Restless but purposeful': 'high', 'Playful and light': 'high', 'Energized and magnetic': 'high', 'Clear-headed and decisive': 'high',
  'Protective and fierce': 'high', 'Creative and inspired': 'high',
};
function bandOf(lng: Lng, mood: string) {
  const i = (app(lng).dailyInsights.moodDescriptors as string[]).indexOf(mood);
  return BAND_OF_EN[(app('en').dailyInsights.moodDescriptors as string[])[i]];
}
const bandOfScore = (n: number) => (n >= 4 ? 'high' : n >= 3 ? 'mid' : 'low');

/** The card as read: its score, its vibe and its mood line. */
function readCard() {
  const score = Number(/^(\d)\/5$/.exec(screen.getByText(/^\d\/5$/).textContent ?? '')![1]);
  const vibeTile = screen.getByText(i18n.t('app:horoscope.luckyLabels.vibe')).parentElement!;
  const vibe = vibeTile.querySelectorAll('p')[1].textContent ?? '';
  const moodBlock = screen.getByRole('heading', { name: i18n.t('app:horoscope.todaysMood') }).parentElement!;
  const mood = moodBlock.querySelector('p')!.textContent ?? '';
  return { score, vibe, mood };
}

async function renderOn(lng: Lng, day: number) {
  vi.setSystemTime(new Date(2026, 9, day, 12, 0));
  await act(async () => { await i18n.changeLanguage(lng); });
  return render(<HoroscopeSection onShowPaywall={() => {}} />);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
afterAll(async () => {
  await act(async () => { await i18n.changeLanguage('en'); });
});

describe('the sun-sign horoscope tells one story (p10 d2-ja-12)', { timeout: 30_000 }, () => {
  it('ja, the QA case: 2/5, 内省 — and a mood of a low day', async () => {
    await renderOn('ja', 20);
    const { score, vibe, mood } = readCard();
    expect(score).toBe(2);
    expect(vibe).toBe(app('ja').horoscope.vibe.introspective);
    expect(mood).not.toBe('活気があって人を惹きつける');
    expect(bandOf('ja', mood)).toBe('low');
  });

  it.each(['en', 'ja', 'ko', 'zh'] as const)('%s: over two weeks, the mood is always the score’s', async (lng) => {
    const wrong: string[] = [];
    for (let day = 14; day <= 27; day++) {
      await renderOn(lng, day);
      const { score, mood } = readCard();
      if (bandOf(lng, mood) !== bandOfScore(score)) wrong.push(`10-${day}: ${score}/5 “${mood}”`);
      cleanup();
    }
    expect(wrong).toEqual([]);
  });

  // Needs the p10 locale delta (horoscope.cardOfTheDay).
  it.each([
    ['en', /\bsign\b/i],
    ['ja', /星座/],
    ['ko', /별자리/],
    ['zh', /星座/],
  ] as const)('%s: the card’s heading names it the sign’s, not the member’s', async (lng, signWord) => {
    await renderOn(lng, 20);
    const heading = app(lng).horoscope.cardOfTheDay as string;
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    expect(heading).toMatch(signWord);
    expect(heading).not.toBe(app(lng).home.ritualCards.yourCard);
  });
});
