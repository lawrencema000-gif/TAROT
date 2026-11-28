import { describe, it, expect, vi, afterAll, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/*
 * WP-P2-10 (home-astro-10): "Tonight's Moon" prints the real Moon. At
 * 2026-11-14 15:04 UTC it said "day 4.7" and "Next: First quarter in 0.8
 * days"; the real age was 5.3 days and the First Quarter 2.9 days away
 * (USNO: 2026-11-17 11:48 UT). On a principal-phase day the card never
 * names the phase it shows as "next".
 */

const moon = vi.hoisted(() => ({ forceNull: false }));
vi.mock('../../data/moonPhases', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../data/moonPhases')>();
  return {
    ...real,
    getMoonPhase: (...args: Parameters<typeof real.getMoonPhase>) => (moon.forceNull ? null : real.getMoonPhase(...args)),
  };
});

import i18n from '../../i18n/config';
import { MoonPhaseCard } from './MoonPhaseCard';

const ORIGINAL_TZ = process.env.TZ;

async function cardAt(lng: string, timeZone: string, iso: string) {
  process.env.TZ = timeZone;
  vi.setSystemTime(new Date(iso));
  await i18n.changeLanguage(lng);
  return render(<MoonPhaseCard />).container;
}

beforeEach(() => {
  moon.forceNull = false;
  vi.useFakeTimers({ toFake: ['Date'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('Tonight’s Moon card', () => {
  it('en, 2026-11-14 15:04 UTC: the audit instant reads the real Moon', async () => {
    const c = await cardAt('en', 'UTC', '2026-11-14T15:04:03Z');
    expect(c.querySelector('h3')?.textContent).toBe('Waxing crescent');
    expect(c.textContent).toContain('24% illuminated · day 5.3 of ~29.5');
    expect(c.textContent).toContain('Next: First quarter in 2.9 days');
  });

  it('ja, same instant', async () => {
    const c = await cardAt('ja', 'UTC', '2026-11-14T15:04:03Z');
    expect(c.querySelector('h3')?.textContent).toBe('三日月（上弦前）');
    expect(c.textContent).toContain('24%の光 · 約29.5日のうち5.3日目');
    expect(c.textContent).toContain('次：2.9日後に上弦の月');
  });

  it('en, Tokyo on its First Quarter day: next is the Full moon, not the phase shown', async () => {
    const c = await cardAt('en', 'Asia/Tokyo', '2026-11-17T03:00:00Z');
    expect(c.querySelector('h3')?.textContent).toBe('First quarter');
    expect(c.textContent).toContain('47% illuminated · day 7.8 of ~29.5');
    expect(c.textContent).toContain('Next: Full moon in 7.5 days');
    expect(c.textContent).not.toContain('Next: First quarter');
  });

  it('renders nothing when the ephemeris fails', async () => {
    moon.forceNull = true;
    const c = await cardAt('en', 'UTC', '2026-11-14T15:04:03Z');
    expect(c.innerHTML).toBe('');
  });
});
