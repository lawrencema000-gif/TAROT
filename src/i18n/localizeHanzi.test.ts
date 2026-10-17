import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localizeHanzi, hanziLang, hanziUnlessShown } from './localizeHanzi';
import { MANSIONS, QUADRANT_INFO, PLANET7_INFO } from '../data/lunarMansions';
import { PALACES, MAJOR_STARS, SUPPORT_STARS_IN_TRANSFORMATIONS, BUREAU_INFO } from '../data/ziweiTables';
import { STAR_MEANINGS, PALACE_MEANINGS, TRANSFORMATION_MEANINGS } from '../data/ziweiContent';
import { INTENTIONS } from '../data/auspiciousDates';

/**
 * The data's traditional hanzi, held to the scripts the zh and ja overlays
 * actually write. If a translator's form and this table ever disagree, a
 * Chinese or Japanese screen shows the same name in two scripts again.
 */

type Json = Record<string, unknown>;
const overlay = (lng: string, mod: string): Json =>
  JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, `content-${mod}.json`), 'utf8'));
const at = (o: Json, path: string): string => path.split('.').reduce<unknown>((c, k) => (c as Json)?.[k], o) as string;

const glyphs = MANSIONS.map((m) => m.cn).join('');
const animals = MANSIONS.map((m) => m.animalCn).join('');
const quadrants = Object.values(QUADRANT_INFO).map((q) => q.cn).join(' ');
const palaces = PALACES.map((p) => p.cn).join(' ');
const stars = Object.values(STAR_MEANINGS).map((s) => s.cn).join(' ');
const transformations = Object.values(TRANSFORMATION_MEANINGS).map((t) => t.cn).join(' ');
const intentions = Object.values(INTENTIONS).map((i) => i.cn).join(' ');
const bureaus = Object.values(BUREAU_INFO).map((b) => b.cn).join(' ');
const luminaries = Object.values(PLANET7_INFO).map((p) => p.cn).join('');
const words = '紫微斗數 擇日 二十八宿 農曆 閏 時 身宮';

describe('localizeHanzi: the data inventory in each script', () => {
  it('zh reads simplified', () => {
    const zh = (s: string) => localizeHanzi(s, 'zh');
    expect(zh(glyphs)).toBe('角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸');
    expect(zh(animals)).toBe('蛟龙貉兔狐虎豹獬牛蝠鼠燕猪貐狼狗雉鸡乌猴猿犴羊獐马鹿蛇蚓');
    expect(zh(quadrants)).toBe('东方青龙 北方玄武 西方白虎 南方朱雀');
    expect(zh(palaces)).toBe('命宫 兄弟宫 夫妻宫 子女宫 财帛宫 疾厄宫 迁移宫 交友宫 官禄宫 田宅宫 福德宫 父母宫');
    expect(zh(stars)).toBe('紫微 天机 太阳 武曲 天同 廉贞 天府 太阴 贪狼 巨门 天相 天梁 七杀 破军 左辅 右弼 文昌 文曲');
    expect(zh(transformations)).toBe('化禄 化权 化科 化忌');
    expect(zh(intentions)).toBe('婚姻 出行 开市 入宅 修造 立契 入学 祭祀 播种');
    expect(zh(bureaus)).toBe(bureaus);
    expect(zh(luminaries)).toBe(luminaries);
    expect(zh(words)).toBe('紫微斗数 择日 二十八宿 农历 闰 时 身宫');
  });

  it('ja reads the shinjitai, and only those characters change', () => {
    const ja = (s: string) => localizeHanzi(s, 'ja');
    expect(ja(glyphs)).toBe('角亢氐房心尾箕斗牛女虚危室壁奎婁胃昴畢觜参井鬼柳星張翼軫');
    expect(ja(animals)).toBe('蛟龍貉兎狐虎豹獬牛蝠鼠燕猪貐狼狗雉鶏烏猴猿犴羊獐馬鹿蛇蚓');
    expect(ja(quadrants)).toBe(quadrants);
    expect(ja(palaces)).toBe('命宮 兄弟宮 夫妻宮 子女宮 財帛宮 疾厄宮 遷移宮 交友宮 官禄宮 田宅宮 福徳宮 父母宮');
    expect(ja(stars)).toBe(stars);
    expect(ja(transformations)).toBe('化禄 化権 化科 化忌');
    expect(ja(intentions)).toBe('婚姻 出行 開市 入宅 修造 立契 入学 祭祀 播種');
    expect(ja(words)).toBe('紫微斗数 択日 二十八宿 農暦 閏 時 身宮');
  });

  it('en and ko keep the traditional forms (hanja are traditional)', () => {
    for (const s of [glyphs, animals, quadrants, palaces, stars, transformations, intentions, words]) {
      expect(localizeHanzi(s, 'en')).toBe(s);
      expect(localizeHanzi(s, 'ko')).toBe(s);
    }
  });

  it('the grid draws the same stars the essays describe', () => {
    const placed = [...MAJOR_STARS, ...SUPPORT_STARS_IN_TRANSFORMATIONS].map((s) => s.cn).sort();
    expect(placed).toEqual(Object.values(STAR_MEANINGS).map((s) => s.cn).sort());
  });
});

describe('localizeHanzi agrees with the overlays', () => {
  it('every mansion glyph + 宿 is the zh and ja overlay title; Korean keeps the hanja', () => {
    const zh = overlay('zh', 'mansions');
    const ja = overlay('ja', 'mansions');
    const ko = overlay('ko', 'mansions');
    for (const m of MANSIONS) {
      expect(at(zh, `mansions.${m.key}.title`), m.key).toBe(`${localizeHanzi(m.cn, 'zh')}宿`);
      expect(at(ja, `mansions.${m.key}.title`), m.key).toBe(`${localizeHanzi(m.cn, 'ja')}宿`);
      expect(at(ko, `mansions.${m.key}.title`), m.key).toContain(`${m.cn}宿`);
    }
  });

  it('every zh palace term is the zh overlay name; the ja essays spell the terms in shinjitai', () => {
    const zh = overlay('zh', 'ziwei');
    const ja = overlay('ja', 'ziwei');
    for (const [key, p] of Object.entries(PALACE_MEANINGS)) {
      expect(at(zh, `palaces.${key}.name`), key).toBe(localizeHanzi(p.cn, 'zh'));
    }
    // The essays that name their palace (官禄宮 and 福徳宮 are the ones the table changes).
    for (const key of ['life', 'spouse', 'wealth', 'travel', 'career', 'property', 'fortune']) {
      expect(at(ja, `palaces.${key}.text`), key).toContain(localizeHanzi(PALACE_MEANINGS[key].cn, 'ja'));
    }
  });

  it('every star and transformation essay names itself in the reader’s script', () => {
    for (const lng of ['zh', 'ja'] as const) {
      const o = overlay(lng, 'ziwei');
      for (const [key, s] of Object.entries(STAR_MEANINGS)) {
        expect(at(o, `stars.${key}.text`), `${lng} ${key}`).toContain(localizeHanzi(s.cn, lng));
      }
      for (const [key, t] of Object.entries(TRANSFORMATION_MEANINGS)) {
        expect(at(o, `transformations.${key}.text`), `${lng} ${key}`).toContain(localizeHanzi(t.cn, lng));
      }
    }
  });

  it('no zh or ja overlay writes a form the table converts away', () => {
    const from = (lng: 'zh' | 'ja') => [...new Set([...(glyphs + animals + quadrants + palaces + stars + transformations + intentions + words)])]
      .filter((ch) => localizeHanzi(ch, lng) !== ch);
    for (const lng of ['zh', 'ja'] as const) {
      for (const mod of ['mansions', 'ziwei', 'auspicious']) {
        const text = JSON.stringify(overlay(lng, mod));
        expect(from(lng).filter((ch) => text.includes(ch)), `${lng} ${mod}`).toEqual([]);
      }
    }
  });
});

describe('hanziLang and hanziUnlessShown', () => {
  it('marks only the traditional forms as zh-Hant', () => {
    expect(hanziLang('en')).toBe('zh-Hant');
    expect(hanziLang('ko')).toBe('zh-Hant');
    expect(hanziLang('zh')).toBeUndefined();
    expect(hanziLang('ja')).toBeUndefined();
  });

  it('drops a name the localized copy already shows, in any script', () => {
    expect(hanziUnlessShown('擇日', 'en', ['Pick a good day', 'Zeri — choosing the day for a thing'])).toBe('擇日');
    expect(hanziUnlessShown('擇日', 'zh', ['择日', '择日——为一件事挑选日子'])).toBeNull();
    expect(hanziUnlessShown('擇日', 'ja', ['吉日を選ぶ', '択日——ことを行う日を選ぶ'])).toBeNull();
    expect(hanziUnlessShown('擇日', 'ko', ['좋은 날 고르기', '택일(擇日) — 어떤 일을 위한 날 고르기'])).toBeNull();
    expect(hanziUnlessShown('紫微斗數', 'ko', ['자미두수', '십이궁, 십사주성, 사화'])).toBe('紫微斗數');
  });
});
