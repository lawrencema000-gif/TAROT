import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { ChartWheel } from './ChartWheel';
import type { WheelChart } from '../../types/astrology';

// A t() that honours defaultValue and {{interpolation}}, so the assertions
// read the same English a user would until the keys are merged. The keys
// the wheel reuses from the horoscope namespace already exist in en/app.json
// and so carry no defaultValue; they are spelled out here.
const EXISTING: Record<string, string> = {
  'horoscope.birthChartView.planetInSign': '{{planet}} in {{sign}}',
  'horoscope.birthChartView.applying': 'Applying',
  'horoscope.birthChartView.separating': 'Separating',
  'horoscope.birthChartView.elements.Fire': 'Fire',
  'horoscope.birthChartView.elements.Earth': 'Earth',
  'horoscope.birthChartView.elements.Air': 'Air',
  'horoscope.birthChartView.elements.Water': 'Water',
};
vi.mock('../../i18n/useT', () => ({
  useT: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      let s = typeof opts?.defaultValue === 'string' ? opts.defaultValue : (EXISTING[key] ?? key);
      for (const [k, v] of Object.entries(opts ?? {})) s = s.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      return s;
    },
  }),
}));

/** ASC at 15° Aries, a three-planet stellium on the Ascendant, one retrograde, no Jupiter longitude. */
const chart: WheelChart = {
  ascendant: 15,
  houses: Array.from({ length: 12 }, (_, i) => (15 + i * 30) % 360),
  planets: [
    { planet: 'Sun', sign: 'Aries', degree: 15, longitude: 15, house: 1 },
    { planet: 'Moon', sign: 'Aries', degree: 17, longitude: 17, house: 1 },
    { planet: 'Mercury', sign: 'Aries', degree: 19, longitude: 19, house: 1 },
    { planet: 'Venus', sign: 'Libra', degree: 5, longitude: 185, house: 7, retrograde: true },
    { planet: 'Mars', sign: 'Cancer', degree: 10, longitude: 100, house: 3 },
    { planet: 'Jupiter', sign: 'Leo', degree: 10, house: 4 },
    { planet: 'Saturn', sign: 'Capricorn', degree: 0, longitude: 270, house: 9 },
    { planet: 'Uranus', sign: 'Aquarius', degree: 0, longitude: 300, house: 10 },
    { planet: 'Neptune', sign: 'Pisces', degree: 0, longitude: 330, house: 11 },
    { planet: 'Pluto', sign: 'Sagittarius', degree: 0, longitude: 240, house: 8 },
  ],
  aspects: [
    { planet1: 'Sun', planet2: 'Moon', type: 'conjunction', orb: 2, applying: true },
    { planet1: 'Sun', planet2: 'Venus', type: 'opposition', orb: 6, applying: false },
    { planet1: 'Mars', planet2: 'Sun', type: 'square', orb: 5, applying: true },
  ],
};

describe('ChartWheel', () => {
  it('renders every planet as a labelled button in a group, with nothing NaN', () => {
    const { container } = render(<ChartWheel chart={chart} />);
    expect(container.innerHTML).not.toContain('NaN');
    const group = screen.getByRole('group', { name: 'Natal chart wheel' });
    const coins = within(group).getAllByRole('button');
    expect(coins).toHaveLength(10);
    expect(within(group).getByRole('button', { name: 'Venus in Libra, 5°, house 7, Retrograde' })).toBeTruthy();
    // Jupiter had no longitude and still landed on the wheel (sign + degree).
    expect(within(group).getByRole('button', { name: 'Jupiter in Leo, 10°, house 4' })).toBeTruthy();
  });

  it('selects a planet on click and says so in the live panel', () => {
    render(<ChartWheel chart={chart} />);
    const group = screen.getByRole('group', { name: 'Natal chart wheel' });
    const sun = within(group).getByRole('button', { name: /^Sun in Aries/ });
    fireEvent.click(sun);
    expect(sun.getAttribute('aria-pressed')).toBe('true');
    const panel = document.querySelector('[aria-live="polite"]')!;
    expect(panel.textContent).toContain('Sun in Aries');
    expect(panel.textContent).toContain('House 1');
    expect(panel.textContent).toContain('Self and identity');
    // Second tap clears.
    fireEvent.click(sun);
    expect(sun.getAttribute('aria-pressed')).toBe('false');
  });

  it('answers Enter and Space, and offers the host action when given one', () => {
    const onOpenPlanet = vi.fn();
    render(<ChartWheel chart={chart} onOpenPlanet={onOpenPlanet} />);
    const group = screen.getByRole('group', { name: 'Natal chart wheel' });
    const venus = within(group).getByRole('button', { name: /^Venus/ });
    fireEvent.keyDown(venus, { key: 'Enter' });
    expect(venus.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Read the full interpretation' }));
    expect(onOpenPlanet).toHaveBeenCalledWith(expect.objectContaining({ planet: 'Venus', retrograde: true }));
    fireEvent.keyDown(venus, { key: ' ' });
    expect(venus.getAttribute('aria-pressed')).toBe('false');
  });

  it('lists only the aspect types drawn and lets the orb filter change that', () => {
    const { container } = render(<ChartWheel chart={chart} />);
    const hitLines = () => container.querySelectorAll('line[stroke="transparent"]').length;
    expect(hitLines()).toBe(3);
    expect(container.querySelectorAll('ul li')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Tight orbs (1)' }));
    expect(hitLines()).toBe(1);
    expect(container.querySelectorAll('ul li')).toHaveLength(1);
    expect(container.textContent).toContain('Conjunction');
    expect(container.textContent).not.toContain('Opposition');
  });

  it('draws twelve 30° sign sectors — no large-arc flag anywhere in the sign ring', () => {
    const { container } = render(<ChartWheel chart={chart} />);
    const sectors = [...container.querySelectorAll('path[d^="M"]')]
      .map((p) => p.getAttribute('d') ?? '')
      .filter((d) => d.includes('A 156 156'));
    expect(sectors).toHaveLength(12);
    for (const d of sectors) expect(d).not.toMatch(/A 156 156 0 1/);
  });
});
