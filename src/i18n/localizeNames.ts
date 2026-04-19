// Localized display names for Zodiac signs, Planets, and Aspect types.
// The underlying enum values (Planet, ZodiacSign, AspectType) stay English
// everywhere in code/data — these helpers only affect what renders in the UI.
import { getLocale, type SupportedLocale } from './config';
import type { ZodiacSign, Planet, AspectType } from '../types/astrology';

const SIGN_NAMES: Record<SupportedLocale, Record<ZodiacSign, string>> = {
  en: {
    Aries: 'Aries', Taurus: 'Taurus', Gemini: 'Gemini', Cancer: 'Cancer',
    Leo: 'Leo', Virgo: 'Virgo', Libra: 'Libra', Scorpio: 'Scorpio',
    Sagittarius: 'Sagittarius', Capricorn: 'Capricorn', Aquarius: 'Aquarius', Pisces: 'Pisces',
  },
  ja: {
    Aries: '牡羊座', Taurus: '牡牛座', Gemini: '双子座', Cancer: '蟹座',
    Leo: '獅子座', Virgo: '乙女座', Libra: '天秤座', Scorpio: '蠍座',
    Sagittarius: '射手座', Capricorn: '山羊座', Aquarius: '水瓶座', Pisces: '魚座',
  },
  ko: {
    Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
    Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
    Sagittarius: '궁수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
  },
  zh: {
    Aries: '白羊座', Taurus: '金牛座', Gemini: '双子座', Cancer: '巨蟹座',
    Leo: '狮子座', Virgo: '处女座', Libra: '天秤座', Scorpio: '天蝎座',
    Sagittarius: '射手座', Capricorn: '摩羯座', Aquarius: '水瓶座', Pisces: '双鱼座',
  },
};

const PLANET_NAMES: Record<SupportedLocale, Record<Planet, string>> = {
  en: {
    Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
    Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto',
  },
  ja: {
    Sun: '太陽', Moon: '月', Mercury: '水星', Venus: '金星', Mars: '火星',
    Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
  },
  ko: {
    Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
    Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
  },
  zh: {
    Sun: '太阳', Moon: '月亮', Mercury: '水星', Venus: '金星', Mars: '火星',
    Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
  },
};

const ASPECT_NAMES: Record<SupportedLocale, Record<AspectType, string>> = {
  en: {
    conjunction: 'conjunction', opposition: 'opposition', trine: 'trine',
    square: 'square', sextile: 'sextile',
  },
  ja: {
    conjunction: '合', opposition: '衝', trine: 'トライン',
    square: 'スクエア', sextile: 'セクスタイル',
  },
  ko: {
    conjunction: '합', opposition: '대립', trine: '삼각',
    square: '직각', sextile: '육분',
  },
  zh: {
    conjunction: '合相', opposition: '对分相', trine: '三分相',
    square: '四分相', sextile: '六分相',
  },
};

export function localizeSignName(sign: ZodiacSign, locale: SupportedLocale = getLocale()): string {
  return SIGN_NAMES[locale]?.[sign] ?? sign;
}

export function localizePlanetName(planet: Planet, locale: SupportedLocale = getLocale()): string {
  return PLANET_NAMES[locale]?.[planet] ?? planet;
}

export function localizeAspectName(aspect: AspectType, locale: SupportedLocale = getLocale()): string {
  return ASPECT_NAMES[locale]?.[aspect] ?? aspect;
}
