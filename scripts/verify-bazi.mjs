/**
 * Verify our Bazi computation against the canonical example from the
 * user's ChatGPT reading: 8 June 2001 4:15pm → 辛巳 甲午 壬寅 戊申
 */
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Inline the constants + functions from src/data/bazi.ts so we don't
// need to compile TypeScript for this verification.

const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
const CHINESE_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const CHINESE_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

const SOLAR_TERM_BOUNDARIES = [
  { m: 1,  d: 6,  branchIdx: 1 },  // 丑
  { m: 2,  d: 4,  branchIdx: 2 },  // 寅
  { m: 3,  d: 6,  branchIdx: 3 },  // 卯
  { m: 4,  d: 5,  branchIdx: 4 },  // 辰
  { m: 5,  d: 6,  branchIdx: 5 },  // 巳
  { m: 6,  d: 6,  branchIdx: 6 },  // 午
  { m: 7,  d: 7,  branchIdx: 7 },  // 未
  { m: 8,  d: 8,  branchIdx: 8 },  // 申
  { m: 9,  d: 8,  branchIdx: 9 },  // 酉
  { m: 10, d: 8,  branchIdx: 10 }, // 戌
  { m: 11, d: 7,  branchIdx: 11 }, // 亥
  { m: 12, d: 7,  branchIdx: 0 },  // 子
];

const DAY_PILLAR_OFFSET = 17;

function computeYearPillar(y, m, d) {
  const effectiveYear = (m < 2 || (m === 2 && d < 4)) ? y - 1 : y;
  const offset = effectiveYear - 1984;
  const stemIdx = ((offset % 10) + 10) % 10;
  const branchIdx = ((offset % 12) + 12) % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

function computeMonthPillar(m, d, yearStemIdx) {
  let branchIdx = 0;
  for (const term of SOLAR_TERM_BOUNDARIES) {
    if (m > term.m || (m === term.m && d >= term.d)) {
      branchIdx = term.branchIdx;
    }
  }
  const firstMonthStem = (yearStemIdx * 2 + 2) % 10;
  const monthOrdinal = (branchIdx - 2 + 12) % 12;
  const stemIdx = (firstMonthStem + monthOrdinal) % 10;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

function computeDayPillar(y, m, d) {
  const utcDate = Date.UTC(y, m - 1, d);
  const daysSinceEpoch = Math.floor(utcDate / 86_400_000);
  const idx60 = ((daysSinceEpoch + DAY_PILLAR_OFFSET) % 60 + 60) % 60;
  const stemIdx = idx60 % 10;
  const branchIdx = idx60 % 12;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx, idx60, daysSinceEpoch };
}

function computeHourPillar(birthTime, dayStemIdx) {
  let branchIdx = 6;
  if (birthTime && /^\d{1,2}:\d{2}/.test(birthTime)) {
    const hh = parseInt(birthTime.split(':')[0], 10);
    branchIdx = Math.floor(((hh % 24) + 1) / 2) % 12;
  }
  const firstHourStem = (dayStemIdx * 2) % 10;
  const stemIdx = (firstHourStem + branchIdx) % 10;
  return { stem: STEMS[stemIdx], branch: BRANCHES[branchIdx], stemIdx, branchIdx };
}

function pillarChinese(stemIdx, branchIdx) {
  return CHINESE_STEMS[stemIdx] + CHINESE_BRANCHES[branchIdx];
}

function check(label, expected, actual) {
  const ok = expected === actual;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected ${expected}, got ${actual}`);
  return ok;
}

// ───────── Test cases ─────────

const cases = [
  // Anchor case: matches the ChatGPT 5.4 reading the user shared.
  {
    label: 'User example — 8 Jun 2001 16:15 (canonical 壬寅 day)',
    y: 2001, m: 6, d: 8, t: '16:15',
    expected: { year: '辛巳', month: '甲午', day: '壬寅', hour: '戊申' },
  },
  // 60-day cycle consistency derived from the anchor:
  //   Jun 5 2001 = 己亥 (confirmed by user's source)
  //   Jun 8 2001 = 壬寅 (Jun 5 + 3 = idx60 35 → 38)
  //   Jul 8 2001 = idx60 (35 + 33) % 60 = 8 → 壬申  (壬 idx 8, 申 idx 8 → 壬申; idx60=8)
  //     Wait: idx60 8 → stem 8, branch 8 → 壬申. ✓
  {
    label: 'Cycle check — 5 Jun 2001 (己亥)',
    y: 2001, m: 6, d: 5, t: '12:00',
    expected: { year: '辛巳', month: '甲午', day: '己亥' },
  },
  // Solar-term boundary: 4 Feb 2024 was 立春 (start of new BaZi year)
  // 2024-02-04 should switch to year 甲辰 (idx60 of YEAR cycle: 2024-1984=40,
  // stem 0 (Jia), branch 4 (Chen). → 甲辰).
  {
    label: 'Year boundary — 4 Feb 2024 (立春, year flips to 甲辰)',
    y: 2024, m: 2, d: 4, t: '12:00',
    expected: { year: '甲辰', month: '丙寅' },
  },
  // Just before 立春, year stays in 癸卯
  {
    label: 'Year boundary — 3 Feb 2024 (still in 癸卯 year)',
    y: 2024, m: 2, d: 3, t: '12:00',
    expected: { year: '癸卯', month: '乙丑' },
  },
];

let allPassed = true;
for (const c of cases) {
  console.log(`\n${c.label}`);
  const yearP = computeYearPillar(c.y, c.m, c.d);
  const monthP = computeMonthPillar(c.m, c.d, yearP.stemIdx);
  const dayP = computeDayPillar(c.y, c.m, c.d);
  const hourP = computeHourPillar(c.t, dayP.stemIdx);

  const yearStr = pillarChinese(yearP.stemIdx, yearP.branchIdx);
  const monthStr = pillarChinese(monthP.stemIdx, monthP.branchIdx);
  const dayStr = pillarChinese(dayP.stemIdx, dayP.branchIdx);
  const hourStr = pillarChinese(hourP.stemIdx, hourP.branchIdx);

  console.log(`    days_since_epoch=${dayP.daysSinceEpoch} idx60=${dayP.idx60}`);
  if (!check('year', c.expected.year, yearStr)) allPassed = false;
  if (!check('month', c.expected.month, monthStr)) allPassed = false;
  if (!check('day', c.expected.day, dayStr)) allPassed = false;
  if (c.expected.hour && !check('hour', c.expected.hour, hourStr)) allPassed = false;
}

console.log('\n' + (allPassed ? '✅ ALL PASS' : '❌ MISMATCHES — algorithm has a bug'));
