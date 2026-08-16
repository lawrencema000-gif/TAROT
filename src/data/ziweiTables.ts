// Zi Wei Dou Shu (紫微斗數) — REFERENCE TABLES for star placement (安星法).
//
// SCOPE: pure lookup data + placement rules. This module contains NO calendar
// code. It never converts a Gregorian date, never resolves a leap month
// (閏月), never decides where a 子時 birth belongs. It takes lunar values that
// a separate calendar module produces — lunar month (1-12), lunar day (1-30),
// hour branch index (0-11), and the stem/branch of the 命宮 — and returns
// branch indices. Keep it that way: the calendar is the hard, lossy part and
// it deserves its own module and its own tests.
//
// Naming is aligned with `src/data/ziweiContent.ts` so a chart engine can go
// straight from a key here to the interpretation text there:
//   - palace keys are lowercase   (`life`, `siblings`, …) → PALACE_MEANINGS
//   - star keys are PascalCase    (`Ziwei`, `Tianji`, …)  → STAR_MEANINGS
//   - bureau keys match           (`water2` … `fire6`)    → BUREAU_MEANINGS
//   - transformation keys match   (`hua_lu` … `hua_ji`)   → TRANSFORMATION_MEANINGS
//
// SOURCES (cross-checked; per-table citations appear inline below):
//   [A] 紫微斗數安星訣大全 / 中洲派初階講義 安星口訣 — the classical mnemonic
//       verses (安紫微諸星訣, 安天府諸星訣, 起命身宮訣).
//       https://vlee0610.pixnet.net/blog/post/36341986
//   [B] 紫微麥 ziwei.my — 五行局 (納音) full 60-combination table.
//       https://www.ziwei.my/zi-wei-dou-shu-portfolio/wu-xing-ju-note-1/
//   [C] 紫微斗数学堂 — 安星诀与排盘方法详解, 起紫微星表 (30 × 5 lookup).
//       https://www.ziweicn.com/ziweirumen/ziweijichu/3083.html
//   [D] 紫微取象派 — 排盤步驟 / 掌上推盘安紫微星五诀.
//       https://www.ziweishuyuan.com/ziwei-place/181.html
//   [E] 天干四化表 (vocus) + 雲算 四化教學 + AiAstrum 四化對照 — the 10-stem
//       transformation table, three independent renderings.
//       https://vocus.cc/article/6646c651fd89780001ef63be
//       https://fortunecloud.co/learn/four-transformations

/* ────────────────────────────────────────────────────────────────────────
 * 1. The twelve palaces (十二宮)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The 12 palaces in their canonical order, starting from 命宮.
 *
 * IMPORTANT — the palaces run COUNTER-CLOCKWISE (逆佈) from 命宮 around the
 * branch ring, i.e. the palace at index `i` sits at branch
 * `(lifeBranchIdx - i + 12) % 12`. Use {@link palaceBranch}; do not add.
 *
 * A sanity check that falls out of this: 遷移宮 (index 6) is always exactly
 * opposite 命宮 — 命宮 in 寅 puts 遷移 in 申. [A][D]
 *
 * 交友宮 is the modern name; the classical texts call it 僕役宮. Same palace.
 */
export const PALACES: { key: string; cn: string; en: string }[] = [
  { key: 'life',     cn: '命宮',  en: 'Life' },
  { key: 'siblings', cn: '兄弟宮', en: 'Siblings' },
  { key: 'spouse',   cn: '夫妻宮', en: 'Spouse' },
  { key: 'children', cn: '子女宮', en: 'Children' },
  { key: 'wealth',   cn: '財帛宮', en: 'Wealth' },
  { key: 'health',   cn: '疾厄宮', en: 'Health' },
  { key: 'travel',   cn: '遷移宮', en: 'Travel' },
  { key: 'friends',  cn: '交友宮', en: 'Friends' },   // 僕役宮
  { key: 'career',   cn: '官祿宮', en: 'Career' },    // 事業宮
  { key: 'property', cn: '田宅宮', en: 'Property' },
  { key: 'fortune',  cn: '福德宮', en: 'Fortune' },
  { key: 'parents',  cn: '父母宮', en: 'Parents' },
];

/* ────────────────────────────────────────────────────────────────────────
 * 2. The twelve earthly branches (十二地支)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The 12 earthly branches, index 0-11. Every branch index in this module —
 * 紫微's seat, a palace's seat, an hour — is an index into this array.
 *
 * Index 0 = 子, 2 = 寅 (the 寅 palace is the fixed counting origin for both
 * 紫微 placement and 命宮 placement — 斗柄建寅), 11 = 亥.
 */
export const BRANCHES12: string[] = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
];

/** Romanised branch names, same order — for building {@link NAYIN_BUREAU} keys. */
export const BRANCHES12_ROMAN: string[] = [
  'Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai',
];

/** Romanised stem names, index 0-9 — for building {@link NAYIN_BUREAU} keys. */
export const STEMS10_ROMAN: string[] = [
  'Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui',
];

/** The 10 heavenly stems in Chinese, index 0-9 — pairs with {@link STEMS10_ROMAN}. */
export const STEMS10: string[] = [
  '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
];

/** Index of the 寅 palace. The fixed origin for 紫微 counting and 命宮 counting. */
export const YIN_BRANCH_INDEX = 2;

/* ────────────────────────────────────────────────────────────────────────
 * 3. The five bureaus (五行局)
 * ──────────────────────────────────────────────────────────────────────── */

export type Bureau = 'water2' | 'wood3' | 'metal4' | 'earth5' | 'fire6';

/**
 * The five bureaus and their numbers. The number does triple duty: it is the
 * divisor in the 紫微 placement algorithm, it is the age at which the first
 * 大限 (decade) begins, and it names the bureau. [B][D]
 */
export const BUREAU_INFO: Record<Bureau, { cn: string; number: number }> = {
  water2: { cn: '水二局', number: 2 },
  wood3:  { cn: '木三局', number: 3 },
  metal4: { cn: '金四局', number: 4 },
  earth5: { cn: '土五局', number: 5 },
  fire6:  { cn: '火六局', number: 6 },
};

/** Bureaus in ascending number order — handy for rendering the 紫微 table. */
export const BUREAUS: Bureau[] = ['water2', 'wood3', 'metal4', 'earth5', 'fire6'];

/* ────────────────────────────────────────────────────────────────────────
 * 4. 納音五行局 — stem-branch of the 命宮 → bureau
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Builds a {@link NAYIN_BUREAU} key from romanised stem + branch.
 *
 * Use this rather than hand-writing keys. The romanisation collides in the
 * obvious place — stem 戊 and branch 午 are both `Wu`, so 戊午 is the key
 * `'WuWu'` and 戊子 is `'WuZi'`. Order (stem first) disambiguates, but only
 * if you never build a key by hand.
 */
export function nayinKey(stemRoman: string, branchRoman: string): string {
  return `${stemRoman}${branchRoman}`;
}

/**
 * 六十甲子納音 → 五行局, keyed by the stem-branch of the 命宮 (NOT the year
 * pillar — this is the single most common implementation bug in Zi Wei code).
 *
 * The 命宮 stem is itself derived from the year stem via 五虎遁 by the chart
 * engine; this table only consumes the finished 干支.
 *
 * Derivation: the 納音 five-element of the pair, mapped water→2, wood→3,
 * metal→4, earth→5, fire→6. Each 納音 covers two consecutive 干支, so the 60
 * entries are 30 pairs. Verbatim from [B], cross-checked against [D]. All 60
 * keys present.
 */
export const NAYIN_BUREAU: Record<string, Bureau> = {
  // 甲子乙丑 海中金 → 金四局
  JiaZi: 'metal4',    YiChou: 'metal4',
  // 丙寅丁卯 爐中火 → 火六局
  BingYin: 'fire6',   DingMao: 'fire6',
  // 戊辰己巳 大林木 → 木三局
  WuChen: 'wood3',    JiSi: 'wood3',
  // 庚午辛未 路旁土 → 土五局
  GengWu: 'earth5',   XinWei: 'earth5',
  // 壬申癸酉 劍鋒金 → 金四局
  RenShen: 'metal4',  GuiYou: 'metal4',
  // 甲戌乙亥 山頭火 → 火六局
  JiaXu: 'fire6',     YiHai: 'fire6',
  // 丙子丁丑 澗下水 → 水二局
  BingZi: 'water2',   DingChou: 'water2',
  // 戊寅己卯 城頭土 → 土五局
  WuYin: 'earth5',    JiMao: 'earth5',
  // 庚辰辛巳 白蠟金 → 金四局
  GengChen: 'metal4', XinSi: 'metal4',
  // 壬午癸未 楊柳木 → 木三局
  RenWu: 'wood3',     GuiWei: 'wood3',
  // 甲申乙酉 井泉水 (泉中水) → 水二局
  JiaShen: 'water2',  YiYou: 'water2',
  // 丙戌丁亥 屋上土 → 土五局
  BingXu: 'earth5',   DingHai: 'earth5',
  // 戊子己丑 霹靂火 → 火六局
  WuZi: 'fire6',      JiChou: 'fire6',
  // 庚寅辛卯 松柏木 → 木三局
  GengYin: 'wood3',   XinMao: 'wood3',
  // 壬辰癸巳 長流水 → 水二局
  RenChen: 'water2',  GuiSi: 'water2',
  // 甲午乙未 沙中金 → 金四局
  JiaWu: 'metal4',    YiWei: 'metal4',
  // 丙申丁酉 山下火 → 火六局
  BingShen: 'fire6',  DingYou: 'fire6',
  // 戊戌己亥 平地木 → 木三局
  WuXu: 'wood3',      JiHai: 'wood3',
  // 庚子辛丑 壁上土 → 土五局
  GengZi: 'earth5',   XinChou: 'earth5',
  // 壬寅癸卯 金箔金 → 金四局
  RenYin: 'metal4',   GuiMao: 'metal4',
  // 甲辰乙巳 覆燈火 → 火六局
  JiaChen: 'fire6',   YiSi: 'fire6',
  // 丙午丁未 天河水 → 水二局
  BingWu: 'water2',   DingWei: 'water2',
  // 戊申己酉 大驛土 → 土五局
  WuShen: 'earth5',   JiYou: 'earth5',
  // 庚戌辛亥 釵釧金 → 金四局
  GengXu: 'metal4',   XinHai: 'metal4',
  // 壬子癸丑 桑柘木 → 木三局
  RenZi: 'wood3',     GuiChou: 'wood3',
  // 甲寅乙卯 大溪水 → 水二局
  JiaYin: 'water2',   YiMao: 'water2',
  // 丙辰丁巳 沙中土 → 土五局
  BingChen: 'earth5', DingSi: 'earth5',
  // 戊午己未 天上火 → 火六局
  WuWu: 'fire6',      JiWei: 'fire6',
  // 庚申辛酉 石榴木 → 木三局
  GengShen: 'wood3',  XinYou: 'wood3',
  // 壬戌癸亥 大海水 → 水二局
  RenXu: 'water2',    GuiHai: 'water2',
};

/* ────────────────────────────────────────────────────────────────────────
 * 5. 紫微星定位表 — the crux of the system
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 紫微星定位表 (起紫微星表). For each bureau, a 30-element array where
 * index `lunarDay - 1` gives the BRANCH INDEX (0-11) that 紫微 occupies.
 *
 * ── Derivation (安紫微星訣) [C][D] ──────────────────────────────────────
 * Let `d` = lunar day (1-30), `m` = the bureau number (2/3/4/5/6).
 *   1. Find the smallest `k ≥ 0` such that `(d + k)` is divisible by `m`.
 *      Let the quotient be `Q = (d + k) / m`.
 *   2. Count `Q` palaces forward starting AT 寅 (寅 counts as 1), giving a
 *      base seat `P = (2 + Q - 1) mod 12`.
 *   3. Adjust by the borrowed amount `k`, 「餘數偶順奇逆」:
 *        k even (0 included) → move FORWARD  k palaces: `(P + k) mod 12`
 *        k odd               → move BACKWARD k palaces: `(P - k) mod 12`
 *
 * ── Verification ────────────────────────────────────────────────────────
 * The arrays below were generated by that algorithm and then checked against
 * published tables on three independent points:
 *   • Day 1 row  — 水二局 丑 / 木三局 辰 / 金四局 亥 / 土五局 午 / 火六局 酉  [C][D]
 *   • Day 30 row — 水二局 辰 / 木三局 亥 / 金四局 亥 / 土五局 未 / 火六局 午  [C]
 *   • Worked mid-table example: 火六局 + day 22 → 未.
 *     (22+2=24, k=2, Q=4 → P=巳; k even → 巳+2=未.)  [vocus 查表法安紫微星]
 *   • 木三局 spot checks: day 2 丑, day 3 寅, day 28 丑, day 29 戌, day 30 亥.
 *
 * Note the shape of each row — it is NOT monotonic. 水二局 advances one
 * palace per two days and marches cleanly around the ring; the higher
 * bureaus zig-zag because of the odd/even adjustment. A row that looks
 * "wrong" because it jumps backwards is almost certainly right.
 *
 * Lunar months of 29 days simply never index element 29.
 */
export const ZIWEI_POSITION: Record<Bureau, number[]> = {
  // 水二局: 丑寅寅卯卯辰辰巳巳午午未未申申酉酉戌戌亥亥子子丑丑寅寅卯卯辰
  water2: [
    1, 2, 2, 3, 3, 4, 4, 5, 5, 6,
    6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
    11, 0, 0, 1, 1, 2, 2, 3, 3, 4,
  ],
  // 木三局: 辰丑寅巳寅卯午卯辰未辰巳申巳午酉午未戌未申亥申酉子酉戌丑戌亥
  wood3: [
    4, 1, 2, 5, 2, 3, 6, 3, 4, 7,
    4, 5, 8, 5, 6, 9, 6, 7, 10, 7,
    8, 11, 8, 9, 0, 9, 10, 1, 10, 11,
  ],
  // 金四局: 亥辰丑寅子巳寅卯丑午卯辰寅未辰巳卯申巳午辰酉午未巳戌未申午亥
  metal4: [
    11, 4, 1, 2, 0, 5, 2, 3, 1, 6,
    3, 4, 2, 7, 4, 5, 3, 8, 5, 6,
    4, 9, 6, 7, 5, 10, 7, 8, 6, 11,
  ],
  // 土五局: 午亥辰丑寅未子巳寅卯申丑午卯辰酉寅未辰巳戌卯申巳午亥辰酉午未
  earth5: [
    6, 11, 4, 1, 2, 7, 0, 5, 2, 3,
    8, 1, 6, 3, 4, 9, 2, 7, 4, 5,
    10, 3, 8, 5, 6, 11, 4, 9, 6, 7,
  ],
  // 火六局: 酉午亥辰丑寅戌未子巳寅卯亥申丑午卯辰子酉寅未辰巳丑戌卯申巳午
  fire6: [
    9, 6, 11, 4, 1, 2, 10, 7, 0, 5,
    2, 3, 11, 8, 1, 6, 3, 4, 0, 9,
    2, 7, 4, 5, 1, 10, 3, 8, 5, 6,
  ],
};

/**
 * The generating algorithm behind {@link ZIWEI_POSITION}, kept as executable
 * documentation. Prefer the table at runtime (it is the audited artefact);
 * use this in a test to prove the table and the rule still agree.
 *
 * @param bureau  the 五行局 of the 命宮
 * @param lunarDay 1-30
 */
export function ziweiPositionFromRule(bureau: Bureau, lunarDay: number): number {
  const m = BUREAU_INFO[bureau].number;
  let k = 0;
  while ((lunarDay + k) % m !== 0) k++;
  const quotient = (lunarDay + k) / m;
  const base = (YIN_BRANCH_INDEX + quotient - 1) % 12;
  // 餘數偶順奇逆 — even borrow counts forward, odd borrow counts backward.
  return k % 2 === 0 ? (base + k) % 12 : ((base - k) % 12 + 12) % 12;
}

/* ────────────────────────────────────────────────────────────────────────
 * 6. The 14 major stars (十四主星) — placement from 紫微
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 紫微星系 (the 紫微 series), six stars, placed as offsets from 紫微.
 *
 * 安紫微諸星訣 [A]:
 *   「紫微天機逆行旁，隔一陽武天同當，又隔二位廉貞地，空三復見紫微郎」
 *   (中洲派 variant, same meaning:
 *    「紫微逆去宿天機，隔一太陽武曲移，天同隔二廉貞位，空三復見紫微池」)
 *
 * Reading the verse: from 紫微 move BACKWARD (逆行, decreasing branch index).
 *   紫微  →  0
 *   天機  → −1   ("逆行旁" — the adjacent palace behind)
 *   [skip 1 empty palace]
 *   太陽  → −3
 *   武曲  → −4
 *   天同  → −5
 *   [skip 2 empty palaces]
 *   廉貞  → −8
 *   [skip 3 empty palaces] → −12 ≡ 紫微 again ("空三復見紫微")
 *
 * The offsets in the brief (−1, −3, −4, −5, −8) match both source renderings
 * exactly; nothing to correct.
 *
 * Apply with modulo 12: `(ziweiIdx + offset + 12) % 12`, or use
 * {@link placeMajorStars}.
 */
export const ZIWEI_SERIES: { star: string; cn: string; offset: number }[] = [
  { star: 'Ziwei',    cn: '紫微', offset: 0 },
  { star: 'Tianji',   cn: '天機', offset: -1 },
  { star: 'Taiyang',  cn: '太陽', offset: -3 },
  { star: 'Wuqu',     cn: '武曲', offset: -4 },
  { star: 'Tiantong', cn: '天同', offset: -5 },
  { star: 'Lianzhen', cn: '廉貞', offset: -8 },
];

/**
 * 天府 from 紫微 — the classical mirror rule.
 *
 * 訣 [A][D]:
 *   「局定生日逆佈紫，斜對天府順流行，唯有寅申同一位，其餘丑卯互安星」
 *   (the shorter form: 「紫府同宮在寅申，其餘都是斜對宮」)
 *
 * 紫微 and 天府 are reflections of each other across the 寅–申 axis. Both
 * sit in 寅 together, both sit in 申 together, and everywhere else they are
 * mirror images:
 *
 *     tianfu = (寅 + 寅 − ziwei) mod 12 = (2 + 2 − ziwei) mod 12 = (4 − ziwei) mod 12
 *
 * Checks: 紫微 寅(2) → 天府 寅(2) ✓ (紫府同宮)。紫微 申(8) → 天府 申(8) ✓。
 *         紫微 丑(1) → 天府 卯(3) ✓ (「其餘丑卯互安星」)。
 *         紫微 子(0) → 天府 辰(4) ✓。紫微 午(6) → 天府 戌(10) ✓。
 *
 * Note the two series then travel in opposite directions — 紫微系 counts
 * backward, 天府系 counts forward ("斜對天府順流行").
 */
export function tianfuFromZiwei(ziweiBranchIdx: number): number {
  return ((4 - ziweiBranchIdx) % 12 + 12) % 12;
}

/**
 * 天府星系 (the 天府 series), eight stars, placed as offsets FROM 天府.
 *
 * 安天府諸星訣 [A]:
 *   「天府順行有太陰，貪狼而後巨門臨，隨來天相天梁繼，七殺空三是破軍」
 *
 * From 天府 move FORWARD (順行, increasing branch index), one palace at a
 * time through 七殺, then skip three empty palaces to reach 破軍:
 *   天府 +0, 太陰 +1, 貪狼 +2, 巨門 +3, 天相 +4, 天梁 +5, 七殺 +6,
 *   [skip 3] 破軍 +10.
 *
 * Worked check — 紫微 in 寅 (紫府同宮, 天府 also 寅) produces the textbook
 * 紫微在寅 chart:
 *   子 破軍 / 丑 天機 / 寅 紫微·天府 / 卯 太陰 / 辰 貪狼 / 巳 巨門 /
 *   午 廉貞·天相 / 未 天梁 / 申 七殺 / 酉 天同 / 戌 武曲 / 亥 太陽
 * — 廉貞天相同宮於午, 太陽落陷於亥, 七殺於申. All correct.
 */
export const TIANFU_SERIES: { star: string; cn: string; offset: number }[] = [
  { star: 'Tianfu',    cn: '天府', offset: 0 },
  { star: 'Taiyin',    cn: '太陰', offset: 1 },
  { star: 'Tanlang',   cn: '貪狼', offset: 2 },
  { star: 'Jumen',     cn: '巨門', offset: 3 },
  { star: 'Tianxiang', cn: '天相', offset: 4 },
  { star: 'Tianliang', cn: '天梁', offset: 5 },
  { star: 'Qisha',     cn: '七殺', offset: 6 },
  { star: 'Pojun',     cn: '破軍', offset: 10 },
];

/**
 * The complete placement rule for the 14 majors, bundled.
 *
 * `ziweiSeries` offsets are relative to 紫微's branch and count BACKWARD
 * (they are negative). `tianfuSeries` offsets are relative to 天府's branch
 * and count FORWARD. 天府 itself comes from 紫微 via `tianfuFromZiwei`.
 */
export const STAR_PLACEMENT: {
  ziweiSeries: { star: string; cn: string; offset: number }[];
  tianfuSeries: { star: string; cn: string; offset: number }[];
  tianfuFromZiwei: (ziweiBranchIdx: number) => number;
  ziweiSeriesDirection: 'backward';
  tianfuSeriesDirection: 'forward';
} = {
  ziweiSeries: ZIWEI_SERIES,
  tianfuSeries: TIANFU_SERIES,
  tianfuFromZiwei,
  ziweiSeriesDirection: 'backward',
  tianfuSeriesDirection: 'forward',
};

/** All 14 major-star keys, 紫微 series first then 天府 series. */
export const MAJOR_STARS: { star: string; cn: string }[] = [
  ...ZIWEI_SERIES.map(({ star, cn }) => ({ star, cn })),
  ...TIANFU_SERIES.map(({ star, cn }) => ({ star, cn })),
];

/**
 * Places all 14 major stars given 紫微's branch index.
 * Returns star key → branch index (0-11). Several stars share a branch —
 * that is normal and meaningful (e.g. 廉貞·天相 同宮).
 */
export function placeMajorStars(ziweiBranchIdx: number): Record<string, number> {
  const tianfu = tianfuFromZiwei(ziweiBranchIdx);
  const out: Record<string, number> = {};
  for (const { star, offset } of ZIWEI_SERIES) {
    out[star] = ((ziweiBranchIdx + offset) % 12 + 12) % 12;
  }
  for (const { star, offset } of TIANFU_SERIES) {
    out[star] = ((tianfu + offset) % 12 + 12) % 12;
  }
  return out;
}

/* ────────────────────────────────────────────────────────────────────────
 * 7. 四化 — the four transformations, by birth-year stem
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 天干四化表 — keyed by the birth-YEAR heavenly stem (romanised, `Jia`…`Gui`).
 * Values are star keys; the 14 majors match {@link MAJOR_STARS} and
 * `STAR_MEANINGS` in ziweiContent.ts.
 *
 * Four of the receiving stars are NOT majors — they are 輔星 (support stars)
 * that this module does not place: `Wenchang` 文昌, `Wenqu` 文曲,
 * `Zuofu` 左輔, `Youbi` 右弼. A chart engine that only places the 14 majors
 * must skip those transformations rather than crash on a missing star.
 *
 * Source: [E], three independent renderings in agreement.
 *
 * ── Variant warning (庚干) ──────────────────────────────────────────────
 * 庚's 化科 and 化忌 are the one genuinely contested row in the system.
 * The table below uses the mainstream modern assignment shared by 中州派 and
 * most contemporary software: 太陽祿、武曲權、太陰科、天同忌 (口訣「庚：日武陰同」).
 * The 紫微斗數全書 lineage instead gives 太陽祿、武曲權、天同科、天相忌
 * (「庚：陽武同相」), and a third reading substitutes 天府化科. If this app
 * ever needs to match a specific school's output, this is the row to make
 * configurable — every other row is uncontested.
 */
export const FOUR_TRANSFORMATIONS: Record<
  string,
  { hua_lu: string; hua_quan: string; hua_ke: string; hua_ji: string }
> = {
  // 甲：廉貞化祿、破軍化權、武曲化科、太陽化忌
  Jia:  { hua_lu: 'Lianzhen', hua_quan: 'Pojun',     hua_ke: 'Wuqu',      hua_ji: 'Taiyang'  },
  // 乙：天機化祿、天梁化權、紫微化科、太陰化忌
  Yi:   { hua_lu: 'Tianji',   hua_quan: 'Tianliang', hua_ke: 'Ziwei',     hua_ji: 'Taiyin'   },
  // 丙：天同化祿、天機化權、文昌化科、廉貞化忌
  Bing: { hua_lu: 'Tiantong', hua_quan: 'Tianji',    hua_ke: 'Wenchang',  hua_ji: 'Lianzhen' },
  // 丁：太陰化祿、天同化權、天機化科、巨門化忌
  Ding: { hua_lu: 'Taiyin',   hua_quan: 'Tiantong',  hua_ke: 'Tianji',    hua_ji: 'Jumen'    },
  // 戊：貪狼化祿、太陰化權、右弼化科、天機化忌
  Wu:   { hua_lu: 'Tanlang',  hua_quan: 'Taiyin',    hua_ke: 'Youbi',     hua_ji: 'Tianji'   },
  // 己：武曲化祿、貪狼化權、天梁化科、文曲化忌
  Ji:   { hua_lu: 'Wuqu',     hua_quan: 'Tanlang',   hua_ke: 'Tianliang', hua_ji: 'Wenqu'    },
  // 庚：太陽化祿、武曲化權、太陰化科、天同化忌  ← see variant warning above
  Geng: { hua_lu: 'Taiyang',  hua_quan: 'Wuqu',      hua_ke: 'Taiyin',    hua_ji: 'Tiantong' },
  // 辛：巨門化祿、太陽化權、文曲化科、文昌化忌
  Xin:  { hua_lu: 'Jumen',    hua_quan: 'Taiyang',   hua_ke: 'Wenqu',     hua_ji: 'Wenchang' },
  // 壬：天梁化祿、紫微化權、左輔化科、武曲化忌
  Ren:  { hua_lu: 'Tianliang', hua_quan: 'Ziwei',    hua_ke: 'Zuofu',     hua_ji: 'Wuqu'     },
  // 癸：破軍化祿、巨門化權、太陰化科、貪狼化忌
  Gui:  { hua_lu: 'Pojun',    hua_quan: 'Jumen',     hua_ke: 'Taiyin',    hua_ji: 'Tanlang'  },
};

/**
 * The four 輔星 that appear in {@link FOUR_TRANSFORMATIONS} but are not
 * placed by this module. Exported so an engine can detect and skip them.
 */
export const SUPPORT_STARS_IN_TRANSFORMATIONS: { star: string; cn: string }[] = [
  { star: 'Wenchang', cn: '文昌' },
  { star: 'Wenqu',    cn: '文曲' },
  { star: 'Zuofu',    cn: '左輔' },
  { star: 'Youbi',    cn: '右弼' },
];

/* ────────────────────────────────────────────────────────────────────────
 * 8. 命宮 / 身宮 placement
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * 命宮 (Life palace) branch index.
 *
 * 起命身宮訣 [A]:
 *   「斗柄建寅起正月，數至生月順流行，子時起數生時止，逆回安命順安身」
 *
 * Formula — 寅起正月順數至生月，再由該宮起子時逆數至生時:
 *   命宮 = (寅 + (lunarMonth − 1) − hourBranchIdx) mod 12
 *        = (2 + lunarMonth − 1 − hourBranchIdx) mod 12
 *        = (lunarMonth + 1 − hourBranchIdx) mod 12
 *
 * Checks: 正月子時 → (1+1−0) = 2 = 寅 ✓。正月丑時 → 1 = 丑 ✓。
 *         正月午時 → (1+1−6) mod 12 = 8 = 申 ✓。
 *
 * CALENDAR CAVEAT (not this module's job, but the caller must decide):
 * `lunarMonth` must be the month used by your school for chart-building.
 * Schools differ on leap months (閏月) — some use the 節氣 month, some split
 * the leap month at the 15th, some use the whole leap month as the previous
 * month. Likewise a late-子時 birth (23:00-23:59) belongs to the NEXT day
 * for most schools. Resolve both in the calendar module before calling here.
 *
 * @param lunarMonth     1-12 (chart month, leap already resolved)
 * @param hourBranchIdx  0-11, 0 = 子時
 */
export function lifePalaceBranch(lunarMonth: number, hourBranchIdx: number): number {
  return ((lunarMonth + 1 - hourBranchIdx) % 12 + 12) % 12;
}

/**
 * 身宮 (Body palace) branch index.
 *
 * Same start as 命宮 — 寅起正月順數至生月 — but then count FORWARD from 子時
 * to the birth hour ("逆回安命順安身"):
 *   身宮 = (寅 + (lunarMonth − 1) + hourBranchIdx) mod 12
 *        = (lunarMonth + 1 + hourBranchIdx) mod 12
 *
 * Checks: 正月子時 → 2 = 寅, and 命宮 is also 寅 ✓ (命身同宮 at 子時)。
 *         正月午時 → (1+1+6) = 8 = 申, 命宮 also 申 ✓ (命身同宮 at 午時)。
 * 命身同宮 happens exactly at 子時 and 午時, which is the standard test.
 *
 * 身宮 always coincides with one of 命/夫妻/財帛/遷移/官祿/福德 — never with
 * the other six. Useful as an assertion in tests.
 *
 * @param lunarMonth     1-12 (chart month, leap already resolved)
 * @param hourBranchIdx  0-11, 0 = 子時
 */
export function bodyPalaceBranch(lunarMonth: number, hourBranchIdx: number): number {
  return ((lunarMonth + 1 + hourBranchIdx) % 12 + 12) % 12;
}

/**
 * Branch index of the palace at `palaceIndex` (0-11, indexing {@link PALACES}),
 * given the 命宮's branch.
 *
 * The twelve palaces are laid out COUNTER-CLOCKWISE (逆佈) from 命宮:
 *   palaceBranch = (lifeBranchIdx − palaceIndex) mod 12
 *
 * e.g. 命宮 in 寅 → 兄弟 丑, 夫妻 子, 子女 亥, 財帛 戌, 疾厄 酉, 遷移 申, …
 */
export function palaceBranch(lifeBranchIdx: number, palaceIndex: number): number {
  return ((lifeBranchIdx - palaceIndex) % 12 + 12) % 12;
}
