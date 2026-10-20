import { describe, it, expect, afterAll } from 'vitest';
import i18n from './config';
import { CJK_FONTS, cjkFontHref } from './cjkFonts';

/*
 * p10 d3-ko-10: Korean headings set their Hangul in Noto Serif KR, which the
 * Korean stylesheet now loads beside the sans. Every other language's display
 * stack names 'Noto Serif KR' as well (index.css --font-display), and the
 * Korean faces cover kana and some 4,600 Han characters: a Korean stylesheet
 * left on after the language changes would set part of a Japanese or Chinese
 * heading in the Korean serif. loadCjkFonts (config.ts) keeps the current
 * language's stylesheet on and the others off, as a fresh load has them.
 */

const sheet = (lng: string) => document.getElementById(`arcana-font-${lng}`) as HTMLLinkElement | null;
/** Which CJK stylesheets apply: present and not disabled. */
const applied = () => Object.keys(CJK_FONTS).filter((lng) => sheet(lng) !== null && !sheet(lng)!.disabled);

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('the CJK font loader (p10 d3-ko-10)', () => {
  it('ko: one stylesheet, the sans and the display serif', async () => {
    await i18n.changeLanguage('ko');
    expect(sheet('ko')!.href).toBe(cjkFontHref(CJK_FONTS.ko));
    expect(sheet('ko')!.href).toContain('family=Noto+Serif+KR:wght@500;600');
    expect(applied()).toEqual(['ko']);
  });

  it('switching language switches the last one’s stylesheet off, and back on when it returns', async () => {
    await i18n.changeLanguage('ko');
    await i18n.changeLanguage('ja');
    expect(applied()).toEqual(['ja']);
    await i18n.changeLanguage('zh');
    expect(applied()).toEqual(['zh']);
    await i18n.changeLanguage('en');
    expect(applied()).toEqual([]);
    await i18n.changeLanguage('ko');
    expect(applied()).toEqual(['ko']);
    // One stylesheet per language, however often it is chosen.
    expect(document.querySelectorAll('link[id^="arcana-font-"]')).toHaveLength(3);
  });
});
