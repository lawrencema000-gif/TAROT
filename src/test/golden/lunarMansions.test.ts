import { describe, it, expect } from 'vitest';
import {
  MANSIONS, MANSION_BY_KEY, MANSION_ANCHOR, MANSION_ACTIVITIES,
  QUADRANT_INFO, PLANET7_INFO, SUKUYO_27,
  mansionForDate, mansionForBirth, sukuyoMansionForBirth,
  type MansionKey,
} from '../../data/lunarMansions';
import { MANSION_MEANINGS, MANSION_DAILY_ADVICE, QUADRANT_MEANINGS } from '../../data/lunarMansionsContent';

/**
 * Golden tests for the 二十八宿.
 *
 * The 值日 cycle is a bare count of days from an anchor, which on its own is
 * unfalsifiable — pick the wrong anchor and every date is wrong by the same
 * amount, silently. What makes it testable is that 28 = 4 × 7, so the cycle is
 * phase-locked to the seven-day week and a mansion's 七曜 IS its weekday. Any
 * single almanac day can therefore refute the whole table, and the weekday lock
 * below checks the phase over 4,000 consecutive days.
 */

const CST_OFFSET_MS = 8 * 3600 * 1000;
const cstWeekday = (d: Date) => new Date(d.getTime() + CST_OFFSET_MS).getUTCDay();

describe('the 28 mansions', () => {
  it('has exactly 28, in four quadrants of seven', () => {
    expect(MANSIONS).toHaveLength(28);
    for (const q of ['azureDragon', 'blackTortoise', 'whiteTiger', 'vermilionBird'] as const) {
      expect([q, MANSIONS.filter((m) => m.quadrant === q)]).toEqual([q, expect.any(Array)]);
      expect(MANSIONS.filter((m) => m.quadrant === q)).toHaveLength(7);
    }
  });

  it('opens with 角 and runs the canonical order', () => {
    // 角亢氐房心尾箕 · 斗牛女虛危室壁 · 奎婁胃昴畢觜參 · 井鬼柳星張翼軫
    const CANON = '角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫';
    expect(MANSIONS.map((m) => m.cn).join('')).toBe(CANON);
  });

  it('keeps keys unique and consistent with the lookup', () => {
    const keys = MANSIONS.map((m) => m.key);
    expect(new Set(keys).size).toBe(28);
    for (const m of MANSIONS) expect(MANSION_BY_KEY[m.key]).toBe(m);
  });

  it('groups the quadrants in blocks of seven, in order', () => {
    const order = ['azureDragon', 'blackTortoise', 'whiteTiger', 'vermilionBird'];
    for (let i = 0; i < 28; i++) {
      expect([i, MANSIONS[i].quadrant]).toEqual([i, order[Math.floor(i / 7)]]);
    }
    expect(Object.keys(QUADRANT_INFO)).toHaveLength(4);
  });

  it('assigns the 七曜 in a repeating seven-cycle', () => {
    // 日月火水木金土 repeats four times over the 28, which is exactly why the
    // cycle locks to the week.
    for (let i = 0; i < 28; i++) {
      expect([i, MANSIONS[i].planet]).toEqual([i, MANSIONS[i % 7].planet]);
    }
    expect(new Set(MANSIONS.map((m) => m.planet)).size).toBe(7);
    expect(Object.keys(PLANET7_INFO)).toHaveLength(7);
  });

  it('splits 吉 and 凶 fourteen apiece', () => {
    // The mainstream 通勝 binary split: 吉 = 角房尾箕斗室壁婁胃畢參井張軫.
    const auspicious = MANSIONS.filter((m) => m.fortune === 'auspicious').map((m) => m.cn).join('');
    expect(auspicious).toBe('角房尾箕斗室壁婁胃畢參井張軫');
    expect(MANSIONS.filter((m) => m.fortune === 'inauspicious')).toHaveLength(14);
  });
});

describe('值日 — the day-governing cycle', () => {
  it('returns the anchor mansion on the anchor date', () => {
    const anchor = mansionForDate(new Date(`${MANSION_ANCHOR.date}T04:00:00Z`))!;
    expect(anchor).not.toBeNull();
    expect(anchor.key).toBe(MANSION_ANCHOR.mansionKey);
  });

  it('advances exactly one mansion per day and wraps 28 → 1', () => {
    const start = new Date('2026-08-20T04:00:00Z');
    for (let i = 0; i < 60; i++) {
      const today = mansionForDate(new Date(start.getTime() + i * 86400000))!;
      const expected = MANSIONS[i % 28];
      expect([i, today.cn]).toEqual([i, expected.cn]);
    }
  });

  it('repeats every 28 days, forwards and backwards', () => {
    const d = new Date('2001-06-08T04:00:00Z');
    expect(mansionForDate(d)!.key).toBe(mansionForDate(new Date(d.getTime() + 28 * 86400000))!.key);
    expect(mansionForDate(d)!.key).toBe(mansionForDate(new Date(d.getTime() - 28 * 86400000))!.key);
    // …and 28 × 968 days, the long-interval case the cycle's continuity rests on.
    expect(mansionForDate(d)!.key)
      .toBe(mansionForDate(new Date(d.getTime() - 27104 * 86400000))!.key);
  });

  /**
   * THE INVARIANT. 28 = 4 × 7, so the mansion's 七曜 must equal the CST weekday
   * for every day, forever. A one-day error in the anchor breaks this on the
   * very first date tested.
   */
  it('keeps the 七曜 locked to the weekday over 4,000 consecutive days', () => {
    const PLANET_WEEKDAY: Record<string, number> = {
      sun: 0, moon: 1, fire: 2, water: 3, wood: 4, metal: 5, earth: 6,
    };
    const start = new Date('2015-01-01T04:00:00Z');
    for (let i = 0; i < 4000; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const m = mansionForDate(d)!;
      expect([i, PLANET_WEEKDAY[m.planet]]).toEqual([i, cstWeekday(d)]);
    }
  });

  it('matches the published corroborating almanac day', () => {
    // 1998-03-15 (Sunday) = 房宿 / 房日兔 — a second attested day, 10,385 days
    // before the anchor and in a different century.
    const m = mansionForDate(new Date('1998-03-15T04:00:00Z'))!;
    expect(m.cn).toBe('房');
    expect(m.planet).toBe('sun');
    expect(cstWeekday(new Date('1998-03-15T04:00:00Z'))).toBe(0);
  });

  it('returns null for an Invalid Date rather than an undefined Mansion', () => {
    expect(mansionForDate(new Date('nonsense'))).toBeNull();
    expect(mansionForDate(new Date(NaN))).toBeNull();
  });
});

describe('本命宿 — birth mansion', () => {
  it('agrees with the 值日 reading for the same day', () => {
    expect(mansionForBirth('1998-03-15', '12:00')!.cn).toBe('房');
    expect(mansionForBirth('2026-08-20')!.key).toBe(MANSION_ANCHOR.mansionKey);
  });

  it('works with no birth time, and with a null one', () => {
    expect(mansionForBirth('1998-03-15')).not.toBeNull();
    // Profiles carry `null` for users who never entered a time; a strict
    // `!== undefined` check used to make the whole reading vanish for them.
    expect(mansionForBirth('1998-03-15', null as unknown as undefined)).not.toBeNull();
    expect(mansionForBirth('1998-03-15', '')).not.toBeNull();
  });

  it('rejects malformed input rather than guessing', () => {
    expect(mansionForBirth('not-a-date')).toBeNull();
    expect(mansionForBirth('1998-3-15')).toBeNull();
    expect(mansionForBirth('1998-02-30')).toBeNull();   // Date.UTC would roll this forward
    expect(mansionForBirth('1998-13-01')).toBeNull();
    expect(mansionForBirth('1998-03-15', '25:00')).toBeNull();
  });

  it('never returns undefined across a century of dates', () => {
    for (let y = 1930; y <= 2035; y += 3) {
      for (const md of ['01-01', '02-28', '06-15', '12-31']) {
        const m = mansionForBirth(`${y}-${md}`, '08:00');
        expect([y, md, m?.cn]).toEqual([y, md, expect.any(String)]);
      }
    }
  });
});

describe('宿曜 — the secondary sukuyō reading', () => {
  it('uses 27 mansions, omitting 牛', () => {
    expect(SUKUYO_27).toHaveLength(27);
    expect(SUKUYO_27).not.toContain('niu');
    expect(new Set(SUKUYO_27).size).toBe(27);
  });

  it('matches a published worked example', () => {
    // 1986-10-19 is lunar 9/16; the 九月 朔日宿 is 氐, so (2 + 16 - 1) mod 27
    // = 17 → 畢宿.
    expect(sukuyoMansionForBirth('1986-10-19', '12:00')!.cn).toBe('畢');
  });

  it('stays a separate reading — it must not silently equal the 值日 one', () => {
    let differ = 0;
    for (let y = 1980; y <= 2020; y += 2) {
      const a = mansionForBirth(`${y}-06-15`, '12:00');
      const b = sukuyoMansionForBirth(`${y}-06-15`, '12:00');
      if (a && b && a.key !== b.key) differ++;
    }
    expect(differ).toBeGreaterThan(0);
  });

  it('rejects malformed input', () => {
    expect(sukuyoMansionForBirth('not-a-date')).toBeNull();
  });
});

describe('content — every mansion is readable', () => {
  const KEYS = MANSIONS.map((m) => m.key) as MansionKey[];

  it('has meanings, daily advice and activities for all 28', () => {
    for (const k of KEYS) {
      expect([k, !!MANSION_MEANINGS[k]]).toEqual([k, true]);
      expect([k, !!MANSION_DAILY_ADVICE[k]]).toEqual([k, true]);
      expect([k, !!MANSION_ACTIVITIES[k]]).toEqual([k, true]);
    }
  });

  it('carries no placeholder or empty text', () => {
    for (const k of KEYS) {
      expect(MANSION_MEANINGS[k].text.length).toBeGreaterThan(80);
      expect(MANSION_MEANINGS[k].title.length).toBeGreaterThan(2);
      expect(MANSION_DAILY_ADVICE[k].length).toBeGreaterThan(20);
      expect(MANSION_MEANINGS[k].cn).toBe(MANSION_BY_KEY[k].cn);
    }
  });

  it('gives each mansion its own distinct daily line', () => {
    expect(new Set(KEYS.map((k) => MANSION_DAILY_ADVICE[k])).size).toBe(28);
    expect(new Set(KEYS.map((k) => MANSION_MEANINGS[k].title)).size).toBe(28);
  });

  it('covers the four quadrants', () => {
    for (const q of ['azureDragon', 'blackTortoise', 'whiteTiger', 'vermilionBird'] as const) {
      expect([q, !!QUADRANT_MEANINGS[q]]).toEqual([q, true]);
    }
  });

  it('keeps the deliberately-empty 宜 lists empty', () => {
    // 昴, 翼 and 虛 are 百事皆凶 in the primary source, and 牛 has no itemised 宜.
    // Each of these was, or nearly was, filled with an invented recommendation.
    for (const k of ['mao', 'yi', 'xu', 'niu'] as MansionKey[]) {
      expect([k, MANSION_ACTIVITIES[k].favourable]).toEqual([k, []]);
    }
  });

  it('never lists the same activity as both favourable and unfavourable', () => {
    for (const k of KEYS) {
      const { favourable, unfavourable } = MANSION_ACTIVITIES[k];
      const overlap = favourable.filter((f) => unfavourable.includes(f));
      expect([k, overlap]).toEqual([k, []]);
    }
  });
});
