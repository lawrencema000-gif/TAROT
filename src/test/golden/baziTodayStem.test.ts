import { describe, it, expect, afterEach } from 'vitest';
import { computeBazi, dayStemOn, todaysLuckyColor } from '../../data/bazi';

/**
 * WP-P2-12 (eastern-08, premium-06): "Today's lucky colour" took 1984-02-02 as
 * a 甲 day (it was 丙寅) — two stems off — and read the UTC date, so in Japan
 * the day turned at 09:00. The day stem now comes from the member's own
 * calendar day through the calibrated day-pillar code.
 *
 * Reference day pillars: lunar-javascript 1.7.3.
 */
const TZ = process.env.TZ;
afterEach(() => {
  process.env.TZ = TZ;
});

describe('dayStemOn', () => {
  it.each([
    [1984, 1, 31, 'Jia'], // 甲子
    [1984, 2, 2, 'Bing'], // 丙寅
    [2001, 6, 8, 'Ren'], // 壬寅
    [2026, 11, 6, 'Jia'], // 甲申
    [2026, 11, 14, 'Ren'], // 壬辰
    [2026, 11, 15, 'Gui'], // 癸巳
  ] as const)('%i-%i-%i → %s', (y, m, d, stem) => {
    expect(dayStemOn(new Date(y, m - 1, d, 12))).toBe(stem);
  });

  it('Tokyo: 08:30 JST on the 15th is already the 15th (UTC would still say the 14th)', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(dayStemOn(new Date('2026-11-14T23:30:00Z'))).toBe('Gui');
  });

  it('Los Angeles: 21:00 PST on the 14th is still the 14th', () => {
    process.env.TZ = 'America/Los_Angeles';
    expect(dayStemOn(new Date('2026-11-15T05:00:00Z'))).toBe('Ren');
  });
});

describe('todaysLuckyColor', () => {
  const waterDay = () => new Date(2026, 10, 15, 12); // 癸巳
  const woodDay = () => new Date(2026, 10, 6, 12); // 甲申

  it('Water day, favourable Metal → neutral, earth (the supporting element)', () => {
    const c = todaysLuckyColor(computeBazi('2001-11-23', '12:00')!, waterDay());
    expect([c.alignment, c.element]).toEqual(['neutral', 'earth']);
  });
  it('Water day, favourable Water → doubled, water', () => {
    const c = todaysLuckyColor(computeBazi('1975-06-15', '12:00')!, waterDay());
    expect([c.alignment, c.element]).toEqual(['doubled', 'water']);
  });
  it('Water day, favourable Wood → favorable, wood', () => {
    const c = todaysLuckyColor(computeBazi('1992-08-07', '12:00')!, waterDay());
    expect([c.alignment, c.element]).toEqual(['favorable', 'wood']);
  });
  it('Wood day, favourable Fire → favorable, fire ("Red carries you today")', () => {
    const c = todaysLuckyColor(computeBazi('1991-03-08', '06:45')!, woodDay());
    expect([c.alignment, c.element]).toEqual(['favorable', 'fire']);
    expect(c.oneLiner).toContain('carries you today');
  });
});
