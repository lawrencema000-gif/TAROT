// Personal Kua number (命卦 / 八宅) calculation.
//
// In Eight Mansions feng shui (八宅), every person has a personal Kua
// number from 1-9 (excluding 5) derived from birth year + gender. The
// Kua determines four favourable directions and four unfavourable
// directions for that person — used to position bed, desk, front door,
// and stove. People also fall into one of two "groups":
//
//   East group:  Kua 1, 3, 4, 9
//   West group:  Kua 2, 6, 7, 8
//
// East-group people thrive facing East / Southeast / South / North.
// West-group people thrive facing West / Northwest / Southwest /
// Northeast. These are not interchangeable — getting your group right
// is the single most consequential feng shui decision a person makes.

export type KuaNumber = 1 | 2 | 3 | 4 | 6 | 7 | 8 | 9;
export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type Gender = 'male' | 'female';
export type FavorableType = 'sheng-qi' | 'tian-yi' | 'yan-nian' | 'fu-wei';
export type UnfavorableType = 'jue-ming' | 'wu-gui' | 'liu-sha' | 'huo-hai';

export interface KuaProfile {
  kua: KuaNumber;
  group: 'East' | 'West';
  /** Personal element (the Kua's trigram element). */
  element: 'Water' | 'Earth' | 'Wood' | 'Metal' | 'Fire';
  /** Trigram name in pinyin. */
  trigram: 'Kan' | 'Kun' | 'Zhen' | 'Xun' | 'Qian' | 'Dui' | 'Gen' | 'Li';
  favorable: Record<FavorableType, Direction>;
  unfavorable: Record<UnfavorableType, Direction>;
}

/**
 * Direction reading — what each direction does for this person.
 * The 4 favourable directions, in order of strength:
 *   Sheng Qi (生氣) — the most beneficial. Place your front door, desk,
 *     bed (head pointing this way) here for prosperity, vitality, drive.
 *   Tian Yi (天醫) — health and recovery. Bedroom direction. Good for
 *     elderly + recovering family members.
 *   Yan Nian (延年) — relationships, longevity. Stove, dining area.
 *     Strengthens marriages and family bonds.
 *   Fu Wei (伏位) — stability, gentle support. Good for study + meditation.
 *
 * The 4 unfavourable directions, in order of severity:
 *   Jue Ming (絕命) — total loss. Avoid sleeping or working here.
 *   Wu Gui (五鬼) — five ghosts. Conflict, betrayal, accidents.
 *   Liu Sha (六煞) — six killers. Setbacks, gossip, financial loss.
 *   Huo Hai (禍害) — misfortune. Mild but persistent bad luck.
 */
export const FAVORABLE_LABEL: Record<FavorableType, string> = {
  'sheng-qi':  'Sheng Qi 生氣',
  'tian-yi':   'Tian Yi 天醫',
  'yan-nian':  'Yan Nian 延年',
  'fu-wei':    'Fu Wei 伏位',
};

export const UNFAVORABLE_LABEL: Record<UnfavorableType, string> = {
  'jue-ming':  'Jue Ming 絕命',
  'wu-gui':    'Wu Gui 五鬼',
  'liu-sha':   'Liu Sha 六煞',
  'huo-hai':   'Huo Hai 禍害',
};

export const FAVORABLE_MEANING: Record<FavorableType, string> = {
  'sheng-qi':  'Best direction. Prosperity, vitality, ambition. Aim front door + main work surface here. Sleep with the head pointing toward this direction. Spending time facing here builds drive and good fortune.',
  'tian-yi':   'Health and recovery. Excellent for the bed when you are unwell, for elderly family, or when a loved one is ill. Healing comes faster from this direction.',
  'yan-nian':  'Long-lasting relationships. Place the stove burner facing here to support family harmony. Good for the marriage bed if Sheng Qi is unavailable. Strengthens loyalty and longevity in commitments.',
  'fu-wei':    'Quiet support, study, meditation. Calm steady direction; good for desks where you want focus rather than ambition, for nurseries, and for spiritual practice.',
};

export const UNFAVORABLE_MEANING: Record<UnfavorableType, string> = {
  'jue-ming':  'Total loss. The most damaging direction. Never face here from your front door, bed, or desk. If you must, use a screen, plants, or a shelf to break the line of sight.',
  'wu-gui':    'Five Ghosts. Brings conflict, betrayal, accidents, and emotional volatility. Avoid sleeping with the head pointing here; the dreams will be turbulent.',
  'liu-sha':   'Six Killers. Setbacks at work, gossip, slow financial drain. Avoid for the front door and home office. If unavoidable, hang a metal wind chime to disperse the energy.',
  'huo-hai':   'Misfortune. Mild but persistent. Causes small recurring problems — health niggles, minor money issues, friction with neighbours. Live with it but don\'t face it for major decisions.',
};

/**
 * Trigram → element + group lookup.
 */
const KUA_META: Record<KuaNumber, Pick<KuaProfile, 'group' | 'element' | 'trigram'>> = {
  1: { group: 'East', element: 'Water', trigram: 'Kan' },
  2: { group: 'West', element: 'Earth', trigram: 'Kun' },
  3: { group: 'East', element: 'Wood',  trigram: 'Zhen' },
  4: { group: 'East', element: 'Wood',  trigram: 'Xun' },
  6: { group: 'West', element: 'Metal', trigram: 'Qian' },
  7: { group: 'West', element: 'Metal', trigram: 'Dui' },
  8: { group: 'West', element: 'Earth', trigram: 'Gen' },
  9: { group: 'East', element: 'Fire',  trigram: 'Li' },
};

/**
 * 4 favourable + 4 unfavourable directions per Kua. From the canonical
 * Eight Mansions table. Ordered as [SQ, TY, YN, FW, JM, WG, LS, HH].
 */
const KUA_DIRECTIONS: Record<KuaNumber, [Direction, Direction, Direction, Direction, Direction, Direction, Direction, Direction]> = {
  1: ['SE', 'E',  'S',  'N',  'SW', 'NE', 'W',  'NW'],
  2: ['NE', 'W',  'NW', 'SW', 'N',  'SE', 'E',  'S'],
  3: ['S',  'N',  'SE', 'E',  'W',  'NW', 'NE', 'SW'],
  4: ['N',  'S',  'E',  'SE', 'NW', 'W',  'SW', 'NE'],
  6: ['W',  'NE', 'SW', 'NW', 'S',  'E',  'SE', 'N'],
  7: ['NW', 'SW', 'NE', 'W',  'E',  'S',  'N',  'SE'],
  8: ['SW', 'NW', 'W',  'NE', 'SE', 'N',  'S',  'E'],
  9: ['E',  'SE', 'N',  'S',  'NE', 'SW', 'NW', 'W'],
};

function buildProfile(kua: KuaNumber): KuaProfile {
  const dirs = KUA_DIRECTIONS[kua];
  return {
    kua,
    ...KUA_META[kua],
    favorable: {
      'sheng-qi': dirs[0],
      'tian-yi':  dirs[1],
      'yan-nian': dirs[2],
      'fu-wei':   dirs[3],
    },
    unfavorable: {
      'jue-ming': dirs[4],
      'wu-gui':   dirs[5],
      'liu-sha':  dirs[6],
      'huo-hai':  dirs[7],
    },
  };
}

/**
 * Compute a person's Kua number from birth year + gender.
 *
 * Traditional formula uses the solar year (anchored at 立春, the start
 * of spring, around Feb 4). Users born Jan 1 - Feb 3 belong to the
 * previous solar year. If a `birthDate` (YYYY-MM-DD) is supplied, we
 * apply that adjustment automatically; otherwise we use the Gregorian
 * year as an approximation and trust the user to know their own
 * boundary. This matches how Bazi handles the same boundary elsewhere
 * in the app.
 *
 * Male formula:    11 - (sum of last two digits of year, reduced to single digit)
 *   (After 2000: 9 - (sum of last two digits, reduced))
 * Female formula:  4 + (sum of last two digits, reduced)
 *   (After 2000: 6 + (sum of last two digits, reduced))
 *
 * 5 maps to 2 for males and 8 for females (as 5 has no Kua trigram).
 */
export function computeKua(birthYear: number, gender: Gender, birthDate?: string): KuaProfile | null {
  if (!Number.isFinite(birthYear) || birthYear < 1900 || birthYear > 2100) return null;

  // Solar-year boundary at 立春 (Feb 4). Anyone born Jan 1 - Feb 3
  // belongs to the previous year for the purpose of Kua computation.
  let effectiveYear = birthYear;
  if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    const [, m, d] = birthDate.split('-').map(Number);
    if (m === 1 || (m === 2 && d <= 3)) {
      effectiveYear = birthYear - 1;
    }
  }

  // Sum the last two digits and reduce to single digit.
  const last2 = effectiveYear % 100;
  let digitSum = (Math.floor(last2 / 10) + (last2 % 10));
  while (digitSum >= 10) {
    digitSum = Math.floor(digitSum / 10) + (digitSum % 10);
  }

  let raw: number;
  const isModern = effectiveYear >= 2000;

  if (gender === 'male') {
    raw = isModern ? (9 - digitSum) : (11 - digitSum);
    while (raw <= 0) raw += 9;
    raw = ((raw - 1) % 9) + 1;
  } else {
    raw = isModern ? (6 + digitSum) : (4 + digitSum);
    raw = ((raw - 1) % 9) + 1;
  }

  // 5 has no Kua trigram — substitute.
  if (raw === 5) raw = gender === 'male' ? 2 : 8;

  return buildProfile(raw as KuaNumber);
}

/**
 * Direction display label (full name + abbreviation).
 */
export const DIRECTION_LABEL: Record<Direction, string> = {
  N:  'North',
  NE: 'Northeast',
  E:  'East',
  SE: 'Southeast',
  S:  'South',
  SW: 'Southwest',
  W:  'West',
  NW: 'Northwest',
};
