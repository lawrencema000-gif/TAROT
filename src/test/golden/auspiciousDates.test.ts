import { describe, it, expect } from 'vitest';
import {
  INTENTIONS, scoreDay, scoreWindow, bestDays, daysToAvoid, toICS,
  clashes, combines, sameFrame, type Intention,
} from '../../data/auspiciousDates';
import { MANSIONS, MANSION_ACTIVITIES, mansionForBirth, type MansionKey } from '../../data/lunarMansions';
import { computeBazi, BRANCHES } from '../../data/bazi';

/**
 * Golden tests for 擇日, the good-day finder.
 *
 * The scoring is a transparent additive tally rather than an oracle, so what
 * matters is that every input is real: the intentions must map onto activity
 * strings the mansion tables actually contain (a rename would otherwise leave
 * an intention silently matching nothing), and the branch relations must be the
 * classical sets rather than something plausible.
 */

const CN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const B = (cn: string) => BRANCHES[CN.indexOf(cn)];
const ALL_INTENTIONS = Object.keys(INTENTIONS) as Intention[];

describe('intentions map onto activities that really exist', () => {
  it('every activity string appears in at least one mansion table', () => {
    // This is the guard that matters: if a mansion table is edited and an
    // activity renamed, the intention keeps working but matches nothing, and
    // the feature degrades silently into "no guidance" for everyone.
    const known = new Set<string>();
    for (const m of MANSIONS) {
      const a = MANSION_ACTIVITIES[m.key as MansionKey];
      a.favourable.forEach((x) => known.add(x));
      a.unfavourable.forEach((x) => known.add(x));
    }
    for (const key of ALL_INTENTIONS) {
      for (const activity of INTENTIONS[key].activities) {
        expect([key, activity, known.has(activity)]).toEqual([key, activity, true]);
      }
    }
  });

  it('gives every intention a label, a Chinese name and a blurb', () => {
    for (const key of ALL_INTENTIONS) {
      const i = INTENTIONS[key];
      expect(i.label.length).toBeGreaterThan(2);
      expect(/^[一-鿿]+$/.test(i.cn)).toBe(true);
      expect(i.blurb.length).toBeGreaterThan(10);
      expect(i.activities.length).toBeGreaterThan(0);
    }
  });

  it('finds real matches across a year for every intention', () => {
    // An intention whose activities exist but never co-occur with a day would
    // be just as broken as one with no activities at all.
    for (const key of ALL_INTENTIONS) {
      const year = scoreWindow(new Date(2026, 0, 1), 365, key);
      const withDirectGuidance = year.filter((d) =>
        d.reasons.some((r) => r.kind === 'mansion' && Math.abs(r.weight) >= 3));
      expect([key, withDirectGuidance.length > 0]).toEqual([key, true]);
    }
  });
});

describe('branch relations', () => {
  it('clashes on exactly the six classical pairs', () => {
    const CLASH = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
    for (const a of CN) {
      for (const b of CN) {
        const expected = CLASH.some((p) => p.includes(a) && p.includes(b) && a !== b);
        expect([a, b, clashes(B(a), B(b))]).toEqual([a, b, expected]);
      }
    }
  });

  it('combines on exactly the six classical pairs', () => {
    const COMBINE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
    for (const a of CN) {
      for (const b of CN) {
        const expected = COMBINE.some((p) => p.includes(a) && p.includes(b) && a !== b);
        expect([a, b, combines(B(a), B(b))]).toEqual([a, b, expected]);
      }
    }
  });

  it('shares a frame only within the four 三合 groups, never with itself', () => {
    const FRAMES = [['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未']];
    for (const a of CN) {
      expect([a, sameFrame(B(a), B(a))]).toEqual([a, false]);
      for (const b of CN) {
        if (a === b) continue;
        const expected = FRAMES.some((f) => f.includes(a) && f.includes(b));
        expect([a, b, sameFrame(B(a), B(b))]).toEqual([a, b, expected]);
      }
    }
  });
});

describe('scoring a day', () => {
  it('works with no birth chart at all', () => {
    const d = scoreDay(new Date(2026, 5, 15), 'wedding');
    expect(d).not.toBeNull();
    expect(d!.reasons.every((r) => r.kind === 'mansion')).toBe(true);
    expect(d!.personalClash).toBe(false);
  });

  it('adds personal reasons once a birth chart is supplied', () => {
    const birth = computeBazi('1990-06-15', '14:30')!;
    // Sweep a window; at least one day must clash with the birth day branch,
    // since the day cycle passes every branch every twelve days.
    const window = scoreWindow(new Date(2026, 0, 1), 30, 'wedding', birth);
    expect(window.some((d) => d.personalClash)).toBe(true);
    expect(window.some((d) => d.reasons.some((r) => r.kind === 'personal'))).toBe(true);
  });

  it('marks a clash day as a clash and scores it below the same day without a chart', () => {
    const birth = computeBazi('1990-06-15', '14:30')!;
    const window = scoreWindow(new Date(2026, 0, 1), 40, 'wedding', birth);
    const clashDay = window.find((d) => d.personalClash)!;
    expect(clashDay).toBeDefined();
    const impersonal = scoreDay(new Date(`${clashDay.date}T12:00:00`), 'wedding')!;
    expect(clashDay.score).toBeLessThan(impersonal.score);
  });

  it('always explains itself — every day carries at least one reason', () => {
    const window = scoreWindow(new Date(2026, 2, 1), 60, 'travel');
    for (const d of window) {
      expect([d.date, d.reasons.length > 0]).toEqual([d.date, true]);
      // The score is exactly the sum of its reasons; no hidden terms.
      const sum = d.reasons.reduce((n, r) => n + r.weight, 0);
      expect([d.date, d.score]).toEqual([d.date, sum]);
    }
  });

  it('gives the same mansion whatever time of day the Date carries', () => {
    // Regression: scoreWindow built its Dates at LOCAL MIDNIGHT, which belongs
    // to the previous CST day for anyone east of UTC+8 — so the date label and
    // the mansion described were a day apart for every user in Japan or Korea.
    const y = 2026, m = 3, d = 14; // 2026-04-14
    const times = [0, 6, 12, 18, 23];
    const seen = times.map((h) => {
      const s = scoreDay(new Date(y, m, d, h, 30), 'travel')!;
      return `${s.date}:${s.mansion.cn}`;
    });
    expect(new Set(seen).size).toBe(1);
    expect(seen[0].startsWith('2026-04-14:')).toBe(true);
  });

  it('agrees with the mansion the birth-mansion reader gives for the same date', () => {
    for (const iso of ['2026-01-01', '2026-04-14', '2026-08-20', '2026-12-31']) {
      const [yy, mm, dd] = iso.split('-').map(Number);
      const s = scoreDay(new Date(yy, mm - 1, dd, 12), 'wedding')!;
      expect([iso, s.date, s.mansion.key]).toEqual([iso, iso, mansionForBirth(iso)!.key]);
    }
  });

  it('rejects an Invalid Date rather than guessing', () => {
    expect(scoreDay(new Date('nonsense'), 'wedding')).toBeNull();
  });
});

describe('windows and ranking', () => {
  it('returns one entry per day, in date order', () => {
    const w = scoreWindow(new Date(2026, 0, 1), 45, 'business');
    expect(w).toHaveLength(45);
    for (let i = 1; i < w.length; i++) {
      expect(w[i].date > w[i - 1].date).toBe(true);
    }
    expect(new Set(w.map((d) => d.date)).size).toBe(45);
  });

  it('crosses a month and a year boundary correctly', () => {
    const w = scoreWindow(new Date(2026, 11, 20), 20, 'travel');
    expect(w[0].date).toBe('2026-12-20');
    expect(w[w.length - 1].date).toBe('2027-01-08');
  });

  it('ranks best days strongest first, ties to the earlier date', () => {
    const w = scoreWindow(new Date(2026, 0, 1), 60, 'wedding');
    const best = bestDays(w, 5);
    expect(best).toHaveLength(5);
    for (let i = 1; i < best.length; i++) {
      expect(best[i - 1].score).toBeGreaterThanOrEqual(best[i].score);
      if (best[i - 1].score === best[i].score) {
        expect(best[i - 1].date < best[i].date).toBe(true);
      }
    }
    // And the top day must be at least as good as every day in the window.
    expect(best[0].score).toBe(Math.max(...w.map((d) => d.score)));
  });

  it('only lists genuinely bad days as days to avoid', () => {
    const birth = computeBazi('1988-03-02', '09:00')!;
    const w = scoreWindow(new Date(2026, 0, 1), 90, 'wedding', birth);
    for (const d of daysToAvoid(w, 10)) {
      const hasDirectWarning = d.reasons.some((r) => r.kind === 'mansion' && r.weight <= -4);
      expect([d.date, d.personalClash || hasDirectWarning]).toEqual([d.date, true]);
    }
  });

  it('does not pre-sort the window itself', () => {
    // bestDays must not mutate or reorder its input.
    const w = scoreWindow(new Date(2026, 0, 1), 20, 'study');
    const before = w.map((d) => d.date).join(',');
    bestDays(w, 5);
    daysToAvoid(w, 5);
    expect(w.map((d) => d.date).join(',')).toBe(before);
  });
});

describe('calendar export', () => {
  it('emits a well-formed all-day VEVENT per day', () => {
    const w = bestDays(scoreWindow(new Date(2026, 0, 1), 30, 'wedding'), 3);
    const ics = toICS(w, 'wedding');
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('BEGIN:VEVENT').length - 1).toBe(3);
    expect(ics.split('END:VEVENT').length - 1).toBe(3);
    expect(ics.includes('\r\n')).toBe(true);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
  });

  it('ends an all-day event on the following day, as the spec requires', () => {
    const day = scoreDay(new Date(2026, 0, 31), 'travel')!;
    const ics = toICS([day], 'travel');
    expect(ics).toContain('DTSTART;VALUE=DATE:20260131');
    expect(ics).toContain('DTEND;VALUE=DATE:20260201'); // month rollover
  });

  it('gives each day a stable, unique UID', () => {
    const w = bestDays(scoreWindow(new Date(2026, 0, 1), 30, 'moving'), 4);
    const uids = toICS(w, 'moving').split('\r\n').filter((l) => l.startsWith('UID:'));
    expect(new Set(uids).size).toBe(4);
    // Same input twice → same UIDs, so a re-import updates rather than duplicates.
    expect(toICS(w, 'moving')).toBe(toICS(w, 'moving'));
  });

  it('escapes commas and semicolons in the description', () => {
    const w = scoreWindow(new Date(2026, 0, 1), 10, 'ceremony');
    const ics = toICS(w, 'ceremony');
    for (const line of ics.split('\r\n').filter((l) => l.startsWith('DESCRIPTION:'))) {
      // Any bare comma would split the property value.
      expect(line.replace(/\\[,;\\]/g, '')).not.toMatch(/[,;]/);
    }
  });

  it('handles an empty selection without emitting a broken file', () => {
    const ics = toICS([], 'wedding');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
