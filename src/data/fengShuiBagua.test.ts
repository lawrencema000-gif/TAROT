import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BAGUA_AREAS, BAGUA_AREA_ORDER } from './fengShuiBagua';

/**
 * The placement sentence reads fengshui.placement with the area's `direction`
 * as {{dir}}. The template names the room and the door, so a direction that
 * named them too produced "in the Centre of the room of your room" and
 * 部屋の部屋の中央 (P7 F28/F68). Held for English, the three overlays and the
 * four templates.
 */
const LOCALES = join(process.cwd(), 'src', 'i18n', 'locales');
const json = (lng: string, file: string) => JSON.parse(readFileSync(join(LOCALES, lng, file), 'utf8'));
const template = (lng: string): string => json(lng, 'app.json').fengshui.placement;
const fill = (tpl: string, dir: string) => tpl.replace('{{dir}}', dir);

/** Words that name the room or the door, per language. */
const ROOM_OR_DOOR: Record<string, RegExp> = {
  en: /\b(?:room|door|entry|entrance)\b/i,
  ja: /部屋|玄関|入口/,
  ko: /방|현관|입구/,
  zh: /房间|大门|入口|门/,
};

describe('feng shui placement: a bare position in a sentence that names the room once', () => {
  it('English directions are bare lowercase positions', () => {
    for (const area of BAGUA_AREA_ORDER) {
      const d = BAGUA_AREAS[area].direction;
      expect(d, area).toMatch(/^[a-z]+(?:-[a-z]+)?$/);
      expect(ROOM_OR_DOOR.en.test(d), area).toBe(false);
    }
  });

  it('no overlay direction names the room or the door', () => {
    for (const lng of ['ja', 'ko', 'zh']) {
      const bagua = json(lng, 'content-fengshui.json').bagua as Record<string, { direction: string }>;
      for (const area of BAGUA_AREA_ORDER) {
        expect(ROOM_OR_DOOR[lng].test(bagua[area].direction), `${lng} ${area}: ${bagua[area].direction}`).toBe(false);
      }
    }
  });

  it('every filled sentence names the room once and the door once', () => {
    for (const lng of ['en', 'ja', 'ko', 'zh']) {
      const tpl = template(lng);
      const bagua: Record<string, { direction: string }> | null =
        lng === 'en' ? null : json(lng, 'content-fengshui.json').bagua;
      for (const area of BAGUA_AREA_ORDER) {
        const s = fill(tpl, bagua ? bagua[area].direction : BAGUA_AREAS[area].direction);
        const room = { en: /room/g, ja: /部屋/g, ko: /방의|방 /g, zh: /房间/g }[lng]!;
        const door = { en: /door/g, ja: /入口|玄関/g, ko: /입구|현관/g, zh: /入口|大门/g }[lng]!;
        expect(s.match(room)?.length, `${lng} ${area}: ${s}`).toBe(1);
        expect(s.match(door)?.length, `${lng} ${area}: ${s}`).toBe(1);
      }
    }
  });

  it('reads as a sentence in English', () => {
    expect(fill(template('en'), BAGUA_AREAS.wealth.direction)).toBe(
      'Place these adjustments in the back-left area of your room, as seen from the entry door.',
    );
    expect(fill(template('en'), BAGUA_AREAS.health.direction)).toBe(
      'Place these adjustments in the central area of your room, as seen from the entry door.',
    );
  });
});
