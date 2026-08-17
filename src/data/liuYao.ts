// 六爻 (Liu Yao) / 納甲筮法 — REFERENCE TABLES + PLACEMENT RULES.
//
// SCOPE: pure data and the placement rules that annotate a cast hexagram. No
// React, no interpretation prose (a separate content file owns that), no
// judgement engine. This module answers “what is written on the chart”, never
// “what does it mean”.
//
// ── WHAT THIS MODULE IS ABOUT ────────────────────────────────────────────────
//
// 六爻 reads a hexagram as a DIVINATION INSTRUMENT rather than as a wisdom
// text. src/data/ichingHexagrams.ts already owns the wisdom-text side (names,
// judgements, images, prose); this file never duplicates or modifies it — it
// imports from it. What 六爻 adds on top of the same six lines is:
//
//   1. 八宮 — every hexagram belongs to one of eight palaces, and the palace
//      carries a FIVE-ELEMENT attribute that acts as “me” for the whole chart.
//   2. 世/應 — one line is 世 (the querent) and one is 應 (the other party).
//      Both follow mechanically from the hexagram’s RANK inside its palace.
//   3. 納甲 — each line gets a stem-branch, assigned per trigram, and the
//      branch’s element is what the rest of the method actually operates on.
//   4. 六親 — each line’s branch element compared to the PALACE element gives
//      it a kinship role: 父母 / 兄弟 / 官鬼 / 妻財 / 子孫.
//   5. 六神 (六獸) — a spirit per line, seeded by the DAY STEM of the reading.
//   6. 伏神 — a 六親 role missing from the cast hexagram is not absent; it is
//      hidden, and is read off the palace’s 本宮卦 at the same line position.
//
// Only (5) and the day/month pillars depend on the calendar. Everything else is
// a pure function of the six line values.
//
// ── SOURCES ──────────────────────────────────────────────────────────────────
//
//   [A] bopo/najia — 基于 python 开发的纳甲六爻排盘项目. Its `const.py` carries
//       the 納甲 table (NAJIA), the palace element table (GUA5), and GUA64 in
//       eight-palace order; `utils.py` carries `set_shi_yao` (世應),
//       `get_qin6` (六親), `get_god6` (六神) and `get_najia`; `najia.py`
//       carries `_hidden` (伏神). Read as source, not as prose:
//       https://raw.githubusercontent.com/bopo/najia/master/najia/const.py
//       https://raw.githubusercontent.com/bopo/najia/master/najia/utils.py
//       https://raw.githubusercontent.com/bopo/najia/master/najia/najia.py
//   [B] kentang2017/ichingshifa — an INDEPENDENT Python implementation. Its
//       `src/ichingshifa/data.pkl` holds `八宮卦`, `八宮卦五行`, `世應排法`,
//       `八卦六爻五行` and `六親五行` as explicit tables:
//       https://raw.githubusercontent.com/kentang2017/ichingshifa/master/src/ichingshifa/data.pkl
//       (repo: https://github.com/kentang2017/ichingshifa)
//   [C] 《卜筮正宗》六獸/六神 — the classical 六兽歌 for the day-stem seeding,
//       reproduced at https://www.quanxue.cn/qt_mingxiang/boshi/boshi08.html
//   [D] 好赞易学 — 六爻中的六神配置 (day-stem table + cycle order).
//       http://www.howzan.com/liu-yao/liu-shen-pei-zhi/
//   [E] 君無憂 — 六爻裝卦的方法. Per-trigram 納甲 starting stem-branch for inner
//       and outer trigram, the 尋世訣, and the 六親 生剋 rule.
//       https://www.jun5you.com/welcome/artview1752
//   [F] Cantian AI wiki — 六爻飛神伏神. States the 伏神 rule explicitly:
//       “用神不上卦時…要回到本宮首卦尋找伏神，再看它伏在哪一爻之下.”
//       https://www.cantian.ai/wiki/zh-Hans/iching/liuyao/terms/flying-hidden-spirit/
//   [G] 易師匯 — 六爻卦裝六親的方法和規律. On the changed hexagram:
//       “變卦六親要按照正卦來安。” https://ly.yishihui.net/16031.htm
//
// ── SOURCE CONFLICTS, AND HOW THEY WERE RESOLVED ─────────────────────────────
//
//   * 應爻 of a 四世卦. [B]’s `世應排法` table reads, by rank,
//       本宮 初二應四五世 · 一世 世二三應五六 · 二世 初世三四應六 ·
//       三世 初二世四五應 · 四世 初二三世五應 · 五世 初應三四世六 ·
//       遊魂 應二三世五六 · 歸魂 初二世四五應
//     Read positionally, seven of the eight rows put 應 exactly three lines from
//     世 — but the 四世 row puts 世 on 4 and 應 on 6, which is two. That is a
//     defect in that one row (compare its own 遊魂 row, also 世 on 4, which
//     correctly gives 應 on 1). WE IMPLEMENT THE RULE, not that table: 應 is
//     always three lines from 世 (一與四, 二與五, 三與六), which is [A]’s
//     `set_shi_yao` (`ying = shi - 3 if shi > 3 else shi + 3`) and [E]’s
//     「世隔兩爻即為應」. See responseLineFor().
//   * 六親 of the CHANGED hexagram. Two readings exist: score the changed lines
//     against the changed hexagram’s OWN palace, or against the PRIMARY
//     hexagram’s palace. We follow the mainstream — the primary palace — per
//     [G] (“變卦六親要按照正卦來安”) and [A] (`_transform` passes the original
//     `gong` into `get_qin6`). The changed hexagram’s own palace and 世/應 are
//     still reported, because they are read for other purposes.
//   * 陰陽 grouping of the trigrams — NOT a conflict. [E] states it outright:
//     「乾、震、坎、艮为阳卦，坤、巽、离、兑为阴卦」, and applies it as the stepping
//     rule — 陽卦 run FORWARD through 子寅辰午申戌, 陰卦 run BACKWARD through
//     亥酉未巳卯丑. NAJIA_DIRECTION encodes exactly that and no source disagrees.
//     (An earlier draft of this header claimed [E] mislabels 離/兌 as 陽 and that
//     we were resolving a conflict. That was wrong — the page says the opposite.
//     Left recorded here because a header that invents a disagreement is worse
//     than one that says nothing.)
//   * 螣蛇 vs 騰蛇. [A] and [C] write 螣蛇; [B] writes 騰蛇. Interchangeable
//     variants for the same spirit. We print 螣蛇.
//   * 伏神 is implemented, not omitted: [F] and [A] agree on both halves of the
//     rule (source = the palace’s 本宮卦, position = the same line number), and
//     [A] ships it as executable code. Only the JUDGEMENT of a 伏神 (whether it
//     can surface) is contested, and this file does not judge.
//
// NOTHING IN THIS FILE IS INVENTED. Every table below is attested by at least
// two of the sources above, and every table that a rule can regenerate is
// exported ALONGSIDE that rule — see derivePalaceSequence(), NAJIA_DIRECTION
// and auditLiuYaoTables(), which exist so a golden test under src/test/ can
// prove table and rule agree. That pattern has caught real defects on this
// codebase before.
//
// PAIRED CONTENT FILE: src/data/liuYaoContent.ts holds the prose and declares
// its own local copies of `Palace`, `Relative` and `Spirit`. The dependency
// runs one way — nothing here imports from there — so the key sets are a
// hand-maintained contract, not a compiler-enforced one. Keep them identical.

import {
  HEXAGRAMS,
  LINES_TO_HEXAGRAM,
  castFromLineValues,
  type Line,
  type LineValue,
} from './ichingHexagrams';
import {
  BRANCHES,
  BRANCH_ELEMENT,
  ELEMENT_CONTROLS,
  ELEMENT_PRODUCES,
  STEMS,
  computeBazi,
  type EarthlyBranch,
  type FiveElement,
  type HeavenlyStem,
} from './bazi';

/* ────────────────────────────────────────────────────────────────────────
 * 1. Glyph tables for the pieces bazi.ts keeps romanised
 * ──────────────────────────────────────────────────────────────────────── */

/** 十天干 in STEMS order. */
export const STEM_CN: Record<HeavenlyStem, string> = {
  Jia: '甲', Yi: '乙', Bing: '丙', Ding: '丁', Wu: '戊',
  Ji: '己', Geng: '庚', Xin: '辛', Ren: '壬', Gui: '癸',
};

/** 十二地支 in BRANCHES order. */
export const BRANCH_CN: Record<EarthlyBranch, string> = {
  Zi: '子', Chou: '丑', Yin: '寅', Mao: '卯', Chen: '辰', Si: '巳',
  Wu: '午', Wei: '未', Shen: '申', You: '酉', Xu: '戌', Hai: '亥',
};

/* ────────────────────────────────────────────────────────────────────────
 * 2. Trigrams — bit patterns, keyed by ichingHexagrams.ts’ own names
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The eight trigram names EXACTLY as ichingHexagrams.ts spells them in
 * `upperTrigram` / `lowerTrigram`. That file types those fields as `string`,
 * so the union here is the contract; TRIGRAM_NAJIA is deliberately widened to
 * `Record<string, …>` at export so a consumer can index it with a raw
 * `HEXAGRAMS[n].upperTrigram` without a cast.
 */
export type TrigramName =
  | 'Heaven' | 'Lake' | 'Fire' | 'Thunder'
  | 'Wind' | 'Water' | 'Mountain' | 'Earth';

/**
 * Three-bit pattern per trigram, BOTTOM-TO-TOP, '1' = yang — the same
 * convention as LINES_TO_HEXAGRAM in ichingHexagrams.ts (whose keys are the
 * lower trigram’s three bits followed by the upper trigram’s three).
 */
export const TRIGRAM_BITS: Record<TrigramName, string> = {
  Heaven:   '111', // ☰ 乾
  Lake:     '110', // ☱ 兌  (yin on top)
  Fire:     '101', // ☲ 離
  Thunder:  '100', // ☳ 震
  Wind:     '011', // ☴ 巽  (yin at bottom)
  Water:    '010', // ☵ 坎
  Mountain: '001', // ☶ 艮
  Earth:    '000', // ☷ 坤
};

const BITS_TO_TRIGRAM: Record<string, TrigramName> = Object.fromEntries(
  (Object.keys(TRIGRAM_BITS) as TrigramName[]).map((t) => [TRIGRAM_BITS[t], t])
);

/**
 * Hexagram number → six-bit pattern, bottom-to-top. Inverted from
 * LINES_TO_HEXAGRAM so there is exactly one place in the codebase where a
 * hexagram’s bits are written down, and it is not this file.
 */
export const HEXAGRAM_BITS: Record<number, string> = Object.fromEntries(
  Object.entries(LINES_TO_HEXAGRAM).map(([bits, n]) => [n, bits])
);

/** Inner (lines 1-3) and outer (lines 4-6) trigram of a hexagram. */
export function trigramsForHexagram(
  hexNumber: number
): { inner: TrigramName; outer: TrigramName } | null {
  const bits = HEXAGRAM_BITS[hexNumber];
  if (!bits) return null;
  const inner = BITS_TO_TRIGRAM[bits.slice(0, 3)];
  const outer = BITS_TO_TRIGRAM[bits.slice(3, 6)];
  if (!inner || !outer) return null;
  return { inner, outer };
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. 八宮 — the eight palaces
 * ──────────────────────────────────────────────────────────────────────── */

export type Palace = 'qian' | 'dui' | 'li' | 'zhen' | 'xun' | 'kan' | 'gen' | 'kun';

/**
 * Palace glyph and FIVE-ELEMENT attribute. Sources [A] (`GUA5` against
 * `XING5`) and [B] (`八宮卦五行`) agree on all eight.
 *
 * Note two pairs share an element — 乾/兌 are both 金, 震/巽 both 木, 艮/坤
 * both 土 — so the palace element alone does not identify the palace.
 */
export const PALACE_INFO: Record<Palace, { cn: string; element: FiveElement }> = {
  qian: { cn: '乾', element: 'metal' },
  dui:  { cn: '兌', element: 'metal' },
  li:   { cn: '離', element: 'fire'  },
  zhen: { cn: '震', element: 'wood'  },
  xun:  { cn: '巽', element: 'wood'  },
  kan:  { cn: '坎', element: 'water' },
  gen:  { cn: '艮', element: 'earth' },
  kun:  { cn: '坤', element: 'earth' },
};

/** Palace ↔ the trigram it is named for. */
export const PALACE_TRIGRAM: Record<Palace, TrigramName> = {
  qian: 'Heaven', dui: 'Lake', li: 'Fire', zhen: 'Thunder',
  xun: 'Wind', kan: 'Water', gen: 'Mountain', kun: 'Earth',
};

export const TRIGRAM_PALACE: Record<TrigramName, Palace> = {
  Heaven: 'qian', Lake: 'dui', Fire: 'li', Thunder: 'zhen',
  Wind: 'xun', Water: 'kan', Mountain: 'gen', Earth: 'kun',
};

/** The eight ranks inside a palace, index = rank. */
export const RANK_INFO: { cn: string; en: string }[] = [
  { cn: '本宮卦', en: 'Pure palace'   }, // 0 — the doubled trigram
  { cn: '一世卦', en: 'First world'   }, // 1
  { cn: '二世卦', en: 'Second world'  }, // 2
  { cn: '三世卦', en: 'Third world'   }, // 3
  { cn: '四世卦', en: 'Fourth world'  }, // 4
  { cn: '五世卦', en: 'Fifth world'   }, // 5
  { cn: '遊魂卦', en: 'Wandering soul' }, // 6
  { cn: '歸魂卦', en: 'Returning soul' }, // 7
];

/**
 * THE TABLE. Each palace’s eight hexagram numbers in rank order
 * 本宮 · 一世 · 二世 · 三世 · 四世 · 五世 · 遊魂 · 歸魂.
 *
 * Attested identically by [A] (`GUA64`, whose insertion order IS this table)
 * and [B] (`八宮卦五行`, whose keys are these same eight-name groups), and
 * reproduced by derivePalaceSequence() below from the generation rule alone.
 *
 * 乾宮金: 乾為天 天風姤 天山遯 天地否 風地觀 山地剝 火地晉 火天大有
 * 兌宮金: 兌為澤 澤水困 澤地萃 澤山咸 水山蹇 地山謙 雷山小過 雷澤歸妹
 * 離宮火: 離為火 火山旅 火風鼎 火水未濟 山水蒙 風水渙 天水訟 天火同人
 * 震宮木: 震為雷 雷地豫 雷水解 雷風恆 地風升 水風井 澤風大過 澤雷隨
 * 巽宮木: 巽為風 風天小畜 風火家人 風雷益 天雷無妄 火雷噬嗑 山雷頤 山風蠱
 * 坎宮水: 坎為水 水澤節 水雷屯 水火既濟 澤火革 雷火豐 地火明夷 地水師
 * 艮宮土: 艮為山 山火賁 山天大畜 山澤損 火澤睽 天澤履 風澤中孚 風山漸
 * 坤宮土: 坤為地 地雷復 地澤臨 地天泰 雷天大壯 澤天夬 水天需 水地比
 */
export const PALACE_SEQUENCE: Record<Palace, number[]> = {
  qian: [1, 44, 33, 12, 20, 23, 35, 14],
  dui:  [58, 47, 45, 31, 39, 15, 62, 54],
  li:   [30, 56, 50, 64, 4, 59, 6, 13],
  zhen: [51, 16, 40, 32, 46, 48, 28, 17],
  xun:  [57, 9, 37, 42, 25, 21, 27, 18],
  kan:  [29, 60, 3, 63, 49, 55, 36, 7],
  gen:  [52, 22, 26, 41, 38, 10, 61, 53],
  kun:  [2, 24, 19, 11, 34, 43, 5, 8],
};

/**
 * THE RULE, as executable documentation. A palace is generated from its pure
 * doubled trigram by flipping lines from the bottom up:
 *
 *   本宮 — the trigram doubled, nothing flipped
 *   一世 — flip line 1          四世 — flip lines 1-4
 *   二世 — flip lines 1-2       五世 — flip lines 1-5
 *   三世 — flip lines 1-3       遊魂 — from 五世, flip line 4 BACK
 *   歸魂 — from 遊魂, restore the whole inner trigram to the original
 *
 * (「遊魂卦為下五爻都變之後，再回頭往第四爻變回原本的陰陽；歸魂卦則是在遊魂之後，
 * 下體變回本宮的陰陽」.) auditLiuYaoTables() asserts derivePalaceSequence(p) equals
 * PALACE_SEQUENCE[p] for all eight palaces — if the literal table above ever
 * drifts, that assertion is what catches it.
 */
export function derivePalaceSequence(palace: Palace): number[] {
  const base = TRIGRAM_BITS[PALACE_TRIGRAM[palace]];
  const flip = (bits: string, index: number): string =>
    bits.slice(0, index) + (bits[index] === '1' ? '0' : '1') + bits.slice(index + 1);

  const patterns: string[] = [];
  let current = base + base; // 本宮卦 — inner and outer are the same trigram
  patterns.push(current);
  for (let i = 0; i < 5; i++) {
    current = flip(current, i); // 一世 … 五世
    patterns.push(current);
  }
  const wandering = flip(current, 3); // 遊魂 — line 4 reverts
  patterns.push(wandering);
  patterns.push(base + wandering.slice(3, 6)); // 歸魂 — inner trigram reverts

  return patterns.map((p) => LINES_TO_HEXAGRAM[p]);
}

/**
 * All 64 hexagrams → their palace and rank. Mechanically inverted from
 * PALACE_SEQUENCE so the two can never disagree; PALACE_SEQUENCE is the thing
 * to edit, and derivePalaceSequence() is the thing that proves it right.
 */
export const HEXAGRAM_PALACE: Record<number, { palace: Palace; rank: number }> =
  (() => {
    const out: Record<number, { palace: Palace; rank: number }> = {};
    for (const palace of Object.keys(PALACE_SEQUENCE) as Palace[]) {
      PALACE_SEQUENCE[palace].forEach((hex, rank) => {
        out[hex] = { palace, rank };
      });
    }
    return out;
  })();

/* ────────────────────────────────────────────────────────────────────────
 * 4. 世應 — world and response lines
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 世爻 from the palace rank. Line numbers are 1-6 counting from the BOTTOM.
 *
 *   本宮 → 6   一世 → 1   二世 → 2   三世 → 3
 *   四世 → 4   五世 → 5   遊魂 → 4   歸魂 → 3
 *
 * i.e. ranks 1-5 place 世 on their own number, the pure palace hexagram places
 * it on the top line, and the two soul hexagrams reuse 4 and 3. Sources [A]
 * (`set_shi_yao`) and [B] (`世應排法`) agree on all eight.
 *
 * Returns 0 for a rank outside 0-7 rather than throwing — callers treat 0 as
 * “no world line”, and readLiuYao() can only ever pass a rank it got from
 * HEXAGRAM_PALACE.
 */
export function worldLineFor(rank: number): number {
  switch (rank) {
    case 0: return 6; // 本宮卦
    case 1: return 1;
    case 2: return 2;
    case 3: return 3;
    case 4: return 4;
    case 5: return 5;
    case 6: return 4; // 遊魂卦
    case 7: return 3; // 歸魂卦
    default: return 0;
  }
}

/**
 * 應爻 — always three lines from 世 (一與四, 二與五, 三與六). See the header
 * note on [B]’s defective 四世 row; this rule is the one both [A] and [E]
 * encode, and it is what the file uses everywhere.
 */
export function responseLineFor(worldLine: number): number {
  // Comparison alone lets NaN, 1.5 and the string '3' past — and '3' + 3 is '33'.
  if (!Number.isInteger(worldLine) || worldLine < 1 || worldLine > 6) return 0;
  return worldLine > 3 ? worldLine - 3 : worldLine + 3;
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. 納甲 — stem and branch per line
 * ──────────────────────────────────────────────────────────────────────── */

export interface TrigramNajia {
  /** 卦名 glyph. */
  cn: string;
  /** Stem for lines 1-3 when this trigram is the INNER trigram. */
  stem: HeavenlyStem;
  /** Stem for lines 4-6 when this trigram is the OUTER trigram. */
  outerStem: HeavenlyStem;
  /** Branches for lines 1, 2, 3 when this trigram is the inner trigram. */
  innerBranches: [EarthlyBranch, EarthlyBranch, EarthlyBranch];
  /** Branches for lines 4, 5, 6 when this trigram is the outer trigram. */
  outerBranches: [EarthlyBranch, EarthlyBranch, EarthlyBranch];
}

/**
 * THE TABLE. 「乾納甲壬、坤納乙癸、震納庚、巽納辛、坎納戊、離納己、艮納丙、兌納丁」
 * — only 乾 and 坤 take a second stem for their outer trigram; the other six
 * use one stem throughout.
 *
 * Attested identically by [A] (`NAJIA`), [B] (`八卦六爻五行`, which stores the
 * same sequences as their element strings), and [E] (which gives each
 * trigram’s inner and outer STARTING stem-branch):
 *
 *   乾 甲子 甲寅 甲辰 / 壬午 壬申 壬戌      兌 丁巳 丁卯 丁丑 / 丁亥 丁酉 丁未
 *   離 己卯 己丑 己亥 / 己酉 己未 己巳      震 庚子 庚寅 庚辰 / 庚午 庚申 庚戌
 *   巽 辛丑 辛亥 辛酉 / 辛未 辛巳 辛卯      坎 戊寅 戊辰 戊午 / 戊申 戊戌 戊子
 *   艮 丙辰 丙午 丙申 / 丙戌 丙子 丙寅      坤 乙未 乙巳 乙卯 / 癸丑 癸亥 癸酉
 *
 * 坤 and 巽 are the usual place to slip because their branches run BACKWARD
 * (未→巳→卯, 丑→亥→酉), and so do 離’s and 兌’s. NAJIA_DIRECTION below
 * regenerates all eight sequences from that rule; auditLiuYaoTables() asserts
 * the two agree.
 */
const TRIGRAM_NAJIA_TABLE: Record<TrigramName, TrigramNajia> = {
  Heaven: {
    cn: '乾', stem: 'Jia', outerStem: 'Ren',
    innerBranches: ['Zi', 'Yin', 'Chen'],   // 甲子 甲寅 甲辰
    outerBranches: ['Wu', 'Shen', 'Xu'],    // 壬午 壬申 壬戌
  },
  Lake: {
    cn: '兌', stem: 'Ding', outerStem: 'Ding',
    innerBranches: ['Si', 'Mao', 'Chou'],   // 丁巳 丁卯 丁丑
    outerBranches: ['Hai', 'You', 'Wei'],   // 丁亥 丁酉 丁未
  },
  Fire: {
    cn: '離', stem: 'Ji', outerStem: 'Ji',
    innerBranches: ['Mao', 'Chou', 'Hai'],  // 己卯 己丑 己亥
    outerBranches: ['You', 'Wei', 'Si'],    // 己酉 己未 己巳
  },
  Thunder: {
    cn: '震', stem: 'Geng', outerStem: 'Geng',
    innerBranches: ['Zi', 'Yin', 'Chen'],   // 庚子 庚寅 庚辰
    outerBranches: ['Wu', 'Shen', 'Xu'],    // 庚午 庚申 庚戌
  },
  Wind: {
    cn: '巽', stem: 'Xin', outerStem: 'Xin',
    innerBranches: ['Chou', 'Hai', 'You'],  // 辛丑 辛亥 辛酉
    outerBranches: ['Wei', 'Si', 'Mao'],    // 辛未 辛巳 辛卯
  },
  Water: {
    cn: '坎', stem: 'Wu', outerStem: 'Wu',
    innerBranches: ['Yin', 'Chen', 'Wu'],   // 戊寅 戊辰 戊午
    outerBranches: ['Shen', 'Xu', 'Zi'],    // 戊申 戊戌 戊子
  },
  Mountain: {
    cn: '艮', stem: 'Bing', outerStem: 'Bing',
    innerBranches: ['Chen', 'Wu', 'Shen'],  // 丙辰 丙午 丙申
    outerBranches: ['Xu', 'Zi', 'Yin'],     // 丙戌 丙子 丙寅
  },
  Earth: {
    cn: '坤', stem: 'Yi', outerStem: 'Gui',
    innerBranches: ['Wei', 'Si', 'Mao'],    // 乙未 乙巳 乙卯
    outerBranches: ['Chou', 'Hai', 'You'],  // 癸丑 癸亥 癸酉
  },
};

/**
 * Exported deliberately as `Record<string, …>`, not `Record<TrigramName, …>`:
 * ichingHexagrams.ts types `upperTrigram`/`lowerTrigram` as plain `string`, so
 * a narrower index signature would force every consumer into a cast. The
 * literal above is still declared with the exhaustive type, so a missing or
 * misspelled trigram is a compile error here rather than an `undefined` at
 * runtime in a component.
 */
export const TRIGRAM_NAJIA: Record<string, TrigramNajia> = TRIGRAM_NAJIA_TABLE;

/**
 * THE RULE, as executable documentation. Branches are seeded per trigram and
 * then STEP BY TWO — forward for the four yang trigrams (乾震坎艮), backward
 * for the four yin trigrams (坤巽離兌) — and the outer trigram starts exactly
 * six branches (half the cycle) from the inner one.
 *
 * `start` is the inner trigram’s line-1 branch as an index into BRANCHES.
 */
export const NAJIA_DIRECTION: Record<TrigramName, { start: number; step: 2 | -2 }> = {
  Heaven:   { start: 0, step:  2 }, // 子, forward → 子寅辰 / 午申戌
  Thunder:  { start: 0, step:  2 }, // 子, forward → 子寅辰 / 午申戌
  Water:    { start: 2, step:  2 }, // 寅, forward → 寅辰午 / 申戌子
  Mountain: { start: 4, step:  2 }, // 辰, forward → 辰午申 / 戌子寅
  Earth:    { start: 7, step: -2 }, // 未, backward → 未巳卯 / 丑亥酉
  Wind:     { start: 1, step: -2 }, // 丑, backward → 丑亥酉 / 未巳卯
  Fire:     { start: 3, step: -2 }, // 卯, backward → 卯丑亥 / 酉未巳
  Lake:     { start: 5, step: -2 }, // 巳, backward → 巳卯丑 / 亥酉未
};

/** Regenerate one trigram’s six branches from NAJIA_DIRECTION. */
export function deriveTrigramBranches(trigram: TrigramName): {
  innerBranches: EarthlyBranch[];
  outerBranches: EarthlyBranch[];
} {
  const { start, step } = NAJIA_DIRECTION[trigram];
  const at = (n: number): EarthlyBranch => BRANCHES[((start + step * n) % 12 + 12) % 12];
  return {
    innerBranches: [at(0), at(1), at(2)],
    // The outer trigram picks up half a cycle away and keeps the same step.
    outerBranches: [at(3), at(4), at(5)],
  };
}

/**
 * The six stem-branch pairs of a hexagram, LINE 1 (bottom) FIRST.
 *
 * Lines 1-3 take the INNER trigram’s inner column, lines 4-6 the OUTER
 * trigram’s outer column — the two trigrams are looked up independently, which
 * is why e.g. 天風姤 (inner 巽, outer 乾) reads 辛丑 辛亥 辛酉 壬午 壬申 壬戌.
 *
 * Returns an empty array for a hexagram number outside 1-64.
 */
export function najiaForHexagram(
  hexNumber: number
): { stem: HeavenlyStem; branch: EarthlyBranch }[] {
  const trigrams = trigramsForHexagram(hexNumber);
  if (!trigrams) return [];
  const inner = TRIGRAM_NAJIA_TABLE[trigrams.inner];
  const outer = TRIGRAM_NAJIA_TABLE[trigrams.outer];
  return [
    ...inner.innerBranches.map((branch) => ({ stem: inner.stem, branch })),
    ...outer.outerBranches.map((branch) => ({ stem: outer.outerStem, branch })),
  ];
}

/* ────────────────────────────────────────────────────────────────────────
 * 6. 六親 — the five kinship roles
 * ──────────────────────────────────────────────────────────────────────── */

export type Relative = 'parent' | 'sibling' | 'offspring' | 'wealth' | 'officer';

export const RELATIVE_INFO: Record<Relative, { cn: string; en: string }> = {
  parent:    { cn: '父母', en: 'Parent'    }, // 生我者
  sibling:   { cn: '兄弟', en: 'Sibling'   }, // 比和者
  offspring: { cn: '子孫', en: 'Offspring' }, // 我生者
  wealth:    { cn: '妻財', en: 'Wealth'    }, // 我剋者
  officer:   { cn: '官鬼', en: 'Officer'   }, // 剋我者
};

/**
 * THE RULE. “我” is the PALACE element; the line’s own element is its branch’s
 * element. Five outcomes, and they are exhaustive because the 生 and 剋 cycles
 * between five elements cover every ordered pair:
 *
 *   比和者兄弟 — same element
 *   我生者子孫 — palace produces line
 *   生我者父母 — line produces palace
 *   我剋者妻財 — palace controls line
 *   剋我者官鬼 — line controls palace
 *
 * ELEMENT_PRODUCES and ELEMENT_CONTROLS come from bazi.ts; the cycles are NOT
 * re-declared here. Sources [A] (`get_qin6`), [B] (`六親五行`) and [E] agree.
 */
export function relativeFor(palaceElement: FiveElement, lineElement: FiveElement): Relative {
  if (lineElement === palaceElement) return 'sibling';
  if (ELEMENT_PRODUCES[palaceElement] === lineElement) return 'offspring';
  if (ELEMENT_PRODUCES[lineElement] === palaceElement) return 'parent';
  if (ELEMENT_CONTROLS[palaceElement] === lineElement) return 'wealth';
  return 'officer'; // ELEMENT_CONTROLS[lineElement] === palaceElement — the only case left
}

/**
 * The six 六親 of a hexagram, line 1 first, scored against ITS OWN palace.
 * Returns an empty array for a hexagram number outside 1-64.
 *
 * For the CHANGED hexagram of a reading this is the wrong function — its lines
 * are scored against the PRIMARY hexagram’s palace (see the header note on
 * [G]) — so readLiuYao() calls relativeFor() directly there.
 */
export function relativesForHexagram(hexNumber: number): Relative[] {
  const entry = HEXAGRAM_PALACE[hexNumber];
  if (!entry) return [];
  const palaceElement = PALACE_INFO[entry.palace].element;
  return najiaForHexagram(hexNumber).map((n) =>
    relativeFor(palaceElement, BRANCH_ELEMENT[n.branch])
  );
}

/* ────────────────────────────────────────────────────────────────────────
 * 7. 六神 / 六獸 — the six spirits
 * ──────────────────────────────────────────────────────────────────────── */

export type Spirit =
  | 'azureDragon' | 'vermilionBird' | 'hookSnake'
  | 'soaringSnake' | 'whiteTiger' | 'darkWarrior';

export const SPIRIT_INFO: Record<Spirit, { cn: string; en: string }> = {
  azureDragon:   { cn: '青龍', en: 'Azure Dragon'  },
  vermilionBird: { cn: '朱雀', en: 'Vermilion Bird' },
  hookSnake:     { cn: '勾陳', en: 'Hooked Snake'  },
  soaringSnake:  { cn: '螣蛇', en: 'Soaring Snake' }, // 騰蛇 in some tables
  whiteTiger:    { cn: '白虎', en: 'White Tiger'   },
  darkWarrior:   { cn: '玄武', en: 'Dark Warrior'  },
};

/** The fixed cycle 青龍→朱雀→勾陳→螣蛇→白虎→玄武, then back to 青龍. */
export const SPIRIT_CYCLE: Spirit[] = [
  'azureDragon', 'vermilionBird', 'hookSnake', 'soaringSnake', 'whiteTiger', 'darkWarrior',
];

/**
 * 六兽歌: 「甲乙起青龍，丙丁起朱雀。戊日起勾陳，己日起螣蛇。庚辛起白虎，壬癸起玄武。」
 * Source [C] (《卜筮正宗》), corroborated by [D] and by [A]’s `get_god6`.
 *
 * Note the asymmetry that makes this worth a table rather than arithmetic:
 * every element pairs its two stems onto ONE spirit, except 土 — 戊 takes 勾陳
 * and 己 takes 螣蛇 separately, which is exactly why there are six spirits for
 * five elements.
 */
export const SPIRIT_START_BY_STEM: Record<HeavenlyStem, Spirit> = {
  Jia:  'azureDragon',   // 甲 木
  Yi:   'azureDragon',   // 乙 木
  Bing: 'vermilionBird', // 丙 火
  Ding: 'vermilionBird', // 丁 火
  Wu:   'hookSnake',     // 戊 土
  Ji:   'soaringSnake',  // 己 土
  Geng: 'whiteTiger',    // 庚 金
  Xin:  'whiteTiger',    // 辛 金
  Ren:  'darkWarrior',   // 壬 水
  Gui:  'darkWarrior',   // 癸 水
};

/**
 * Six spirits for a reading, LINE 1 FIRST, seeded by the day stem and then
 * advancing one step per line upward.
 */
export function spiritsForDayStem(dayStem: HeavenlyStem): Spirit[] {
  const start = SPIRIT_CYCLE.indexOf(SPIRIT_START_BY_STEM[dayStem]);
  if (start < 0) return [];
  return Array.from({ length: 6 }, (_, i) => SPIRIT_CYCLE[(start + i) % 6]);
}

/* ────────────────────────────────────────────────────────────────────────
 * 8. 伏神 — hidden spirits
 * ──────────────────────────────────────────────────────────────────────── */

export interface HiddenSpirit {
  /** Line position 1-6 it hides beneath — the same position it occupies in 本宮卦. */
  position: number;
  relative: Relative;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  branchCn: string;
  element: FiveElement;
}

/**
 * 伏神. A 本宮卦 always carries all five 六親; a derived hexagram often does
 * not. Any role missing from the cast hexagram is read off the palace’s 本宮卦
 * at the SAME line position, and is said to hide beneath the cast hexagram’s
 * line there (which is then the 飛神).
 *
 *   「用神不上卦時…要回到本宮首卦尋找伏神，再看它伏在哪一爻之下。」 — [F]
 *
 * Implementation matches [A]’s `Najia._hidden`, which builds the 本宮卦 as the
 * palace trigram doubled, scores its 六親 against the same palace element, and
 * returns the seats of the roles absent from the cast hexagram.
 *
 * Returns an empty array when the hexagram already shows all five roles — and
 * for a 本宮卦 itself, which by construction always does.
 */
export function hiddenSpiritsForHexagram(hexNumber: number): HiddenSpirit[] {
  const entry = HEXAGRAM_PALACE[hexNumber];
  if (!entry) return [];
  const present = new Set(relativesForHexagram(hexNumber));
  if (present.size >= 5) return [];

  const pureHexagram = PALACE_SEQUENCE[entry.palace][0];
  const palaceElement = PALACE_INFO[entry.palace].element;
  const pureNajia = najiaForHexagram(pureHexagram);

  const hidden: HiddenSpirit[] = [];
  pureNajia.forEach((n, i) => {
    const element = BRANCH_ELEMENT[n.branch];
    const relative = relativeFor(palaceElement, element);
    if (present.has(relative)) return;
    // A role can occupy two lines of the 本宮卦; the lower one is the 伏神 seat.
    if (hidden.some((h) => h.relative === relative)) return;
    hidden.push({
      position: i + 1,
      relative,
      stem: n.stem,
      branch: n.branch,
      branchCn: BRANCH_CN[n.branch],
      element,
    });
  });
  return hidden;
}

/* ────────────────────────────────────────────────────────────────────────
 * 9. The reading
 * ──────────────────────────────────────────────────────────────────────── */

export interface LiuYaoLine {
  /** 1 = bottom line (初爻) … 6 = top line (上爻). */
  position: number;
  line: Line;
  /** 動爻 — a 6 or a 9. */
  moving: boolean;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  branchCn: string;
  /** The BRANCH’s element — what 六親 and every 生剋 judgement act on. */
  element: FiveElement;
  relative: Relative;
  spirit: Spirit;
  isWorld: boolean;
  isResponse: boolean;
}

/** A line of the 變卦, scored against the PRIMARY hexagram’s palace. */
export interface LiuYaoChangedLine {
  position: number;
  line: Line;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  branchCn: string;
  element: FiveElement;
  relative: Relative;
}

export interface LiuYaoChanged {
  hexagram: number;
  chinese: string;
  /** The 變卦’s OWN palace — reported for reference, not used for its 六親. */
  palace: Palace;
  rank: number;
  worldLine: number;
  responseLine: number;
  lines: LiuYaoChangedLine[];
}

/** A stem-branch pillar as 六爻 uses it — 日辰 and 月建. */
export interface LiuYaoPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  cn: string;
  /** Element of the BRANCH. 日辰/月建 act on the chart through their branch. */
  element: FiveElement;
}

export interface LiuYaoReading {
  lineValues: LineValue[];
  /** 本卦. */
  primaryHexagram: number;
  primaryChinese: string;
  /** 變卦, or null when nothing moved. */
  changedHexagram: number | null;
  /** 動爻 positions, 1-6, ascending. */
  movingLines: number[];
  palace: Palace;
  palaceCn: string;
  palaceElement: FiveElement;
  /** 0-7, indexes RANK_INFO. */
  rank: number;
  rankCn: string;
  worldLine: number;
  responseLine: number;
  /** Six lines, index 0 = line 1 (bottom). */
  lines: LiuYaoLine[];
  hidden: HiddenSpirit[];
  changed: LiuYaoChanged | null;
  /** 日辰 — also the seed for the 六神. */
  dayPillar: LiuYaoPillar;
  /** 月建 — solar-term bounded, straight from computeBazi. */
  monthPillar: LiuYaoPillar;
}

const VALID_LINE_VALUES = new Set<number>([6, 7, 8, 9]);

/** Local calendar date as YYYY-MM-DD — the shape computeBazi expects. */
function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  // computeBazi matches /^\d{4}-\d{2}-\d{2}$/, so an unpadded 3-digit year
  // would fail the FORMAT check and null the whole reading for a reason that
  // has nothing to do with the ephemeris.
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function pillarOf(stem: HeavenlyStem, branch: EarthlyBranch): LiuYaoPillar {
  return {
    stem,
    branch,
    cn: STEM_CN[stem] + BRANCH_CN[branch],
    element: BRANCH_ELEMENT[branch],
  };
}

/**
 * The whole 六爻 chart for a cast.
 *
 * `lineValues` is six coin-toss values bottom-to-top, exactly as
 * ichingHexagrams.ts produces them (6 = 老陰, 7 = 少陽, 8 = 少陰, 9 = 老陽).
 * `date` defaults to now and supplies 日辰 and 月建 through computeBazi — the
 * pillars are NOT re-implemented here, so a fix to the ephemeris or the
 * day-pillar offset in bazi.ts lands in this reading too.
 *
 * CALENDAR CAVEAT, stated because it changes answers rather than presentation:
 * bazi.ts computes the day pillar from the civil date, so a reading taken
 * during 晚子時 (23:00-23:59) is dated to the civil day, not rolled forward to
 * the next 干支 day as some 六爻 schools do. That shifts the 日辰 and therefore
 * the whole 六神 column for one hour in twenty-four.
 *
 * Returns null — never throws — on a malformed cast, an unmappable hexagram,
 * an invalid Date, or a computeBazi failure.
 */
export function readLiuYao(lineValues: LineValue[], date?: Date): LiuYaoReading | null {
  if (!Array.isArray(lineValues) || lineValues.length !== 6) return null;
  if (!lineValues.every((v) => VALID_LINE_VALUES.has(v))) return null;

  const when = date ?? new Date();
  if (!(when instanceof Date) || Number.isNaN(when.getTime())) return null;

  const cast = castFromLineValues(lineValues);
  if (!cast) return null;

  const entry = HEXAGRAM_PALACE[cast.primaryHexagram];
  if (!entry) return null;

  const najia = najiaForHexagram(cast.primaryHexagram);
  if (najia.length !== 6) return null;

  const bazi = computeBazi(toDateString(when), toTimeString(when));
  if (!bazi) return null;

  const palaceElement = PALACE_INFO[entry.palace].element;
  const worldLine = worldLineFor(entry.rank);
  const responseLine = responseLineFor(worldLine);
  const spirits = spiritsForDayStem(bazi.day.stem);
  if (spirits.length !== 6) return null;

  const movingSet = new Set(cast.changingLineIndexes);
  const bits = HEXAGRAM_BITS[cast.primaryHexagram];

  const lines: LiuYaoLine[] = najia.map((n, i) => {
    const element = BRANCH_ELEMENT[n.branch];
    return {
      position: i + 1,
      line: bits[i] === '1' ? 'yang' : 'yin',
      moving: movingSet.has(i),
      stem: n.stem,
      branch: n.branch,
      branchCn: BRANCH_CN[n.branch],
      element,
      relative: relativeFor(palaceElement, element),
      spirit: spirits[i],
      isWorld: i + 1 === worldLine,
      isResponse: i + 1 === responseLine,
    };
  });

  let changed: LiuYaoChanged | null = null;
  const changedNumber = cast.transformedHexagram;
  if (changedNumber !== null) {
    const changedEntry = HEXAGRAM_PALACE[changedNumber];
    const changedNajia = najiaForHexagram(changedNumber);
    const changedBits = HEXAGRAM_BITS[changedNumber];
    if (changedEntry && changedNajia.length === 6 && changedBits) {
      const changedWorld = worldLineFor(changedEntry.rank);
      changed = {
        hexagram: changedNumber,
        chinese: HEXAGRAMS[changedNumber]?.chinese ?? '',
        palace: changedEntry.palace,
        rank: changedEntry.rank,
        worldLine: changedWorld,
        responseLine: responseLineFor(changedWorld),
        lines: changedNajia.map((n, i) => {
          const element = BRANCH_ELEMENT[n.branch];
          return {
            position: i + 1,
            line: changedBits[i] === '1' ? 'yang' : 'yin',
            stem: n.stem,
            branch: n.branch,
            branchCn: BRANCH_CN[n.branch],
            element,
            // 「變卦六親要按照正卦來安」 — primary palace, not this hexagram’s own.
            relative: relativeFor(palaceElement, element),
          };
        }),
      };
    }
  }

  return {
    lineValues: [...lineValues],
    primaryHexagram: cast.primaryHexagram,
    primaryChinese: HEXAGRAMS[cast.primaryHexagram]?.chinese ?? '',
    changedHexagram: changedNumber,
    movingLines: cast.changingLineIndexes.map((i) => i + 1),
    palace: entry.palace,
    palaceCn: PALACE_INFO[entry.palace].cn,
    palaceElement,
    rank: entry.rank,
    rankCn: RANK_INFO[entry.rank].cn,
    worldLine,
    responseLine,
    lines,
    hidden: hiddenSpiritsForHexagram(cast.primaryHexagram),
    changed,
    dayPillar: pillarOf(bazi.day.stem, bazi.day.branch),
    monthPillar: pillarOf(bazi.month.stem, bazi.month.branch),
  };
}

/* ────────────────────────────────────────────────────────────────────────
 * 10. Self-check surface
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Exported so a test can assert the generated tables and the hand-entered
 * tables agree, and that the trigram names this file uses are the ones
 * ichingHexagrams.ts actually writes. Returns a list of human-readable
 * problems; an empty list is a pass.
 *
 * Kept in the module (rather than only in the test) because the same check is
 * what a future editor should run after touching PALACE_SEQUENCE or
 * TRIGRAM_NAJIA_TABLE, and because STEMS is otherwise unused here — the stem
 * ordering is a real invariant of SPIRIT_START_BY_STEM.
 */
export function auditLiuYaoTables(): string[] {
  const problems: string[] = [];

  // Palace table vs the generation rule.
  for (const palace of Object.keys(PALACE_SEQUENCE) as Palace[]) {
    const derived = derivePalaceSequence(palace);
    const listed = PALACE_SEQUENCE[palace];
    if (derived.join(',') !== listed.join(',')) {
      problems.push(`palace ${palace}: table [${listed}] ≠ rule [${derived}]`);
    }
  }

  // Every hexagram exactly once.
  const seen = new Set<number>();
  for (const palace of Object.keys(PALACE_SEQUENCE) as Palace[]) {
    for (const hex of PALACE_SEQUENCE[palace]) {
      if (seen.has(hex)) problems.push(`hexagram ${hex} appears in more than one palace`);
      seen.add(hex);
    }
  }
  for (let n = 1; n <= 64; n++) if (!seen.has(n)) problems.push(`hexagram ${n} has no palace`);

  // 納甲 table vs the stepping rule.
  for (const trigram of Object.keys(TRIGRAM_NAJIA_TABLE) as TrigramName[]) {
    const derived = deriveTrigramBranches(trigram);
    const listed = TRIGRAM_NAJIA_TABLE[trigram];
    if (derived.innerBranches.join(',') !== listed.innerBranches.join(',')) {
      problems.push(`najia ${trigram} inner: table ≠ rule`);
    }
    if (derived.outerBranches.join(',') !== listed.outerBranches.join(',')) {
      problems.push(`najia ${trigram} outer: table ≠ rule`);
    }
  }

  // Trigram names must match what ichingHexagrams.ts writes.
  for (let n = 1; n <= 64; n++) {
    const t = trigramsForHexagram(n);
    const h = HEXAGRAMS[n];
    if (!t || !h) {
      problems.push(`hexagram ${n}: missing bits or meaning`);
      continue;
    }
    if (t.inner !== h.lowerTrigram) problems.push(`hexagram ${n}: lower ${h.lowerTrigram} ≠ ${t.inner}`);
    if (t.outer !== h.upperTrigram) problems.push(`hexagram ${n}: upper ${h.upperTrigram} ≠ ${t.outer}`);
  }

  // 本宮卦 must be the doubled trigram, and must carry all five 六親.
  for (const palace of Object.keys(PALACE_SEQUENCE) as Palace[]) {
    const pure = PALACE_SEQUENCE[palace][0];
    const bits = TRIGRAM_BITS[PALACE_TRIGRAM[palace]];
    if (HEXAGRAM_BITS[pure] !== bits + bits) {
      problems.push(`palace ${palace}: 本宮卦 ${pure} is not the doubled trigram`);
    }
    if (new Set(relativesForHexagram(pure)).size !== 5) {
      problems.push(`palace ${palace}: 本宮卦 ${pure} does not carry all five 六親`);
    }
  }

  // 世/應 always three apart and inside 1-6.
  for (let rank = 0; rank <= 7; rank++) {
    const w = worldLineFor(rank);
    const r = responseLineFor(w);
    if (w < 1 || w > 6 || r < 1 || r > 6 || Math.abs(w - r) !== 3) {
      problems.push(`rank ${rank}: 世 ${w} / 應 ${r} out of range or not three apart`);
    }
  }

  // Spirits cycle for all ten stems.
  for (const stem of STEMS) {
    const s = spiritsForDayStem(stem);
    if (s.length !== 6 || new Set(s).size !== 6) {
      problems.push(`stem ${stem}: spirit column is not a full cycle`);
    }
  }

  return problems;
}
