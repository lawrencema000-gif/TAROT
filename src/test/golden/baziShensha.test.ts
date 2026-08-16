import { describe, it, expect } from 'vitest';
import { computeBazi, STEMS, BRANCHES, type HeavenlyStem, type EarthlyBranch, type BaziResult } from '../../data/bazi';
import { detectSpiritStars, detectBranchRelations } from '../../data/baziDeep';
import { nayinFor } from '../../data/bazi';
import { NAYIN_BUREAU, nayinKey, STEMS10_ROMAN, BRANCHES12_ROMAN } from '../../data/ziweiTables';

/**
 * Golden tests for 神煞 (spirit stars) in the BaZi chart.
 *
 * Expectations come from the classical mnemonic verses, quoted inline, and
 * from the structure of the sexagenary cycle — never from what the code
 * currently returns. These rules shipped unverified; 空亡 was wrong for 44 of
 * the 60 day pillars before this file existed.
 */

const S = (cn: string) => STEMS[['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'].indexOf(cn)];
const B = (cn: string) => BRANCHES[['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'].indexOf(cn)];

/** A chart with the pillars we want, so a rule can be exercised in isolation. */
function chartWith(day: { stem: HeavenlyStem; branch: EarthlyBranch }, others: EarthlyBranch[]): BaziResult {
  const pillar = (stem: HeavenlyStem, branch: EarthlyBranch) => ({
    stem, branch, element: 'wood' as const, polarity: 'yang' as const,
  });
  return {
    year: pillar('Jia', others[0]),
    month: pillar('Jia', others[1]),
    day: pillar(day.stem, day.branch),
    hour: pillar('Jia', others[2]),
    dayMaster: day.stem,
    dayMasterElement: 'wood',
    dayMasterPolarity: 'yang',
    elementBalance: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
    dominantElement: 'wood',
    weakElement: 'water',
  };
}

const has = (r: BaziResult, classical: string) =>
  detectSpiritStars(r).some((s) => s.classical === classical);

describe('天乙貴人 — Celestial Benefactor', () => {
  // 「甲戊庚牛羊，乙己鼠猴鄉，丙丁豬雞位，壬癸兔蛇藏，六辛逢馬虎」
  const VERSE: [string, string[]][] = [
    ['甲', ['丑', '未']], ['戊', ['丑', '未']], ['庚', ['丑', '未']],
    ['乙', ['子', '申']], ['己', ['子', '申']],
    ['丙', ['亥', '酉']], ['丁', ['亥', '酉']],
    ['壬', ['卯', '巳']], ['癸', ['卯', '巳']],
    ['辛', ['午', '寅']],
  ];

  it('fires on exactly the branches the verse names', () => {
    for (const [stem, good] of VERSE) {
      for (const branchCn of ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']) {
        const r = chartWith({ stem: S(stem), branch: B('辰') }, [B(branchCn), B('辰'), B('辰')]);
        // 辰 is never a 天乙 branch for any stem, so the year pillar is the only source.
        const expected = good.includes(branchCn);
        expect([stem, branchCn, has(r, '天乙貴人')]).toEqual([stem, branchCn, expected]);
      }
    }
  });

  it('covers all ten stems', () => {
    expect(VERSE).toHaveLength(10);
    expect(new Set(VERSE.map(([s]) => s)).size).toBe(10);
  });
});

describe('文昌 — Literary Star', () => {
  // 「甲巳乙午報君知，丙戊申宮丁己雞，庚豬辛鼠壬逢虎，癸人見卯入雲梯」
  const VERSE: [string, string][] = [
    ['甲', '巳'], ['乙', '午'], ['丙', '申'], ['戊', '申'], ['丁', '酉'],
    ['己', '酉'], ['庚', '亥'], ['辛', '子'], ['壬', '寅'], ['癸', '卯'],
  ];

  it('fires on exactly the branch the verse names', () => {
    for (const [stem, good] of VERSE) {
      for (const branchCn of ['子', '丑', '寅', '卯', '巳', '午', '申', '酉', '亥']) {
        const r = chartWith({ stem: S(stem), branch: B('辰') }, [B(branchCn), B('辰'), B('辰')]);
        expect([stem, branchCn, has(r, '文昌')]).toEqual([stem, branchCn, branchCn === good]);
      }
    }
  });
});

describe('桃花 / 驛馬 / 華蓋 — the three 三合 stars', () => {
  // All three key off the day branch's 三合 group:
  //   桃花 = the group's 沐浴, 驛馬 = the 沖 of its 長生, 華蓋 = its 墓庫.
  const GROUPS: { members: string[]; taohua: string; yima: string; huagai: string }[] = [
    { members: ['寅', '午', '戌'], taohua: '卯', yima: '申', huagai: '戌' },
    { members: ['巳', '酉', '丑'], taohua: '午', yima: '亥', huagai: '丑' },
    { members: ['申', '子', '辰'], taohua: '酉', yima: '寅', huagai: '辰' },
    { members: ['亥', '卯', '未'], taohua: '子', yima: '巳', huagai: '未' },
  ];

  it('places 桃花 at the group 沐浴', () => {
    for (const g of GROUPS) {
      for (const dayCn of g.members) {
        const hit = chartWith({ stem: S('甲'), branch: B(dayCn) }, [B(g.taohua), B(dayCn), B(dayCn)]);
        expect([dayCn, has(hit, '桃花')]).toEqual([dayCn, true]);
      }
    }
  });

  it('places 驛馬 opposite the group 長生', () => {
    for (const g of GROUPS) {
      for (const dayCn of g.members) {
        const hit = chartWith({ stem: S('甲'), branch: B(dayCn) }, [B(g.yima), B(dayCn), B(dayCn)]);
        expect([dayCn, has(hit, '驛馬')]).toEqual([dayCn, true]);
      }
    }
  });

  it('places 華蓋 at the group 墓庫', () => {
    for (const g of GROUPS) {
      for (const dayCn of g.members) {
        const hit = chartWith({ stem: S('甲'), branch: B(dayCn) }, [B(g.huagai), B(dayCn), B(dayCn)]);
        expect([dayCn, has(hit, '華蓋')]).toEqual([dayCn, true]);
      }
    }
  });

  it('covers all twelve branches across the four groups', () => {
    expect(new Set(GROUPS.flatMap((g) => g.members)).size).toBe(12);
  });
});

describe('羊刃 — Blade Star', () => {
  // 陽刃 belongs to the yang stems only: 甲卯 丙午 戊午 庚酉 壬子.
  const YANG: [string, string][] = [['甲', '卯'], ['丙', '午'], ['戊', '午'], ['庚', '酉'], ['壬', '子']];
  const YIN = ['乙', '丁', '己', '辛', '癸'];

  it('fires for the five yang stems on their blade branch', () => {
    for (const [stem, blade] of YANG) {
      const r = chartWith({ stem: S(stem), branch: B('辰') }, [B(blade), B('辰'), B('辰')]);
      expect([stem, has(r, '羊刃')]).toEqual([stem, true]);
    }
  });

  it('never fires for a yin day master', () => {
    for (const stem of YIN) {
      for (const branchCn of ['子', '卯', '午', '酉']) {
        const r = chartWith({ stem: S(stem), branch: B('辰') }, [B(branchCn), B('辰'), B('辰')]);
        expect([stem, branchCn, has(r, '羊刃')]).toEqual([stem, branchCn, false]);
      }
    }
  });
});

describe('空亡 — Void (旬空)', () => {
  /**
   * The 60 pillars run as six 旬 of ten. Each decade uses ten of the twelve
   * branches, and the two left over are its voids. Derived here independently
   * from the cycle itself rather than from a table.
   */
  function voidsFor(stemIdx: number, branchIdx: number): string[] {
    const start = ((branchIdx - stemIdx) % 12 + 12) % 12;
    const cn = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    return [cn[(start + 10) % 12], cn[(start + 11) % 12]];
  }

  it('matches the six classical 旬 heads', () => {
    // 甲子旬 戌亥 · 甲戌旬 申酉 · 甲申旬 午未 · 甲午旬 辰巳 · 甲辰旬 寅卯 · 甲寅旬 子丑
    expect(voidsFor(0, 0)).toEqual(['戌', '亥']);   // 甲子
    expect(voidsFor(0, 10)).toEqual(['申', '酉']);  // 甲戌
    expect(voidsFor(0, 8)).toEqual(['午', '未']);   // 甲申
    expect(voidsFor(0, 6)).toEqual(['辰', '巳']);   // 甲午
    expect(voidsFor(0, 4)).toEqual(['寅', '卯']);   // 甲辰
    expect(voidsFor(0, 2)).toEqual(['子', '丑']);   // 甲寅
  });

  it('gives every pillar in a decade the same two voids', () => {
    for (let decade = 0; decade < 6; decade++) {
      const expected = voidsFor(0, (decade * 10) % 12);
      for (let i = 0; i < 10; i++) {
        const n = decade * 10 + i;
        expect([n, voidsFor(n % 10, n % 12)]).toEqual([n, expected]);
      }
    }
  });

  it('fires in the engine for exactly the void branches, across all 60 day pillars', () => {
    const cn = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    for (let n = 0; n < 60; n++) {
      const s = n % 10, b = n % 12;
      const expected = voidsFor(s, b);
      for (let probe = 0; probe < 12; probe++) {
        const r = chartWith(
          { stem: STEMS[s], branch: BRANCHES[b] },
          [BRANCHES[probe], BRANCHES[b], BRANCHES[b]],
        );
        const fired = detectSpiritStars(r).some((x) => x.classical === '空亡');
        expect([n, cn[probe], fired]).toEqual([n, cn[probe], expected.includes(cn[probe])]);
      }
    }
  });

  it('never marks the day pillar itself void', () => {
    // A decade's voids are precisely the branches it does NOT contain, so the
    // day branch can never be void against its own decade.
    for (let n = 0; n < 60; n++) {
      const s = n % 10, b = n % 12;
      const cn = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      expect([n, voidsFor(s, b).includes(cn[b])]).toEqual([n, false]);
    }
  });

  it('reports every void pillar, not only the first', () => {
    // 甲子 day → voids 戌亥. Put 戌 in the year and 亥 in the hour.
    const r = chartWith({ stem: S('甲'), branch: B('子') }, [B('戌'), B('辰'), B('亥')]);
    const voids = detectSpiritStars(r).filter((s) => s.classical === '空亡');
    expect(voids).toHaveLength(2);
    expect(voids.map((v) => v.pillar).sort()).toEqual(['hour', 'year']);
  });
});

describe('detectSpiritStars — on real computed charts', () => {
  it('never throws and never emits a malformed star', () => {
    for (let y = 1940; y <= 2030; y += 6) {
      for (const md of ['02-11', '06-15', '11-03']) {
        for (const t of ['03:00', '14:30', '23:30']) {
          const chart = computeBazi(`${y}-${md}`, t);
          expect([y, md, t, chart !== null]).toEqual([y, md, t, true]);
          const stars = detectSpiritStars(chart!);
          for (const s of stars) {
            expect(s.classical.length).toBeGreaterThan(0);
            expect(s.name.length).toBeGreaterThan(0);
            expect(s.meaning.length).toBeGreaterThan(20);
            expect(['auspicious', 'mixed', 'inauspicious']).toContain(s.kind);
            expect(['year', 'month', 'day', 'hour']).toContain(s.pillar);
          }
        }
      }
    }
  });
});

describe('紅鸞 / 天喜 — the marriage pair', () => {
  // 「紅鸞起子逆行宮」 — 子年 紅鸞在卯, then counter-clockwise; 天喜 sits opposite.
  const HONGLUAN: [string, string][] = [
    ['子', '卯'], ['丑', '寅'], ['寅', '丑'], ['卯', '子'], ['辰', '亥'], ['巳', '戌'],
    ['午', '酉'], ['未', '申'], ['申', '未'], ['酉', '午'], ['戌', '巳'], ['亥', '辰'],
  ];
  const ALL = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  /**
   * Year branch drives these. Every branch other than the year is the probe,
   * so nothing else in the chart can seat the star — parking the day pillar on
   * a fixed branch would silently fire whenever that branch happened to be the
   * seat (it does, for a 亥 year).
   */
  function withYear(yearCn: string, probeCn: string) {
    const r = chartWith({ stem: S('甲'), branch: B(probeCn) }, [B(yearCn), B(probeCn), B(probeCn)]);
    return detectSpiritStars(r);
  }

  it('seats 紅鸞 where the verse says, for all twelve years', () => {
    for (const [yearCn, expected] of HONGLUAN) {
      const hit = withYear(yearCn, expected).find((x) => x.classical === '紅鸞');
      expect([yearCn, hit !== undefined]).toEqual([yearCn, true]);
      // And nowhere else.
      for (const probe of ALL) {
        if (probe === expected) continue;
        const fired = withYear(yearCn, probe).some((x) => x.classical === '紅鸞');
        expect([yearCn, probe, fired]).toEqual([yearCn, probe, false]);
      }
    }
  });

  it('always seats 天喜 opposite 紅鸞', () => {
    for (const [yearCn, luan] of HONGLUAN) {
      const opposite = ALL[(ALL.indexOf(luan) + 6) % 12];
      const hit = withYear(yearCn, opposite).find((x) => x.classical === '天喜');
      expect([yearCn, opposite, hit !== undefined]).toEqual([yearCn, opposite, true]);
    }
  });

  it('matches the published 子年 anchor — 紅鸞卯, 天喜酉', () => {
    expect(withYear('子', '卯').some((x) => x.classical === '紅鸞')).toBe(true);
    expect(withYear('子', '酉').some((x) => x.classical === '天喜')).toBe(true);
  });
});

describe('孤辰 / 寡宿 — the solitude pair', () => {
  // By the year branch's season: 亥子丑 → 寅/戌, 寅卯辰 → 巳/丑,
  // 巳午未 → 申/辰, 申酉戌 → 亥/未.
  const SEASONS: [string[], string, string][] = [
    [['亥', '子', '丑'], '寅', '戌'],
    [['寅', '卯', '辰'], '巳', '丑'],
    [['巳', '午', '未'], '申', '辰'],
    [['申', '酉', '戌'], '亥', '未'],
  ];

  it('seats both stars per season group', () => {
    for (const [years, guchen, guasu] of SEASONS) {
      for (const y of years) {
        const rc = chartWith({ stem: S('甲'), branch: B('午') }, [B(y), B(guchen), B(guasu)]);
        const found = detectSpiritStars(rc).map((x) => x.classical);
        expect([y, found.includes('孤辰')]).toEqual([y, true]);
        expect([y, found.includes('寡宿')]).toEqual([y, true]);
      }
    }
  });

  it('covers all twelve year branches exactly once', () => {
    expect(new Set(SEASONS.flatMap(([ys]) => ys)).size).toBe(12);
  });
});

describe('將星 — the General', () => {
  it('sits on the 帝旺 of the day branch frame', () => {
    const FRAMES: [string[], string][] = [
      [['寅', '午', '戌'], '午'], [['巳', '酉', '丑'], '酉'],
      [['申', '子', '辰'], '子'], [['亥', '卯', '未'], '卯'],
    ];
    for (const [members, general] of FRAMES) {
      for (const dayCn of members) {
        const r = chartWith({ stem: S('甲'), branch: B(dayCn) }, [B(general), B(dayCn), B(dayCn)]);
        expect([dayCn, has(r, '將星')]).toEqual([dayCn, true]);
      }
    }
  });
});

describe('祿神 / 金輿 — the seat and the carriage', () => {
  // 祿: 甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子. 金輿 is two places on.
  const LU: [string, string][] = [
    ['甲', '寅'], ['乙', '卯'], ['丙', '巳'], ['戊', '巳'], ['丁', '午'],
    ['己', '午'], ['庚', '申'], ['辛', '酉'], ['壬', '亥'], ['癸', '子'],
  ];
  const ALL = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

  it('seats 祿神 on the day master own branch', () => {
    for (const [stem, lu] of LU) {
      const r = chartWith({ stem: S(stem), branch: B('辰') }, [B(lu), B('辰'), B('辰')]);
      expect([stem, has(r, '祿神')]).toEqual([stem, true]);
    }
  });

  it('seats 金輿 two places past 祿', () => {
    for (const [stem, lu] of LU) {
      const carriage = ALL[(ALL.indexOf(lu) + 2) % 12];
      const r = chartWith({ stem: S(stem), branch: B('午') }, [B(carriage), B('午'), B('午')]);
      expect([stem, carriage, has(r, '金輿')]).toEqual([stem, carriage, true]);
    }
  });

  it('matches the published 甲 anchors — 祿在寅, 金輿在辰', () => {
    const r = chartWith({ stem: S('甲'), branch: B('午') }, [B('寅'), B('辰'), B('午')]);
    const found = detectSpiritStars(r).map((x) => x.classical);
    expect(found).toContain('祿神');
    expect(found).toContain('金輿');
  });
});

describe('月德貴人 — Moon Virtue', () => {
  // 寅午戌月見丙, 申子辰月見壬, 巳酉丑月見庚, 亥卯未月見甲 — matched on STEMS.
  const RULE: [string[], string][] = [
    [['寅', '午', '戌'], '丙'], [['申', '子', '辰'], '壬'],
    [['巳', '酉', '丑'], '庚'], [['亥', '卯', '未'], '甲'],
  ];

  it('fires when the virtue stem appears anywhere in the chart', () => {
    for (const [months, stemCn] of RULE) {
      for (const monthCn of months) {
        const base = chartWith({ stem: S('甲'), branch: B('辰') }, [B('辰'), B(monthCn), B('辰')]);
        // chartWith puts 甲 in the year/month/hour stems, so 甲-months always hit.
        const withStem = { ...base, year: { ...base.year, stem: S(stemCn) } };
        expect([monthCn, stemCn, detectSpiritStars(withStem).some((x) => x.classical === '月德貴人')])
          .toEqual([monthCn, stemCn, true]);
      }
    }
  });

  it('does not fire when no stem matches the month virtue', () => {
    // 寅 month wants 丙; fill every stem with 癸 instead.
    const base = chartWith({ stem: S('癸'), branch: B('辰') }, [B('辰'), B('寅'), B('辰')]);
    const allGui = {
      ...base,
      year: { ...base.year, stem: S('癸') },
      month: { ...base.month, stem: S('癸') },
      hour: { ...base.hour, stem: S('癸') },
    };
    expect(detectSpiritStars(allGui).some((x) => x.classical === '月德貴人')).toBe(false);
  });
});

describe('六沖 / 六合 / 三合 — branch relations', () => {
  /** Probe a pair in the year and month pillars; day and hour are the pair itself
   *  repeated, so no third branch can manufacture an extra relation. */
  function relationsBetween(aCn: string, bCn: string) {
    const a = B(aCn), b = B(bCn);
    const r = chartWith({ stem: S('甲'), branch: a }, [a, b, b]);
    return detectBranchRelations(r).filter((rel) => rel.branches.includes(a) && rel.branches.includes(b));
  }

  it('finds a clash for exactly the six classical pairs', () => {
    const CLASHES = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
    const isClash = (a: string, b: string) => CLASHES.some((p) => p.includes(a) && p.includes(b));
    const all = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    for (const a of all) {
      for (const b of all) {
        if (a === b) continue;
        const fired = relationsBetween(a, b).some((r) => r.type === 'clash');
        expect([a, b, fired]).toEqual([a, b, isClash(a, b)]);
      }
    }
  });

  it('finds a combine for exactly the six classical pairs', () => {
    const COMBINES = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
    const isCombine = (a: string, b: string) => COMBINES.some((p) => p.includes(a) && p.includes(b));
    const all = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    for (const a of all) {
      for (const b of all) {
        if (a === b) continue;
        const fired = relationsBetween(a, b).some((r) => r.type === 'combine');
        expect([a, b, fired]).toEqual([a, b, isCombine(a, b)]);
      }
    }
  });

  it('finds the four 三合 frames and nothing else', () => {
    const FRAMES = [['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未']];
    for (const f of FRAMES) {
      const r = chartWith({ stem: S('甲'), branch: B(f[0]) }, [B(f[1]), B(f[2]), B(f[0])]);
      const triples = detectBranchRelations(r).filter((x) => x.type === 'triple-harmony');
      expect([f.join(''), triples.length]).toEqual([f.join(''), 1]);
    }
    // A partial frame must NOT report a triple.
    const partial = chartWith({ stem: S('甲'), branch: B('申') }, [B('子'), B('卯'), B('卯')]);
    expect(detectBranchRelations(partial).filter((x) => x.type === 'triple-harmony')).toHaveLength(0);
  });

  it('covers all twelve branches once across the four frames', () => {
    const FRAMES = [['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未']];
    expect(new Set(FRAMES.flat()).size).toBe(12);
  });
});

describe('納音 — two independently built tables must agree', () => {
  it('assigns the same element to all 60 pillars in bazi.ts and ziweiTables.ts', () => {
    // src/data/bazi.ts carries the 60 納音 names; src/data/ziweiTables.ts carries
    // the 五行局 the same pillars map to. They were built separately, so
    // agreement across all 60 is real evidence rather than a tautology.
    const BUREAU_ELEMENT: Record<string, string> = {
      water2: '水', wood3: '木', metal4: '金', earth5: '土', fire6: '火',
    };
    for (let n = 0; n < 60; n++) {
      const s = n % 10, b = n % 12;
      const fromBazi = nayinFor(STEMS[s], BRANCHES[b]);
      const fromZiwei = NAYIN_BUREAU[nayinKey(STEMS10_ROMAN[s], BRANCHES12_ROMAN[b])];
      expect([n, fromBazi !== null, fromZiwei !== undefined]).toEqual([n, true, true]);
      const baziElement = [...fromBazi!.classical].find((ch) => '金木水火土'.includes(ch));
      expect([n, baziElement]).toEqual([n, BUREAU_ELEMENT[fromZiwei]]);
    }
  });
});
