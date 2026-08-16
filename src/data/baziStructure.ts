// Bazi 取格 / 格局 — formal structure (pattern) determination.
//
// A 格局 is the organising principle of a chart. Classical 子平 practice
// takes it from the MONTH BRANCH (月令) — the seasonal command — and names
// it by the Ten God relationship between the commanding stem and the Day
// Master. A reader names the structure before saying anything else, because
// it decides which of the chart’s energies gets the loudest say.
//
// This module sits on top of `bazi.ts` (four pillars, day master, hidden
// stems, ten-god relations) and adds only the 取格 layer: tables, the
// selection rule, and the reader-facing interpretation text. It is a small
// enough system to keep in one file.
//
// SCOPE — what this file does NOT do:
//   • No 從格 / 化格 / 專旺格 (follower and transformation structures). See
//     the 從格 note at the bottom of the rules section for why we refuse to
//     guess at them rather than emit a wrong one.
//   • No 格局高低 (grading a structure as 成格 / 破格). That needs 用神 and
//     救應 analysis well beyond what we compute.
//
// Sources actually consulted for the tables and the procedure:
//   • 三命通會 卷三 · 論十干祿 — the 祿 table, and “四宮無祿” for 辰戌丑未.
//     https://m.gushiwen.cn/guwen/bookv_8624d83bde38.aspx
//   • 三命通會 卷六 · 論陽刃 — “祿前一位 … 惟甲丙戊庚壬五陽干有刃，
//     乙丁己辛癸五陰干無刃，故曰陽刃.”
//     https://www.suanming.com.tw/blog/228
//   • 子平真詮評註 · 論雜氣如何取用 — “四墓者，雜氣也 … 透干會支，別其
//     重輕而已”, i.e. in 辰戌丑未 months the revealed stem takes the格.
//     https://www.8bei8.com/book/zipingzhenquanpingzhu_18.html
//   • Cantian AI 格局 wiki — modern statement of the same procedure, and
//     explicitly: the tradition has no 比肩格 / 劫財格; those months are
//     named 建祿格 or 羊刃格 instead.
//     https://www.cantian.ai/wiki/geju/geju_intro/
//   • Zi Ping Zhen Quan study notes (deeporacle) — “Friend and Rob Wealth
//     cannot establish patterns”; principal-qi-first emergence rule.
//     https://www.deeporacle.ai/en/bazi/blog/ziping-zhenchuan-study-notes
//   • 偏官格/七殺格 (fatew) — “月支主氣 … 本氣為格局也”.
//     https://fatew.com/mode/r02.htm

import {
  HIDDEN_STEMS,
  STEM_ELEMENT,
  ELEMENT_PRODUCES,
  ELEMENT_CONTROLS,
  type BaziResult,
  type HeavenlyStem,
  type EarthlyBranch,
  type TenGod,
} from './bazi';

// ────────────────────────────────────────────────────────────────────
// NAMING HAZARD — read before editing the tables below.
//
// This codebase reuses the romanisation `Wu` for TWO different things:
//   • HeavenlyStem 'Wu'   = 戊, yang earth
//   • EarthlyBranch 'Wu'  = 午, the Horse branch
// Every table here is typed, so the compiler catches a mix-up, but the
// inline comments always give the hanzi so a human reader can too.
// ────────────────────────────────────────────────────────────────────

export type StructureKey =
  | 'DirectOfficer'     // 正官格
  | 'SevenKillings'     // 七殺格
  | 'DirectWealth'      // 正財格
  | 'IndirectWealth'    // 偏財格
  | 'DirectResource'    // 正印格
  | 'IndirectResource'  // 偏印格
  | 'EatingGod'         // 食神格
  | 'HurtingOfficer'    // 傷官格
  | 'EstablishedRank'   // 建祿格
  | 'Blade'             // 陽刃格 (also written 羊刃格 / 月刃格)
  | 'MonthPeer';        // 月劫格

export interface Structure {
  key: StructureKey;
  cn: string;
  en: string;
  /** The month-branch hidden stem the structure was taken from. */
  sourceStem: HeavenlyStem;
  /** Always the month branch — 格局 is only ever taken from 月令. */
  sourceBranch: EarthlyBranch;
  /** True when `sourceStem` also stands in the year, month, or hour stem (透出). */
  revealed: boolean;
  /**
   * Ten God of `sourceStem` relative to the Day Master — the thing the
   * structure is named after. `null` for 建祿 / 陽刃 / 月劫, which the
   * tradition deliberately does NOT name by a Ten God (比劫不成格).
   */
  tenGod: TenGod | null;
}

// ────────────────────────────────────────────────────────────────────
// 1. 十干祿 — each day master’s "seat" branch (臨官 position).
//
// 三命通會 卷三 論十干祿: 甲祿寅、乙祿卯、丙祿巳、丁祿午、戊寄巳、
// 己寄午、庚祿申、辛祿酉、壬祿亥、癸祿子. The earth stems 戊/己 have no
// seat of their own and *borrow* (寄) the fire stems’ — this is why a 戊
// day master born in 巳 month is 建祿格 even though 巳’s principal qi 丙
// reads as 偏印. The same text states 辰戌丑未 carry no 祿 at all
// (“四宮無祿”), which is what keeps earth day masters born in the four
// storehouse months out of this table.
// ────────────────────────────────────────────────────────────────────

const LU_BRANCH: Record<HeavenlyStem, EarthlyBranch> = {
  Jia:  'Yin',   // 甲祿在寅
  Yi:   'Mao',   // 乙祿在卯
  Bing: 'Si',    // 丙祿在巳
  Ding: 'Wu',    // 丁祿在午   ← branch 午
  Wu:   'Si',    // 戊寄祿於巳 ← stem 戊
  Ji:   'Wu',    // 己寄祿於午
  Geng: 'Shen',  // 庚祿在申
  Xin:  'You',   // 辛祿在酉
  Ren:  'Hai',   // 壬祿在亥
  Gui:  'Zi',    // 癸祿在子
};

// ────────────────────────────────────────────────────────────────────
// 2. 陽刃 — the blade, one branch past the 祿 (祿前一位).
//
// 三命通會 卷六 論陽刃: “惟甲丙戊庚壬五陽干有刃，乙丁己辛癸五陰干無
// 刃，故曰陽刃.” We follow that mainstream reading: only the five YANG
// day masters carry a blade. A minority tradition assigns yin stems a
// blade too (乙刃在寅 by 帝旺, or 乙刃在辰 by 墓庫) — the two minority
// readings do not even agree with each other, so we take the majority
// one. Yin day masters whose month is their Rival branch land in 月劫格
// below instead. This table matches `detectSpiritStars`’ 羊刃 map in
// baziDeep.ts exactly, on purpose.
// ────────────────────────────────────────────────────────────────────

const BLADE_BRANCH: Partial<Record<HeavenlyStem, EarthlyBranch>> = {
  Jia:  'Mao',  // 甲刃在卯
  Bing: 'Wu',   // 丙刃在午
  Wu:   'Wu',   // 戊刃在午 (stem 戊 → branch 午)
  Geng: 'You',  // 庚刃在酉
  Ren:  'Zi',   // 壬刃在子
};

// ────────────────────────────────────────────────────────────────────
// 3. Ten God → structure name.
//
// The eight 正格 are named directly by the Ten God of the commanding
// stem. 比肩 and 劫財 map to `null`: 比劫不成格 — the tradition has no
// 比肩格 or 劫財格, and those months are named 建祿 / 陽刃 / 月劫
// instead (Cantian AI 格局 wiki; 子平真詮 論建祿月劫).
// ────────────────────────────────────────────────────────────────────

const STRUCTURE_BY_TEN_GOD: Record<TenGod, StructureKey | null> = {
  Authority:  'DirectOfficer',     // 正官 → 正官格
  Pressure:   'SevenKillings',     // 七殺 → 七殺格
  Wealth:     'DirectWealth',      // 正財 → 正財格
  WealthEdge: 'IndirectWealth',    // 偏財 → 偏財格
  Resource:   'DirectResource',    // 正印 → 正印格
  Influence:  'IndirectResource',  // 偏印 → 偏印格
  Output:     'EatingGod',         // 食神 → 食神格
  Performer:  'HurtingOfficer',    // 傷官 → 傷官格
  Companion:  null,                // 比肩 — 不成格
  Rival:      null,                // 劫財 — 不成格
};

const STRUCTURE_NAMES: Record<StructureKey, { cn: string; en: string }> = {
  DirectOfficer:    { cn: '正官格', en: 'Direct Officer' },
  SevenKillings:    { cn: '七殺格', en: 'Seven Killings' },
  DirectWealth:     { cn: '正財格', en: 'Direct Wealth' },
  IndirectWealth:   { cn: '偏財格', en: 'Indirect Wealth' },
  DirectResource:   { cn: '正印格', en: 'Direct Resource' },
  IndirectResource: { cn: '偏印格', en: 'Indirect Resource' },
  EatingGod:        { cn: '食神格', en: 'Eating God' },
  HurtingOfficer:   { cn: '傷官格', en: 'Hurting Officer' },
  EstablishedRank:  { cn: '建祿格', en: 'Established Rank' },
  Blade:            { cn: '陽刃格', en: 'Yang Blade' },
  MonthPeer:        { cn: '月劫格', en: 'Month of Peers' },
};

// ────────────────────────────────────────────────────────────────────
// 4. Ten God of one stem relative to the day master.
//
// bazi.ts keeps its `stemTenGod` private (baziDeep.ts had to re-declare
// it too), so we re-derive it here from the exported element tables
// rather than duplicating a lookup table that could drift.
// ────────────────────────────────────────────────────────────────────

function tenGodOf(dayStem: HeavenlyStem, otherStem: HeavenlyStem): TenGod {
  const dm = STEM_ELEMENT[dayStem];
  const other = STEM_ELEMENT[otherStem];
  const samePolarity = dm.polarity === other.polarity;

  if (other.element === dm.element) return samePolarity ? 'Companion' : 'Rival';
  if (ELEMENT_PRODUCES[dm.element] === other.element) return samePolarity ? 'Output' : 'Performer';
  if (ELEMENT_CONTROLS[dm.element] === other.element) return samePolarity ? 'WealthEdge' : 'Wealth';
  if (ELEMENT_CONTROLS[other.element] === dm.element) return samePolarity ? 'Pressure' : 'Authority';
  return samePolarity ? 'Influence' : 'Resource';
}

// ────────────────────────────────────────────────────────────────────
// 5. 取格 — the selection procedure.
//
// Step 0  The structure is taken from the MONTH BRANCH only. Year, day,
//         and hour branches never establish a structure.
//         (“立格必用月令提綱，不可於年日時中求格.”)
//
// Step 1  月支為日主之刃 → 陽刃格.
// Step 2  月支為日主之祿 → 建祿格.
//         These two are checked FIRST and beat the 透出 rule. 子平真詮
//         gives 建祿月劫 and 陽刃 their own chapters precisely because the
//         month command is the day master’s own seat; the revealed
//         財官煞食 becomes the 用神 within that structure rather than
//         renaming it. DIVERGENCE: a minority of modern readers would
//         instead let a revealed 中氣 rename e.g. 甲 day / 寅 month with
//         丙 revealed as 食神格. We take the classical reading, because
//         the alternative means no chart is ever labelled 建祿格 or 陽刃格
//         when it has any revealed stem at all — a silent mislabelling.
//
// Step 3  Otherwise, run the emergence (透干) rule over the month
//         branch’s hidden stems, skipping any whose Ten God is 比肩 or
//         劫財 (比劫不成格):
//   3a    本氣透干 → take the principal. (fatew: “本氣為格局也”.)
//   3b    本氣不透，中氣或餘氣透干 → take the earliest revealed one, i.e.
//         中氣 before 餘氣.
//   3c    皆不透 → fall back to the principal.
//         HIDDEN_STEMS in bazi.ts lists each branch principal-first — we
//         verified all twelve entries against the standard 藏干 table
//         (子:癸 / 丑:己癸辛 / 寅:甲丙戊 / 卯:乙 / 辰:戊乙癸 / 巳:丙庚戊 /
//         午:丁己 / 未:己丁乙 / 申:庚壬戊 / 酉:辛 / 戌:戊辛丁 / 亥:壬甲)
//         before relying on index 0 as 本氣.
//         "Revealed" means the stem also stands in the YEAR, MONTH, or
//         HOUR stem. The day stem is excluded: it *is* the day master, so
//         it can only ever read as 比肩.
//
// Step 4  If the principal is itself 比肩/劫財 and nothing else emerged,
//         the month command is the day master’s own element on a seat
//         that is neither 祿 nor 刃 → 月劫格. 子平真詮 論建祿月劫:
//         “建祿者，月建逢祿堂也，祿即是劫 … 故建祿與月劫，可同一格.”
//         In practice this catches 乙/寅, 丁/巳, 辛/申, 癸/亥 and the earth
//         day masters born in 辰戌丑未 (which 三命通會 says carry no 祿).
//         DIVERGENCE: read strictly, 子平真詮 would keep 月劫格 even when a
//         財官煞食 is revealed. We let the revealed stem win (step 3
//         precedes step 4) because 論雜氣如何取用 tells us to take 辰戌丑未
//         months by 透干會支, and because “雜氣財官格” for an earth day
//         master with 財/官 showing is what practitioners actually say.
//
// 從格 (follower structures) — DELIBERATELY NOT IMPLEMENTED.
//   從財 / 從殺 / 從兒 / 從勢 / 專旺 require judging that the day master is
//   rootless (日主無根) across every branch’s hidden stems AND that no
//   印比 anywhere props it up AND that the dominant force is undamaged —
//   and then still distinguishing 真從 from 假從, which practitioners
//   openly disagree about on the same chart. That is a judgement call,
//   not a lookup. Emitting a wrong 從格 inverts the entire reading (the
//   chart’s helpful and harmful elements swap places), so this module
//   returns the ordinary month-command structure for such charts and
//   says nothing about following. If 從格 is wanted later it needs a
//   separate, explicitly-flagged, human-reviewable pass.
// ────────────────────────────────────────────────────────────────────

/**
 * Determine the chart’s 格局 from the month command.
 *
 * Returns `null` only when the input cannot be read at all (missing
 * pillars, or a month branch with no hidden-stem entry). Every
 * well-formed chart resolves to one of the eleven named structures —
 * the tables are total over all 10 day masters × 12 month branches.
 * Never throws.
 */
export function determineStructure(result: BaziResult): Structure | null {
  if (!result || !result.month || !result.dayMaster) return null;

  const dayMaster = result.dayMaster;
  const branch = result.month.branch;
  const hidden: HeavenlyStem[] | undefined = HIDDEN_STEMS[branch];
  if (!hidden || hidden.length === 0) return null;
  if (!STEM_ELEMENT[dayMaster]) return null;

  const principal = hidden[0]; // 本氣

  // 透出 is checked against year / month / hour stems only — never the day
  // stem, which is the day master itself.
  const standingStems: HeavenlyStem[] = [
    result.year?.stem,
    result.month.stem,
    result.hour?.stem,
  ].filter((s): s is HeavenlyStem => Boolean(s));
  const isRevealed = (stem: HeavenlyStem) => standingStems.includes(stem);

  const build = (key: StructureKey, sourceStem: HeavenlyStem, tenGod: TenGod | null): Structure => ({
    key,
    cn: STRUCTURE_NAMES[key].cn,
    en: STRUCTURE_NAMES[key].en,
    sourceStem,
    sourceBranch: branch,
    revealed: isRevealed(sourceStem),
    tenGod,
  });

  // Step 1 — 陽刃格. The blade stem is the day master’s Rival, which is
  // always among the blade branch’s hidden stems (卯:乙 / 午:丁,己 /
  // 酉:辛 / 子:癸); fall back to the principal defensively.
  if (BLADE_BRANCH[dayMaster] === branch) {
    const bladeStem = hidden.find((s) => tenGodOf(dayMaster, s) === 'Rival') ?? principal;
    return build('Blade', bladeStem, null);
  }

  // Step 2 — 建祿格. The day master itself sits among the 祿 branch’s
  // hidden stems in all ten cases, including the borrowed earth seats
  // (戊 in 巳 = 餘氣, 己 in 午 = 中氣).
  if (LU_BRANCH[dayMaster] === branch) {
    const seatStem = hidden.includes(dayMaster) ? dayMaster : principal;
    return build('EstablishedRank', seatStem, null);
  }

  // Step 3 — 透干 rule over the hidden stems that can actually form a
  // structure. `hidden` is principal-first, so the first match is 本氣,
  // then 中氣, then 餘氣 — exactly the classical priority.
  const formable = hidden.filter((s) => STRUCTURE_BY_TEN_GOD[tenGodOf(dayMaster, s)] !== null);
  const emerged = formable.find(isRevealed);
  const chosen = emerged ?? formable[0];

  if (chosen) {
    const tenGod = tenGodOf(dayMaster, chosen);
    const key = STRUCTURE_BY_TEN_GOD[tenGod];
    if (key) return build(key, chosen, tenGod);
  }

  // Step 4 — every hidden stem is 比肩/劫財 on a seat that is neither
  // 祿 nor 刃. Unreachable for the standard 藏干 table (no branch is all
  // one element for a day master that failed steps 1–2), but kept so the
  // function stays total if the table is ever extended.
  return build('MonthPeer', principal, null);
}

// ────────────────────────────────────────────────────────────────────
// 6. Reader-facing interpretation.
// ────────────────────────────────────────────────────────────────────

export const STRUCTURE_INTRO =
  'A 格局 — a structure, or formal pattern — is your chart’s organising principle. ' +
  'It is taken from the month you were born in: whichever energy commanded that season reaches ' +
  'through the whole chart and decides which of your qualities gets the loudest say. BaZi readers ' +
  'name the structure before they say anything else, because it tells them what the chart is for — ' +
  'what it naturally organises around, and therefore what a good life looks like for this particular ' +
  'person. It is not a verdict on how things turn out; it is a description of the material you were ' +
  'handed and the shape it wants to take.';

export const STRUCTURE_MEANINGS: Record<
  StructureKey,
  { cn: string; title: string; text: string; strengthNote: string }
> = {
  DirectOfficer: {
    cn: '正官格',
    title: 'The Officeholder',
    text:
      'The season you were born into put rightful order in charge of your chart. You have an instinct ' +
      'for the correct form of things — the proper procedure, the fair share, the role done properly — ' +
      'and you tend to earn trust before you earn attention. Responsibility settles on you early, often ' +
      'before you asked for it, and you carry it better than most people would. The work this asks for ' +
      'is telling integrity apart from mere compliance: rules exist to serve something, and you are ' +
      'allowed to ask what.',
    strengthNote:
      'Direct Officer runs best with real backing behind it — learning, mentors, a reserve of your own ' +
      'energy — because an office with nothing behind it becomes a weight rather than a position.',
  },
  SevenKillings: {
    cn: '七殺格',
    title: 'The Tempered One',
    text:
      'Your birth month handed you pressure rather than gentle order. You are built for the situations ' +
      'that would flatten other people — deadlines, rivals, rooms where something is genuinely at stake — ' +
      'and you often only meet your full capability when the stakes are real. This is the sharpest of the ' +
      'classical structures and the most obviously double-edged: unmet, it becomes friction you keep ' +
      'walking back into; met with discipline, it forges an unusual kind of authority. The work is to ' +
      'choose your battles rather than let them choose you.',
    strengthNote:
      'Seven Killings needs something to shape it — a craft, a discipline, a standard you hold yourself ' +
      'to — because pressure with nowhere to go turns inward.',
  },
  DirectWealth: {
    cn: '正財格',
    title: 'The Steady Earner',
    text:
      'You were born in a month that made value tangible. You have a natural relationship with real ' +
      'things — what they cost, what they are worth, what it takes to look after them — and you would ' +
      'rather build something solid slowly than chase a shortcut. Loyalty, thrift, and follow-through ' +
      'come easily; you are the person who actually maintains what they acquire. The work is to keep ' +
      'your sense of worth from collapsing into what can be counted, and to let people be more than ' +
      'their reliability.',
    strengthNote:
      'Direct Wealth needs a day master strong enough to hold it — vitality, confidence, stamina — ' +
      'because wealth in a chart is weight, and weight only helps someone able to carry it.',
  },
  IndirectWealth: {
    cn: '偏財格',
    title: 'The Opportunist',
    text:
      'Your birth month gave you the loose, unattached kind of value — the opening that appears, the ' +
      'network that pays off, the thing you noticed before anyone else did. You are generous, quick to ' +
      'spot a gap, and comfortable with resources moving rather than sitting still. Socially you are ' +
      'easy company, and much of what reaches you arrives through people rather than through grinding. ' +
      'The work is follow-through: the openings are real, but only some of them deserve you, and the ' +
      'discipline to walk past the rest is the whole skill.',
    strengthNote:
      'Indirect Wealth works when there is enough structure and stamina behind it to finish what an ' +
      'opening starts, and goes nowhere in a life that is all beginnings.',
  },
  DirectResource: {
    cn: '正印格',
    title: 'The Well-Supported',
    text:
      'The month you were born under put nourishment at the centre of your chart. Learning, mentors, ' +
      'mothers and mother-figures, tradition, the accumulated knowledge you were handed — these are ' +
      'your fuel, and you absorb far more of them than you let on. You are usually the one others come ' +
      'to for the considered answer, and you carry a kind of cover that means you are rarely left ' +
      'entirely without help. The work is to stop preparing at some point and actually go: support is ' +
      'meant to launch you, not to be the destination.',
    strengthNote:
      'Direct Resource needs an outlet — something you make, teach, or do with what you know — because ' +
      'unspent support settles into comfortable stagnation.',
  },
  IndirectResource: {
    cn: '偏印格',
    title: 'The Sideways Thinker',
    text:
      'Your season handed you the unorthodox route to knowing. You learn obliquely — through intuition, ' +
      'solitary study, odd sources, the thing nobody assigned you — and you often arrive at the right ' +
      'answer by a path you cannot fully retrace. That makes you genuinely original and slightly hard ' +
      'to place; conventional training tends to bore you and conventional recognition tends to arrive ' +
      'late. The work is to build one visible, finished thing out of the sideways knowledge, so the ' +
      'originality has somewhere to land.',
    strengthNote:
      'Indirect Resource does its best work with a real audience or a real craft to answer to, and ' +
      'drifts when it is left alone indefinitely with its own thoughts.',
  },
  EatingGod: {
    cn: '食神格',
    title: 'The Maker',
    text:
      'The month of your birth made you a producer. Something comes out of you steadily — food, ' +
      'writing, music, care, ideas, atmosphere — and the making itself is where your contentment lives, ' +
      'more than in any prize for having made it. People describe you as warm, unhurried, and ' +
      'surprisingly hard to rattle; you have an appetite for life that is not the same thing as ' +
      'ambition. The work is to keep the output pointed outward, rather than letting ease become the ' +
      'whole point.',
    strengthNote:
      'Eating God needs enough of your own energy behind it to keep producing, and somewhere the output ' +
      'actually goes — a table, a reader, an audience — or the generosity quietly stops.',
  },
  HurtingOfficer: {
    cn: '傷官格',
    title: 'The Brilliant Disruptor',
    text:
      'You were born under the month that produces talent with an edge on it. You are quick, expressive, ' +
      'and unusually good at whatever you have decided to be good at — and you have very little patience ' +
      'for being told how it ought to be done. Recognition tends to arrive in bursts, and so does ' +
      'friction with anyone holding a title over you. The work is to aim the brilliance rather than ' +
      'simply discharge it: the sharpness that gets you noticed is the same sharpness that burns bridges ' +
      'you may want later.',
    strengthNote:
      'Hurting Officer is at its best when something absorbs and directs it — a demanding craft, a ' +
      'purpose larger than the point you are making — and at its worst with only people to be clever at.',
  },
  EstablishedRank: {
    cn: '建祿格',
    title: 'The Self-Standing',
    text:
      'You were born in the month your own element commands — you stand on your own seat. Classical ' +
      'readers pointedly do not name this after a Ten God, because the month is not handing you an ' +
      'officer, a fortune, or a teacher; it is handing you yourself, at full strength. That tends to ' +
      'make you independent, self-funding, hard to push around, and often someone who leaves the family ' +
      'house or the safe job earlier than expected. The work is to find something outside yourself ' +
      'worth the strength — this structure is defined by what you go and get, not by what arrives.',
    strengthNote:
      'Established Rank needs a real object — work that demands you, responsibility you chose, something ' +
      'you are building — because strength with nothing to push against turns restless.',
  },
  Blade: {
    cn: '陽刃格',
    title: 'The Blade',
    text:
      'Your month is the blade — the position just past full strength, where power spills over its own ' +
      'edge. Only the five yang day masters carry it, and it makes you decisive, physically capable, and ' +
      'willing to act while other people are still discussing. In a crisis you are the one who moves; in ' +
      'ordinary weather that same force can come out as bluntness, impatience, or a temper that arrives ' +
      'ahead of your judgement. The work is discipline — the blade is not something to dull, it is an ' +
      'instrument that has to be aimed.',
    strengthNote:
      'The Blade does well under something it respects — a standard, a demanding role, a responsibility ' +
      'that outranks the impulse — and turns careless when nothing checks it.',
  },
  MonthPeer: {
    cn: '月劫格',
    title: 'The One Among Equals',
    text:
      'Your own element commands the month you were born in, but on a shared seat rather than your own ' +
      '— the classical texts group this with 建祿 and call it 月劫, the month of peers. You grow up ' +
      'measuring yourself against others: siblings, colleagues, friends who are also rivals, a life ' +
      'spent in rooms full of people doing roughly what you do. It makes you competitive, resourceful, ' +
      'and unusually good at reading where you stand. The work is to stop letting comparison set the ' +
      'target — company is not the same thing as competition, and what you actually want is usually ' +
      'quieter than what you are racing for.',
    strengthNote:
      'Month of Peers needs its own outlet — something you make or earn that is measured on its own ' +
      'terms — because peers with nothing to do but compare end up draining each other.',
  },
};
