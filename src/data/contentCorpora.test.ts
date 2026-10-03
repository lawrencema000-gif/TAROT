import { describe, it, expect } from 'vitest';
import { CONTENT_CORPORA, missionsCorpus, wisdomCorpus, mansionsCorpus, ziweiCorpus, auspiciousCorpus, fengshuiCorpus } from './contentCorpora';
import { ct, ctList } from '../i18n/contentOverlay';
import { DAILY_MISSIONS } from './dailyMissions';
import { DAILY_SCORE_FRAMES, ORACLE_SUGGESTIONS } from './oracleSuggestions';
import { WISDOM_QUOTES } from './dailyWisdom';
import { MANSIONS, MANSION_ACTIVITIES, QUADRANT_INFO, type Quadrant } from './lunarMansions';
import { STAR_MEANINGS, PALACE_MEANINGS, TRANSFORMATION_MEANINGS, BUREAU_MEANINGS } from './ziweiContent';
import { INTENTIONS } from './auspiciousDates';
import { BAGUA_AREA_ORDER } from './fengShuiBagua';
import { FAVORABLE_LABEL, UNFAVORABLE_LABEL } from './fengShuiKua';
import { ROOM_GUIDANCE, type Room } from './fengShuiRooms';
import { FENG_SHUI_PROBLEMS } from './fengShuiProblems';

/**
 * The overlay shape each screen reads (ct/ctList paths) must exist in the
 * English corpus the localizers translate — otherwise a translation lands in
 * a key nobody reads. A sentinel fallback proves the path resolves.
 */
const MISS = '\u0000missing';
const has = (o: Record<string, unknown>, path: string) => ct(o, path, MISS) !== MISS;

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe('content corpora', () => {
  it('carry only user-facing strings (none empty, none numeric)', () => {
    for (const [mod, build] of Object.entries(CONTENT_CORPORA)) {
      const all = strings(build());
      expect(all.length, mod).toBeGreaterThan(0);
      expect(all.filter((s) => !s.trim() || /^[\d\s.,:+-]+$/.test(s)), mod).toEqual([]);
    }
  });

  it('missions: every mission and every cosmic-weather line (DailyMissionCard, DailyCosmicScore)', () => {
    const c = missionsCorpus();
    for (const m of DAILY_MISSIONS) {
      expect(has(c, `missions.${m.id}.prompt`), m.id).toBe(true);
      expect(has(c, `missions.${m.id}.why`), m.id).toBe(true);
    }
    expect(ctList(c, 'scoreFrames', DAILY_SCORE_FRAMES.map(() => MISS))).toEqual(DAILY_SCORE_FRAMES);
  });

  it('wisdom: every quote and every oracle suggestion list', () => {
    const c = wisdomCorpus();
    for (const q of WISDOM_QUOTES) for (const f of ['text', 'source', 'reflection']) expect(has(c, `quotes.${q.id}.${f}`), q.id).toBe(true);
    for (const [ctx, list] of Object.entries(ORACLE_SUGGESTIONS)) expect(ctList(c, `oracle.${ctx}`, list.map(() => MISS))).toEqual(list);
  });

  it('mansions: all 28 with title/text/animal/advice and their activity lists, all four quadrants', () => {
    const c = mansionsCorpus();
    expect(has(c, 'intro')).toBe(true);
    for (const m of MANSIONS) {
      for (const f of ['title', 'text', 'animal', 'advice']) expect(has(c, `mansions.${m.key}.${f}`), `${m.key}.${f}`).toBe(true);
      const acts = MANSION_ACTIVITIES[m.key];
      for (const list of ['favourable', 'unfavourable'] as const) {
        const en = acts[list];
        expect(ctList(c, `mansions.${m.key}.${list}`, en.map(() => MISS)), `${m.key}.${list}`).toEqual(en.length ? en : []);
      }
    }
    for (const q of Object.keys(QUADRANT_INFO) as Quadrant[]) {
      for (const f of ['name', 'text', 'season', 'element', 'direction']) expect(has(c, `quadrants.${q}.${f}`), q).toBe(true);
    }
  });

  it('ziwei: stars, palaces, transformations, bureaus', () => {
    const c = ziweiCorpus();
    expect(has(c, 'intro')).toBe(true);
    for (const k of Object.keys(STAR_MEANINGS)) { expect(has(c, `stars.${k}.title`)).toBe(true); expect(has(c, `stars.${k}.text`)).toBe(true); }
    for (const k of Object.keys(PALACE_MEANINGS)) { expect(has(c, `palaces.${k}.name`)).toBe(true); expect(has(c, `palaces.${k}.text`)).toBe(true); }
    for (const k of Object.keys(TRANSFORMATION_MEANINGS)) { expect(has(c, `transformations.${k}.name`)).toBe(true); expect(has(c, `transformations.${k}.text`)).toBe(true); }
    for (const k of Object.keys(BUREAU_MEANINGS)) expect(has(c, `bureaus.${k}`)).toBe(true);
  });

  it('auspicious: every purpose', () => {
    const c = auspiciousCorpus();
    for (const k of Object.keys(INTENTIONS)) { expect(has(c, `intentions.${k}.label`)).toBe(true); expect(has(c, `intentions.${k}.blurb`)).toBe(true); }
  });

  it('fengshui: bagua, Kua, annual stars, rooms, problems', () => {
    const c = fengshuiCorpus();
    for (const a of BAGUA_AREA_ORDER) {
      for (const f of ['meaning', 'lowReading', 'highReading', 'element', 'color', 'direction']) expect(has(c, `bagua.${a}.${f}`), `${a}.${f}`).toBe(true);
    }
    for (const k of Object.keys(FAVORABLE_LABEL)) { expect(has(c, `kua.favorable.${k}.label`)).toBe(true); expect(has(c, `kua.favorable.${k}.meaning`)).toBe(true); }
    for (const k of Object.keys(UNFAVORABLE_LABEL)) { expect(has(c, `kua.unfavorable.${k}.label`)).toBe(true); expect(has(c, `kua.unfavorable.${k}.meaning`)).toBe(true); }
    for (let n = 1; n <= 9; n++) { expect(has(c, `annual.stars.${n}.meaning`)).toBe(true); expect(has(c, `annual.stars.${n}.remedy`)).toBe(true); }
    for (const room of Object.keys(ROOM_GUIDANCE) as Room[]) {
      expect(has(c, `rooms.${room}.name`)).toBe(true);
      ROOM_GUIDANCE[room].rules.forEach((_, i) => {
        expect(has(c, `rooms.${room}.rules.${i}.rule`)).toBe(true);
        expect(has(c, `rooms.${room}.rules.${i}.why`)).toBe(true);
      });
      expect(ctList(c, `rooms.${room}.avoid`, ROOM_GUIDANCE[room].avoid.map(() => MISS))).toEqual(ROOM_GUIDANCE[room].avoid);
    }
    for (const p of FENG_SHUI_PROBLEMS) for (const f of ['problem', 'why', 'remedy']) expect(has(c, `problems.${p.id}.${f}`), p.id).toBe(true);
  });
});
