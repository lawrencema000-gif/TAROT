import { describe, it, expect } from 'vitest';
import {
  PALACE_INFO, RELATIVE_INFO, SPIRIT_INFO, HEXAGRAM_PALACE,
  worldLineFor, responseLineFor, TRIGRAM_NAJIA,
  najiaForHexagram, relativesForHexagram, spiritsForDayStem,
  hiddenSpiritsForHexagram, auditLiuYaoTables, readLiuYao,
  type Palace,
} from '../../data/liuYao';
import { RELATIVE_MEANINGS, SPIRIT_MEANINGS, PALACE_MEANINGS } from '../../data/liuYaoContent';
import { STEMS, BRANCHES } from '../../data/bazi';
import { HEXAGRAMS } from '../../data/ichingHexagrams';

/**
 * Golden tests for 六爻.
 *
 * The module ships its own auditLiuYaoTables(), which is useful but was found
 * to have no INDEPENDENT oracle for four of the tables it advertises: corrupt a
 * 納甲 stem, a spirit seed, a 世爻 value or a palace element and it still
 * returned clean, because every check was derived from the same data it was
 * checking. The expectations below are pinned to the classical verses and to
 * published charts instead, so they fail when the data moves.
 */

const CN_S = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const CN_B = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const stemCn = (s: string) => CN_S[STEMS.indexOf(s as never)];
const branchCn = (b: string) => CN_B[BRANCHES.indexOf(b as never)];
const najiaString = (n: number) =>
  najiaForHexagram(n).map((l) => `${stemCn(l.stem)}${branchCn(l.branch)}`).join(' ');

describe('the module audit', () => {
  it('reports no problems', () => {
    expect(auditLiuYaoTables()).toEqual([]);
  });
});

describe('八宮 — palaces', () => {
  it('assigns all 64 hexagrams, eight to each palace, ranks 0-7 unique', () => {
    expect(Object.keys(HEXAGRAM_PALACE)).toHaveLength(64);
    const byPalace: Record<string, number[]> = {};
    for (let n = 1; n <= 64; n++) {
      const e = HEXAGRAM_PALACE[n];
      expect([n, !!e]).toEqual([n, true]);
      (byPalace[e.palace] ||= []).push(e.rank);
    }
    expect(Object.keys(byPalace)).toHaveLength(8);
    for (const [p, ranks] of Object.entries(byPalace)) {
      expect([p, ranks.length]).toEqual([p, 8]);
      expect([p, [...ranks].sort((a, b) => a - b)]).toEqual([p, [0, 1, 2, 3, 4, 5, 6, 7]]);
    }
  });

  it('puts the eight pure doubled trigrams at rank 0, with the classical elements', () => {
    // 乾為天 1 金, 兌為澤 58 金, 離為火 30 火, 震為雷 51 木,
    // 巽為風 57 木, 坎為水 29 水, 艮為山 52 土, 坤為地 2 土.
    const PURE: [number, Palace, string][] = [
      [1, 'qian', 'metal'], [58, 'dui', 'metal'], [30, 'li', 'fire'], [51, 'zhen', 'wood'],
      [57, 'xun', 'wood'], [29, 'kan', 'water'], [52, 'gen', 'earth'], [2, 'kun', 'earth'],
    ];
    for (const [n, palace, element] of PURE) {
      expect([n, HEXAGRAM_PALACE[n].palace]).toEqual([n, palace]);
      expect([n, HEXAGRAM_PALACE[n].rank]).toEqual([n, 0]);
      expect([n, PALACE_INFO[palace].element]).toEqual([n, element]);
      // and it really is a doubled trigram
      expect([n, HEXAGRAMS[n].upperTrigram]).toEqual([n, HEXAGRAMS[n].lowerTrigram]);
    }
  });
});

describe('世應 — world and response', () => {
  it('maps rank to the world line the tradition names', () => {
    // 本宮 6, 一世 1, 二世 2, 三世 3, 四世 4, 五世 5, 遊魂 4, 歸魂 3.
    const EXPECTED = [6, 1, 2, 3, 4, 5, 4, 3];
    for (let rank = 0; rank < 8; rank++) {
      expect([rank, worldLineFor(rank)]).toEqual([rank, EXPECTED[rank]]);
    }
  });

  it('always seats 應 exactly three lines from 世', () => {
    // 「世隔兩爻即為應」. One published table breaks this on its 四世 row; the
    // rule is what the engines encode, and it is what we implement.
    for (let w = 1; w <= 6; w++) {
      const r = responseLineFor(w);
      expect([w, Math.abs(r - w)]).toEqual([w, 3]);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });

  it('holds for every one of the 64 hexagrams', () => {
    for (let n = 1; n <= 64; n++) {
      const w = worldLineFor(HEXAGRAM_PALACE[n].rank);
      expect([n, Math.abs(responseLineFor(w) - w)]).toEqual([n, 3]);
    }
  });

  it('returns 0 rather than nonsense for a bad world line', () => {
    for (const bad of [0, 7, -1, 1.5, NaN, undefined as unknown as number, '3' as unknown as number]) {
      expect([String(bad), responseLineFor(bad)]).toEqual([String(bad), 0]);
    }
  });
});

describe('納甲 — stem-branch per line', () => {
  it('assigns the eight trigram stems the 納甲歌 names', () => {
    // 乾甲(內)壬(外), 坤乙(內)癸(外), 震庚, 巽辛, 坎戊, 離己, 艮丙, 兌丁.
    const EXPECT: Record<string, [string, string]> = {
      Heaven: ['甲', '壬'], Earth: ['乙', '癸'], Thunder: ['庚', '庚'], Wind: ['辛', '辛'],
      Water: ['戊', '戊'], Fire: ['己', '己'], Mountain: ['丙', '丙'], Lake: ['丁', '丁'],
    };
    for (const [trigram, [inner, outer]] of Object.entries(EXPECT)) {
      const t = TRIGRAM_NAJIA[trigram];
      expect([trigram, !!t]).toEqual([trigram, true]);
      expect([trigram, stemCn(t.stem)]).toEqual([trigram, inner]);
      expect([trigram, stemCn(t.outerStem ?? t.stem)]).toEqual([trigram, outer]);
    }
  });

  it('matches published charts line for line', () => {
    // The three the author spot-checked, re-asserted here so a table edit fails
    // a test rather than a self-consistent audit.
    expect(najiaString(44)).toBe('辛丑 辛亥 辛酉 壬午 壬申 壬戌'); // 天風姤
    expect(najiaString(2)).toBe('乙未 乙巳 乙卯 癸丑 癸亥 癸酉');  // 坤為地
    expect(najiaString(48)).toBe('辛丑 辛亥 辛酉 戊申 戊戌 戊子'); // 水風井
    expect(najiaString(1)).toBe('甲子 甲寅 甲辰 壬午 壬申 壬戌');  // 乾為天
  });

  it('runs 坤 and 巽 backwards, which is the classic slip', () => {
    // 坤 inner 未巳卯 / outer 丑亥酉; 巽 inner 丑亥酉 / outer 未巳卯.
    expect(TRIGRAM_NAJIA.Earth.innerBranches.map(branchCn)).toEqual(['未', '巳', '卯']);
    expect(TRIGRAM_NAJIA.Earth.outerBranches.map(branchCn)).toEqual(['丑', '亥', '酉']);
    expect(TRIGRAM_NAJIA.Wind.innerBranches.map(branchCn)).toEqual(['丑', '亥', '酉']);
    expect(TRIGRAM_NAJIA.Wind.outerBranches.map(branchCn)).toEqual(['未', '巳', '卯']);
  });

  it('keeps stem/branch parity on every line of every hexagram', () => {
    // A stem-branch pair is only valid when both indices share parity — this is
    // what catches a single corrupted stem, which nothing else does.
    for (let n = 1; n <= 64; n++) {
      for (const l of najiaForHexagram(n)) {
        const parity = STEMS.indexOf(l.stem) % 2 === BRANCHES.indexOf(l.branch) % 2;
        expect([n, l.stem, l.branch, parity]).toEqual([n, l.stem, l.branch, true]);
      }
    }
  });

  it('returns an empty array for an out-of-range hexagram, as documented', () => {
    expect(najiaForHexagram(0)).toEqual([]);
    expect(najiaForHexagram(65)).toEqual([]);
  });
});

describe('六親 — six relatives against the palace element', () => {
  it('reads the worked example from the sources', () => {
    // 水風井 (48) is 震宮, wood. Line 1 is 辛丑, 丑 is earth, wood controls earth
    // → 妻財.
    expect(HEXAGRAM_PALACE[48].palace).toBe('zhen');
    expect(relativesForHexagram(48)[0]).toBe('wealth');
  });

  it('gives 乾為天 its canonical column', () => {
    // 乾宮金. 子水 子孫, 寅木 妻財, 辰土 父母, 午火 官鬼, 申金 兄弟, 戌土 父母.
    expect(relativesForHexagram(1)).toEqual([
      'offspring', 'wealth', 'parent', 'officer', 'sibling', 'parent',
    ]);
  });

  it('returns six defined roles for all 64', () => {
    for (let n = 1; n <= 64; n++) {
      const r = relativesForHexagram(n);
      expect([n, r.length]).toEqual([n, 6]);
      for (const role of r) expect([n, !!RELATIVE_INFO[role]]).toEqual([n, true]);
    }
  });

  it('gives every 本宮卦 all five roles — the precondition 伏神 depends on', () => {
    for (const n of [1, 58, 30, 51, 57, 29, 52, 2]) {
      expect([n, new Set(relativesForHexagram(n)).size]).toEqual([n, 5]);
    }
  });
});

describe('伏神 — hidden spirits', () => {
  it('supplies exactly the roles the cast hexagram lacks', () => {
    for (let n = 1; n <= 64; n++) {
      const present = new Set(relativesForHexagram(n));
      const hidden = hiddenSpiritsForHexagram(n);
      expect([n, hidden.length]).toEqual([n, 5 - present.size]);
      for (const h of hidden) {
        expect([n, present.has(h.relative)]).toEqual([n, false]);
        expect(h.position).toBeGreaterThanOrEqual(1);
        expect(h.position).toBeLessThanOrEqual(6);
      }
      expect(new Set(hidden.map((h) => h.relative)).size).toBe(hidden.length);
    }
  });

  it('matches the textbook example', () => {
    // 天風姤 hides 妻財 (寅木) under line 2.
    const h = hiddenSpiritsForHexagram(44).find((x) => x.relative === 'wealth');
    expect(h).toBeDefined();
    expect(h!.position).toBe(2);
  });
});

describe('六神 — spirits from the day stem', () => {
  it('seeds on the stem the verse names, then cycles', () => {
    const START: Record<string, string> = {
      甲: '青龍', 乙: '青龍', 丙: '朱雀', 丁: '朱雀', 戊: '勾陳',
      己: '螣蛇', 庚: '白虎', 辛: '白虎', 壬: '玄武', 癸: '玄武',
    };
    const CYCLE = ['青龍', '朱雀', '勾陳', '螣蛇', '白虎', '玄武'];
    for (const stem of STEMS) {
      const spirits = spiritsForDayStem(stem);
      expect([stem, spirits.length]).toEqual([stem, 6]);
      const cn = spirits.map((s) => SPIRIT_INFO[s].cn);
      expect([stem, cn[0]]).toEqual([stem, START[stemCn(stem)]]);
      // a full six-cycle in order from that seed
      const from = CYCLE.indexOf(cn[0]);
      expect([stem, cn]).toEqual([stem, CYCLE.map((_, i) => CYCLE[(from + i) % 6])]);
    }
  });
});

describe('readLiuYao — end to end', () => {
  it('reads an all-yang cast as 乾為天 with a full annotated column', () => {
    const r = readLiuYao([7, 7, 7, 7, 7, 7], new Date('2026-08-17T01:00:00Z'))!;
    expect(r).not.toBeNull();
    expect(r.primaryHexagram).toBe(1);
    expect(r.palace).toBe('qian');
    expect(r.lines).toHaveLength(6);
    expect(r.lines.every((l) => l.line === 'yang')).toBe(true);
    expect(r.lines.every((l) => !l.moving)).toBe(true);
    expect(r.lines.filter((l) => l.isWorld)).toHaveLength(1);
    expect(r.lines.filter((l) => l.isResponse)).toHaveLength(1);
  });

  it('produces a changed hexagram only when a line moves', () => {
    expect(readLiuYao([7, 7, 7, 7, 7, 7])!.changed).toBeNull();
    const moving = readLiuYao([9, 7, 7, 7, 7, 7])!;
    expect(moving.changed).not.toBeNull();
    expect(moving.lines[0].moving).toBe(true);
  });

  it('never emits a blank field, across all 4096 casts', () => {
    const VALUES = [6, 7, 8, 9] as const;
    for (let i = 0; i < 4096; i++) {
      const cast = [0, 1, 2, 3, 4, 5].map((k) => VALUES[(i >> (k * 2)) & 3]);
      const r = readLiuYao(cast, new Date('2026-06-15T04:00:00Z'));
      expect([i, r !== null]).toEqual([i, true]);
      for (const l of r!.lines) {
        expect(l.branchCn.length).toBeGreaterThan(0);
        expect(RELATIVE_INFO[l.relative]).toBeDefined();
        expect(SPIRIT_INFO[l.spirit]).toBeDefined();
      }
    }
  });

  it('rejects malformed casts rather than guessing', () => {
    expect(readLiuYao([])).toBeNull();
    expect(readLiuYao([7, 7, 7])).toBeNull();
    expect(readLiuYao([7, 7, 7, 7, 7, 5 as never])).toBeNull();
    expect(readLiuYao([7, 7, 7, 7, 7, 7], new Date('nonsense'))).toBeNull();
  });
});

describe('content covers every key the engine can produce', () => {
  it('has meanings for all five relatives, six spirits and eight palaces', () => {
    for (const k of Object.keys(RELATIVE_INFO)) {
      expect([k, !!RELATIVE_MEANINGS[k as keyof typeof RELATIVE_MEANINGS]]).toEqual([k, true]);
    }
    for (const k of Object.keys(SPIRIT_INFO)) {
      expect([k, !!SPIRIT_MEANINGS[k as keyof typeof SPIRIT_MEANINGS]]).toEqual([k, true]);
    }
    for (const k of Object.keys(PALACE_INFO)) {
      expect([k, !!PALACE_MEANINGS[k as keyof typeof PALACE_MEANINGS]]).toEqual([k, true]);
    }
  });

  it('keeps the Chinese names identical on both sides of the contract', () => {
    // The two files are hand-maintained against each other, so a drift here is
    // exactly the failure that hit the mansion tables.
    for (const [k, v] of Object.entries(RELATIVE_INFO)) {
      const m = RELATIVE_MEANINGS[k as keyof typeof RELATIVE_MEANINGS];
      expect([k, m?.cn]).toEqual([k, v.cn]);
    }
    for (const [k, v] of Object.entries(SPIRIT_INFO)) {
      const m = SPIRIT_MEANINGS[k as keyof typeof SPIRIT_MEANINGS];
      expect([k, m?.cn]).toEqual([k, v.cn]);
    }
  });

  it('carries no placeholder text', () => {
    for (const v of Object.values(RELATIVE_MEANINGS)) {
      expect(v.text.length).toBeGreaterThan(120);
      expect(v.asks.length).toBeGreaterThan(30);
    }
    for (const v of Object.values(SPIRIT_MEANINGS)) expect(v.text.length).toBeGreaterThan(80);
  });
});
