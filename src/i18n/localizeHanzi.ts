import type { SupportedLocale } from './config';

/**
 * The Eastern systems' hanzi, in the reader's script.
 *
 * The lunar-mansion, Zi Wei and good-days data spell their names in
 * traditional characters (參水猿, 財帛宮, 化祿, 開市…), which is right for
 * English and Korean (hanja are traditional). Chinese and Japanese readers
 * meet the same names in their own script everywhere else on the screen:
 * the zh overlays are simplified (参宿, 财帛宫, 化禄) and the ja overlays use
 * the shinjitai (参宿, 官禄宮, 化権). Printing the data raw put two scripts
 * side by side on one card (参宿 under 參水猿, 畢宿宜嫁娶 beside 毕宿).
 *
 * This is NOT a general converter: it maps the closed set of characters
 * those data files use, each of which has exactly one form in the target
 * script. src/i18n/localizeHanzi.test.ts holds the tables to the overlays
 * (every converted mansion glyph + 宿 is the overlay's title; every zh palace
 * term is the zh overlay's name) and to an inventory of the data, so a new
 * character in the data cannot slip through unconverted.
 */

/** Traditional → simplified, for zh. */
const SIMPLIFIED: Readonly<Record<string, string>> = {
  // mansions and their animals; the quadrant names
  虛: '虚', 婁: '娄', 畢: '毕', 參: '参', 張: '张', 軫: '轸',
  龍: '龙', 豬: '猪', 雞: '鸡', 烏: '乌', 馬: '马', 東: '东',
  // Zi Wei palaces, stars and the four transformations
  宮: '宫', 財: '财', 遷: '迁', 祿: '禄', 權: '权',
  機: '机', 陽: '阳', 陰: '阴', 貞: '贞', 貪: '贪', 門: '门', 殺: '杀', 軍: '军', 輔: '辅',
  // calendar words; the good-days purposes
  農: '农', 曆: '历', 閏: '闰', 時: '时', 數: '数', 擇: '择', 開: '开', 學: '学', 種: '种',
};

/** Traditional (kyūjitai) → shinjitai, for ja: only where Japanese writes the name differently. */
const SHINJITAI: Readonly<Record<string, string>> = {
  虛: '虚', 參: '参', 兔: '兎', 雞: '鶏', 豬: '猪',
  祿: '禄', 權: '権', 德: '徳',
  曆: '暦', 數: '数', 擇: '択', 學: '学',
};

const TABLE: Partial<Record<SupportedLocale, Readonly<Record<string, string>>>> = {
  zh: SIMPLIFIED,
  ja: SHINJITAI,
};

/** `text` (traditional hanzi from the data) in the script `locale` reads; en and ko unchanged. */
export function localizeHanzi(text: string, locale: SupportedLocale): string {
  const table = TABLE[locale];
  if (!table) return text;
  let out = '';
  for (const ch of text) out += table[ch] ?? ch;
  return out;
}

/**
 * Chinese and Japanese write these names in hanzi themselves, so a localized
 * name (东方青龙, 東方の青龍, 命宫) already is the name; English and Korean
 * localize into another script and print the hanzi beside it.
 */
export function writesHanzi(locale: SupportedLocale): boolean {
  return locale === 'zh' || locale === 'ja';
}

/**
 * The `lang` for an element showing localized hanzi: the traditional forms
 * shown to en and ko readers are marked zh-Hant (so the browser picks
 * traditional glyph shapes); in zh and ja the text is in the page's own
 * script and inherits <html lang>.
 */
export function hanziLang(locale: SupportedLocale): string | undefined {
  return writesHanzi(locale) ? undefined : 'zh-Hant';
}

/**
 * A hanzi name to print beside localized copy, or null when that copy
 * already says it. A page header reads "擇日 · Zeri — choosing the day";
 * in Chinese the title is 择日 and in Japanese the lede opens with 択日, so
 * the name would print twice, once in another script.
 */
export function hanziUnlessShown(text: string, locale: SupportedLocale, shown: readonly string[]): string | null {
  const name = localizeHanzi(text, locale);
  return shown.some((s) => s.includes(name)) ? null : name;
}
