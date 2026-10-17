import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mansionCaption, mansionGlyph, mansionAlmanacName } from './mansionCaption';
import { MANSIONS, MANSION_BY_KEY } from '../../data/lunarMansions';

const title = (lng: string, key: string): string =>
  (JSON.parse(readFileSync(join(process.cwd(), 'src', 'i18n', 'locales', lng, 'content-mansions.json'), 'utf8')) as {
    mansions: Record<string, { title: string }>;
  }).mansions[key].title;

describe('mansionCaption: one script per card (P7 F16)', () => {
  it('reads 参水猿 under the title 参宿 in Chinese and Japanese, never the traditional 參', () => {
    const shen = MANSION_BY_KEY.shen;
    expect(mansionCaption(shen, 'zh')).toEqual({ text: '参水猿', lang: undefined });
    expect(mansionCaption(shen, 'ja')).toEqual({ text: '参水猿', lang: undefined });
    expect(mansionCaption(MANSION_BY_KEY.mao, 'zh').text).toBe('昴日鸡');
    expect(mansionCaption(MANSION_BY_KEY.mao, 'ja').text).toBe('昴日鶏');
    expect(mansionCaption(MANSION_BY_KEY.kang, 'zh').text).toBe('亢金龙');
  });

  it('every mansion: the caption and tile glyph start with the glyph of the overlay title beneath them', () => {
    for (const lng of ['zh', 'ja'] as const) {
      for (const m of MANSIONS) {
        const glyph = mansionGlyph(m, lng).text;
        expect(`${glyph}宿`, `${lng} ${m.key}`).toBe(title(lng, m.key));
        expect(mansionCaption(m, lng).text.startsWith(glyph), `${lng} ${m.key}`).toBe(true);
      }
    }
  });

  it('English and Korean keep the romanised caption; the traditional glyph is marked zh-Hant', () => {
    const shen = MANSION_BY_KEY.shen;
    expect(mansionCaption(shen, 'en').text).toBe('Shēn · Mercury');
    expect(mansionCaption(shen, 'ko').lang).toBeUndefined();
    expect(mansionGlyph(shen, 'en')).toEqual({ text: '參', lang: 'zh-Hant' });
    expect(mansionGlyph(shen, 'ko')).toEqual({ text: '參', lang: 'zh-Hant' });
    expect(mansionAlmanacName(shen, 'ko')).toBe('參水猿');
  });
});
