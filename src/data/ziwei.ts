/**
 * Zi Wei Dou Shu (紫微斗数) chart engine.
 *
 * Placement pipeline:
 *   1. Gregorian birth → lunar month/day (utils/chineseLunar, from ephemeris)
 *   2. birth hour → 時辰 branch
 *   3. 命宮 / 身宮 from lunar month + hour branch
 *   4. 命宮 stem via 五虎遁 → 納音 → 五行局
 *   5. 紫微 position from 五行局 + lunar day, then the other 13 majors
 *   6. 四化 from the lunar-year stem
 *
 * Reference tables live in ./ziweiTables; interpretation text in ./ziweiContent.
 */

import { lunarFromBirth, type LunarDate } from '../utils/chineseLunar';
import {
  PALACES, BRANCHES12, BRANCHES12_ROMAN, STEMS10, STEMS10_ROMAN,
  BUREAU_INFO, NAYIN_BUREAU, nayinKey, ziweiPositionFromRule,
  placeMajorStars, MAJOR_STARS, FOUR_TRANSFORMATIONS,
  lifePalaceBranch, bodyPalaceBranch, palaceBranch,
  type Bureau,
} from './ziweiTables';

export interface ZiweiStarPlacement {
  key: string;
  cn: string;
  transformation: 'hua_lu' | 'hua_quan' | 'hua_ke' | 'hua_ji' | null;
}

export interface ZiweiPalaceResult {
  key: string;
  cn: string;
  en: string;
  branchIdx: number;
  branchCn: string;
  stars: ZiweiStarPlacement[];
  isLife: boolean;
  isBody: boolean;
}

export interface ZiweiChartResult {
  lunar: LunarDate;
  hourBranchIdx: number;
  hourBranchCn: string;
  yearStemRoman: string;
  yearStemCn: string;
  bureau: Bureau;
  bureauCn: string;
  bureauNumber: number;
  lifeBranchIdx: number;
  bodyBranchIdx: number;
  ziweiBranchIdx: number;
  palaces: ZiweiPalaceResult[];
  transformations: { star: string; kind: 'hua_lu' | 'hua_quan' | 'hua_ke' | 'hua_ji' }[];
}

/** 時辰 branch from a HH:MM birth time. 23:00-00:59 → 子 (0). */
export function hourBranchIndex(birthTime?: string): number {
  if (!birthTime || !/^\d{1,2}:\d{2}/.test(birthTime)) return 6; // default 午
  const hh = parseInt(birthTime.split(':')[0], 10);
  return Math.floor(((hh % 24) + 1) / 2) % 12;
}

/** Lunar-year stem index (0-9). Year 4 CE = 甲子, so (year - 4) mod 10. */
function yearStemIndex(lunarYear: number): number {
  return ((lunarYear - 4) % 10 + 10) % 10;
}

/**
 * Stem of the palace sitting at `branchIdx`, via 五虎遁: the 寅 palace's stem
 * is fixed by the year stem, then stems run forward with the branches.
 *   寅 stem = (yearStem × 2 + 2) mod 10
 */
function palaceStemIndex(yearStemIdx: number, branchIdx: number): number {
  const yinStem = (yearStemIdx * 2 + 2) % 10;
  const stepsFromYin = ((branchIdx - 2) % 12 + 12) % 12;
  return (yinStem + stepsFromYin) % 10;
}

export function computeZiweiChart(birthDate: string, birthTime?: string): ZiweiChartResult | null {
  const lunar = lunarFromBirth(birthDate, birthTime);
  if (!lunar) return null;

  const hourBranchIdx = hourBranchIndex(birthTime);
  const lifeBranchIdx = lifePalaceBranch(lunar.month, hourBranchIdx);
  const bodyBranchIdx = bodyPalaceBranch(lunar.month, hourBranchIdx);

  // 五行局 from the 命宮's own stem-branch pillar.
  const yearStemIdx = yearStemIndex(lunar.year);
  const lifeStemIdx = palaceStemIndex(yearStemIdx, lifeBranchIdx);
  const bureau: Bureau =
    NAYIN_BUREAU[nayinKey(STEMS10_ROMAN[lifeStemIdx], BRANCHES12_ROMAN[lifeBranchIdx])] ?? 'water2';

  const ziweiBranchIdx = ziweiPositionFromRule(bureau, lunar.day);
  const placements = placeMajorStars(ziweiBranchIdx);

  // 四化 by lunar-year stem.
  const huaMap = FOUR_TRANSFORMATIONS[STEMS10_ROMAN[yearStemIdx]];
  const starTransformation = new Map<string, ZiweiStarPlacement['transformation']>();
  const transformations: ZiweiChartResult['transformations'] = [];
  if (huaMap) {
    (['hua_lu', 'hua_quan', 'hua_ke', 'hua_ji'] as const).forEach((kind) => {
      const star = huaMap[kind];
      starTransformation.set(star, kind);
      transformations.push({ star, kind });
    });
  }

  const starsByBranch = new Map<number, ZiweiStarPlacement[]>();
  for (const { star, cn } of MAJOR_STARS) {
    const branch = placements[star];
    if (branch === undefined) continue;
    const list = starsByBranch.get(branch) ?? [];
    list.push({ key: star, cn, transformation: starTransformation.get(star) ?? null });
    starsByBranch.set(branch, list);
  }

  const palaces: ZiweiPalaceResult[] = PALACES.map((p, i) => {
    const branchIdx = palaceBranch(lifeBranchIdx, i);
    return {
      key: p.key,
      cn: p.cn,
      en: p.en,
      branchIdx,
      branchCn: BRANCHES12[branchIdx],
      stars: starsByBranch.get(branchIdx) ?? [],
      isLife: branchIdx === lifeBranchIdx,
      isBody: branchIdx === bodyBranchIdx,
    };
  });

  return {
    lunar,
    hourBranchIdx,
    hourBranchCn: BRANCHES12[hourBranchIdx],
    yearStemRoman: STEMS10_ROMAN[yearStemIdx],
    yearStemCn: STEMS10[yearStemIdx],
    bureau,
    bureauCn: BUREAU_INFO[bureau].cn,
    bureauNumber: BUREAU_INFO[bureau].number,
    lifeBranchIdx,
    bodyBranchIdx,
    ziweiBranchIdx,
    palaces,
    transformations,
  };
}
