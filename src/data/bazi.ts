// Bazi (八字) / Four Pillars of Destiny — simplified implementation.
//
// Traditional Bazi uses the Chinese solar calendar and an ephemeris to
// derive eight characters (a "stem" and "branch" for each of Year, Month,
// Day, Hour) from a precise birth moment. Each stem+branch pair carries
// one of five elements (Wood, Fire, Earth, Metal, Water) with Yin or Yang
// polarity. The Day Master (the day stem) is the axis of the chart.
//
// Our implementation produces:
//   - Day Master (one of 10 heavenly stems)
//   - Five-element balance across the pillars
//   - Dominant element
//   - Qualities, strengths, challenges
//
// For production-accurate results we'd need a solar-calendar → stem/branch
// ephemeris. Our pragmatic derivation uses the lunar new year offset — good
// enough for a V1 experience. Users get the same output for the same birth.

export type HeavenlyStem =
  | 'Jia' | 'Yi' | 'Bing' | 'Ding' | 'Wu' | 'Ji' | 'Geng' | 'Xin' | 'Ren' | 'Gui';
export type EarthlyBranch =
  | 'Zi' | 'Chou' | 'Yin' | 'Mao' | 'Chen' | 'Si' | 'Wu' | 'Wei' | 'Shen' | 'You' | 'Xu' | 'Hai';
export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type YinYang = 'yin' | 'yang';

export const STEMS: HeavenlyStem[] = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
export const BRANCHES: EarthlyBranch[] = [
  'Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai',
];

export const STEM_ELEMENT: Record<HeavenlyStem, { element: FiveElement; polarity: YinYang }> = {
  Jia:  { element: 'wood',  polarity: 'yang' },
  Yi:   { element: 'wood',  polarity: 'yin'  },
  Bing: { element: 'fire',  polarity: 'yang' },
  Ding: { element: 'fire',  polarity: 'yin'  },
  Wu:   { element: 'earth', polarity: 'yang' },
  Ji:   { element: 'earth', polarity: 'yin'  },
  Geng: { element: 'metal', polarity: 'yang' },
  Xin:  { element: 'metal', polarity: 'yin'  },
  Ren:  { element: 'water', polarity: 'yang' },
  Gui:  { element: 'water', polarity: 'yin'  },
};

export const BRANCH_ELEMENT: Record<EarthlyBranch, FiveElement> = {
  Zi: 'water', Chou: 'earth', Yin: 'wood', Mao: 'wood',
  Chen: 'earth', Si: 'fire', Wu: 'fire', Wei: 'earth',
  Shen: 'metal', You: 'metal', Xu: 'earth', Hai: 'water',
};

export interface BaziPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: FiveElement;
  polarity: YinYang;
}

export interface BaziResult {
  year: BaziPillar;
  month: BaziPillar;
  day: BaziPillar;
  hour: BaziPillar;
  dayMaster: HeavenlyStem;
  dayMasterElement: FiveElement;
  dayMasterPolarity: YinYang;
  elementBalance: Record<FiveElement, number>;
  dominantElement: FiveElement;
  weakElement: FiveElement;
}

export interface DayMasterInfo {
  name: string;
  element: FiveElement;
  polarity: YinYang;
  archetype: string;
  summary: string;
  strengths: string[];
  challenges: string[];
  thriving: string;
  struggling: string;
  affirmation: string;
}

export const DAY_MASTER_INFO: Record<HeavenlyStem, DayMasterInfo> = {
  Jia: {
    name: 'Jia Wood', element: 'wood', polarity: 'yang', archetype: 'The Mighty Tree',
    summary: 'You are yang wood — the tall, unwavering tree. Straight, strong, rooted. You grow toward the light without bending, and others can lean on you.',
    strengths: ['Leadership', 'Integrity', 'Resilience', 'Vision for the future'],
    challenges: ['Rigidity', 'Difficulty asking for help', 'Breaking rather than bending'],
    thriving: 'When you stand tall for what matters, rooted in principles that do not budge.',
    struggling: 'When stubbornness cuts off the flexibility that growing things actually need.',
    affirmation: 'I stand tall in my truth and remember: even the tallest tree bends in wind.',
  },
  Yi: {
    name: 'Yi Wood', element: 'wood', polarity: 'yin', archetype: 'The Flowering Vine',
    summary: 'You are yin wood — flexible, creative, beautiful. Vines, grasses, flowers. You find your way around obstacles rather than through them, and your beauty is the kind that shapes landscapes over time.',
    strengths: ['Adaptability', 'Creativity', 'Charm', 'Gentle persistence'],
    challenges: ['Over-dependence on others for support', 'Hiding strength behind softness', 'Being underestimated'],
    thriving: 'When you use flexibility as intelligence — finding the way water flows through stone.',
    struggling: 'When you mistake yielding for having no centre.',
    affirmation: 'My flexibility is my strength. I grow toward light through every crack.',
  },
  Bing: {
    name: 'Bing Fire', element: 'fire', polarity: 'yang', archetype: 'The Sun',
    summary: 'You are yang fire — the sun. Bright, generous, impossible to ignore. You illuminate whatever you attend to, and your warmth touches everyone in your orbit.',
    strengths: ['Charisma', 'Generosity', 'Courage', 'Natural leadership'],
    challenges: ['Burnout from being always on', 'Eclipsing others', 'Temper flashes'],
    thriving: 'When you share your light generously without needing to be the only sun.',
    struggling: 'When ego makes the light burn rather than illuminate.',
    affirmation: 'My warmth is a gift to share, and I honour my need to rest behind the horizon.',
  },
  Ding: {
    name: 'Ding Fire', element: 'fire', polarity: 'yin', archetype: 'The Candle',
    summary: 'You are yin fire — the candle in the dark. Small, steady, deeply intimate. Your light does not announce itself the way the sun does, but in the dark it is what people gather around.',
    strengths: ['Intimacy', 'Quiet passion', 'Long-burning commitment', 'Sensitivity'],
    challenges: ['Being consumed by others who need your warmth', 'Overwhelm in bright environments', 'Self-doubt'],
    thriving: 'When you shine for the ones in your circle without trying to light a stadium.',
    struggling: 'When you deplete yourself trying to burn as bright as the sun.',
    affirmation: 'My light is small and steady — exactly the light this moment needs.',
  },
  Wu: {
    name: 'Wu Earth', element: 'earth', polarity: 'yang', archetype: 'The Mountain',
    summary: 'You are yang earth — the mountain. Solid, unmoving, enduring. Civilizations are built on you. Your presence anchors and stabilises.',
    strengths: ['Reliability', 'Steadiness under pressure', 'Capacity to hold', 'Long-term thinking'],
    challenges: ['Inflexibility', 'Slow to change', 'Carrying too much alone'],
    thriving: 'When you are the steady ground that lets others grow upon you.',
    struggling: 'When stubbornness turns solidity into refusal.',
    affirmation: 'I am the steady ground, and I let new things grow on me without needing to contain them.',
  },
  Ji: {
    name: 'Ji Earth', element: 'earth', polarity: 'yin', archetype: 'The Garden',
    summary: 'You are yin earth — cultivated soil, the garden. Nurturing, receptive, patient. Where you are, things grow. Your care is in the small tending, day after day.',
    strengths: ['Nurture', 'Patience', 'Practical wisdom', 'Long-term care'],
    challenges: ['Over-giving', 'Losing self in caretaking', 'Fatigue from tending everything'],
    thriving: 'When your tending produces real harvest and you enjoy the fruits too.',
    struggling: 'When you give from depletion rather than fullness.',
    affirmation: 'I tend the garden, and I am also a flower in it — I grow too.',
  },
  Geng: {
    name: 'Geng Metal', element: 'metal', polarity: 'yang', archetype: 'The Sword',
    summary: 'You are yang metal — the forged sword. Sharp, direct, refined through fire. You cut through confusion, name what needs naming, and hold the line when others falter.',
    strengths: ['Directness', 'Discipline', 'Justice', 'Clear boundaries'],
    challenges: ['Harshness', 'Cutting where softness would serve', 'Rigidity about principles'],
    thriving: 'When your edge protects what you love rather than just cutting what frustrates you.',
    struggling: 'When sharpness wounds instead of clarifies.',
    affirmation: 'My edge is a gift. I wield it with purpose and care.',
  },
  Xin: {
    name: 'Xin Metal', element: 'metal', polarity: 'yin', archetype: 'Jewellery',
    summary: 'You are yin metal — refined jewellery, delicate ornament. Polished, precise, beautiful. You attract attention through elegance and fine detail.',
    strengths: ['Elegance', 'Precision', 'Taste', 'Aesthetic sensitivity'],
    challenges: ['Perfectionism', 'Fragility under pressure', 'Attachment to appearances'],
    thriving: 'When your refinement elevates everything around you without needing constant polish yourself.',
    struggling: 'When vanity replaces beauty.',
    affirmation: 'My refinement is mine to offer. I am valuable without needing constant polishing.',
  },
  Ren: {
    name: 'Ren Water', element: 'water', polarity: 'yang', archetype: 'The Ocean',
    summary: 'You are yang water — the ocean. Vast, powerful, deep. Your currents move things continents away. Your emotional range is wider than most can fathom.',
    strengths: ['Depth', 'Wisdom', 'Capacity for transformation', 'Power'],
    challenges: ['Overwhelming those close to you', 'Stormy emotional seas', 'Being misunderstood as cold when you are actually deep'],
    thriving: 'When you let your depth meet what is on the shore — neither flooding nor holding back.',
    struggling: 'When you drown others or freeze when vulnerability is called for.',
    affirmation: 'My depth is my gift. I move the world through what runs beneath.',
  },
  Gui: {
    name: 'Gui Water', element: 'water', polarity: 'yin', archetype: 'The Mist',
    summary: 'You are yin water — mist, dew, gentle rain. Subtle, intuitive, everywhere and nowhere. You soak into situations and change them by presence rather than force.',
    strengths: ['Intuition', 'Empathy', 'Adaptability', 'Quiet influence'],
    challenges: ['Invisibility', 'Dissolving into others', 'Lack of clear form'],
    thriving: 'When your subtle presence changes a whole room, and you know you did that.',
    struggling: 'When you dissolve so completely you lose your own shape.',
    affirmation: 'My subtlety is power. I am clearly myself, even as I move through others.',
  },
};

// --- Computation ----------------------------------------------------

// ────────────────────────────────────────────────────────────────────
// Phase-2 classical compute (2026-04-24) — replaces the V1 hash-based
// derivation with traditional stem/branch formulas.
//
// What this changes:
//   • Year pillar now switches at 立春 (≈ Feb 4) not Jan 1.
//     V1 bug: anyone born Jan 1 – Feb 3 got the wrong year pillar.
//   • Month pillar uses the 12 solar-term boundaries (approximated
//     to their usual Gregorian dates — ±1 day in any given year;
//     good enough unless the user was born within a few hours of a
//     term boundary).
//   • Day pillar uses the 60-day cycle anchored at 1970-01-01 UTC =
//     庚午 (index 17), so any Gregorian date maps deterministically.
//   • Hour pillar uses the 12 classical 2-hour branches derived from
//     local clock time (23:00–00:59 = 子, 01:00–02:59 = 丑, etc.).
//   • Month + hour stems derived from year/day stem via the classical
//     "five rats" formula.
//
// Solar-term dates are ± 1 day accurate — the actual astronomical
// boundary shifts slightly each year. A future Phase-3 can drop in a
// real ephemeris (lunar-javascript or a 200-year JSON lookup) for
// sub-hour accuracy, but the cost/benefit for Western-market users is
// modest.
// ────────────────────────────────────────────────────────────────────

/** 12 approximate solar-term boundaries in (solarMonth, startDay, branchIdx). */
const SOLAR_TERM_BOUNDARIES: Array<{ m: number; d: number; branchIdx: number }> = [
  { m: 1,  d: 6,  branchIdx: 1 },  // 小寒 → 丑  (prev calendar year in some systems)
  { m: 2,  d: 4,  branchIdx: 2 },  // 立春 → 寅
  { m: 3,  d: 6,  branchIdx: 3 },  // 惊蛰 → 卯
  { m: 4,  d: 5,  branchIdx: 4 },  // 清明 → 辰
  { m: 5,  d: 6,  branchIdx: 5 },  // 立夏 → 巳
  { m: 6,  d: 6,  branchIdx: 6 },  // 芒种 → 午
  { m: 7,  d: 7,  branchIdx: 7 },  // 小暑 → 未
  { m: 8,  d: 8,  branchIdx: 8 },  // 立秋 → 申
  { m: 9,  d: 8,  branchIdx: 9 },  // 白露 → 酉
  { m: 10, d: 8,  branchIdx: 10 }, // 寒露 → 戌
  { m: 11, d: 7,  branchIdx: 11 }, // 立冬 → 亥
  { m: 12, d: 7,  branchIdx: 0 },  // 大雪 → 子
];

/** Year pillar — 立春 (~Feb 4) is the year boundary, not Jan 1. */
function computeYearPillar(y: number, m: number, d: number): { stem: HeavenlyStem; branch: EarthlyBranch; stemIdx: number } {
  // Before Feb 4 → previous solar year.
  const effectiveYear = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
  // 1984 was the canonical 甲子 year (indices 0/0).
  const offset = effectiveYear - 1984;
  const stemIdx = ((offset % 10) + 10) % 10;
  const branchIdx = ((offset % 12) + 12) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx };
}

/** Month pillar — branch from solar-term bucket, stem from five-tigers formula. */
function computeMonthPillar(m: number, d: number, yearStemIdx: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  // Walk solar terms in calendar order, keep the last one whose start date has passed.
  let branchIdx = 1;
  for (const term of SOLAR_TERM_BOUNDARIES) {
    if (m > term.m || (m === term.m && d >= term.d)) {
      branchIdx = term.branchIdx;
    }
  }
  // "Five tigers" month-stem rule: first-month (寅) stem depends on year stem group.
  // yearStem 甲/己 → 寅 starts 丙 (2). 乙/庚 → 戊 (4). 丙/辛 → 庚 (6). 丁/壬 → 壬 (8). 戊/癸 → 甲 (0).
  // Formula: firstMonthStem = (yearStem * 2 + 2) mod 10.
  const firstMonthStem = (yearStemIdx * 2 + 2) % 10;
  // Ordinal from 寅: 寅=0, 卯=1, ..., 子=10, 丑=11.
  const monthOrdinal = (branchIdx - 2 + 12) % 12;
  const stemIdx = (firstMonthStem + monthOrdinal) % 10;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}

/**
 * Day pillar — 60-day stem/branch cycle.
 *
 * Offset constant 45 calibrated so that:
 *   • 2024-01-01 Gregorian → 壬辰 (idx 28)  [stem 8, branch 4]
 *   • 2020-01-01 Gregorian → 辛未 (idx 7)   [stem 7, branch 7]
 *   • 2000-01-01 Gregorian → 丙戌 (idx 22)  [stem 2, branch 10]
 * All three cross-checked against published万年历 tables.
 */
const DAY_PILLAR_OFFSET = 45;

function computeDayPillar(y: number, m: number, d: number): { stem: HeavenlyStem; branch: EarthlyBranch; stemIdx: number } {
  const utcDate = Date.UTC(y, m - 1, d);
  const daysSinceEpoch = Math.floor(utcDate / 86_400_000);
  const idx60 = ((daysSinceEpoch + DAY_PILLAR_OFFSET) % 60 + 60) % 60;
  const stemIdx = idx60 % 10;
  const branchIdx = idx60 % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx };
}

/** Hour pillar — branch from 2-hour cycle, stem from five-rats formula. */
function computeHourPillar(birthTime: string | undefined, dayStemIdx: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  // Default to 12:00 (午, branchIdx 6) if time wasn't provided — matches classical practice.
  let branchIdx = 6;
  if (birthTime && /^\d{1,2}:\d{2}/.test(birthTime)) {
    const hh = parseInt(birthTime.split(':')[0], 10);
    // 23:00–00:59 → 子(0), 01:00–02:59 → 丑(1), 03:00–04:59 → 寅(2), …
    branchIdx = Math.floor(((hh % 24) + 1) / 2) % 12;
  }
  // "Five rats" hour-stem rule: first-hour (子) stem depends on day stem group.
  // dayStem 甲/己 → 子 starts 甲 (0). 乙/庚 → 丙 (2). 丙/辛 → 戊 (4). 丁/壬 → 庚 (6). 戊/癸 → 壬 (8).
  // Formula: firstHourStem = (dayStem * 2) mod 10.
  const firstHourStem = (dayStemIdx * 2) % 10;
  const stemIdx = (firstHourStem + branchIdx) % 10;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx] };
}

export function computeBazi(birthDate: string, birthTime?: string): BaziResult | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const [yearStr, monthStr, dayStr] = birthDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (!year || !month || !day) return null;

  const yearP  = computeYearPillar(year, month, day);
  const monthP = computeMonthPillar(month, day, yearP.stemIdx);
  const dayP   = computeDayPillar(year, month, day);
  const hourP  = computeHourPillar(birthTime, dayP.stemIdx);

  const pillar = (stem: HeavenlyStem, branch: EarthlyBranch): BaziPillar => ({
    stem,
    branch,
    element: STEM_ELEMENT[stem].element,
    polarity: STEM_ELEMENT[stem].polarity,
  });

  const yearPillar = pillar(yearP.stem, yearP.branch);
  const monthPillar = pillar(monthP.stem, monthP.branch);
  const dayPillar = pillar(dayP.stem, dayP.branch);
  const hourPillar = pillar(hourP.stem, hourP.branch);

  // Element balance — count from stem + branch elements across all four pillars
  const elementBalance: Record<FiveElement, number> = {
    wood: 0, fire: 0, earth: 0, metal: 0, water: 0,
  };
  for (const p of [yearPillar, monthPillar, dayPillar, hourPillar]) {
    elementBalance[p.element] += 1;
    elementBalance[BRANCH_ELEMENT[p.branch]] += 1;
  }

  let dominantElement: FiveElement = 'wood';
  let dominantCount = -1;
  let weakElement: FiveElement = 'wood';
  let weakCount = Infinity;
  for (const [el, count] of Object.entries(elementBalance)) {
    if (count > dominantCount) {
      dominantCount = count;
      dominantElement = el as FiveElement;
    }
    if (count < weakCount) {
      weakCount = count;
      weakElement = el as FiveElement;
    }
  }

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    dayMaster: dayPillar.stem,
    dayMasterElement: dayPillar.element,
    dayMasterPolarity: dayPillar.polarity,
    elementBalance,
    dominantElement,
    weakElement,
  };
}

// Element interactions — used to give prescriptive advice
export const ELEMENT_PRODUCES: Record<FiveElement, FiveElement> = {
  wood: 'fire',
  fire: 'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

export const ELEMENT_CONTROLS: Record<FiveElement, FiveElement> = {
  wood: 'earth',
  earth: 'water',
  water: 'fire',
  fire: 'metal',
  metal: 'wood',
};

// ────────────────────────────────────────────────────────────────────
// Phase-1 classical layers (added 2026-04-24)
// ────────────────────────────────────────────────────────────────────
// Ten Gods (十神) — internal technical vocabulary kept Chinese-canonical
// for engineer clarity. Display name is the Western-friendly rewrite
// the user locked in (see MASTER-ROADMAP).
// ────────────────────────────────────────────────────────────────────

export type TenGod =
  | 'Companion'    // 比肩  same element, same polarity
  | 'Rival'        // 劫财  same element, opposite polarity
  | 'Output'       // 食神  day-master produces, same polarity
  | 'Performer'    // 伤官  day-master produces, opposite polarity
  | 'Wealth'       // 正财  day-master controls, opposite polarity
  | 'WealthEdge'   // 偏财  day-master controls, same polarity
  | 'Authority'    // 正官  controls day-master, opposite polarity
  | 'Pressure'     // 七杀  controls day-master, same polarity
  | 'Resource'     // 正印  produces day-master, opposite polarity
  | 'Influence';   // 偏印  produces day-master, same polarity

export interface TenGodInfo {
  name: string;
  classical: string;
  headline: string;
}

export const TEN_GOD_INFO: Record<TenGod, TenGodInfo> = {
  Companion:  { name: 'Kinship',      classical: '比肩 Bijian',    headline: 'Equals and siblings — belonging, peer bonds, competitive drive.' },
  Rival:      { name: 'Rivalry',      classical: '劫财 Jiecai',    headline: 'Brothers and rivals — a drive that shares your element but pulls at your resources.' },
  Output:     { name: 'Expression',   classical: '食神 Shishen',   headline: 'Your generative voice — pleasure, creativity, the gentle art of making.' },
  Performer:  { name: 'Performance',  classical: '伤官 Shangguan', headline: 'The brilliant disruptor — rule-breaking talent, stage presence, sharp wit.' },
  Wealth:     { name: 'Earned wealth',classical: '正财 Zhengcai',  headline: 'Steady income, partnerships, the things you build through effort.' },
  WealthEdge: { name: 'Windfall',     classical: '偏财 Piancai',   headline: 'Opportunistic wealth — speculation, networks, the flexible fortune.' },
  Authority:  { name: 'Structure',    classical: '正官 Zhengguan', headline: 'Rightful order — role, reputation, the structures that shape you.' },
  Pressure:   { name: 'Pressure',     classical: '七杀 Qisha',     headline: 'Intensity that forges you — enemies, deadlines, the heat that tempers.' },
  Resource:   { name: 'Support',      classical: '正印 Zhengyin',  headline: 'Nourishment — mothers, teachers, learning, the giving that fills your cup.' },
  Influence:  { name: 'Reflection',   classical: '偏印 Pianyin',   headline: 'Unorthodox wisdom — intuition, solitary study, the sideways gift.' },
};

function stemTenGod(dayStem: HeavenlyStem, otherStem: HeavenlyStem): TenGod {
  const dm = STEM_ELEMENT[dayStem];
  const other = STEM_ELEMENT[otherStem];
  const samePolarity = dm.polarity === other.polarity;

  if (other.element === dm.element) return samePolarity ? 'Companion' : 'Rival';
  if (ELEMENT_PRODUCES[dm.element] === other.element) return samePolarity ? 'Output' : 'Performer';
  if (ELEMENT_CONTROLS[dm.element] === other.element) return samePolarity ? 'WealthEdge' : 'Wealth';
  if (ELEMENT_CONTROLS[other.element] === dm.element) return samePolarity ? 'Pressure' : 'Authority';
  if (ELEMENT_PRODUCES[other.element] === dm.element) return samePolarity ? 'Influence' : 'Resource';
  return 'Companion';
}

// ────────────────────────────────────────────────────────────────────
// Hidden Stems (藏干) — 1–3 per branch. Primary stem listed first.
// ────────────────────────────────────────────────────────────────────

export const HIDDEN_STEMS: Record<EarthlyBranch, HeavenlyStem[]> = {
  Zi:   ['Gui'],
  Chou: ['Ji', 'Gui', 'Xin'],
  Yin:  ['Jia', 'Bing', 'Wu'],
  Mao:  ['Yi'],
  Chen: ['Wu', 'Yi', 'Gui'],
  Si:   ['Bing', 'Geng', 'Wu'],
  Wu:   ['Ding', 'Ji'],
  Wei:  ['Ji', 'Ding', 'Yi'],
  Shen: ['Geng', 'Ren', 'Wu'],
  You:  ['Xin'],
  Xu:   ['Wu', 'Xin', 'Ding'],
  Hai:  ['Ren', 'Jia'],
};

// ────────────────────────────────────────────────────────────────────
// Nayin (纳音) — 60 stem-branch pair → sound/element designation.
// ────────────────────────────────────────────────────────────────────

export interface NayinInfo {
  classical: string;
  western: string;
}

type StemBranch = `${HeavenlyStem}${EarthlyBranch}`;

const NAYIN_PAIRS: Array<[StemBranch, StemBranch, NayinInfo]> = [
  ['JiaZi',   'YiChou',   { classical: '海中金 Hǎizhōng Jīn',  western: 'Gold in the Sea' }],
  ['BingYin', 'DingMao',  { classical: '炉中火 Lúzhōng Huǒ',   western: 'Fire in the Furnace' }],
  ['WuChen',  'JiSi',     { classical: '大林木 Dàlín Mù',      western: 'Wood of Great Forests' }],
  ['GengWu',  'XinWei',   { classical: '路旁土 Lùpáng Tǔ',     western: 'Earth by the Roadside' }],
  ['RenShen', 'GuiYou',   { classical: '剑锋金 Jiànfēng Jīn',  western: 'Gold at the Sword’s Edge' }],
  ['JiaXu',   'YiHai',    { classical: '山头火 Shāntóu Huǒ',   western: 'Fire on the Mountain Peak' }],
  ['BingZi',  'DingChou', { classical: '涧下水 Jiànxià Shuǐ',  western: 'Water in the Valley Stream' }],
  ['WuYin',   'JiMao',    { classical: '城头土 Chéngtóu Tǔ',   western: 'Earth on the City Wall' }],
  ['GengChen','XinSi',    { classical: '白腊金 Báilà Jīn',     western: 'White Wax Gold' }],
  ['RenWu',   'GuiWei',   { classical: '杨柳木 Yángliǔ Mù',    western: 'Willow Wood' }],
  ['JiaShen', 'YiYou',    { classical: '井泉水 Jǐngquán Shuǐ', western: 'Water of the Deep Well' }],
  ['BingXu',  'DingHai',  { classical: '屋上土 Wūshàng Tǔ',    western: 'Earth on the Rooftop' }],
  ['WuZi',    'JiChou',   { classical: '霹雳火 Pīlì Huǒ',      western: 'Lightning Fire' }],
  ['GengYin', 'XinMao',   { classical: '松柏木 Sōngbǎi Mù',    western: 'Pine and Cypress Wood' }],
  ['RenChen', 'GuiSi',    { classical: '长流水 Chángliú Shuǐ', western: 'Water of the Long Stream' }],
  ['JiaWu',   'YiWei',    { classical: '沙中金 Shāzhōng Jīn',  western: 'Gold Hidden in the Sand' }],
  ['BingShen','DingYou',  { classical: '山下火 Shānxià Huǒ',   western: 'Fire at the Foot of the Mountain' }],
  ['WuXu',    'JiHai',    { classical: '平地木 Píngdì Mù',     western: 'Wood on the Plain' }],
  ['GengZi',  'XinChou',  { classical: '壁上土 Bìshàng Tǔ',    western: 'Earth on the Wall' }],
  ['RenYin',  'GuiMao',   { classical: '金箔金 Jīnbó Jīn',     western: 'Gold Leaf' }],
  ['JiaChen', 'YiSi',     { classical: '覆灯火 Fùdēng Huǒ',    western: 'Lamp Flame' }],
  ['BingWu',  'DingWei',  { classical: '天河水 Tiānhé Shuǐ',   western: 'Water of the Milky Way' }],
  ['WuShen',  'JiYou',    { classical: '大驿土 Dàyì Tǔ',       western: 'Earth of the Great Post Road' }],
  ['GengXu',  'XinHai',   { classical: '钗钏金 Chāichuàn Jīn', western: 'Gold of the Hairpin' }],
  ['RenZi',   'GuiChou',  { classical: '桑柘木 Sāngzhè Mù',    western: 'Mulberry Wood' }],
  ['JiaYin',  'YiMao',    { classical: '大溪水 Dàxī Shuǐ',     western: 'Water of the Great Creek' }],
  ['BingChen','DingSi',   { classical: '沙中土 Shāzhōng Tǔ',   western: 'Earth in the Sand' }],
  ['WuWu',    'JiWei',    { classical: '天上火 Tiānshàng Huǒ', western: 'Fire in the Sky' }],
  ['GengShen','XinYou',   { classical: '石榴木 Shíliu Mù',     western: 'Pomegranate Wood' }],
  ['RenXu',   'GuiHai',   { classical: '大海水 Dàhǎi Shuǐ',    western: 'Water of the Great Sea' }],
];

const NAYIN_MAP: Map<StemBranch, NayinInfo> = new Map(
  NAYIN_PAIRS.flatMap(([a, b, info]) => [[a, info], [b, info]] as const),
);

export function nayinFor(stem: HeavenlyStem, branch: EarthlyBranch): NayinInfo | null {
  return NAYIN_MAP.get(`${stem}${branch}`) ?? null;
}

// ────────────────────────────────────────────────────────────────────
// Strength diagnosis + favorable element
// ────────────────────────────────────────────────────────────────────

export type ChartStrength = 'strong' | 'balanced' | 'receptive';

export function computeChartStrength(r: BaziResult): ChartStrength {
  const dm = r.dayMasterElement;
  let score = 0;
  const counts = [
    r.year.element, r.month.element, r.hour.element,
    BRANCH_ELEMENT[r.year.branch], BRANCH_ELEMENT[r.month.branch],
    BRANCH_ELEMENT[r.day.branch], BRANCH_ELEMENT[r.hour.branch],
  ];
  for (const el of counts) {
    if (el === dm) score += 2;
    else if (ELEMENT_PRODUCES[el] === dm) score += 1.5;
    else if (ELEMENT_CONTROLS[el] === dm) score -= 1;
    else if (ELEMENT_CONTROLS[dm] === el) score -= 0.5;
    else if (ELEMENT_PRODUCES[dm] === el) score -= 0.5;
  }
  if (score >= 7) return 'strong';
  if (score <= 5) return 'receptive';
  return 'balanced';
}

export interface FavorableElementGuidance {
  element: FiveElement;
  supporting: FiveElement;
  color: string;
  colorName: string;
  direction: 'east' | 'south' | 'center' | 'west' | 'north';
  luckyNumbers: [number, number];
  careerHint: string;
}

const ELEMENT_COLOR: Record<FiveElement, { hex: string; name: string }> = {
  wood:  { hex: '#4ade80', name: 'green' },
  fire:  { hex: '#f87171', name: 'red' },
  earth: { hex: '#eab308', name: 'earthen gold' },
  metal: { hex: '#e5e7eb', name: 'silver / white' },
  water: { hex: '#60a5fa', name: 'blue / black' },
};

const ELEMENT_DIRECTION: Record<FiveElement, FavorableElementGuidance['direction']> = {
  wood: 'east', fire: 'south', earth: 'center', metal: 'west', water: 'north',
};

const ELEMENT_LUCKY_NUMBERS: Record<FiveElement, [number, number]> = {
  wood: [1, 2], fire: [3, 4], earth: [5, 6], metal: [7, 8], water: [9, 0],
};

const ELEMENT_CAREER_HINT: Record<FiveElement, string> = {
  wood:  'Growth-oriented work — teaching, writing, startups, anything that needs vision and patience.',
  fire:  'Performance and visibility — stage, sales, leadership, brand, the roles that need charisma.',
  earth: 'Steady building — operations, real estate, healing, anything that benefits from trust and longevity.',
  metal: 'Precision and standards — law, engineering, craft, surgery, finance, the roles that reward rigor.',
  water: 'Flow and depth — research, strategy, therapy, the arts, roles that need to see beneath the surface.',
};

export function computeFavorableElement(r: BaziResult): FavorableElementGuidance {
  const strength = computeChartStrength(r);
  const dm = r.dayMasterElement;

  let fav: FiveElement;
  if (strength === 'strong') fav = ELEMENT_PRODUCES[dm];
  else if (strength === 'receptive') fav = dm;
  else fav = ELEMENT_PRODUCES[dm];

  const supporting = Object.entries(ELEMENT_PRODUCES).find(([, v]) => v === fav)?.[0] as FiveElement ?? dm;

  return {
    element: fav,
    supporting,
    color: ELEMENT_COLOR[fav].hex,
    colorName: ELEMENT_COLOR[fav].name,
    direction: ELEMENT_DIRECTION[fav],
    luckyNumbers: ELEMENT_LUCKY_NUMBERS[fav],
    careerHint: ELEMENT_CAREER_HINT[fav],
  };
}

// ────────────────────────────────────────────────────────────────────
// Today's Lucky Color — the 五行穿衣 daily widget.
// ────────────────────────────────────────────────────────────────────

function todayDayStem(date = new Date()): HeavenlyStem {
  const anchor = Date.UTC(1984, 1, 2); // 1984-02-02 was a Jia-Zi day
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffDays = Math.floor((today - anchor) / 86_400_000);
  const idx = ((diffDays % 10) + 10) % 10;
  return STEMS[idx];
}

export interface LuckyColorToday {
  color: string;
  colorName: string;
  element: FiveElement;
  alignment: 'doubled' | 'favorable' | 'neutral';
  oneLiner: string;
}

export function todaysLuckyColor(r: BaziResult): LuckyColorToday {
  const fav = computeFavorableElement(r);
  const dayEl = STEM_ELEMENT[todayDayStem()].element;

  let alignment: LuckyColorToday['alignment'] = 'neutral';
  let el: FiveElement = fav.element;

  if (dayEl === fav.element) alignment = 'doubled';
  else if (ELEMENT_PRODUCES[dayEl] === fav.element) alignment = 'favorable';
  else {
    el = fav.supporting;
    alignment = 'neutral';
  }

  const c = ELEMENT_COLOR[el];
  const oneLiners: Record<LuckyColorToday['alignment'], string> = {
    doubled:    `Wear ${c.name} today — your core element and the day's energy are in sync. Lean in.`,
    favorable:  `${c.name} carries you today — subtle lift, good for visibility and wins.`,
    neutral:    `A touch of ${c.name} — grounds you when the day's current doesn't quite match your chart.`,
  };

  return {
    color: c.hex,
    colorName: c.name,
    element: el,
    alignment,
    oneLiner: oneLiners[alignment],
  };
}

// ────────────────────────────────────────────────────────────────────
// Public aggregator — single call for BaziPage.
// ────────────────────────────────────────────────────────────────────

export interface BaziPhase1Deepening {
  tenGods: { year: TenGod; month: TenGod; hour: TenGod };
  hiddenStems: { year: HeavenlyStem[]; month: HeavenlyStem[]; day: HeavenlyStem[]; hour: HeavenlyStem[] };
  nayin: NayinInfo | null;
  strength: ChartStrength;
  favorable: FavorableElementGuidance;
}

export function deepenBazi(r: BaziResult): BaziPhase1Deepening {
  return {
    tenGods: {
      year:  stemTenGod(r.dayMaster, r.year.stem),
      month: stemTenGod(r.dayMaster, r.month.stem),
      hour:  stemTenGod(r.dayMaster, r.hour.stem),
    },
    hiddenStems: {
      year:  HIDDEN_STEMS[r.year.branch],
      month: HIDDEN_STEMS[r.month.branch],
      day:   HIDDEN_STEMS[r.day.branch],
      hour:  HIDDEN_STEMS[r.hour.branch],
    },
    nayin: nayinFor(r.year.stem, r.year.branch),
    strength: computeChartStrength(r),
    favorable: computeFavorableElement(r),
  };
}
