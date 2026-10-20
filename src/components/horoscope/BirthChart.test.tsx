import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';

/*
 * p9 QZ-3: Zodiac Scholar counts the Astrology guide's sign pages
 * (/astrology/<sign>), and the Big Three — the three signs a member reads
 * first — led nowhere. Each expanded row now opens its sign's page, as the
 * best matches in Compatibility do (CompatibilityBestMatches.test.tsx).
 * The card itself was the toggle (role="button"), and a link inside a button
 * is presentational to assistive tech, so the toggle is now a real button
 * that says whether it is open, and the links sit outside it.
 */

type Chart = {
  natalChart: {
    planets: never[];
    houses: number[];
    ascendant: number | null;
    bigThree: {
      sun: { sign: string; degree: number; house: number | null };
      moon: { sign: string; degree: number; house: number | null };
      rising: { sign: string; degree: number } | null;
    };
    aspects: never[];
    dominants: null;
    chartMode: string;
  };
};

const chartWith = (rising: string | null): Chart => ({
  natalChart: {
    planets: [],
    houses: [],
    ascendant: rising ? 130 : null,
    bigThree: {
      sun: { sign: 'Aries', degree: 11, house: 10 },
      moon: { sign: 'Cancer', degree: 3, house: 1 },
      rising: rising ? { sign: rising, degree: 22 } : null,
    },
    aspects: [],
    dominants: null,
    chartMode: rising ? 'full' : 'no-time',
  },
});

let chart: Chart = chartWith('Sagittarius');
vi.mock('../../hooks/useAstrology', () => ({
  useNatalChart: () => ({ chart, loading: false, error: null, fetchChart: () => {} }),
}));
vi.mock('./birthZone', () => ({ useBirthTzBackfill: () => {} }));
vi.mock('../chart/ChartWheel', () => ({ ChartWheel: () => <div data-testid="wheel" /> }));

import i18n from '../../i18n/config';
import { localizeSignName } from '../../i18n/localizeNames';
import { BirthChart } from './BirthChart';

function SignPage() {
  const { slug } = useParams();
  return <p>sign page: {slug}</p>;
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/horoscope']}>
      <Routes>
        <Route path="/horoscope" element={<BirthChart />} />
        <Route path="/astrology/:slug" element={<SignPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The Big Three's toggle: the button named by its heading. */
const toggle = (title: string | RegExp) => screen.getByRole('button', { name: title });

/** Open the Big Three and wait for its rows (the interpretations load lazily). */
async function openBigThree(title: string | RegExp) {
  fireEvent.click(toggle(title));
  return screen.findAllByRole('link', undefined, { timeout: 5000 });
}

afterEach(() => cleanup());

describe('the Big Three open the Astrology guide (p9 QZ-3)', { timeout: 20_000 }, () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('the toggle is a real button that says whether it is open; the card is not a button', async () => {
    chart = chartWith('Sagittarius');
    const { container } = mount();
    const button = toggle(/Your Big Three/);
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    // The summary still reads the three signs, once each (the glyphs beside
    // the names are hidden). jsdom has no layout, so the flex spans that a
    // browser separates run together here: whitespace is not under test.
    expect(button).toHaveAccessibleName(/^Your Big Three\s*Sun\s*Aries\s*Moon\s*Cancer\s*Rising\s*Sagittarius$/);
    // No other element plays a button around the summary (the card used to).
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    const links = await openBigThree(/Your Big Three/);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    // Every link sits outside the button, in the panel the button controls.
    const panel = document.getElementById(button.getAttribute('aria-controls')!);
    expect(panel).not.toBeNull();
    for (const a of links) {
      expect(button.contains(a)).toBe(false);
      expect(panel!.contains(a)).toBe(true);
    }
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('each expanded row links its sign’s guide page, by the lowercase English id', async () => {
    chart = chartWith('Sagittarius');
    mount();
    const links = await openBigThree(/Your Big Three/);
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Aries', '/astrology/aries'],
      ['Cancer', '/astrology/cancer'],
      ['Sagittarius', '/astrology/sagittarius'],
    ]);
  });

  it('no birth time, no rising sign: two rows, two links', async () => {
    chart = chartWith(null);
    mount();
    const links = await openBigThree(/Your Big Three/);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/astrology/aries', '/astrology/cancer']);
  });

  it('a tap opens the sign’s page inside the app', async () => {
    chart = chartWith('Sagittarius');
    mount();
    await openBigThree(/Your Big Three/);
    fireEvent.click(screen.getByRole('link', { name: 'Cancer' }));
    expect(screen.getByText('sign page: cancer')).toBeInTheDocument();
  });
});

describe('in Japanese', { timeout: 20_000 }, () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ja');
  });
  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('the links read the Japanese sign names and go to the same pages', async () => {
    chart = chartWith('Leo');
    mount();
    const title = i18n.t('app:horoscope.birthChartView.yourBigThree');
    expect(title).toBe('あなたのビッグスリー');
    expect(toggle(new RegExp(title))).toHaveAttribute('aria-expanded', 'false');
    const links = await openBigThree(new RegExp(title));
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      [localizeSignName('Aries'), '/astrology/aries'],
      [localizeSignName('Cancer'), '/astrology/cancer'],
      [localizeSignName('Leo'), '/astrology/leo'],
    ]);
    for (const a of links) expect(a.textContent).not.toMatch(/[A-Za-z]/);
    // Each link sits under its row's own heading line (「牡羊座の太陽」…).
    const row = links[0].closest('[data-big-three-row]') as HTMLElement;
    expect(within(row).getByText(i18n.t('app:horoscope.birthChartView.planetInSign', {
      planet: i18n.t('app:horoscope.birthChartView.sun'),
      sign: localizeSignName('Aries'),
    }))).toBeInTheDocument();
  });
});
