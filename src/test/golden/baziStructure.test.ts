import { describe, it, expect } from 'vitest';
import { computeBazi, STEMS, BRANCHES, HIDDEN_STEMS, type HeavenlyStem, type EarthlyBranch } from '../../data/bazi';
import { determineStructure, STRUCTURE_MEANINGS, type StructureKey } from '../../data/baziStructure';

/**
 * Golden tests for 取格 — the chart's formal structure.
 *
 * The classical procedure: take the MONTH branch (月令), find the hidden stem
 * that is 透出 in the chart's stems (else its 本氣), and name the structure by
 * that stem's Ten God relation to the day master. Where the month branch is
 * the day master's own seat or blade, the tradition names 建祿 / 陽刃 instead —
 * it has no 比肩格.
 */

const CN_S = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const CN_B = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const S = (cn: string) => STEMS[CN_S.indexOf(cn)];
const B = (cn: string) => BRANCHES[CN_B.indexOf(cn)];

function chart(day: string, monthBranch: string, stems: string[] = ['甲', '甲', '甲']) {
  const pillar = (stem: HeavenlyStem, branch: EarthlyBranch) => ({
    stem, branch, element: 'wood' as const, polarity: 'yang' as const,
  });
  return {
    year: pillar(S(stems[0]), B('辰')),
    month: pillar(S(stems[1]), B(monthBranch)),
    day: pillar(S(day), B('辰')),
    hour: pillar(S(stems[2]), B('辰')),
    dayMaster: S(day),
    dayMasterElement: 'wood' as const,
    dayMasterPolarity: 'yang' as const,
    elementBalance: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    dominantElement: 'wood' as const,
    weakElement: 'water' as const,
  };
}

describe('the structure vocabulary', () => {
  it('gives every key interpretation text', () => {
    const KEYS: StructureKey[] = [
      'DirectOfficer', 'SevenKillings', 'DirectWealth', 'IndirectWealth',
      'DirectResource', 'IndirectResource', 'EatingGod', 'HurtingOfficer',
      'EstablishedRank', 'Blade', 'MonthPeer',
    ];
    for (const k of KEYS) {
      expect([k, !!STRUCTURE_MEANINGS[k]]).toEqual([k, true]);
      expect(STRUCTURE_MEANINGS[k].text.length).toBeGreaterThan(80);
      expect(STRUCTURE_MEANINGS[k].strengthNote.length).toBeGreaterThan(20);
      expect(/^[一-鿿]+$/.test(STRUCTURE_MEANINGS[k].cn)).toBe(true);
    }
  });

  it('names no structure the tradition does not use', () => {
    // Notably there is no 比肩格: a 月令 that matches the day master is read as
    // 建祿 or 陽刃 instead.
    const keys = Object.keys(STRUCTURE_MEANINGS);
    expect(keys).not.toContain('Companion');
    expect(keys).not.toContain('Peer');
    expect(keys).toContain('EstablishedRank');
    expect(keys).toContain('Blade');
  });
});

describe('建祿 / 陽刃 — the special month commands', () => {
  it('reads a 月令 on the day master own seat as 建祿', () => {
    // 祿: 甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子.
    const LU: [string, string][] = [
      ['甲', '寅'], ['乙', '卯'], ['丙', '巳'], ['丁', '午'],
      ['庚', '申'], ['辛', '酉'], ['壬', '亥'], ['癸', '子'],
    ];
    for (const [dayStem, monthBranch] of LU) {
      const s = determineStructure(chart(dayStem, monthBranch, [dayStem, dayStem, dayStem]));
      expect([dayStem, monthBranch, s?.key]).toEqual([dayStem, monthBranch, 'EstablishedRank']);
    }
  });

  it('reads a yang day master on its blade as 陽刃', () => {
    // 陽刃: 甲卯 丙午 戊午 庚酉 壬子.
    const BLADE: [string, string][] = [
      ['甲', '卯'], ['丙', '午'], ['戊', '午'], ['庚', '酉'], ['壬', '子'],
    ];
    for (const [dayStem, monthBranch] of BLADE) {
      const s = determineStructure(chart(dayStem, monthBranch, [dayStem, dayStem, dayStem]));
      expect([dayStem, monthBranch, s?.key]).toEqual([dayStem, monthBranch, 'Blade']);
    }
  });
});

describe('取格 — hand-verified charts', () => {
  it('names 正官格 when the month branch reveals the officer', () => {
    // 甲 day master. 酉 month: 本氣 辛, which is 正官 to 甲 (metal controls wood,
    // opposite polarity). Reveal 辛 in the year stem.
    const s = determineStructure(chart('甲', '酉', ['辛', '甲', '甲']));
    expect(s?.key).toBe('DirectOfficer');
    expect(s?.sourceStem).toBe(S('辛'));
    expect(s?.revealed).toBe(true);
  });

  it('names 七殺格 for the same-polarity controller', () => {
    // 甲 day master, 申 month: 本氣 庚, 七殺 to 甲 (same polarity).
    const s = determineStructure(chart('甲', '申', ['庚', '甲', '甲']));
    expect(s?.key).toBe('SevenKillings');
    expect(s?.sourceStem).toBe(S('庚'));
  });

  it('names 正財格 for the controlled element of opposite polarity', () => {
    // 甲 controls earth. 丑 month 本氣 己 — 正財 to 甲.
    const s = determineStructure(chart('甲', '丑', ['己', '甲', '甲']));
    expect(s?.key).toBe('DirectWealth');
  });

  it('falls back to the 本氣 when nothing is revealed', () => {
    // 甲 day, 酉 month, no 辛 anywhere in the stems → still 正官格, but
    // `revealed` must say so honestly.
    const s = determineStructure(chart('甲', '酉', ['甲', '甲', '甲']));
    expect(s?.key).toBe('DirectOfficer');
    expect(s?.revealed).toBe(false);
    expect(s?.sourceStem).toBe(HIDDEN_STEMS[B('酉')][0]);
  });

  it('reports the month branch it read the structure from', () => {
    const s = determineStructure(chart('甲', '酉', ['辛', '甲', '甲']));
    expect(s?.sourceBranch).toBe(B('酉'));
  });
});

describe('determineStructure — over real charts', () => {
  it('never throws, and every key it returns has text', () => {
    let resolved = 0, total = 0;
    for (let y = 1940; y <= 2030; y += 3) {
      for (const md of ['01-20', '03-15', '07-04', '10-31']) {
        for (const t of ['02:00', '11:00', '19:00']) {
          total++;
          const c = computeBazi(`${y}-${md}`, t);
          expect(c).not.toBeNull();
          const s = determineStructure(c!);
          if (s) {
            resolved++;
            expect([s.key, !!STRUCTURE_MEANINGS[s.key]]).toEqual([s.key, true]);
            expect(BRANCHES).toContain(s.sourceBranch);
            expect(STEMS).toContain(s.sourceStem);
          }
        }
      }
    }
    // Every chart has a month branch, so every chart resolves to a structure.
    expect([resolved, total]).toEqual([total, total]);
  });

  it('is stable — the same birth always gives the same structure', () => {
    for (let i = 0; i < 5; i++) {
      expect(determineStructure(computeBazi('1990-06-15', '14:30')!)?.key)
        .toBe(determineStructure(computeBazi('1990-06-15', '14:30')!)?.key);
    }
  });

  it('resolves a structure for all twelve month branches', () => {
    const seen = new Set<StructureKey>();
    for (const monthCn of CN_B) {
      for (const dayCn of CN_S) {
        const s = determineStructure(chart(dayCn, monthCn, [dayCn, dayCn, dayCn]));
        expect([dayCn, monthCn, s !== null]).toEqual([dayCn, monthCn, true]);
        if (s) seen.add(s.key);
      }
    }
    // A 10 × 12 sweep should exercise most of the vocabulary.
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });
});
