/**
 * The English corpus of each static-content module, in exactly the shape
 * its overlay (`src/i18n/locales/<lng>/content-<module>.json`, read through
 * src/i18n/contentOverlay.ts) must have. Keys are stable ids — mission ids,
 * mansion keys, star/palace keys, intention ids, bagua areas, rooms, problem
 * ids — never English text.
 *
 * Two consumers: the generator that writes the English files the localizers
 * translate (scratchpad p7-FX6-gen-corpora), and the golden test that holds
 * every screen's ct()/ctList() paths to this shape. A render site reads
 * `ct(overlay, '<path>', english)` with a path that exists here.
 *
 * Only user-facing strings: no ids as values, no numbers, no CJK-only names
 * (those are the same in every language).
 */
import { DAILY_MISSIONS } from './dailyMissions';
import { DAILY_SCORE_FRAMES, ORACLE_SUGGESTIONS } from './oracleSuggestions';
import { WISDOM_QUOTES } from './dailyWisdom';
import { MANSIONS, MANSION_ACTIVITIES, QUADRANT_INFO, type Quadrant } from './lunarMansions';
import { MANSION_INTRO, MANSION_MEANINGS, MANSION_DAILY_ADVICE, QUADRANT_MEANINGS } from './lunarMansionsContent';
import { STAR_MEANINGS, PALACE_MEANINGS, TRANSFORMATION_MEANINGS, BUREAU_MEANINGS, ZIWEI_INTRO } from './ziweiContent';
import { INTENTIONS, type Intention } from './auspiciousDates';
import { BAGUA_AREAS, BAGUA_AREA_ORDER } from './fengShuiBagua';
import { FAVORABLE_LABEL, FAVORABLE_MEANING, UNFAVORABLE_LABEL, UNFAVORABLE_MEANING, type FavorableType, type UnfavorableType } from './fengShuiKua';
import { ROOM_GUIDANCE, type Room } from './fengShuiRooms';
import { FENG_SHUI_PROBLEMS } from './fengShuiProblems';
import { STAR_BASE_TEXT } from './fengShuiAnnual';

type Obj = Record<string, unknown>;

/** Home: the daily mission (prompt + why) and the cosmic-weather lines under the score. */
export function missionsCorpus(): Obj {
  const missions: Obj = {};
  for (const m of DAILY_MISSIONS) missions[m.id] = { prompt: m.prompt, why: m.why };
  return { missions, scoreFrames: [...DAILY_SCORE_FRAMES] };
}

/** Daily wisdom quotes and the oracle's suggested questions. */
export function wisdomCorpus(): Obj {
  const quotes: Obj = {};
  for (const q of WISDOM_QUOTES) quotes[q.id] = { text: q.text, source: q.source, reflection: q.reflection };
  const oracle: Obj = {};
  for (const [ctx, list] of Object.entries(ORACLE_SUGGESTIONS)) oracle[ctx] = [...list];
  return { quotes, oracle };
}

/** The twenty-eight lunar mansions: the Mansions page, Home's mansion card, Good Days. */
export function mansionsCorpus(): Obj {
  const quadrants: Obj = {};
  for (const q of Object.keys(QUADRANT_INFO) as Quadrant[]) {
    const info = QUADRANT_INFO[q];
    quadrants[q] = {
      name: info.en,
      text: QUADRANT_MEANINGS[q].text,
      season: info.season,
      element: info.element,
      direction: info.direction,
    };
  }
  const mansions: Obj = {};
  for (const m of MANSIONS) {
    const acts = MANSION_ACTIVITIES[m.key];
    const entry: Obj = {
      title: MANSION_MEANINGS[m.key].title,
      text: MANSION_MEANINGS[m.key].text,
      animal: m.animal,
      advice: MANSION_DAILY_ADVICE[m.key],
    };
    if (acts.favourable.length) entry.favourable = [...acts.favourable];
    if (acts.unfavourable.length) entry.unfavourable = [...acts.unfavourable];
    mansions[m.key] = entry;
  }
  return { intro: MANSION_INTRO, quadrants, mansions };
}

/** Zi Wei Dou Shu: stars, palaces, the four transformations, the five bureaus. */
export function ziweiCorpus(): Obj {
  const stars: Obj = {};
  for (const [key, s] of Object.entries(STAR_MEANINGS)) stars[key] = { title: s.title, text: s.text };
  const palaces: Obj = {};
  for (const [key, p] of Object.entries(PALACE_MEANINGS)) palaces[key] = { name: p.en, text: p.text };
  const transformations: Obj = {};
  for (const [key, tr] of Object.entries(TRANSFORMATION_MEANINGS)) transformations[key] = { name: tr.en, text: tr.text };
  const bureaus: Obj = { ...BUREAU_MEANINGS };
  return { intro: ZIWEI_INTRO, stars, palaces, transformations, bureaus };
}

/** Good Days: what each purpose is called and what it covers. */
export function auspiciousCorpus(): Obj {
  const intentions: Obj = {};
  for (const k of Object.keys(INTENTIONS) as Intention[]) {
    intentions[k] = { label: INTENTIONS[k].label, blurb: INTENTIONS[k].blurb };
  }
  return { intentions };
}

/** Feng shui: bagua areas, Kua directions, annual stars, rooms, the problems checklist. */
export function fengshuiCorpus(): Obj {
  const bagua: Obj = {};
  for (const area of BAGUA_AREA_ORDER) {
    const a = BAGUA_AREAS[area];
    bagua[area] = {
      meaning: a.meaning,
      element: a.element,
      color: a.color,
      direction: a.direction,
      adjustments: [...a.adjustments],
      lowReading: a.lowReading,
      highReading: a.highReading,
    };
  }
  const favorable: Obj = {};
  for (const k of Object.keys(FAVORABLE_LABEL) as FavorableType[]) {
    favorable[k] = { label: FAVORABLE_LABEL[k], meaning: FAVORABLE_MEANING[k] };
  }
  const unfavorable: Obj = {};
  for (const k of Object.keys(UNFAVORABLE_LABEL) as UnfavorableType[]) {
    unfavorable[k] = { label: UNFAVORABLE_LABEL[k], meaning: UNFAVORABLE_MEANING[k] };
  }
  const stars: Obj = {};
  for (const [n, s] of Object.entries(STAR_BASE_TEXT)) stars[n] = { meaning: s.meaning, remedy: s.remedy };
  const rooms: Obj = {};
  for (const room of Object.keys(ROOM_GUIDANCE) as Room[]) {
    const g = ROOM_GUIDANCE[room];
    rooms[room] = {
      name: g.name,
      rules: g.rules.map((r) => ({ rule: r.rule, why: r.why })),
      avoid: [...g.avoid],
    };
  }
  const problems: Obj = {};
  for (const p of FENG_SHUI_PROBLEMS) problems[p.id] = { problem: p.problem, why: p.why, remedy: p.remedy };
  return { bagua, kua: { favorable, unfavorable }, annual: { stars }, rooms, problems };
}

export const CONTENT_CORPORA = {
  missions: missionsCorpus,
  wisdom: wisdomCorpus,
  mansions: mansionsCorpus,
  ziwei: ziweiCorpus,
  auspicious: auspiciousCorpus,
  fengshui: fengshuiCorpus,
} as const;
