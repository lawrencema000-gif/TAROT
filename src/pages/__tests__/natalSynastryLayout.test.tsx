import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { render, screen, act, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * p9 R33: the Synastry tab's partner date and time sat in a `flex gap-2`
 * row. A native date input keeps its intrinsic width as a flex item
 * (min-width:auto — 166 px in Chromium, the time input 134 px), so the row
 * needed 166 + 8 + 134 = 308 px in a box of 300 px at 390 and 270 px at
 * 360: the time field stuck out of the card and the page scrolled sideways.
 * And the ja cross-aspect row broke inside a katakana word
 * (「相手の金星とあなたの火星がトラ / イン」).
 *
 * jsdom lays nothing out, so what decides the layout is checked: the row
 * wraps; each input's base size is its own width ('auto', not flex-1's 0%),
 * so the time field takes the next line as soon as the two do not fit; and
 * neither keeps a minimum wider than the box (min-w-0), so neither can push
 * the page wider. The aspect row is a phrase-breaking label.
 */

const USER = { id: '00000000-0000-4000-8000-0000000000a9', email: 'qa@example.com' };
const invoke = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: USER, profile: { birthDate: '1990-04-01', isPremium: true, displayName: 'QA' } }),
}));
vi.mock('../../context/FeatureFlagContext', () => ({ useFeatureFlag: (key: string) => key === 'chart-variants' }));
vi.mock('../../hooks/useAstrology', () => ({
  useNatalChart: () => ({
    chart: {
      natalChart: {
        planets: [
          { planet: 'Sun', sign: 'Aries', degree: 11, longitude: 11, house: 1 },
          { planet: 'Moon', sign: 'Taurus', degree: 4, longitude: 34, house: 2 },
        ],
        houses: [],
        ascendant: null,
        bigThree: { sun: { sign: 'Aries', degree: 11, house: 1 }, moon: { sign: 'Taurus', degree: 4, house: 2 }, rising: null },
        aspects: [],
        dominants: { elements: { Fire: 1, Earth: 1, Air: 0, Water: 0 }, modalities: { Cardinal: 1, Fixed: 1, Mutable: 0 }, chartRuler: null, dominantPlanets: [] },
        chartMode: 'approximate',
      },
    },
    loading: false,
    fetchChart: vi.fn(),
  }),
}));
vi.mock('../../components/horoscope/birthZone', () => ({ useBirthTzBackfill: () => {} }));
vi.mock('../../dal', () => ({
  reportUnlocks: { isUnlocked: vi.fn().mockResolvedValue({ ok: true, data: true }) },
  moonstones: { getBalance: vi.fn().mockResolvedValue({ ok: true, data: 0 }) },
}));
vi.mock('../../lib/supabase', () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock('../../hooks/useMoonstoneSpend', () => ({ useMoonstoneSpend: () => ({ tryConsume: async () => true, refund: vi.fn(), EarnSheet: null }) }));
vi.mock('../../components/chart/ChartWheel', () => ({ ChartWheel: () => null }));
vi.mock('../../components/premium', () => ({ PaywallSheet: () => null, WatchAdSheet: () => null }));
vi.mock('../../components/moonstones/useAdCreditsLeft', () => ({ useCanOfferAd: () => false }));
vi.mock('../../utils/platform', () => ({ isNative: () => false }));

import i18n from '../../i18n/config';
import { NatalChartReportPage } from '../NatalChartReportPage';

const classes = (el: Element) => el.className.split(/\s+/);

describe('Natal report → Synastry: the partner row fits its box (p9 R33)', () => {
  beforeEach(() => {
    cleanup();
    invoke.mockReset().mockResolvedValue({
      data: {
        partnerPositions: [{ planet: 'Venus', sign: 'Leo', degree: 3, longitude: 123 }],
        crossAspects: [{ partnerPlanet: 'Venus', natalPlanet: 'Mars', type: 'trine', orb: 1.2 }],
      },
      error: null,
    });
  });
  afterAll(async () => {
    cleanup();
    await i18n.changeLanguage('en');
  });

  it('ja: the date and time wrap instead of overflowing, and an aspect row breaks between phrases', async () => {
    await act(async () => { await i18n.changeLanguage('ja'); });
    const { container } = render(
      <MemoryRouter>
        <NatalChartReportPage />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('tab', { name: 'シナストリー' }));
    const date = container.querySelector('input[type="date"]')!;
    const time = container.querySelector('input[type="time"]')!;
    expect(date).toBeTruthy();
    expect(time.parentElement).toBe(date.parentElement);

    const row = classes(date.parentElement!);
    expect(row).toContain('flex');
    expect(row).toContain('flex-wrap');
    for (const input of [date, time]) {
      const c = classes(input);
      expect(c).toContain('min-w-0');
      // A base size of its own width: flex-1 (a 0% basis) never wraps once min-w-0 lets it shrink.
      expect(c.some((k) => /^flex-\[\d+_\d+_auto\]$/.test(k))).toBe(true);
      expect(c).not.toContain('flex-1');
    }

    fireEvent.change(date, { target: { value: '1992-08-20' } });
    fireEvent.click(screen.getByRole('button', { name: '相手のチャートを重ねる' }));
    const aspect = await screen.findByText(/^相手の.+とあなたの.+が.+$/);
    expect(classes(aspect)).toContain('keep-phrases');
    expect(invoke).toHaveBeenCalledWith('astrology-synastry', expect.anything());
  });
});
