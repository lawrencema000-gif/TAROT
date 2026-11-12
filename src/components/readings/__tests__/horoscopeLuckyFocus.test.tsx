import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';

/*
 * The sun-sign horoscope's lucky focus in Japanese (polish 2026-11): the
 * colour sat in a third of the card, 68px of text at 390px and 58px at 360px,
 * and a katakana colour is one word at 15px a letter, so アイボリー (75px)
 * broke as アイボ/リー. The colour has the card's width to itself now (276px,
 * 246px at 360px) and the number and the vibe share the row under it, the
 * three still one grid of the same tiles. jsdom measures nothing, so this
 * pins the structure that arithmetic rests on, and the length of every colour
 * the horoscope can draw.
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
import { generateDailyHoroscope } from '../../../data/horoscopes';
import type { ZodiacSign } from '../../../types';
import { HoroscopeSection } from '../HoroscopeSection';

const LANGS = ['en', 'ja', 'ko', 'zh'] as const;
const SIGNS: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

const classes = (el: Element) => el.className.split(/\s+/);

/** A lucky tile: the box around a label ("Color") and its value. */
function tile(labelKey: string): HTMLElement {
  return screen.getByText(i18n.t(`app:horoscope.luckyLabels.${labelKey}`)).parentElement!;
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

describe('HoroscopeSection (sun sign): the lucky focus', () => {
  it.each(LANGS)('%s: the colour has a row of its own, the number and the vibe share the next', async (lng) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    render(<HoroscopeSection onShowPaywall={() => {}} />);
    const colour = tile('color');
    const number = tile('number');
    const vibe = tile('vibe');
    const grid = colour.parentElement!;

    // One group: the three tiles, in reading order, in one two-column grid.
    expect([...grid.children]).toEqual([colour, number, vibe]);
    expect(classes(grid)).toEqual(expect.arrayContaining(['grid', 'grid-cols-2', 'gap-3']));
    expect(classes(grid)).not.toContain('grid-cols-3');
    // The colour spans both columns; the number and the vibe take one each.
    expect(classes(colour)).toContain('col-span-2');
    for (const t of [number, vibe]) expect(classes(t).filter((c) => c.startsWith('col-span'))).toEqual([]);
    // The same tiles as before.
    for (const t of [colour, number, vibe]) {
      expect(classes(t)).toEqual(expect.arrayContaining(['text-center', 'p-3', 'bg-mystic-800/30', 'rounded-control']));
    }
    expect(classes(colour.querySelectorAll('p')[1])).toEqual(expect.arrayContaining(['keep-phrases', 'text-ui']));
  });

  /*
   * The row's text is 246px at 360px, 229px with the larger reading size
   * (17.25px a letter): 13 letters, none wider than 1em (a kana, a Hangul
   * syllable, a hanzi; Inter's W is 1.003em). The longest today is
   * オブシディアン, 7.
   */
  it.each(LANGS)('%s: every colour the horoscope can draw fits the row', async (lng) => {
    await act(async () => { await i18n.changeLanguage(lng); });
    const drawn = new Set<string>();
    for (const sign of SIGNS) {
      for (let d = 0; d < 120; d++) {
        drawn.add(generateDailyHoroscope(sign, new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10)).luckyColor);
      }
    }
    expect(drawn.size).toBeGreaterThan(1);
    expect([...drawn].filter((c) => [...c].length > 13)).toEqual([]);
  });
});
