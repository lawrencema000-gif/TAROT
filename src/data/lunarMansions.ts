// 二十八宿 — the Twenty-Eight Lunar Mansions: REFERENCE TABLES + PLACEMENT RULES.
//
// SCOPE: pure data and the day-counting rules that select from it. No React,
// no interpretation prose (a separate content file owns that), no ephemeris.
// The one calendar dependency is `src/utils/chineseLunar.ts`, and only for the
// SECONDARY (sukuyō) reading, which is defined on lunar month + lunar day. The
// PRIMARY (Chinese 值日) reading needs nothing but a count of calendar days.
//
// ── WHAT THIS MODULE IS ABOUT ────────────────────────────────────────────────
//
// The 28 mansions are 28 unequal segments of the sky along the celestial
// equator, grouped seven-and-seven into the four 象 (Azure Dragon, Black
// Tortoise, White Tiger, Vermilion Bird). Every mansion also carries an animal
// and one of the 七曜 (seven luminaries), giving the familiar three-character
// almanac names: 角木蛟, 亢金龍, 氐土貉, …
//
// The 值日 (“governing the day”) cycle assigns one mansion to each calendar day
// in an UNBROKEN 28-day rotation. Three things about it are load-bearing and
// easy to get wrong:
//
//   1. It is NOT the Moon’s real position. It is a fixed civil cycle. Almanac
//      software that “corrects” it against an ephemeris produces a different,
//      incompatible answer (see the open discussion at
//      https://github.com/6tail/lunar-javascript/issues/38).
//   2. It does NOT reset at the lunar new year, at a solar term, or anywhere
//      else. This is the file's load-bearing assumption, so it is worth being
//      precise about the evidence: the continuity is demonstrated by dated
//      almanac records matching across long intervals, and by the weekday lock
//      in (3) holding over any span you care to test. It is NOT sourced to the
//      zh.wikipedia 二十八宿 article — that page does not discuss 值日
//      continuity at all, and an earlier draft of this header wrongly cited a
//      27,104-day figure to it. See the 擇日/calendar-history literature, e.g.
//      https://zhuanlan.zhihu.com/p/702398652
//   3. Because 28 = 4 × 7, the cycle is PHASE-LOCKED to the seven-day week:
//      a mansion’s 七曜 is always its weekday. Every 日 mansion (房虛昴星) falls
//      on a Sunday, every 月 mansion (心危畢張) on a Monday, and so on. This is
//      not a coincidence to be explained away — it is the invariant that makes
//      the whole table falsifiable, and the self-checks below rely on it.
//
// ── THE ANCHOR ───────────────────────────────────────────────────────────────
//
// See MANSION_ANCHOR. Chosen anchor: 2026-08-20 (Thursday, 丙寅日) = 角宿
// (角木蛟, 木曜, 東方七宿), attested at
//   https://www.qmrl888.com/2026-8-20.html
//
// CROSS-CHECK (the important part — an anchor with no second witness is a
// guess). Three independent lines of evidence agree on the same phase:
//
//   [i]  A second published almanac day, 10,385 days earlier:
//        1998-03-15 (Sunday, 辛酉日) = 房宿 (房日兔, 日曜).
//        https://www.qmrl888.com/1998-3-15.html
//        房 is index 3, so (3 + 10385) mod 28 = 0 = 角. ✓
//   [ii] A published worked example of the classical 值日 formula, computed
//        independently of any of the above, also gives 1998-03-15 = 房宿:
//        “二十八宿序号 = (23 + A) mod 28 … (23 + 729465) mod 28 = 4，即为房宿”.
//        https://blog.csdn.net/cnbloger/article/details/4500133
//        (The article itself would not load for us — HTTP 521 — so this is
//        cited from its indexed text, not a page we rendered. It is corroboration,
//        not the anchor.)
//   [iii] lunar-javascript, a widely-used Chinese calendar library, encodes the
//        same cycle as a 12×7 table keyed by (day 地支, weekday):
//        XIU['寅' + 4] = 角  → 2026-08-20 is 丙寅 + Thursday → 角. ✓
//        XIU['酉' + 0] = 房  → 1998-03-15 is 辛酉 + Sunday   → 房. ✓
//        Its four Sunday entries are exactly 虛房星昴, its four Monday entries
//        exactly 畢危心張, etc. — the weekday lock, from a third direction.
//        https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js  (LunarUtil.XIU)
//
//   Rejected: https://www.jiri123.com/2026-08-16.html gives 2026-08-16 = 角宿.
//   Its cycle advances correctly (08-17 = 亢) but its phase is 4 days off and it
//   puts a 木 mansion on a Sunday, breaking the weekday lock. Not used.
//
// ── SOURCES ──────────────────────────────────────────────────────────────────
//   [A] 二十八宿 — 维基百科. Canonical order, four 象, full 三字 names.
//       https://zh.wikipedia.org/wiki/二十八宿
//   [B] Twenty-Eight Mansions — Wikipedia (EN). Pinyin + English glosses.
//       https://en.wikipedia.org/wiki/Twenty-Eight_Mansions
//   [C] lunar-javascript (6tail) LunarUtil.XIU / XIU_LUCK / ZHENG / ANIMAL /
//       GONG / XIU_SONG, plus FotoUtil.XIU_27 and the module-local XIU_OFFSET
//       behind FotoUtil.getXiu(m, d) — XIU_OFFSET is declared inside the
//       FotoUtil IIFE and is not reachable as a property of it.
//       https://cdn.jsdelivr.net/npm/lunar-javascript/lunar.js
//   [D] 全民万年历 老黄历 — per-day 值日宿 with 七政 and animal.
//       https://www.qmrl888.com/2026-8-20.html
//   [E] 易先生 — 二十八宿择日：吉凶对应早知晓. Full 28-row 吉凶 + 宜/忌 table.
//       https://www.yixiansheng.com/article/4496.html
//   [F] 黄历网 — 二十八星宿算命 / 28宿吉凶歌诀. NOT a 宜/忌 table: it is 28
//       numbered 吉凶歌訣 verses, a one-word 吉凶 grade per mansion, and a
//       seasonal 詩訣. The contradiction rule below therefore compares [E]'s
//       宜/忌 fields against the verses in [E] and [F].
//       https://www.huangli.com/wenhua/14887.html
//   [G] なにこれネット — 二十八宿：向くこと・避けること (Japanese 暦注 list).
//       https://www.nanikorenet.com/archives/10953
//   [H] jpnculture.net — 二十八宿一覧 (Japanese 暦注, four-象 grouping).
//       https://jpnculture.net/nijuuhasshuku/
//   [I] 【図解】宿曜占星術「本命宿」を求める方法《月宿傍通暦》 — the sukuyō
//       朔日宿 table. https://www.divination.page/2024/03/honmeisyuku.html
//   [J] 大久保占い研究室 / 諒設計 — sukuyō worked example (1986-10-19 = 畢宿).
//       https://www.designlearn.co.jp/syukuyo/syukuyo-article17/
//
// ── SOURCE CONFLICTS, AND HOW THEY WERE RESOLVED ─────────────────────────────
//
//   * 吉凶 grading. We use the mainstream 通勝 BINARY split — 14 吉宿 / 14 凶宿
//     (吉: 角房尾箕斗室壁婁胃畢參井張軫). [C], [E] and the 擇日 literature all
//     give exactly this list. [F] instead grades a middle tier: 半吉凶 = 角奎參星,
//     吉多凶小 = 井, and 吉小凶多 = 昴鬼 (i.e. 昴 and 鬼 lean INAUSPICIOUS in [F]
//     — reading them the other way is what produced a since-removed 宜 on 昴).
//     A finer scheme we did NOT adopt, because mixing it
//     with the binary tables would produce a hybrid nobody actually publishes.
//     CONSEQUENCE: no mansion carries `fortune: 'mixed'` in MANSIONS. The union
//     member exists for the shared type contract and for any future table that
//     does grade a middle tier. Do not “fix” this by reclassifying by hand.
//   * 鬼宿. Chinese practice calls it a 凶宿 ([C], [E], [F]); Japanese 暦注 calls
//     it the single most auspicious day of the 28, good for everything except a
//     wedding ([G], [H]). We follow the Chinese reading, since this file’s
//     primary rule is the Chinese 值日 cycle. The Japanese view is noted here
//     and nowhere else — it is not blended into the data.
//   * 牛宿. Same shape of disagreement, opposite direction: Chinese tables make
//     it a 凶宿 with no 宜 at all; Japanese 暦注 calls it 大吉「何事においても吉」
//     without itemising anything. Its `favourable` list is therefore EMPTY, and
//     deliberately so — see the note at MANSION_ACTIVITIES.
//   * Animal glyphs. 胃土雉 is written 胃土彘 in [C]; 壁水貐 appears as 壁水㺄 in
//     [A] and 壁水獝 in [C]. We use the common printed almanac forms 雉 and 貐.
//     [B] renders 壁’s animal as “Pixiu (貔貅)” and 井’s as “Bian (鞭)”; both are
//     outliers against [A] and [C] and are not used.
//   * 犴 (井木犴) is glossed 駝鹿 — elk/moose — in Chinese explanatory sources;
//     other readings make it a hound (狴犴). 貐 is variously a mythical 猰貐, a
//     hog badger, or a tapir. We keep the transliteration `Yayu` for 貐 rather
//     than pick one zoology.
//   * Per-mansion 宜/忌. [E] is primary. Where the Chinese sources CONTRADICT
//     each other on an item, the item is omitted from both lists rather than
//     adjudicated. Where they are SILENT on one side, the Japanese list [G] may
//     fill it, marked `// [G]`. A blanket 百事皆凶 in [E] is never overridden by
//     [G] — 昴, 翼 and 虛 therefore carry empty `favourable` arrays.
//     CAVEAT, KNOWN AND UNFINISHED: the `// [G]` marks are not yet a complete
//     audit trail. A review found items borrowed from [G] but left unmarked
//     (e.g. 井 'Digging a well', from 井戸掘り) and items marked [G] where [E] is
//     in fact not silent. The five defects where a mark actually changed the
//     PUBLISHED ADVICE have been fixed (昴, 軫, 參, 婁, 翼/虛); the remaining
//     mismatches are provenance-comment accuracy, not wrong recommendations.
//     Treat an unmarked line as "provenance unconfirmed", not "Chinese".

import { lunarFromBirth } from '../utils/chineseLunar';

/* ────────────────────────────────────────────────────────────────────────
 * 1. Types and the two classification axes
 * ──────────────────────────────────────────────────────────────────────── */

/** The four 象 — each governs seven consecutive mansions. */
export type Quadrant = 'azureDragon' | 'blackTortoise' | 'whiteTiger' | 'vermilionBird';

/**
 * Direction / season / element for each 象. Source [A].
 *
 * Note the seasons are the classical Chinese assignment, which is what the
 * mansions were named for — the Azure Dragon rises at dusk in spring.
 */
export const QUADRANT_INFO: Record<
  Quadrant,
  { cn: string; en: string; direction: string; season: string; element: string }
> = {
  azureDragon:   { cn: '東方青龍', en: 'Azure Dragon of the East',    direction: 'East',  season: 'Spring', element: 'Wood'  },
  blackTortoise: { cn: '北方玄武', en: 'Black Tortoise of the North', direction: 'North', season: 'Winter', element: 'Water' },
  whiteTiger:    { cn: '西方白虎', en: 'White Tiger of the West',     direction: 'West',  season: 'Autumn', element: 'Metal' },
  vermilionBird: { cn: '南方朱雀', en: 'Vermilion Bird of the South', direction: 'South', season: 'Summer', element: 'Fire'  },
};

/**
 * 七曜 — the seven luminaries. Note these are LUMINARIES, not the five
 * elements: `fire` is 火曜 = 熒惑 = Mars, `water` is 水曜 = 辰星 = Mercury, and
 * so on, with 日 and 月 completing the seven. The cycle runs
 * 木 → 金 → 土 → 日 → 月 → 火 → 水 and repeats four times across the 28.
 */
export type Planet7 = 'sun' | 'moon' | 'fire' | 'water' | 'wood' | 'metal' | 'earth';

export const PLANET7_INFO: Record<Planet7, { cn: string; en: string }> = {
  sun:   { cn: '日', en: 'Sun'     },
  moon:  { cn: '月', en: 'Moon'    },
  fire:  { cn: '火', en: 'Mars'    },
  water: { cn: '水', en: 'Mercury' },
  wood:  { cn: '木', en: 'Jupiter' },
  metal: { cn: '金', en: 'Venus'   },
  earth: { cn: '土', en: 'Saturn'  },
};

export interface Mansion {
  key: MansionKey;
  cn: string;
  pinyin: string;
  quadrant: Quadrant;
  animal: string;
  animalCn: string;
  planet: Planet7;
  fortune: 'auspicious' | 'inauspicious' | 'mixed';
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. The 28 mansions
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The 28 mansions in canonical order from 角. Sources [A], [B] for names,
 * animals and quadrants; [C] and [E] for `fortune` (the 14 吉 / 14 凶 split).
 *
 * KEY NAMING. `key` is the mansion’s bare pinyin, lowercased and stripped of
 * tone marks — except where the pinyin collides. Tone numbers do not separate
 * them either (畢 and 壁 are both bì), so those take pinyin + an underscore and
 * the standard English gloss; 女 takes `nu` rather than `nv`:
 *
 *     尾 wěi → wei_tail     危 wēi → wei_danger    胃 wèi → wei_stomach
 *     畢 bì  → bi_net       壁 bì  → bi_wall       女 nǚ  → nu
 *
 * These keys are a contract with ./lunarMansionsContent.ts, and the contract is
 * now compiler-enforced: both files type their records as Record<MansionKey, …>,
 * so a rename on either side is a build error rather than a blank on screen.
 * (They HAD drifted on six of the 28 — every colliding key above — and because
 * both sides were Record<string, …> tsc reported nothing.)
 */

/** The 28 mansion keys, in canonical order from 角. */
export type MansionKey =
  | 'jiao' | 'kang' | 'di' | 'fang' | 'xin' | 'wei_tail' | 'ji'
  | 'dou' | 'niu' | 'nu' | 'xu' | 'wei_danger' | 'shi' | 'bi_wall'
  | 'kui' | 'lou' | 'wei_stomach' | 'mao' | 'bi_net' | 'zi' | 'shen'
  | 'jing' | 'gui' | 'liu' | 'xing' | 'zhang' | 'yi' | 'zhen';
export const MANSIONS: Mansion[] = [
  // 東方青龍 — 角亢氐房心尾箕
  { key: 'jiao',       cn: '角', pinyin: 'Jiǎo',  quadrant: 'azureDragon',   animal: 'Flood Dragon', animalCn: '蛟', planet: 'wood',  fortune: 'auspicious'   },
  { key: 'kang',       cn: '亢', pinyin: 'Kàng',  quadrant: 'azureDragon',   animal: 'Dragon',       animalCn: '龍', planet: 'metal', fortune: 'inauspicious' },
  { key: 'di',         cn: '氐', pinyin: 'Dī',    quadrant: 'azureDragon',   animal: 'Raccoon Dog',  animalCn: '貉', planet: 'earth', fortune: 'inauspicious' },
  { key: 'fang',       cn: '房', pinyin: 'Fáng',  quadrant: 'azureDragon',   animal: 'Rabbit',       animalCn: '兔', planet: 'sun',   fortune: 'auspicious'   },
  { key: 'xin',        cn: '心', pinyin: 'Xīn',   quadrant: 'azureDragon',   animal: 'Fox',          animalCn: '狐', planet: 'moon',  fortune: 'inauspicious' },
  { key: 'wei_tail',    cn: '尾', pinyin: 'Wěi',   quadrant: 'azureDragon',   animal: 'Tiger',        animalCn: '虎', planet: 'fire',  fortune: 'auspicious'   },
  { key: 'ji',         cn: '箕', pinyin: 'Jī',    quadrant: 'azureDragon',   animal: 'Leopard',      animalCn: '豹', planet: 'water', fortune: 'auspicious'   },
  // 北方玄武 — 斗牛女虛危室壁
  { key: 'dou',        cn: '斗', pinyin: 'Dǒu',   quadrant: 'blackTortoise', animal: 'Xiezhi',       animalCn: '獬', planet: 'wood',  fortune: 'auspicious'   },
  { key: 'niu',        cn: '牛', pinyin: 'Niú',   quadrant: 'blackTortoise', animal: 'Ox',           animalCn: '牛', planet: 'metal', fortune: 'inauspicious' },
  { key: 'nu',         cn: '女', pinyin: 'Nǚ',    quadrant: 'blackTortoise', animal: 'Bat',          animalCn: '蝠', planet: 'earth', fortune: 'inauspicious' },
  { key: 'xu',         cn: '虛', pinyin: 'Xū',    quadrant: 'blackTortoise', animal: 'Rat',          animalCn: '鼠', planet: 'sun',   fortune: 'inauspicious' },
  { key: 'wei_danger', cn: '危', pinyin: 'Wēi',   quadrant: 'blackTortoise', animal: 'Swallow',      animalCn: '燕', planet: 'moon',  fortune: 'inauspicious' },
  { key: 'shi',        cn: '室', pinyin: 'Shì',   quadrant: 'blackTortoise', animal: 'Pig',          animalCn: '豬', planet: 'fire',  fortune: 'auspicious'   },
  { key: 'bi_wall',     cn: '壁', pinyin: 'Bì',    quadrant: 'blackTortoise', animal: 'Yayu',         animalCn: '貐', planet: 'water', fortune: 'auspicious'   },
  // 西方白虎 — 奎婁胃昴畢觜參
  { key: 'kui',        cn: '奎', pinyin: 'Kuí',   quadrant: 'whiteTiger',    animal: 'Wolf',         animalCn: '狼', planet: 'wood',  fortune: 'inauspicious' },
  { key: 'lou',        cn: '婁', pinyin: 'Lóu',   quadrant: 'whiteTiger',    animal: 'Dog',          animalCn: '狗', planet: 'metal', fortune: 'auspicious'   },
  { key: 'wei_stomach', cn: '胃', pinyin: 'Wèi',   quadrant: 'whiteTiger',    animal: 'Pheasant',     animalCn: '雉', planet: 'earth', fortune: 'auspicious'   },
  { key: 'mao',        cn: '昴', pinyin: 'Mǎo',   quadrant: 'whiteTiger',    animal: 'Rooster',      animalCn: '雞', planet: 'sun',   fortune: 'inauspicious' },
  { key: 'bi_net',      cn: '畢', pinyin: 'Bì',    quadrant: 'whiteTiger',    animal: 'Crow',         animalCn: '烏', planet: 'moon',  fortune: 'auspicious'   },
  { key: 'zi',         cn: '觜', pinyin: 'Zī',    quadrant: 'whiteTiger',    animal: 'Monkey',       animalCn: '猴', planet: 'fire',  fortune: 'inauspicious' },
  { key: 'shen',       cn: '參', pinyin: 'Shēn',  quadrant: 'whiteTiger',    animal: 'Ape',          animalCn: '猿', planet: 'water', fortune: 'auspicious'   },
  // 南方朱雀 — 井鬼柳星張翼軫
  { key: 'jing',       cn: '井', pinyin: 'Jǐng',  quadrant: 'vermilionBird', animal: 'Elk',          animalCn: '犴', planet: 'wood',  fortune: 'auspicious'   },
  { key: 'gui',        cn: '鬼', pinyin: 'Guǐ',   quadrant: 'vermilionBird', animal: 'Goat',         animalCn: '羊', planet: 'metal', fortune: 'inauspicious' },
  { key: 'liu',        cn: '柳', pinyin: 'Liǔ',   quadrant: 'vermilionBird', animal: 'Water Deer',   animalCn: '獐', planet: 'earth', fortune: 'inauspicious' },
  { key: 'xing',       cn: '星', pinyin: 'Xīng',  quadrant: 'vermilionBird', animal: 'Horse',        animalCn: '馬', planet: 'sun',   fortune: 'inauspicious' },
  { key: 'zhang',      cn: '張', pinyin: 'Zhāng', quadrant: 'vermilionBird', animal: 'Deer',         animalCn: '鹿', planet: 'moon',  fortune: 'auspicious'   },
  { key: 'yi',         cn: '翼', pinyin: 'Yì',    quadrant: 'vermilionBird', animal: 'Snake',        animalCn: '蛇', planet: 'fire',  fortune: 'inauspicious' },
  { key: 'zhen',       cn: '軫', pinyin: 'Zhěn',  quadrant: 'vermilionBird', animal: 'Earthworm',    animalCn: '蚓', planet: 'water', fortune: 'auspicious'   },
];

/** Convenience lookup so consumers never have to `.find()` by key. */
export const MANSION_BY_KEY: Record<MansionKey, Mansion> = Object.fromEntries(
  MANSIONS.map((m) => [m.key, m]),
) as Record<MansionKey, Mansion>;

/* ────────────────────────────────────────────────────────────────────────
 * 3. The 值日 rule — which mansion governs a calendar day
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The attested day the continuous cycle is pinned to.
 *
 * 2026-08-20 is a Thursday, 丙寅日, lunar 七月初八 — and 角宿 (角木蛟, 木曜).
 * Being a 木 mansion on a Thursday, it satisfies the weekday lock; being
 * index 0 it makes the arithmetic below read as plain day-counting.
 *
 * Corroboration is laid out in the file header: a second almanac day 10,385
 * days earlier (1998-03-15 = 房宿), a published worked example of the classical
 * formula giving the same 1998 answer, and lunar-javascript’s (地支, weekday)
 * table agreeing with both.
 */
export const MANSION_ANCHOR: { date: string; mansionKey: string; source: string } = {
  date: '2026-08-20',
  mansionKey: 'jiao',
  source: 'https://www.qmrl888.com/2026-8-20.html',
};

// The calendar day boundary is China Standard Time (UTC+8) — the same
// convention `src/utils/chineseLunar.ts` defines its whole calendar against.
// That module keeps `cstDayNumber` private, so we mirror it here rather than
// widen its API; the two must stay identical.
//
// Deliberately NOT applied: the 晚子時 convention that rolls 23:00–23:59 into
// the following day. chineseLunar.ts uses the plain civil day and so do we, so
// a chart never disagrees with itself about which day someone was born on.
const CST_OFFSET_MS = 8 * 3600 * 1000;
const DAY_MS = 86400000;

/** Days since the Unix epoch in China Standard Time — our unit for “day”. */
function cstDayNumber(d: Date): number {
  return Math.floor((d.getTime() + CST_OFFSET_MS) / DAY_MS);
}

const ANCHOR_DAY = cstDayNumber(new Date(`${MANSION_ANCHOR.date}T00:00:00+08:00`));
const ANCHOR_INDEX = MANSIONS.findIndex((m) => m.key === MANSION_ANCHOR.mansionKey);

/**
 * The 值日 mansion for a given instant, on the CST day boundary.
 *
 * One mansion per day, advancing by one and wrapping 28 → 1, forever, with no
 * reset at any point in the year. Works for dates before the anchor too — the
 * modulo is normalised for negative offsets.
 */
export function mansionForDate(date: Date): Mansion | null {
  // An Invalid Date is still a Date, so TypeScript warns nobody. cstDayNumber
  // yields NaN for it, NaN survives the modulo, and MANSIONS[NaN] is undefined
  // — returned from a signature that promised a Mansion. Fail loudly instead.
  if (!Number.isFinite(date.getTime())) return null;
  const offset = cstDayNumber(date) - ANCHOR_DAY;
  const index = (((offset + ANCHOR_INDEX) % MANSIONS.length) + MANSIONS.length) % MANSIONS.length;
  return MANSIONS[index];
}

/**
 * Parse a `YYYY-MM-DD` (+ optional `HH:MM`) birth input into a UTC instant,
 * reading the given wall time as China Standard Time — the same assumption
 * `lunarFromBirth` makes, so the primary and secondary readings agree about
 * which day a birth falls on.
 *
 * Returns null for anything malformed, including calendar dates that do not
 * exist (2026-02-30 must not silently become 2026-03-02).
 */
function cstInstantFromBirth(birthDate: string, birthTime?: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!dm) return null;
  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // No time given → noon, matching `lunarFromBirth`’s default. Noon is also the
  // safest default: it cannot drift across a day boundary under rounding.
  let hour = 12;
  let minute = 0;
  // Gate the same way src/data/bazi.ts and src/utils/chineseLunar.ts do. A
  // strict `!== undefined` check is wrong here: profiles carry `null` for a
  // missing birth time, `exec(null)` coerces to the string 'null', and the
  // reading would vanish for exactly the users who gave us no time at all.
  if (birthTime && /^\d{1,2}:\d{2}/.test(birthTime)) {
    const tm = /^(\d{1,2}):(\d{2})/.exec(birthTime);
    if (!tm) return null;
    hour = Number(tm[1]);
    minute = Number(tm[2]);
    if (hour > 23 || minute > 59) return null;
  }

  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute) - CST_OFFSET_MS);
  if (Number.isNaN(utc.getTime())) return null;

  // Date.UTC rolls overflow forward and maps two-digit years into the 1900s.
  // Round-trip the CST wall date and reject anything that moved.
  const cst = new Date(utc.getTime() + CST_OFFSET_MS);
  if (
    cst.getUTCFullYear() !== year ||
    cst.getUTCMonth() !== month - 1 ||
    cst.getUTCDate() !== day
  ) {
    return null;
  }
  return utc;
}

/**
 * 本命宿 — PRIMARY reading (Chinese 二十八宿 practice).
 *
 * The mansion governing the birth DATE, taken straight off the continuous 值日
 * cycle. This is what a 通勝 / 老黃曆 means by someone’s 值日星宿, and it is the
 * reading the rest of the app should use unless it says otherwise.
 *
 * Returns null on malformed input rather than guessing a date.
 */
export function mansionForBirth(birthDate: string, birthTime?: string): Mansion | null {
  const at = cstInstantFromBirth(birthDate, birthTime);
  return at === null ? null : mansionForDate(at);
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. 宿曜 (sukuyō) — the SECONDARY, Indo-Japanese reading
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The 27 mansions of 宿曜道, in order, as mansion keys.
 *
 * The Indo-Japanese tradition that reached Japan with the 宿曜経 works with 27
 * nakṣatra rather than 28: 牛宿 is dropped, and the remaining 27 divide the
 * ecliptic evenly. Everything else about the names is shared with the Chinese
 * set, so we key straight back into MANSIONS. Source [C] (FotoUtil.XIU_27),
 * confirmed against [I].
 */
export const SUKUYO_27: MansionKey[] = [
  'jiao', 'kang', 'di', 'fang', 'xin', 'wei_tail', 'ji',
  'dou', /* 牛 omitted */ 'nu', 'xu', 'wei_danger', 'shi', 'bi_wall',
  'kui', 'lou', 'wei_stomach', 'mao', 'bi_net', 'zi', 'shen',
  'jing', 'gui', 'liu', 'xing', 'zhang', 'yi', 'zhen',
];

/**
 * 月宿傍通暦 — the 朔日宿: index into SUKUYO_27 for day 1 of lunar months 1…12.
 *
 * This is the crucial difference from the Chinese rule. The sukuyō sequence
 * RESETS every lunar month to a fixed mansion — 正月朔 is 室, 二月朔 is 奎, and
 * so on through 室奎胃畢參鬼張角氐心斗虛 — then advances one mansion per lunar
 * day. It is therefore a function of (lunar month, lunar day) only, and it will
 * usually disagree with the 值日 reading above. That is expected: they are two
 * different traditions, and this file keeps them apart on purpose.
 *
 * Sources [I] (the table) and [C] (FotoUtil.XIU_OFFSET), which agree exactly.
 *
 * 閏月 (leap months) are not special-cased: LunarDate reports a leap month
 * under the number it repeats, and the 傍通暦 is indexed by month number alone.
 */
export const SUKUYO_MONTH_START: number[] = [11, 13, 15, 17, 19, 21, 24, 0, 2, 4, 7, 9];

/**
 * 本命宿 — SECONDARY reading (宿曜道 / sukuyō).
 *
 * Verified against the worked example in [J]: 1986-10-19 is lunar 9/16, the
 * 九月朔日宿 is 氐 (index 2), and (2 + 16 − 1) mod 27 = 17 → 畢宿.
 *
 * Returns null on malformed input, and null if the lunar conversion itself
 * fails (a date outside the ephemeris range) — never a guessed mansion.
 */
export function sukuyoMansionForBirth(birthDate: string, birthTime?: string): Mansion | null {
  if (cstInstantFromBirth(birthDate, birthTime) === null) return null;
  const lunar = lunarFromBirth(birthDate, birthTime);
  if (lunar === null) return null;

  const start = SUKUYO_MONTH_START[lunar.month - 1];
  if (start === undefined) return null;

  const index = (start + lunar.day - 1) % SUKUYO_27.length;
  return MANSION_BY_KEY[SUKUYO_27[index]] ?? null;
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. 宜 / 忌 — what each mansion’s day is traditionally used for
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * The traditional 宜 (favourable) and 忌 (unfavourable) uses of each mansion.
 *
 * Compiled from [E] (primary) and [F] (second Chinese table), with [G], the
 * Japanese 暦注 list, filling only those sides where BOTH Chinese tables are
 * silent — every such entry is marked `[G]` on its line. Where the two Chinese
 * tables contradict each other on an item, the item is dropped from both lists
 * rather than adjudicated; that is why a few arrays are short.
 *
 * The [G] fill only applies where the Chinese tables say NOTHING. Where they
 * assert a blanket 百事皆凶 / 萬事皆凶, that is a contradiction rather than a
 * silence, and [G] does not get to override it.
 *
 * Three arrays are therefore deliberately unbalanced and must not be
 * “completed”:
 *   - `niu.favourable` is EMPTY. Chinese practice records no 宜 for 牛宿 at all
 *     (its 吉凶歌 is negative throughout), and the Japanese tradition that
 *     disagrees calls it auspicious for everything without naming a single
 *     activity. There is nothing to list. Callers must handle an empty array.
 *   - `zi.favourable` is EMPTY for the same reason: [E] calls 觜宿 百事皆凶, [F]
 *     lists no 宜, and its 吉凶歌 is negative from first line to last.
 *   - `dou.unfavourable` has one entry, from [G]; both Chinese tables record no
 *     忌 for 斗宿.
 *
 * These are almanac customs about ceremonies, building, farming and travel.
 * Nothing here is advice about health, money or law, and the content layer
 * should not present it as any of those.
 *
 * One traditional line is knowingly left out: [F]’s 鬼宿 verse
 * 「修築牆垣傷產女，手扶雙女淚汪汪」 — construction work on that day harming a
 * woman in childbirth. It is an omen about women’s bodies rather than a custom
 * about a day, and it has no place in front of a reader. (An earlier draft of
 * this note attributed it to 井宿 and called it a 忌 item; it belongs to 鬼宿
 * and is a verse line. [E] gives 井 「宜：祭祀、播种、建造。忌：裁衣」 and no 產女
 * anywhere. The decision to omit stands — only the citation was wrong.)
 */
export const MANSION_ACTIVITIES: Record<MansionKey, { favourable: string[]; unfavourable: string[] }> = {
  jiao: {
    favourable: ['Weddings', 'Travel', 'Breaking ground on a build', 'Raising pillars'],
    unfavourable: ['Funerals and burials', 'Work on tombs and grave sites'],
  },
  kang: {
    // [E] lists weddings as favourable while [F] and the 吉凶歌 warn against
    // them; the contested item is dropped and only betrothal is kept.
    favourable: ['Betrothals', 'Sowing and planting', 'Buying and selling'],
    unfavourable: ['Building a house', 'Funerals and burials'],
  },
  di: {
    favourable: ['Buying land', 'Sowing and planting'],
    unfavourable: ['Weddings', 'Building', 'Funerals and burials', 'Long voyages'],
  },
  fang: {
    favourable: ['Rituals and offerings', 'Weddings', 'Raising the roof beam', 'Moving house'],
    unfavourable: ['Buying land', 'Cutting cloth for new clothes'],
  },
  xin: {
    favourable: ['Rituals and offerings', 'Moving house', 'Travel'],
    unfavourable: ['Building', 'Weddings', 'Funerals and burials', 'Cutting cloth for new clothes'],
  },
  wei_tail: {
    favourable: ['Weddings', 'Building and repairs', 'Opening a business', 'Burials'],
    unfavourable: [
      'Cutting cloth for new clothes',
      'Wearing new clothes for the first time', // [G]
    ],
  },
  ji: {
    favourable: ['Building', 'Digging ponds and water channels', 'Burials', 'Gathering in money'],
    unfavourable: ['Weddings', 'Cutting cloth for new clothes'],
  },
  dou: {
    favourable: ['Building', 'Cutting cloth for new clothes', 'Opening a business', 'Burials'],
    unfavourable: ['Demolishing a building'], // [G] — Chinese tables list no 忌
  },
  niu: {
    favourable: [], // see the note above — Chinese practice records no 宜 for 牛宿
    unfavourable: ['Weddings', 'Building', 'Opening water channels'],
  },
  nu: {
    favourable: [
      'Study and the arts',
      'Metalwork and fine craft', // [G]
    ],
    unfavourable: [
      'Funerals',
      'Lawsuits and disputes',
      'Cutting cloth for new clothes',
      'Weddings', // [G]
    ],
  },
  xu: {
    // DELIBERATELY EMPTY, for the same reason as 翼: [E]'s summary names 虛
    // alongside it as 百事不吉, and [G] does not override that.
    favourable: [],
    unfavourable: [
      'Building',
      'Opening water channels',
      'Important consultations', // [G]
    ],
  },
  wei_danger: {
    favourable: ['Travel', 'Taking in money'],
    unfavourable: [
      'Building',
      'Funerals and burials',
      'Work at height', // [G]
    ],
  },
  shi: {
    favourable: ['Weddings', 'Moving house', 'Building and renovation', 'Rituals and offerings'],
    unfavourable: ['Funerals'],
  },
  bi_wall: {
    favourable: ['Weddings', 'Building', 'Burials', 'Opening a business'],
    unfavourable: ['Travelling south'],
  },
  kui: {
    favourable: ['Travel', 'Cutting cloth and sewing', 'Repairing a house'],
    unfavourable: ['Opening a shop', 'Funerals and burials', 'Opening water channels'],
  },
  lou: {
    // [E]: 「宜：婚礼、修屋、造庭」 and, in its closing summary, 「婁忌开张、新筑」.
    // 'Moving house' was unmarked Japanese 引越し; 'Travelling south' is 壁宿's
    // well-attested taboo, duplicated here under a [G] mark that wrongly
    // claimed the Chinese sources were silent — they are not.
    // Note [E]'s 新筑 sits beside 修屋: repairing yes, building new no.
    favourable: ['Weddings', 'Repairing a house', 'Making a garden'],
    unfavourable: ['Opening a shop', 'New construction'],
  },
  wei_stomach: {
    favourable: ['Weddings', 'Burials', 'Public and official business'],
    unfavourable: [
      'Private, self-interested dealings',
      'Cutting cloth for new clothes', // [G]
    ],
  },
  mao: {
    // DELIBERATELY EMPTY. [E] gives 昴 no 宜 field at all — its verdict is
    // 「忌：结婚，万事皆凶」. We previously carried 'Building and renovation'
    // from line 1 of the 吉凶歌 (昴星造作進田牛) while its other seven lines run
    // negative, which published a "go ahead and build" on a day the primary
    // source calls comprehensively inauspicious. Do not reinstate it.
    favourable: [],
    unfavourable: ['Weddings', 'Funerals and burials', 'Opening water channels'],
  },
  bi_net: {
    favourable: ['Building a house', 'Weddings', 'Burials', 'Building bridges'],
    unfavourable: [
      'Cutting cloth for new clothes', // [G]
      'Extravagant spending', // [G]
    ],
  },
  zi: {
    favourable: [], // see the note above — 百事皆凶; [G]’s 入学 contradicts it, so it is not borrowed
    unfavourable: ['Building', 'Funerals and burials', 'Opening a shop', 'Investing'],
  },
  shen: {
    // [E]: 「宜：旅行、立门、建造皆吉」 — nothing more. 'Opening a business' was a
    // misreading of the verse line 開門放水加官職, where 開門 is hanging a gate.
    favourable: ['Travel', 'Building', 'Hanging a new door'],
    unfavourable: ['Weddings', 'Funerals and burials'],
  },
  jing: {
    favourable: ['Rituals and offerings', 'Sowing and planting', 'Building', 'Digging a well'],
    unfavourable: ['Cutting cloth for new clothes'],
  },
  gui: {
    // Chinese reading. Japanese 暦注 inverts this entirely — see the header.
    favourable: ['Burials'],
    unfavourable: ['Weddings', 'Building', 'Opening water channels'],
  },
  liu: {
    favourable: [
      'Felling trees', // [G]
      'Making a firm decision', // [G]
    ],
    unfavourable: ['Building', 'Funerals and burials', 'Opening water channels', 'Weddings'],
  },
  xing: {
    // [E] and [G] contradict each other on sowing and on weddings, so both are
    // dropped; what survives is the 吉凶歌 line 星宿日好造新房，進職加官.
    favourable: ['Building a new house', 'Seeking promotion or office'],
    unfavourable: ['Funerals and burials', 'Opening water channels'],
  },
  zhang: {
    favourable: ['Weddings', 'Opening a market or business', 'Rituals and offerings', 'Burials'],
    unfavourable: ['Cutting cloth for new clothes'], // [G]
  },
  yi: {
    // DELIBERATELY EMPTY. [E]'s 翼 line ends 「百事皆不宜」 and its summary reads
    // 「翼和虚为百事不吉」. The header's rule is that [G] never overrides a
    // blanket 百事皆凶, so the three Japanese items that sat here are dropped.
    favourable: [],
    unfavourable: ['Weddings', 'Building', 'Funerals and burials'],
  },
  zhen: {
    favourable: [
      'Weddings', 'Buying land', 'Starting school or study', 'Building',
      // [E]: 「宜：买田园、入学、建造、婚礼、裁衣」. [G] and [H] both call 裁衣
      // 凶 here; primary wins, and the disagreement is recorded rather than
      // silently resolved by moving it to the other list.
      'Cutting cloth and sewing',
    ],
    unfavourable: [
      'Travelling north',
    ],
  },
};
