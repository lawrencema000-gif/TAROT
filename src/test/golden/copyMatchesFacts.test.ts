import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { mbtiQuiz } from '../../data/quizzes';
import { mbtiQuickQuiz } from '../../data/mbtiQuickQuiz';
import { achievementSlug } from '../../components/achievements/localizeAchievement';

/**
 * Copy that states a fact the code decides — a count, what a badge counts, a
 * label another label must not repeat. The final QA run found each of these
 * stale (Q04, Q08, Q25, Q27, Q34, Q37); each is held to its source here.
 */
const ROOT = process.cwd();
const LOCALES = ['en', 'ja', 'ko', 'zh'] as const;
const load = (lng: string, ns: string) => JSON.parse(readFileSync(join(ROOT, 'src/i18n/locales', lng, `${ns}.json`), 'utf8'));
const app = Object.fromEntries(LOCALES.map((l) => [l, load(l, 'app')]));
const common = Object.fromEntries(LOCALES.map((l) => [l, load(l, 'common')]));

describe('the career report names the real quiz lengths (Q37)', () => {
  const want = [mbtiQuickQuiz.questions.length, mbtiQuiz.questions.length].map(String).sort();

  it.each(LOCALES)('%s careerReport.needsMbtiBody', (lng) => {
    const body: string = app[lng].careerReport.needsMbtiBody;
    expect((body.match(/\d+/g) ?? []).sort(), body).toEqual(want);
  });

  it('CareerReportPage’s English default', () => {
    const page = readFileSync(join(ROOT, 'src/pages/CareerReportPage.tsx'), 'utf8');
    const m = /'This report is derived from your MBTI personality type\.[^']*'/.exec(page);
    expect(m).not.toBeNull();
    expect((m![0].match(/\d+/g) ?? []).sort()).toEqual(want);
  });
});

/** Seeded badges: slug → the activity its progress is derived from (migration 018). */
function seededActivities(): Map<string, string> {
  const sql = readFileSync(join(ROOT, 'supabase/migrations/20260127070447_seed_achievement_definitions.sql'), 'utf8');
  const out = new Map<string, string>();
  for (const m of sql.matchAll(/\('((?:[^']|'')+)',\s*'(?:[^']|'')*',[^\n]*\n\s*'(\{[^']*\})'/g)) {
    out.set(achievementSlug(m[1].replace(/''/g, '\'')), (JSON.parse(m[2]) as { activity_type: string }).activity_type);
  }
  return out;
}

describe('badge descriptions say what is counted (Q04, Q08)', () => {
  const activities = seededActivities();
  const TAROT = /tarot|タロット|타로|塔罗/i;
  // 018 counts these from the XP ledger, which every reading writes whatever
  // the deck (owner decision: tarot and playing-card readings count together).
  const ANY_DECK = new Set(['reading_complete', 'reading_saved', 'full_moon_reading', 'witching_hour_reading', 'new_year_reading']);

  it('reads the seed', () => {
    expect(activities.get('card-collector')).toBe('reading_saved');
    expect(activities.get('full-moon-reader')).toBe('full_moon_reading');
    expect(activities.get('zodiac-scholar')).toBe('zodiac_signs_viewed');
  });

  it.each(LOCALES)('%s: a badge any reading counts toward does not say "tarot"', (lng) => {
    const defs = app[lng].achievements.defs as Record<string, { description: string }>;
    const bad = [...activities]
      .filter(([slug, act]) => ANY_DECK.has(act) && defs[slug] && TAROT.test(defs[slug].description))
      .map(([slug]) => `${slug}: ${defs[slug].description}`);
    expect(bad).toEqual([]);
  });

  it.each([
    ['en', /compatibility/i, /astrology entry/i],
    ['ja', /相性/, /占星術の項目/],
    ['ko', /궁합/, /점성술 항목/],
    ['zh', /配对/, /占星条目/],
  ] as const)('%s: Zodiac Scholar points at the sign pages that count, not the compatibility section', (lng, notThere, there) => {
    const d: string = app[lng].achievements.defs['zodiac-scholar'].description;
    expect(d).not.toMatch(notThere);
    expect(d).toMatch(there);
    expect(d).toMatch(/12/);
  });

  it('the sign pages are what report a sign', () => {
    const page = readFileSync(join(ROOT, 'src/pages/AstrologyEntryPage.tsx'), 'utf8');
    expect(page).toMatch(/reportZodiacSignViewed\(/);
  });
});

describe('labels that must not repeat (Q25, Q27)', () => {
  it.each(LOCALES)('%s: no two Readings tabs share a name', (lng) => {
    const tabs = app[lng].readings.tabs as Record<string, string>;
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [k, v] of Object.entries(tabs)) {
      if (seen.has(v)) dupes.push(`${seen.get(v)} = ${k} = ${v}`);
      else seen.set(v, k);
    }
    expect(dupes).toEqual([]);
  });

  it.each(LOCALES)('%s: the Readings hub is not named like the spreads inside it', (lng) => {
    const spreads: string = app[lng].readings.spreadsSection;
    expect(common[lng].nav.readings).not.toBe(spreads);
    expect(app[lng].readings.title).not.toBe(spreads);
  });

  it('zh calls the hub 解读, its word for readings', () => {
    expect(common.zh.nav.readings).toBe('解读');
    expect(app.zh.readings.title).toBe('解读');
  });
});

describe('Japanese honorifics follow the name directly (Q34)', () => {
  it('no ja string puts a space between a name and さん / 様 / くん / ちゃん', () => {
    const dir = join(ROOT, 'src/i18n/locales/ja');
    const bad: string[] = [];
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const text = readFileSync(join(dir, f), 'utf8');
      for (const m of text.matchAll(/"[^"\n]*\}\}[ \u3000]+(さん|様|くん|ちゃん)[^"\n]*"/g)) bad.push(`${f}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it('Home and the OAuth welcome read 「さくらさん」', () => {
    expect(app.ja.home.nameTitle.replace('{{name}}', 'さくら')).toBe('さくらさん');
    expect(load('ja', 'onboarding').oauth.welcome.replace('{{name}}', '山田 花子')).toBe('ようこそ、山田 花子さん。');
  });
});
