import { describe, it, expect } from 'vitest';
import {
  BRANCHES12, STEMS10, BUREAU_INFO, NAYIN_BUREAU, nayinKey,
  ZIWEI_POSITION, ziweiPositionFromRule, placeMajorStars, placeSupportStars,
  tianfuFromZiwei, FOUR_TRANSFORMATIONS,
  lifePalaceBranch, bodyPalaceBranch, palaceBranch,
  type Bureau,
} from '../../data/ziweiTables';
import { computeZiweiChart, hourBranchIndex } from '../../data/ziwei';
import { STAR_MEANINGS } from '../../data/ziweiContent';

/**
 * Golden tests for Zi Wei Dou Shu placement.
 *
 * Every expectation here is derived from the classical 安星訣 verses or from a
 * structural property of the system — NEVER by running the code and freezing
 * its answer. A wrong 紫微 chart is worse than no chart, so the crux table
 * (ZIWEI_POSITION, 5 bureaus × 30 days) is checked cell-by-cell against the
 * rule, and the rule itself is re-derived here independently.
 */

const B = (cn: string) => BRANCHES12.indexOf(cn);

describe('五行局 — bureau numbers', () => {
  it('maps each bureau to its classical divisor', () => {
    expect(BUREAU_INFO.water2.number).toBe(2);
    expect(BUREAU_INFO.wood3.number).toBe(3);
    expect(BUREAU_INFO.metal4.number).toBe(4);
    expect(BUREAU_INFO.earth5.number).toBe(5);
    expect(BUREAU_INFO.fire6.number).toBe(6);
  });

  it('covers all 60 stem-branch pillars', () => {
    expect(Object.keys(NAYIN_BUREAU)).toHaveLength(60);
  });

  it('agrees with known 納音 pillars', () => {
    // 甲子乙丑海中金 → 金四局
    expect(NAYIN_BUREAU[nayinKey('Jia', 'Zi')]).toBe('metal4');
    expect(NAYIN_BUREAU[nayinKey('Yi', 'Chou')]).toBe('metal4');
    // 丙寅丁卯爐中火 → 火六局
    expect(NAYIN_BUREAU[nayinKey('Bing', 'Yin')]).toBe('fire6');
    expect(NAYIN_BUREAU[nayinKey('Ding', 'Mao')]).toBe('fire6');
    // 戊辰己巳大林木 → 木三局
    expect(NAYIN_BUREAU[nayinKey('Wu', 'Chen')]).toBe('wood3');
    // 庚午辛未路旁土 → 土五局
    expect(NAYIN_BUREAU[nayinKey('Geng', 'Wu')]).toBe('earth5');
    // 壬申癸酉劍鋒金 → 金四局
    expect(NAYIN_BUREAU[nayinKey('Ren', 'Shen')]).toBe('metal4');
    // 丙子丁丑澗下水 → 水二局
    expect(NAYIN_BUREAU[nayinKey('Bing', 'Zi')]).toBe('water2');
  });

  it('pairs consecutive pillars onto the same 納音 element', () => {
    // 納音 runs in pairs: 甲子/乙丑 share, 丙寅/丁卯 share, and so on.
    const stems = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
    const branches = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
    for (let i = 0; i < 60; i += 2) {
      const a = NAYIN_BUREAU[nayinKey(stems[i % 10], branches[i % 12])];
      const b = NAYIN_BUREAU[nayinKey(stems[(i + 1) % 10], branches[(i + 1) % 12])];
      expect(a).toBe(b);
    }
  });
});

describe('起紫微星 — the crux table', () => {
  /**
   * Independent re-derivation of 起紫微訣, written from the verse rather than
   * from the implementation:
   *   「六五四三二，酉午亥辰丑，局數除日數，商數尋寅宮，
   *     若見數無餘，便要起虎口，有餘超一位，逆回一宮是」
   * Divide the lunar day by the bureau number, borrowing k days until it
   * divides evenly. Count `quotient` palaces forward from 寅 (inclusive), then
   * move k palaces — forward if k is even, backward if k is odd.
   */
  function derive(bureauNumber: number, day: number): number {
    const YIN = 2; // 寅
    let k = 0;
    while ((day + k) % bureauNumber !== 0) k++;
    const q = (day + k) / bureauNumber;
    const base = (YIN + q - 1) % 12;
    return k % 2 === 0 ? (base + k) % 12 : ((base - k) % 12 + 12) % 12;
  }

  it('table and rule agree on all 150 cells', () => {
    for (const [bureau, row] of Object.entries(ZIWEI_POSITION)) {
      expect(row).toHaveLength(30);
      for (let day = 1; day <= 30; day++) {
        expect(
          [bureau, day, BRANCHES12[row[day - 1]]],
        ).toEqual(
          [bureau, day, BRANCHES12[ziweiPositionFromRule(bureau as Bureau, day)]],
        );
      }
    }
  });

  it('matches an independent derivation of the verse', () => {
    for (const [bureau, row] of Object.entries(ZIWEI_POSITION)) {
      const n = BUREAU_INFO[bureau as Bureau].number;
      for (let day = 1; day <= 30; day++) {
        expect([bureau, day, row[day - 1]]).toEqual([bureau, day, derive(n, day)]);
      }
    }
  });

  it('honours the classical anchors', () => {
    // 水二局初二 → 紫微在寅 (2 ÷ 2 = 1, no borrow, so 寅 itself: 起虎口).
    expect(ZIWEI_POSITION.water2[1]).toBe(B('寅'));
    // 水二局初一 → borrow 1, odd, step back one from 寅 → 丑.
    expect(ZIWEI_POSITION.water2[0]).toBe(B('丑'));
    // The verse's own mnemonic 「六五四三二，酉午亥辰丑」 gives day 1 per bureau.
    expect(ZIWEI_POSITION.fire6[0]).toBe(B('酉'));
    expect(ZIWEI_POSITION.earth5[0]).toBe(B('午'));
    expect(ZIWEI_POSITION.metal4[0]).toBe(B('亥'));
    expect(ZIWEI_POSITION.wood3[0]).toBe(B('辰'));
    expect(ZIWEI_POSITION.water2[0]).toBe(B('丑'));
    // 金四局初四 → 4 ÷ 4 = 1 → 寅.
    expect(ZIWEI_POSITION.metal4[3]).toBe(B('寅'));
    // 火六局初六 → 6 ÷ 6 = 1 → 寅.
    expect(ZIWEI_POSITION.fire6[5]).toBe(B('寅'));
  });

  it('never leaves the branch ring', () => {
    for (const row of Object.values(ZIWEI_POSITION)) {
      for (const v of row) expect(v).toBeGreaterThanOrEqual(0), expect(v).toBeLessThan(12);
    }
  });
});

describe('安十四主星 — placement from 紫微', () => {
  it('places the 紫微 series by 安紫微諸星訣', () => {
    // 「紫微天機逆行旁，隔一陽武天同當，又隔二位廉貞地，空三復見紫微郎」
    // For 紫微在子: 天機亥, 太陽酉, 武曲申, 天同未, 廉貞辰.
    const p = placeMajorStars(B('子'));
    expect(BRANCHES12[p.Ziwei]).toBe('子');
    expect(BRANCHES12[p.Tianji]).toBe('亥');
    expect(BRANCHES12[p.Taiyang]).toBe('酉');
    expect(BRANCHES12[p.Wuqu]).toBe('申');
    expect(BRANCHES12[p.Tiantong]).toBe('未');
    expect(BRANCHES12[p.Lianzhen]).toBe('辰');
  });

  it('places the 天府 series by 安天府諸星訣', () => {
    // 紫微在子 → 天府在辰; then 太陰貪狼巨門天相天梁 run forward, 七殺 at +6,
    // and 破軍 three palaces on at +10.
    const p = placeMajorStars(B('子'));
    expect(BRANCHES12[p.Tianfu]).toBe('辰');
    expect(BRANCHES12[p.Taiyin]).toBe('巳');
    expect(BRANCHES12[p.Tanlang]).toBe('午');
    expect(BRANCHES12[p.Jumen]).toBe('未');
    expect(BRANCHES12[p.Tianxiang]).toBe('申');
    expect(BRANCHES12[p.Tianliang]).toBe('酉');
    expect(BRANCHES12[p.Qisha]).toBe('戌');
    expect(BRANCHES12[p.Pojun]).toBe('寅');
  });

  it('mirrors 天府 against 紫微 about the 寅-申 axis', () => {
    // The classical pairing: 紫微在寅 → 天府亦在寅; 紫微在申 → 天府亦在申;
    // everywhere else they reflect. tianfu = (4 - ziwei) mod 12.
    for (let z = 0; z < 12; z++) {
      expect([z, BRANCHES12[tianfuFromZiwei(z)]]).toEqual([z, BRANCHES12[((4 - z) % 12 + 12) % 12]]);
    }
    expect(tianfuFromZiwei(B('寅'))).toBe(B('寅'));
    expect(tianfuFromZiwei(B('申'))).toBe(B('申'));
  });

  it('places all 14 majors, wherever 紫微 falls', () => {
    for (let z = 0; z < 12; z++) {
      const p = placeMajorStars(z);
      expect(Object.keys(p)).toHaveLength(14);
      for (const v of Object.values(p)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(12);
      }
    }
  });
});

describe('起命身宮 — Life and Body palaces', () => {
  it('puts 命宮 in 寅 for a 正月子時 birth', () => {
    // 正月生, 子時: count zero forward from 寅, zero back → 寅.
    expect(lifePalaceBranch(1, B('子'))).toBe(B('寅'));
  });

  it('agrees with the classical 正月午時 → 命在申', () => {
    expect(lifePalaceBranch(1, 6)).toBe(B('申'));
  });

  it('keeps 命身同宮 only at 子時 and 午時', () => {
    for (let month = 1; month <= 12; month++) {
      for (let h = 0; h < 12; h++) {
        const same = lifePalaceBranch(month, h) === bodyPalaceBranch(month, h);
        expect([month, h, same]).toEqual([month, h, h === 0 || h === 6]);
      }
    }
  });

  it('runs the palaces counter-clockwise, 遷移 opposite 命宮', () => {
    for (let life = 0; life < 12; life++) {
      expect(palaceBranch(life, 0)).toBe(life);
      expect(palaceBranch(life, 6)).toBe((life + 6) % 12);
      // All twelve palaces occupy twelve distinct branches.
      const seats = new Set(Array.from({ length: 12 }, (_, i) => palaceBranch(life, i)));
      expect(seats.size).toBe(12);
    }
  });
});

describe('時辰 — hour branch', () => {
  it('folds 23:00-00:59 into 子', () => {
    expect(hourBranchIndex('23:30')).toBe(0);
    expect(hourBranchIndex('00:15')).toBe(0);
  });

  it('walks the double-hours', () => {
    const cases: [string, string][] = [
      ['01:00', '丑'], ['03:20', '寅'], ['05:00', '卯'], ['07:45', '辰'],
      ['09:00', '巳'], ['11:30', '午'], ['13:00', '未'], ['15:00', '申'],
      ['17:10', '酉'], ['19:00', '戌'], ['21:00', '亥'],
    ];
    for (const [t, cn] of cases) expect([t, BRANCHES12[hourBranchIndex(t)]]).toEqual([t, cn]);
  });

  it('defaults to 午 when no time is given', () => {
    expect(BRANCHES12[hourBranchIndex()]).toBe('午');
  });
});

describe('四化 — the four transformations', () => {
  it('covers all ten stems with four distinct stars each', () => {
    expect(Object.keys(FOUR_TRANSFORMATIONS)).toHaveLength(10);
    for (const [stem, m] of Object.entries(FOUR_TRANSFORMATIONS)) {
      const stars = [m.hua_lu, m.hua_quan, m.hua_ke, m.hua_ji];
      expect([stem, new Set(stars).size]).toEqual([stem, 4]);
    }
  });

  it('matches the classical 天干四化表 for the stems it is easiest to get wrong', () => {
    // 甲廉破武陽 — 廉貞化祿, 破軍化權, 武曲化科, 太陽化忌.
    expect(FOUR_TRANSFORMATIONS.Jia).toMatchObject({
      hua_lu: 'Lianzhen', hua_quan: 'Pojun', hua_ke: 'Wuqu', hua_ji: 'Taiyang',
    });
    // 乙機梁紫陰.
    expect(FOUR_TRANSFORMATIONS.Yi).toMatchObject({
      hua_lu: 'Tianji', hua_quan: 'Tianliang', hua_ke: 'Ziwei', hua_ji: 'Taiyin',
    });
    // 庚陽武陰同 (中州派).
    expect(FOUR_TRANSFORMATIONS.Geng).toMatchObject({
      hua_lu: 'Taiyang', hua_quan: 'Wuqu', hua_ke: 'Taiyin', hua_ji: 'Tiantong',
    });
    // 癸破巨陰貪.
    expect(FOUR_TRANSFORMATIONS.Gui).toMatchObject({
      hua_lu: 'Pojun', hua_quan: 'Jumen', hua_ke: 'Taiyin', hua_ji: 'Tanlang',
    });
  });
});

describe('computeZiweiChart — end to end', () => {
  it('casts a complete chart for a known birth', () => {
    // 1990-06-15 14:30 → 農曆 庚午年五月廿三, 未時.
    // (五月初一 = 1990-05-24, the day of that month's new moon in CST.)
    const c = computeZiweiChart('1990-06-15', '14:30')!;
    expect(c).not.toBeNull();
    expect(c.lunar.year).toBe(1990);
    expect(c.lunar.month).toBe(5);
    expect(c.lunar.isLeapMonth).toBe(false);
    expect(c.lunar.day).toBe(23);
    expect(c.hourBranchCn).toBe('未');
    expect(STEMS10.indexOf(c.yearStemCn)).toBe((1990 - 4) % 10); // 庚
    expect(c.yearStemCn).toBe('庚');
  });

  it('places every star in exactly one palace', () => {
    const c = computeZiweiChart('1990-06-15', '14:30')!;
    const all = c.palaces.flatMap((p) => p.stars);
    // 14 majors + 輔弼昌曲.
    expect(all).toHaveLength(18);
    expect(new Set(all.map((s) => s.key)).size).toBe(18);
    expect(all.filter((s) => !s.isSupport)).toHaveLength(14);
    expect(all.filter((s) => s.isSupport)).toHaveLength(4);
  });

  it('gives exactly one 命宮 and one 身宮 among twelve distinct seats', () => {
    const c = computeZiweiChart('1990-06-15', '14:30')!;
    expect(c.palaces).toHaveLength(12);
    expect(new Set(c.palaces.map((p) => p.branchIdx)).size).toBe(12);
    expect(c.palaces.filter((p) => p.isLife)).toHaveLength(1);
    expect(c.palaces.filter((p) => p.isBody)).toHaveLength(1);
    expect(c.palaces[0].isLife).toBe(true); // index 0 is 命宮 by construction
  });

  it('applies the year stem transformations to placed stars', () => {
    const c = computeZiweiChart('1990-06-15', '14:30')!;
    expect(c.transformations.map((t) => t.star)).toEqual(
      ['Taiyang', 'Wuqu', 'Taiyin', 'Tiantong'], // 庚: 陽武陰同
    );
    const marked = c.palaces.flatMap((p) => p.stars).filter((s) => s.transformation);
    expect(marked).toHaveLength(4);
  });

  it('survives every hour of a leap-month birth', () => {
    // 2020 had 閏四月; 2020-06-01 falls inside it.
    for (let h = 0; h < 24; h++) {
      const t = `${String(h).padStart(2, '0')}:00`;
      const c = computeZiweiChart('2020-06-01', t);
      expect([t, c !== null]).toEqual([t, true]);
      expect([t, c!.palaces.flatMap((p) => p.stars).length]).toEqual([t, 18]);
    }
  });

  it('rejects malformed input rather than guessing', () => {
    expect(computeZiweiChart('not-a-date')).toBeNull();
    expect(computeZiweiChart('1990-6-15')).toBeNull();
  });

  it('stays self-consistent across a century of births', () => {
    for (let y = 1930; y <= 2030; y += 7) {
      for (const md of ['01-20', '05-05', '09-14', '12-30']) {
        const c = computeZiweiChart(`${y}-${md}`, '08:00');
        expect([y, md, c !== null]).toEqual([y, md, true]);
        expect([y, md, c!.lunar.day]).toEqual([y, md, expect.any(Number)]);
        expect(c!.lunar.day).toBeGreaterThanOrEqual(1);
        expect(c!.lunar.day).toBeLessThanOrEqual(30);
        expect(c!.lunar.month).toBeGreaterThanOrEqual(1);
        expect(c!.lunar.month).toBeLessThanOrEqual(12);
        expect(new Set(c!.palaces.map((p) => p.branchIdx)).size).toBe(12);
        expect(c!.palaces.flatMap((p) => p.stars)).toHaveLength(18);
      }
    }
  });
});

describe('安輔弼昌曲 — the four support stars', () => {
  it('places 左輔右弼 from the lunar month', () => {
    // 「辰上順正尋左輔，戌上逆正右弼當」 — 正月 seats them at 辰 and 戌.
    expect(BRANCHES12[placeSupportStars(1, 0).Zuofu]).toBe('辰');
    expect(BRANCHES12[placeSupportStars(1, 0).Youbi]).toBe('戌');
    // 七月 counts six on and six back, so they swap seats.
    expect(BRANCHES12[placeSupportStars(7, 0).Zuofu]).toBe('戌');
    expect(BRANCHES12[placeSupportStars(7, 0).Youbi]).toBe('辰');
  });

  it('places 文昌文曲 from the hour branch', () => {
    // 「文昌戌上逆時尋，文曲辰上順時輪」 — 子時 seats them at 戌 and 辰.
    expect(BRANCHES12[placeSupportStars(1, B('子')).Wenchang]).toBe('戌');
    expect(BRANCHES12[placeSupportStars(1, B('子')).Wenqu]).toBe('辰');
    // 午時 swaps them.
    expect(BRANCHES12[placeSupportStars(1, 6).Wenchang]).toBe('辰');
    expect(BRANCHES12[placeSupportStars(1, 6).Wenqu]).toBe('戌');
  });

  it('keeps both pairs symmetric about the 辰-戌 axis', () => {
    for (let m = 1; m <= 12; m++) {
      for (let h = 0; h < 12; h++) {
        const s = placeSupportStars(m, h);
        // Reflection about 辰-戌 is x → (14 - x) mod 12.
        expect([m, h, s.Youbi]).toEqual([m, h, ((14 - s.Zuofu) % 12 + 12) % 12]);
        expect([m, h, s.Wenchang]).toEqual([m, h, ((14 - s.Wenqu) % 12 + 12) % 12]);
      }
    }
  });
});

describe('四化 recipients are always real, placed, readable stars', () => {
  it('has interpretation text for every star any stem can transform', () => {
    // Four stems send a 化 to a support star rather than a major. Missing text
    // here is what makes a chart print "Wenchang" at a user.
    for (const m of Object.values(FOUR_TRANSFORMATIONS)) {
      for (const star of [m.hua_lu, m.hua_quan, m.hua_ke, m.hua_ji]) {
        expect([star, !!STAR_MEANINGS[star]]).toEqual([star, true]);
        expect([star, /^[一-鿿]+$/.test(STAR_MEANINGS[star].cn)]).toEqual([star, true]);
      }
    }
  });

  it('seats all four transformations in a palace, for every year stem', () => {
    // One birth date per stem: 1984 is 甲子, so 1984+n cycles the stems.
    for (let n = 0; n < 10; n++) {
      const year = 1984 + n;
      const c = computeZiweiChart(`${year}-08-20`, '10:00')!;
      expect([year, c !== null]).toEqual([year, true]);
      const marked = c.palaces.flatMap((p) => p.stars).filter((s) => s.transformation);
      expect([year, c.yearStemCn, marked.length]).toEqual([year, c.yearStemCn, 4]);
      // And each transformation is on the star the table names.
      for (const t of c.transformations) {
        const hit = marked.find((s) => s.key === t.star);
        expect([year, t.star, hit?.transformation]).toEqual([year, t.star, t.kind]);
      }
    }
  });
});

describe('晚子時 — the 23:00 day boundary', () => {
  it('reads a 23:xx birth as 子時 of the following lunar day', () => {
    const late = computeZiweiChart('1990-06-15', '23:30')!;
    const nextMorning = computeZiweiChart('1990-06-16', '00:30')!;
    expect(BRANCHES12[late.hourBranchIdx]).toBe('子');
    // Same 子時, same lunar day → the same chart.
    expect(late.lunar.day).toBe(nextMorning.lunar.day);
    expect(late.ziweiBranchIdx).toBe(nextMorning.ziweiBranchIdx);
    expect(late.lifeBranchIdx).toBe(nextMorning.lifeBranchIdx);
  });

  it('advances one lunar day past the same evening', () => {
    const evening = computeZiweiChart('1990-06-15', '21:00')!;  // 亥時, same day
    const late = computeZiweiChart('1990-06-15', '23:30')!;
    expect(late.lunar.day).toBe(evening.lunar.day + 1);
  });

  it('rolls across a month end without breaking the chart', () => {
    // 1990-06-30 23:30 → 1990-07-01 子時.
    const c = computeZiweiChart('1990-06-30', '23:30')!;
    expect(c).not.toBeNull();
    expect(BRANCHES12[c.hourBranchIdx]).toBe('子');
    expect(c.palaces.flatMap((p) => p.stars)).toHaveLength(18);
    expect(new Set(c.palaces.map((p) => p.branchIdx)).size).toBe(12);
  });

  it('rolls across a year end', () => {
    const c = computeZiweiChart('1999-12-31', '23:45')!;
    expect(c).not.toBeNull();
    expect(c.lunar.day).toBe(computeZiweiChart('2000-01-01', '00:10')!.lunar.day);
  });
});
