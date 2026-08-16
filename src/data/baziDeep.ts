// Bazi deep-mode additions — luck pillars, annual luck, spirit stars,
// branch relations, climate, career/wealth/spouse/health analysis, and
// per-pillar narratives.
//
// This module sits on top of `bazi.ts` (which provides the 4 pillars,
// element balance, day master, ten gods, hidden stems, and nayin) and
// adds the layers a real consultation surfaces beyond the basic chart.

import { luckStartAge } from '../utils/solarTerms';
import {
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  ELEMENT_PRODUCES,
  ELEMENT_CONTROLS,
  type HeavenlyStem,
  type EarthlyBranch,
  type FiveElement,
  type BaziResult,
  type TenGod,
} from './bazi';

export type Gender = 'male' | 'female';

// ────────────────────────────────────────────────────────────────────
// 1. Luck Pillars (大運) — 10-year cycles starting from the birth month
// pillar. Direction (forward / reverse) depends on year-pillar yin-yang
// + gender. Most impactful Bazi feature beyond the natal chart.
// ────────────────────────────────────────────────────────────────────

export interface LuckPillar {
  /** True when startAge came from the exact solar-term calculation rather
   *  than the legacy fallback heuristic. */
  startAgeExact: boolean;
  /** Age range when this pillar is active (start age, end age). */
  startAge: number;
  endAge: number;
  /** Approximate calendar-year start (rough — uses solar age, not lunar). */
  startYear: number;
  endYear: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: FiveElement;
  branchElement: FiveElement;
  /** What this 10-year window emphasizes. */
  theme: string;
  /** Whether the cycle's element nourishes the day master (favorable),
   *  drains it (challenging), or is neutral. */
  flavour: 'supporting' | 'challenging' | 'neutral';
}

/**
 * Compute the 8 luck pillars covering ~80 years from age ~3-10 onward.
 *
 * Direction rule:
 *   - Yang-year males + Yin-year females  → forward (clockwise through stems/branches)
 *   - Yin-year males + Yang-year females  → reverse (counterclockwise)
 *
 * Start age comes from the classical 3-days-to-1-year rule measured against
 * the EXACT adjacent sectional solar term (via astronomy-engine), not a
 * fixed guess: forward charts count birth → next 節, reverse charts count
 * previous 節 → birth. This used to be hardcoded to 5 or 7, which shifted
 * every user's whole 大运 timeline by up to four years.
 */
export function computeLuckPillars(
  result: BaziResult,
  gender: Gender,
  birthYear: number,
  birthDate?: string,
  birthTime?: string,
): LuckPillar[] {
  const yearPolarity = STEM_ELEMENT[result.year.stem].polarity;
  const isForward =
    (yearPolarity === 'yang' && gender === 'male') ||
    (yearPolarity === 'yin' && gender === 'female');

  const monthStemIdx = STEMS.indexOf(result.month.stem);
  const monthBranchIdx = BRANCHES.indexOf(result.month.branch);

  // Exact start age from the adjacent solar term when we know the birth
  // moment; fall back to the old heuristic only if the ephemeris search
  // fails or no date was supplied.
  let startAge = isForward ? 5 : 7;
  let startAgeExact = false;
  if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const hhmm = birthTime && /^\d{1,2}:\d{2}/.test(birthTime) ? birthTime.slice(0, 5) : '12:00';
    const birth = new Date(`${birthDate}T${hhmm}:00Z`);
    if (!Number.isNaN(birth.getTime())) {
      const exact = luckStartAge(birth, isForward);
      if (exact) {
        // Classical charts quote the start age to the nearest year.
        startAge = Math.max(0, Math.round(exact.years * 10) / 10);
        startAgeExact = true;
      }
    }
  }

  const pillars: LuckPillar[] = [];
  for (let i = 1; i <= 8; i++) {
    const stepStem = isForward
      ? (monthStemIdx + i) % 10
      : (monthStemIdx - i + 100) % 10;
    const stepBranch = isForward
      ? (monthBranchIdx + i) % 12
      : (monthBranchIdx - i + 120) % 12;

    const stem = STEMS[stepStem];
    const branch = BRANCHES[stepBranch];
    const stemEl = STEM_ELEMENT[stem].element;
    const branchEl = BRANCH_ELEMENT[branch];

    const ageStart = startAge + (i - 1) * 10;
    const ageEnd = ageStart + 9;
    const yearStart = birthYear + ageStart;
    const yearEnd = birthYear + ageEnd;

    pillars.push({
      startAgeExact,
      startAge: ageStart,
      endAge: ageEnd,
      startYear: yearStart,
      endYear: yearEnd,
      stem,
      branch,
      element: stemEl,
      branchElement: branchEl,
      theme: themeForElement(result.dayMasterElement, stemEl),
      flavour: flavourForElement(result.dayMasterElement, stemEl),
    });
  }
  return pillars;
}

function themeForElement(dm: FiveElement, stemEl: FiveElement): string {
  if (stemEl === dm) {
    return 'A decade of self-assertion and peer dynamics. Strong urge to test your independence; watch for over-extending against allies who feel like rivals.';
  }
  if (ELEMENT_PRODUCES[stemEl] === dm) {
    return 'A decade of nourishment and learning. Mentors, teachers, and supportive family figures shape this period. Excellent for study and skill-building.';
  }
  if (ELEMENT_PRODUCES[dm] === stemEl) {
    return 'A decade of expression and creative output. Art, communication, ideas pouring out. Watch for burnout from over-producing without rest.';
  }
  if (ELEMENT_CONTROLS[dm] === stemEl) {
    return 'A decade of wealth and pursuit. Money, work projects, partnerships you actively manage. The decade of building.';
  }
  if (ELEMENT_CONTROLS[stemEl] === dm) {
    return 'A decade of pressure and accountability. Authority figures, deadlines, structural challenges that forge maturity. Hardest if resisted, most transforming if met head-on.';
  }
  return 'A neutral decade with no single dominant theme. Mix of all the above; pay attention to which element from your annual luck activates.';
}

function flavourForElement(dm: FiveElement, stemEl: FiveElement): LuckPillar['flavour'] {
  if (stemEl === dm) return 'neutral';
  if (ELEMENT_PRODUCES[stemEl] === dm) return 'supporting';
  if (ELEMENT_CONTROLS[stemEl] === dm) return 'challenging';
  return 'neutral';
}

export function currentLuckPillar(pillars: LuckPillar[], currentYear: number): LuckPillar | null {
  return pillars.find((p) => currentYear >= p.startYear && currentYear <= p.endYear) ?? null;
}

// ────────────────────────────────────────────────────────────────────
// 2. Annual luck (流年) — current calendar year's stem-branch + 10 Gods
// relationship to day master.
// ────────────────────────────────────────────────────────────────────

export interface AnnualLuck {
  year: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  element: FiveElement;
  branchElement: FiveElement;
  /** Ten God relationship of this year's stem to the user's day master. */
  tenGod: TenGod;
  /** What this year's energy invites or challenges. */
  reading: string;
}

const ANNUAL_TEN_GOD_READING: Record<TenGod, string> = {
  Companion: 'A year of belonging and peer activity. Old friends resurface, new peers click immediately. Watch for over-merging — the year asks you to stay distinct even within community.',
  Rival: 'A competitive year. Resources you thought were yours get challenged. The energy is brotherly but sharp — used well it sharpens your edge; ignored it drains money.',
  Output: 'A creative, expressive year. Art, writing, food, hospitality, parenting — anything where you generate. Speak more, perform more, share more. Watch for burnout from over-giving.',
  Performer: 'A breakthrough year for visible talent. Stage moments, viral content, surprising recognition. Also a year of bristling against authority — be careful where you cut.',
  Wealth: 'A year of steady earning and partnership. Builds slowly, lasts. Excellent for committing to long-term financial structures (savings, mortgages, business). Romance for men also surfaces here.',
  WealthEdge: 'A year of opportunistic wealth. Side hustles, networks, lucky timing. Don\'t mistake luck for skill; the gain is real but the next year may not repeat it.',
  Authority: 'A year of formal recognition. Promotion, public role, paperwork that makes things official. Marriage for women often falls in this kind of year. Heaviest if you resist structure.',
  Pressure: 'A year of forging. Enemies, deadlines, intensity that won\'t let you off the hook. The hardest annual energy to live well — but the most transforming. Don\'t flinch; do meet it with discipline.',
  Resource: 'A year of being supported. Mentors, family, learning. Excellent for study, returning to school, healing. Watch for over-reliance on others; the support is for the next leap, not the resting place.',
  Influence: 'A year of unorthodox wisdom. Intuition opens. Solitary study, spiritual practice, deep dives. Also can manifest as an unconventional mentor or the odd lucky break that doesn\'t make sense yet.',
};

/**
 * Compute this year's stem-branch + 10 Gods relationship.
 * Bazi-correct year computation: lunar new year, but for simplicity we
 * use the canonical 60-cycle starting from 1924 (Year of the Wood Rat).
 */
export function annualLuckFor(result: BaziResult, year: number): AnnualLuck {
  // 1984 was Year of the Wood Rat — Jia stem (idx 0), Zi branch (idx 0).
  // From there each year advances both indices by 1.
  const baseYear = 1984;
  const offset = ((year - baseYear) % 60 + 60) % 60;
  const stemIdx = offset % 10;
  const branchIdx = offset % 12;
  const stem = STEMS[stemIdx];
  const branch = BRANCHES[branchIdx];
  const tenGod = computeStemTenGod(result.dayMaster, stem);
  return {
    year,
    stem,
    branch,
    element: STEM_ELEMENT[stem].element,
    branchElement: BRANCH_ELEMENT[branch],
    tenGod,
    reading: ANNUAL_TEN_GOD_READING[tenGod],
  };
}

function computeStemTenGod(dayStem: HeavenlyStem, otherStem: HeavenlyStem): TenGod {
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
// 3. Spirit Stars (神煞) — auspicious + inauspicious stars detected
// from pillar combinations. We surface 12 of the most consequential.
// ────────────────────────────────────────────────────────────────────

export type SpiritStarKind = 'auspicious' | 'mixed' | 'inauspicious';

export interface SpiritStar {
  classical: string;
  name: string;
  kind: SpiritStarKind;
  /** Where in the chart this star landed. */
  pillar: 'year' | 'month' | 'day' | 'hour';
  meaning: string;
}

export function detectSpiritStars(result: BaziResult): SpiritStar[] {
  const stars: SpiritStar[] = [];
  const dm = result.dayMaster;
  const dayBranch = result.day.branch;
  const allBranches: { p: 'year' | 'month' | 'day' | 'hour'; b: EarthlyBranch }[] = [
    { p: 'year',  b: result.year.branch },
    { p: 'month', b: result.month.branch },
    { p: 'day',   b: result.day.branch },
    { p: 'hour',  b: result.hour.branch },
  ];

  // Tian Yi Gui Ren 天乙貴人 — celestial benefactor
  // Map: Day stem → 2 favorable branches that bring nobility/help.
  const tianYi: Partial<Record<HeavenlyStem, EarthlyBranch[]>> = {
    Jia: ['Chou', 'Wei'], Yi: ['Zi', 'Shen'],
    Bing: ['You', 'Hai'], Ding: ['You', 'Hai'],
    Wu: ['Chou', 'Wei'], Ji: ['Zi', 'Shen'],
    Geng: ['Chou', 'Wei'], Xin: ['Yin', 'Wu'],
    Ren: ['Mao', 'Si'], Gui: ['Mao', 'Si'],
  };
  for (const { p, b } of allBranches) {
    if (tianYi[dm]?.includes(b)) {
      stars.push({
        classical: '天乙貴人',
        name: 'Celestial Benefactor',
        kind: 'auspicious',
        pillar: p,
        meaning: 'Mentors and unexpected help arrive throughout your life, often at the most critical moments. People in positions of authority become advocates. The clearest "lucky" star in classical Bazi.',
      });
      break; // count once
    }
  }

  // Wen Chang 文昌 — academic / writing star
  const wenChang: Partial<Record<HeavenlyStem, EarthlyBranch>> = {
    Jia: 'Si', Yi: 'Wu', Bing: 'Shen', Ding: 'You',
    Wu: 'Shen', Ji: 'You', Geng: 'Hai', Xin: 'Zi',
    Ren: 'Yin', Gui: 'Mao',
  };
  for (const { p, b } of allBranches) {
    if (wenChang[dm] === b) {
      stars.push({
        classical: '文昌',
        name: 'Literary Star',
        kind: 'auspicious',
        pillar: p,
        meaning: 'Strong intellect, writing ability, academic success, articulate communication. Often manifests as a memorable teacher, a published voice, or a particularly clear-thinking mind.',
      });
      break;
    }
  }

  // Tao Hua 桃花 — Peach Blossom (romance, charisma)
  const taoHuaMap: Record<EarthlyBranch, EarthlyBranch | null> = {
    Yin: 'Mao', Wu: 'Mao', Xu: 'Mao',
    Si: 'Wu', You: 'Wu', Chou: 'Wu',
    Shen: 'You', Zi: 'You', Chen: 'You',
    Hai: 'Zi', Mao: 'Zi', Wei: 'Zi',
  };
  const taoHuaTarget = taoHuaMap[dayBranch];
  if (taoHuaTarget) {
    for (const { p, b } of allBranches) {
      if (b === taoHuaTarget && p !== 'day') {
        stars.push({
          classical: '桃花',
          name: 'Peach Blossom',
          kind: 'mixed',
          pillar: p,
          meaning: 'Magnetic charm and romantic / sexual appeal. People are drawn to you. In favourable contexts: a fulfilling love life. In unfavourable: scandal, infidelity, or attention you didn\'t want. The pillar where it appears tells you which life-area carries the charge.',
        });
        break;
      }
    }
  }

  // Yi Ma 驛馬 — Travel Horse
  const yiMaMap: Record<EarthlyBranch, EarthlyBranch | null> = {
    Yin: 'Shen', Wu: 'Shen', Xu: 'Shen',
    Si: 'Hai', You: 'Hai', Chou: 'Hai',
    Shen: 'Yin', Zi: 'Yin', Chen: 'Yin',
    Hai: 'Si', Mao: 'Si', Wei: 'Si',
  };
  const yiMaTarget = yiMaMap[dayBranch];
  if (yiMaTarget) {
    for (const { p, b } of allBranches) {
      if (b === yiMaTarget) {
        stars.push({
          classical: '驛馬',
          name: 'Travel Horse',
          kind: 'mixed',
          pillar: p,
          meaning: 'Restlessness, frequent moves, international career, life lived between places. People with strong Yi Ma rarely settle young; their soul calls them outward. Excellent for sales, diplomacy, journalism, anything mobile.',
        });
        break;
      }
    }
  }

  // Hua Gai 華蓋 — Canopy Star (spiritual / artistic / solitary)
  const huaGai: Partial<Record<EarthlyBranch, EarthlyBranch>> = {
    Yin: 'Xu', Wu: 'Xu', Xu: 'Xu',
    Si: 'Chou', You: 'Chou', Chou: 'Chou',
    Shen: 'Chen', Zi: 'Chen', Chen: 'Chen',
    Hai: 'Wei', Mao: 'Wei', Wei: 'Wei',
  };
  const huaGaiTarget = huaGai[dayBranch];
  if (huaGaiTarget) {
    for (const { p, b } of allBranches) {
      if (b === huaGaiTarget) {
        stars.push({
          classical: '華蓋',
          name: 'Canopy of Solitude',
          kind: 'auspicious',
          pillar: p,
          meaning: 'A spiritual, artistic, or scholarly disposition. Comfortable alone. Often religious, philosophical, or unusually creative. The shadow: relationships can feel like compromise of an essential solitude.',
        });
        break;
      }
    }
  }

  // Yang Ren 羊刃 — Sheep-Blade (intensity, leadership, also volatility)
  const yangRen: Partial<Record<HeavenlyStem, EarthlyBranch>> = {
    Jia: 'Mao', Bing: 'Wu', Wu: 'Wu', Geng: 'You', Ren: 'Zi',
  };
  const yangRenTarget = yangRen[dm];
  if (yangRenTarget) {
    for (const { p, b } of allBranches) {
      if (b === yangRenTarget) {
        stars.push({
          classical: '羊刃',
          name: 'Blade Star',
          kind: 'mixed',
          pillar: p,
          meaning: 'Intensity, decisiveness, willingness to cut through. Strong leadership, military / surgical / operational capability. The shadow: explosive temper, accidents, harsh action that can\'t be undone. Channel it through discipline.',
        });
        break;
      }
    }
  }

  // ── Year-branch stars ────────────────────────────────────────────────
  // 紅鸞 / 天喜 — the marriage and celebration pair. 紅鸞 starts at 卯 for a 子
  // year and runs counter-clockwise (「紅鸞起子逆行宮」); 天喜 always sits
  // opposite it. Together they mark the years and areas where unions,
  // births and celebrations cluster.
  const yearBranchIdx = BRANCHES.indexOf(result.year.branch);
  const hongluanIdx = ((3 - yearBranchIdx) % 12 + 12) % 12;
  const PAIR: { idx: number; classical: string; name: string; meaning: string }[] = [
    {
      idx: hongluanIdx,
      classical: '紅鸞',
      name: 'Crimson Phoenix',
      meaning: 'The marriage star. Attraction that leads somewhere binding — engagement, partnership, the joining of families. Where it sits shows the part of life through which love tends to arrive.',
    },
    {
      idx: (hongluanIdx + 6) % 12,
      classical: '天喜',
      name: 'Heavenly Joy',
      meaning: 'The celebration star: births, reunions, good news that arrives without being chased. Softer than 紅鸞 and less about romance — this is the star of things going right in public.',
    },
  ];
  for (const star of PAIR) {
    for (const { p, b } of allBranches) {
      if (BRANCHES.indexOf(b) === star.idx) {
        stars.push({ classical: star.classical, name: star.name, kind: 'auspicious', pillar: p, meaning: star.meaning });
        break;
      }
    }
  }

  // 孤辰 / 寡宿 — the solitude pair, taken from the year branch's season.
  // 亥子丑 → 寅/戌, 寅卯辰 → 巳/丑, 巳午未 → 申/辰, 申酉戌 → 亥/未.
  const SOLITUDE: Record<string, [EarthlyBranch, EarthlyBranch]> = {
    Hai: ['Yin', 'Xu'], Zi: ['Yin', 'Xu'], Chou: ['Yin', 'Xu'],
    Yin: ['Si', 'Chou'], Mao: ['Si', 'Chou'], Chen: ['Si', 'Chou'],
    Si: ['Shen', 'Chen'], Wu: ['Shen', 'Chen'], Wei: ['Shen', 'Chen'],
    Shen: ['Hai', 'Wei'], You: ['Hai', 'Wei'], Xu: ['Hai', 'Wei'],
  };
  const solitude = SOLITUDE[result.year.branch];
  if (solitude) {
    const [guchen, guasu] = solitude;
    for (const { p, b } of allBranches) {
      if (b === guchen) {
        stars.push({
          classical: '孤辰', name: 'Solitary Star', kind: 'inauspicious', pillar: p,
          meaning: 'A pull toward standing apart. Independence that reads as self-sufficiency from outside and as distance from inside. Not a sentence to loneliness — but closeness here takes deliberate effort rather than arriving on its own.',
        });
        break;
      }
    }
    for (const { p, b } of allBranches) {
      if (b === guasu) {
        stars.push({
          classical: '寡宿', name: 'Widowed Star', kind: 'inauspicious', pillar: p,
          meaning: 'The quieter twin of 孤辰: a tendency to withdraw inward, especially after loss. Often found in people whose depth is real but slow to show. Ask for company before you need it.',
        });
        break;
      }
    }
  }

  // 將星 — the general. The 帝旺 seat of the day branch's 三合 frame, i.e. the
  // frame's own middle branch: 寅午戌 → 午, 巳酉丑 → 酉, 申子辰 → 子, 亥卯未 → 卯.
  const GENERAL: Record<EarthlyBranch, EarthlyBranch> = {
    Yin: 'Wu', Wu: 'Wu', Xu: 'Wu',
    Si: 'You', You: 'You', Chou: 'You',
    Shen: 'Zi', Zi: 'Zi', Chen: 'Zi',
    Hai: 'Mao', Mao: 'Mao', Wei: 'Mao',
  };
  for (const { p, b } of allBranches) {
    if (b === GENERAL[dayBranch]) {
      stars.push({
        classical: '將星', name: 'General Star', kind: 'auspicious', pillar: p,
        meaning: 'Command. People look to you to decide, and you are usually comfortable being looked at that way. Strong in management, the armed and emergency services, anywhere someone has to carry the call.',
      });
      break;
    }
  }

  // ── Day-stem stars ───────────────────────────────────────────────────
  // 祿神 — the day master's own seat, where its element sits at full strength.
  const LU: Record<HeavenlyStem, EarthlyBranch> = {
    Jia: 'Yin', Yi: 'Mao', Bing: 'Si', Wu: 'Si', Ding: 'Wu',
    Ji: 'Wu', Geng: 'Shen', Xin: 'You', Ren: 'Hai', Gui: 'Zi',
  };
  for (const { p, b } of allBranches) {
    if (b === LU[dm]) {
      stars.push({
        classical: '祿神', name: 'Prosperity Seat', kind: 'auspicious', pillar: p,
        meaning: 'Your own element at full strength — self-sufficiency, a steady living earned rather than gifted. Where it sits is where your effort reliably converts into support.',
      });
      break;
    }
  }

  // 金輿 — the carriage, two places past the 祿 seat. Comfort, and a partner
  // who brings some of it.
  const luIdx = BRANCHES.indexOf(LU[dm]);
  const jinyu = BRANCHES[(luIdx + 2) % 12];
  for (const { p, b } of allBranches) {
    if (b === jinyu) {
      stars.push({
        classical: '金輿', name: 'Golden Carriage', kind: 'auspicious', pillar: p,
        meaning: 'Ease of circumstance — comfortable surroundings, a supportive marriage, help that arrives in material form. Classically the star of riding rather than walking.',
      });
      break;
    }
  }

  // ── Month-branch star ────────────────────────────────────────────────
  // 月德貴人 — the month's virtue. Read from the month branch's 三合 frame and
  // matched against the chart's STEMS, not its branches:
  // 寅午戌月見丙, 申子辰月見壬, 巳酉丑月見庚, 亥卯未月見甲.
  const YUEDE: Record<EarthlyBranch, HeavenlyStem> = {
    Yin: 'Bing', Wu: 'Bing', Xu: 'Bing',
    Shen: 'Ren', Zi: 'Ren', Chen: 'Ren',
    Si: 'Geng', You: 'Geng', Chou: 'Geng',
    Hai: 'Jia', Mao: 'Jia', Wei: 'Jia',
  };
  const yuedeStem = YUEDE[result.month.branch];
  const allStems: { p: 'year' | 'month' | 'day' | 'hour'; s: HeavenlyStem }[] = [
    { p: 'year', s: result.year.stem },
    { p: 'month', s: result.month.stem },
    { p: 'day', s: result.day.stem },
    { p: 'hour', s: result.hour.stem },
  ];
  for (const { p, s } of allStems) {
    if (s === yuedeStem) {
      stars.push({
        classical: '月德貴人', name: 'Moon Virtue', kind: 'auspicious', pillar: p,
        meaning: 'A protective star. Trouble tends to resolve before it lands, and people are inclined to give you the benefit of the doubt. Classically said to soften every harsh star it shares a chart with.',
      });
      break;
    }
  }

  // Kong Wang 空亡 — Void (旬空)
  //
  // The 60-pillar cycle runs as six 旬 (decades). Each decade pairs ten stems
  // with ten of the twelve branches, so exactly two branches are left over —
  // those two are that decade's voids. Rather than look the pairs up (and get
  // the index arithmetic wrong, which we did: `stemIdx * 6 + branchIdx` is not
  // the sexagenary index, and it mislabelled 44 of the 60 day pillars), derive
  // them. Stepping back `stemIdx` places from the day pillar lands on the 甲
  // that opens its decade; the decade then covers ten consecutive branches
  // from there, and the two immediately after it are the voids.
  //
  //   甲子旬 → 戌亥   甲戌旬 → 申酉   甲申旬 → 午未
  //   甲午旬 → 辰巳   甲辰旬 → 寅卯   甲寅旬 → 子丑
  const decadeStartBranch =
    ((BRANCHES.indexOf(dayBranch) - STEMS.indexOf(result.day.stem)) % 12 + 12) % 12;
  const voids: EarthlyBranch[] = [
    BRANCHES[(decadeStartBranch + 10) % 12],
    BRANCHES[(decadeStartBranch + 11) % 12],
  ];
  // Report every void pillar, not just the first. Which life-area fails to bear
  // fruit is the entire content of this star — collapsing two voids into one
  // throws away the half the reader most needs.
  for (const { p, b } of allBranches) {
    if (voids.includes(b)) {
      stars.push({
        classical: '空亡',
        name: 'Void',
        kind: 'inauspicious',
        pillar: p,
        meaning: 'A pillar that does not produce its expected fruit. Plans here unravel. Effort spent in this life-area returns less than expected. Not a permanent loss — but a sign to redirect rather than push harder.',
      });
    }
  }

  return stars;
}

// ────────────────────────────────────────────────────────────────────
// 4. Branch Relations — clashes (沖), combines (合), triples (三合)
// ────────────────────────────────────────────────────────────────────

export interface BranchRelation {
  type: 'clash' | 'combine' | 'triple-harmony';
  branches: EarthlyBranch[];
  pillars: ('year' | 'month' | 'day' | 'hour')[];
  meaning: string;
}

const SIX_CLASHES: Array<[EarthlyBranch, EarthlyBranch]> = [
  ['Zi', 'Wu'], ['Chou', 'Wei'], ['Yin', 'Shen'],
  ['Mao', 'You'], ['Chen', 'Xu'], ['Si', 'Hai'],
];

const SIX_COMBINES: Array<[EarthlyBranch, EarthlyBranch]> = [
  ['Zi', 'Chou'], ['Yin', 'Hai'], ['Mao', 'Xu'],
  ['Chen', 'You'], ['Si', 'Shen'], ['Wu', 'Wei'],
];

const TRIPLE_HARMONIES: Array<[EarthlyBranch, EarthlyBranch, EarthlyBranch]> = [
  ['Shen', 'Zi', 'Chen'], // water frame
  ['Yin', 'Wu', 'Xu'],    // fire frame
  ['Si', 'You', 'Chou'],  // metal frame
  ['Hai', 'Mao', 'Wei'],  // wood frame
];

export function detectBranchRelations(result: BaziResult): BranchRelation[] {
  const list: BranchRelation[] = [];
  const pillarMap: Record<EarthlyBranch, Array<'year' | 'month' | 'day' | 'hour'>> = {} as Record<EarthlyBranch, Array<'year' | 'month' | 'day' | 'hour'>>;
  const recordPillar = (branch: EarthlyBranch, pillar: 'year' | 'month' | 'day' | 'hour') => {
    if (!pillarMap[branch]) pillarMap[branch] = [];
    pillarMap[branch].push(pillar);
  };
  recordPillar(result.year.branch, 'year');
  recordPillar(result.month.branch, 'month');
  recordPillar(result.day.branch, 'day');
  recordPillar(result.hour.branch, 'hour');

  for (const [a, b] of SIX_CLASHES) {
    if (pillarMap[a] && pillarMap[b]) {
      list.push({
        type: 'clash',
        branches: [a, b],
        pillars: [...pillarMap[a], ...pillarMap[b]],
        meaning: `Six-Clash between ${a} and ${b}. Polar-opposite branches in your chart create persistent tension between the life-areas they govern. Manifests as recurring conflict, restless changes, and "you can't have both at once" forced choices.`,
      });
    }
  }
  for (const [a, b] of SIX_COMBINES) {
    if (pillarMap[a] && pillarMap[b]) {
      list.push({
        type: 'combine',
        branches: [a, b],
        pillars: [...pillarMap[a], ...pillarMap[b]],
        meaning: `Six-Combine between ${a} and ${b}. These branches lock together and produce stable harmony in their domains. Cooperative energy: partnerships, alliances, settled relationships.`,
      });
    }
  }
  for (const triple of TRIPLE_HARMONIES) {
    if (triple.every((b) => pillarMap[b])) {
      list.push({
        type: 'triple-harmony',
        branches: [...triple],
        pillars: triple.flatMap((b) => pillarMap[b] ?? []),
        meaning: `Three-Harmony of ${triple.join(' + ')}. The most powerful branch combination — generates abundant ${BRANCH_ELEMENT[triple[1]]} energy. Whatever life-area this serves becomes a major theme in this lifetime.`,
      });
    }
  }
  return list;
}

// ────────────────────────────────────────────────────────────────────
// 5. Climate balance (寒/燥/濕/熱)
// ────────────────────────────────────────────────────────────────────

export interface ClimateBalance {
  cold: number;
  hot: number;
  wet: number;
  dry: number;
  dominant: 'cold' | 'hot' | 'wet' | 'dry' | 'balanced';
  remedy: string;
}

const BRANCH_CLIMATE: Record<EarthlyBranch, { cold: number; hot: number; wet: number; dry: number }> = {
  Zi:   { cold: 3, hot: 0, wet: 2, dry: 0 },
  Chou: { cold: 2, hot: 0, wet: 2, dry: 0 },
  Yin:  { cold: 0, hot: 1, wet: 0, dry: 1 },
  Mao:  { cold: 0, hot: 0, wet: 1, dry: 0 },
  Chen: { cold: 0, hot: 0, wet: 2, dry: 0 },
  Si:   { cold: 0, hot: 2, wet: 0, dry: 1 },
  Wu:   { cold: 0, hot: 3, wet: 0, dry: 1 },
  Wei:  { cold: 0, hot: 1, wet: 0, dry: 2 },
  Shen: { cold: 1, hot: 0, wet: 0, dry: 1 },
  You:  { cold: 1, hot: 0, wet: 0, dry: 1 },
  Xu:   { cold: 0, hot: 0, wet: 0, dry: 2 },
  Hai:  { cold: 2, hot: 0, wet: 2, dry: 0 },
};

export function computeClimate(result: BaziResult): ClimateBalance {
  let cold = 0, hot = 0, wet = 0, dry = 0;
  for (const p of [result.year, result.month, result.day, result.hour]) {
    const c = BRANCH_CLIMATE[p.branch];
    cold += c.cold; hot += c.hot; wet += c.wet; dry += c.dry;
  }
  const max = Math.max(cold, hot, wet, dry);
  const dominant: ClimateBalance['dominant'] =
    max === 0 ? 'balanced'
    : cold === max ? 'cold'
    : hot === max ? 'hot'
    : wet === max ? 'wet'
    : 'dry';
  const remedies: Record<ClimateBalance['dominant'], string> = {
    cold: 'Your chart runs cold. Warmth is medicine — fire elements (red, orange decor; spicy food in moderation; sunny exposure; afternoon energy) restore vitality. Avoid over-icing your environment in winter. Cold-leaning charts especially benefit from southwest and south as living directions.',
    hot:  'Your chart runs hot. Cooling balances — water elements (blue tones; still water nearby; pre-dawn and evening as your strongest hours; cold immersion done thoughtfully). Watch for inflammation, irritability, and burnout. Don\'t double-up on red rooms or fiery decor.',
    wet:  'Your chart runs damp. Earth and metal elements drain the dampness — dry foods, well-ventilated spaces, structured routines, decisive action. Watch for stagnation, water-retention issues, drifting motivation. Open windows; clear clutter; finish what you start.',
    dry:  'Your chart runs dry. Water nourishes — proper hydration, moist environments, emotional fluency, gentle rest. Watch for skin issues, brittle joints, parched creativity. Avoid over-strenuous yang practices; cultivate the receptive feminine yin.',
    balanced: 'Your chart is climatically balanced — no single climate dominates. This is rare and a source of resilience. The work is to maintain balance through seasonal adjustments rather than corrective intervention.',
  };
  return { cold, hot, wet, dry, dominant, remedy: remedies[dominant] };
}

// ────────────────────────────────────────────────────────────────────
// 6. Career / Wealth / Spouse / Health summaries
// ────────────────────────────────────────────────────────────────────

export interface LifeAreas {
  careerAffinity: string[];
  wealthAnalysis: string;
  spouseAnalysis: string;
  healthFocus: string;
}

const CAREER_BY_DAY_MASTER: Record<HeavenlyStem, string[]> = {
  Jia: ['Architecture', 'Education / academia', 'Forestry / agriculture', 'Leadership in established institutions', 'Civil engineering'],
  Yi:  ['Floral / botanical / herbal', 'Writing + editorial', 'Mediation / diplomacy', 'Boutique design', 'Therapy + counselling'],
  Bing: ['Performance / theatre', 'Public speaking', 'Solar / renewable energy', 'Marketing + advertising', 'Tour-guiding / charismatic leadership'],
  Ding: ['Lighting design', 'Spiritual practice', 'Surgery / precision medicine', 'Watchmaking / jewellery', 'Candle-lit hospitality'],
  Wu:  ['Real estate', 'Earth + ceramics', 'Government / civil service', 'Manufacturing', 'Stable mid-management'],
  Ji:  ['Soil-based agriculture', 'Cooking + culinary', 'Public-health work', 'Childcare + early education', 'Community service'],
  Geng: ['Surgery + sharp instruments', 'Engineering + machining', 'Military / law enforcement', 'Sports + martial arts', 'Decisive leadership'],
  Xin:  ['Jewellery + precious metals', 'Aesthetics + beauty industry', 'Diplomacy + soft power', 'Music', 'Fine craft'],
  Ren:  ['Maritime + shipping', 'Travel industry', 'Movements / activism', 'Distribution + logistics', 'Open-water sports'],
  Gui:  ['Counselling / therapy', 'Mysticism + divination', 'Pharmaceutical research', 'Hidden / behind-the-scenes work', 'Brewing + fermentation'],
};

export function computeLifeAreas(result: BaziResult): LifeAreas {
  const dm = result.dayMaster;
  const dmEl = result.dayMasterElement;
  const wealthEl = ELEMENT_CONTROLS[dmEl];

  const wealthCount = result.elementBalance[wealthEl] ?? 0;
  const wealthStrength =
    wealthCount >= 3 ? 'strong' :
    wealthCount === 2 ? 'moderate' :
    wealthCount === 1 ? 'weak but present' : 'absent';

  const wealthAnalysis = wealthCount === 0
    ? `Your wealth element (${wealthEl}) is absent from the natal chart. This is not a sentence of poverty — it means money rarely arrives directly. You typically need to channel through your output star or follow a Wealth annual luck pillar to access it. Build through skills + reputation rather than direct pursuit.`
    : `Your wealth element (${wealthEl}) appears in your chart with ${wealthStrength} presence. ${wealthCount >= 3 ? 'Money flows toward you naturally — the work is stewardship, not chase. Watch for over-spending or hoarding extremes.' : wealthCount === 2 ? 'A solid earning capacity. Money responds to consistent effort. Build slowly; don\'t gamble.' : 'Money requires deliberate cultivation. Skill-building, networking, and patience over years compound. Avoid speculative shortcuts.'}`;

  // Spouse star: female → Authority/Pressure (the controlling element). Male → Wealth/WealthEdge.
  const spouseEl = result.dayMasterPolarity === 'yang' ? wealthEl : ELEMENT_CONTROLS[dmEl] === wealthEl ? wealthEl : wealthEl;
  // Note: simplified — full Bazi distinguishes by user's gender, which we don't always have. Show element-based reading.
  const spouseCount = result.elementBalance[spouseEl] ?? 0;
  const spouseAnalysis = spouseCount === 0
    ? `The spouse element does not appear in your natal chart. Often correlates with marrying late or to someone whose chart strongly carries this element. Not a barrier; a different timing.`
    : spouseCount >= 3
    ? `The spouse element appears strongly in your chart. Relationships are a major life theme; you marry early or partner intensely. Watch for over-prioritizing partnership at the cost of self.`
    : `The spouse element is moderately present. Relationships develop on a steady timeline. Quality more than urgency.`;

  const healthMap: Record<FiveElement, string> = {
    wood: 'Liver, gallbladder, joints, eyes, tendons. When wood is excessive: irritability, headaches, neck tension. When weak: rigid joints, dry eyes, short temper. Stretch daily; manage anger through exercise.',
    fire: 'Heart, small intestine, circulation, tongue, skin (blood-related). When fire is excessive: insomnia, anxiety, palpitations. When weak: cold extremities, depression, low libido. Cardio matters; don\'t skip rest.',
    earth: 'Spleen, stomach, digestion, mouth, muscles. When earth is excessive: weight gain, lethargy, overthinking. When weak: poor appetite, IBS, brain fog. Eat slowly; avoid raw cold foods.',
    metal: 'Lungs, large intestine, skin, nose. When metal is excessive: rigidity, grief, sinus issues. When weak: weak immunity, dry skin, asthma. Breath-work daily; clear closets to clear lungs.',
    water: 'Kidneys, bladder, bones, ears, hair. When water is excessive: fear, listlessness, urinary issues. When weak: lower back pain, hearing issues, premature aging. Sleep is the medicine; don\'t over-exert.',
  };

  return {
    careerAffinity: CAREER_BY_DAY_MASTER[dm],
    wealthAnalysis,
    spouseAnalysis,
    healthFocus: healthMap[dmEl],
  };
}

// ────────────────────────────────────────────────────────────────────
// 7. Per-pillar narratives — what each of the 4 pillars represents
// ────────────────────────────────────────────────────────────────────

export const PILLAR_NARRATIVES = {
  year: 'The Year Pillar represents your ancestors, family origin, and the first 16-20 years of life. The energy carried in by your lineage; the structures you were born into; the inheritance — material and energetic — you start with.',
  month: 'The Month Pillar represents your parents, your career, and roughly ages 16-32. The container in which you grew up; the social and professional environment you operate within; how you show up in the workplace.',
  day: 'The Day Pillar represents you and your spouse, ages 32-48. The Day Stem is your essential self; the Day Branch describes the partner you naturally attract. The middle of life — the years of partnership and primary work.',
  hour: 'The Hour Pillar represents your children, your aspirations, and ages 48 onward. What you produce, leave behind, or birth into the world. The legacy years.',
} as const;

// ────────────────────────────────────────────────────────────────────
// Aggregate deep result
// ────────────────────────────────────────────────────────────────────

export interface BaziDeepResult {
  luckPillars: LuckPillar[];
  currentLuckPillar: LuckPillar | null;
  annualLuck: AnnualLuck;
  spiritStars: SpiritStar[];
  branchRelations: BranchRelation[];
  climate: ClimateBalance;
  lifeAreas: LifeAreas;
  pillarNarratives: typeof PILLAR_NARRATIVES;
}

export function computeBaziDeep(
  result: BaziResult,
  birthDate: string,
  gender: Gender,
  birthTime?: string,
  currentYear: number = new Date().getFullYear(),
): BaziDeepResult {
  const birthYear = parseInt(birthDate.split('-')[0], 10);
  const luckPillars = computeLuckPillars(result, gender, birthYear, birthDate, birthTime);
  return {
    luckPillars,
    currentLuckPillar: currentLuckPillar(luckPillars, currentYear),
    annualLuck: annualLuckFor(result, currentYear),
    spiritStars: detectSpiritStars(result),
    branchRelations: detectBranchRelations(result),
    climate: computeClimate(result),
    lifeAreas: computeLifeAreas(result),
    pillarNarratives: PILLAR_NARRATIVES,
  };
}
