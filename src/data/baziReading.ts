/**
 * The Bazi result in the reader's language: the 'bazi' content overlay
 * (src/i18n/locales/<lng>/content-bazi.json, read through
 * src/i18n/contentOverlay.ts).
 *
 * English stays the source of truth in TypeScript (bazi.ts, baziDeep.ts,
 * baziStructure.ts). Every text the result prints is reached by a stable key
 * the chart already carries — a stem, a Ten God, a 納音 pair, an element, a
 * direction, an alignment, a luck relation, a star id, a relation type, a
 * climate, a level, a pillar, a structure — never by matching the English.
 * A string the overlay lacks falls back to the English one.
 *
 * Overlay shape (baziCorpus() is the English of it):
 *   dayMasters.<stem>.{name, archetype, summary, strengths[], challenges[], thriving, struggling, affirmation}
 *   tenGods.<god>.{name, classical, headline}          classical: the term in the reader's script
 *   nayin.<JiaZi…>.{name, classical}                   keyed by the first pillar of the pair
 *   colors.<element> · directions.<direction> · careerHints.<element>
 *   luckyColor.<alignment>                             {{color}}
 *   luckThemes.<relation> · annual.<god>
 *   stars.<id>.{name, meaning}                         the classical name is a glyph (localizeHanzi)
 *   relations.<clash|combine|triple-harmony>           {{a}} {{b}} / {{branches}} {{element}}
 *   climate.<dominant> · careers.<stem>[] · wealth.<level> ({{element}}) · spouse.<level>
 *   health.<element> · pillars.<pillar> · structureIntro · structures.<key>.{title, text, strengthNote}
 * The stems, branches, the structure names (正官格…) and the star names
 * (天乙貴人…) are glyphs: printed through localizeHanzi in zh and ja, as the
 * traditional forms in ko, and romanized (stems, branches) in English.
 */
import { ct, ctEntry, ctList, type ContentOverlay } from '../i18n/contentOverlay';
import type { SupportedLocale } from '../i18n/config';
import { localizeHanzi } from '../i18n/localizeHanzi';
import {
  BRANCH_CN,
  DAY_MASTER_INFO,
  ELEMENT_CAREER_HINT,
  ELEMENT_COLOR_NAME,
  LUCKY_COLOR_LINES,
  NAYIN_LIST,
  STEM_CN,
  TEN_GOD_INFO,
  fillTemplate,
  type DayMasterInfo,
  type EarthlyBranch,
  type FavorableElementGuidance,
  type FiveElement,
  type HeavenlyStem,
  type LuckyColorToday,
  type NayinInfo,
  type TenGod,
  type TenGodInfo,
} from './bazi';
import {
  ANNUAL_TEN_GOD_READING,
  BRANCH_RELATION_TEXT,
  CAREER_BY_DAY_MASTER,
  CLIMATE_REMEDIES,
  HEALTH_BY_ELEMENT,
  LUCK_THEMES,
  PILLAR_NARRATIVES,
  SPIRIT_STARS,
  SPOUSE_TEXT,
  WEALTH_TEXT,
  type BranchRelation,
  type ClimateBalance,
  type LifeAreas,
  type LuckRelation,
  type SpiritStar,
  type SpiritStarId,
} from './baziDeep';
import { STRUCTURE_INTRO, STRUCTURE_MEANINGS, type StructureKey } from './baziStructure';

export const DAY_MASTER_FIELDS = ['name', 'archetype', 'summary', 'strengths', 'challenges', 'thriving', 'struggling', 'affirmation'] as const;
export const TEN_GOD_FIELDS = ['name', 'classical', 'headline'] as const;
export const STRUCTURE_FIELDS = ['title', 'text', 'strengthNote'] as const;
export const DIRECTIONS: readonly FavorableElementGuidance['direction'][] = ['east', 'south', 'center', 'west', 'north'];
export const PILLARS = ['year', 'month', 'day', 'hour'] as const;
const ELEMENTS: readonly FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];

type DayMasterText = Pick<DayMasterInfo, (typeof DAY_MASTER_FIELDS)[number]>;
type StructureText = { title: string; text: string; strengthNote: string };

const pick = <T extends object, K extends keyof T>(o: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, Array.isArray(o[k]) ? [...(o[k] as unknown[])] : o[k]])) as Pick<T, K>;

const byKey = <K extends string, V>(keys: readonly K[], f: (k: K) => V): Record<K, V> =>
  Object.fromEntries(keys.map((k) => [k, f(k)])) as Record<K, V>;

/** The English the 'bazi' overlay translates, in exactly its shape. */
export function baziCorpus() {
  const stems = Object.keys(DAY_MASTER_INFO) as HeavenlyStem[];
  const gods = Object.keys(TEN_GOD_INFO) as TenGod[];
  return {
    dayMasters: byKey(stems, (s) => pick(DAY_MASTER_INFO[s], DAY_MASTER_FIELDS)),
    tenGods: byKey(gods, (g) => pick(TEN_GOD_INFO[g], TEN_GOD_FIELDS)),
    nayin: Object.fromEntries(NAYIN_LIST.map((n) => [n.id, { name: n.western, classical: n.classical }])) as Record<string, { name: string; classical: string }>,
    colors: { ...ELEMENT_COLOR_NAME },
    directions: byKey(DIRECTIONS, (d) => d as string),
    careerHints: { ...ELEMENT_CAREER_HINT },
    luckyColor: { ...LUCKY_COLOR_LINES },
    luckThemes: { ...LUCK_THEMES },
    annual: { ...ANNUAL_TEN_GOD_READING },
    stars: byKey(Object.keys(SPIRIT_STARS) as SpiritStarId[], (id) => ({ name: SPIRIT_STARS[id].name, meaning: SPIRIT_STARS[id].meaning })),
    relations: { ...BRANCH_RELATION_TEXT },
    climate: { ...CLIMATE_REMEDIES },
    careers: byKey(stems, (s) => [...CAREER_BY_DAY_MASTER[s]]),
    wealth: { ...WEALTH_TEXT },
    spouse: { ...SPOUSE_TEXT },
    health: { ...HEALTH_BY_ELEMENT },
    pillars: { ...PILLAR_NARRATIVES },
    structureIntro: STRUCTURE_INTRO,
    structures: byKey(Object.keys(STRUCTURE_MEANINGS) as StructureKey[], (k) => pick(STRUCTURE_MEANINGS[k], STRUCTURE_FIELDS)),
  };
}

/** A heavenly stem as the reader writes it: the character in zh/ja/ko, the romanized key in English. */
export function stemLabel(stem: HeavenlyStem, locale: SupportedLocale): string {
  return locale === 'en' ? stem : localizeHanzi(STEM_CN[stem], locale);
}

/** An earthly branch as the reader writes it. */
export function branchLabel(branch: EarthlyBranch, locale: SupportedLocale): string {
  return locale === 'en' ? branch : localizeHanzi(BRANCH_CN[branch], locale);
}

/** A stem-branch pillar: "Xin Wei" in English, 辛未 in zh/ja/ko. */
export function pillarLabel(stem: HeavenlyStem, branch: EarthlyBranch, locale: SupportedLocale): string {
  return locale === 'en' ? `${stem} ${branch}` : `${stemLabel(stem, locale)}${branchLabel(branch, locale)}`;
}

/** Everything the result reads out, in the overlay's language (English for a null overlay). */
export interface BaziText {
  dayMaster(stem: HeavenlyStem): DayMasterText;
  tenGod(god: TenGod): TenGodInfo;
  nayin(n: NayinInfo): { name: string; classical: string };
  colorName(el: FiveElement): string;
  direction(d: FavorableElementGuidance['direction']): string;
  careerHint(el: FiveElement): string;
  luckyColorLine(today: Pick<LuckyColorToday, 'alignment' | 'element'>): string;
  luckTheme(relation: LuckRelation): string;
  annualReading(god: TenGod): string;
  star(star: Pick<SpiritStar, 'id'>): { name: string; meaning: string; classical: string };
  relation(r: BranchRelation, elementName: (el: FiveElement) => string): string;
  climate(dominant: ClimateBalance['dominant']): string;
  careers(stem: HeavenlyStem): string[];
  wealth(keys: LifeAreas['keys'], elementName: (el: FiveElement) => string): string;
  spouse(keys: LifeAreas['keys']): string;
  health(keys: LifeAreas['keys']): string;
  pillarNarrative(p: (typeof PILLARS)[number]): string;
  structureIntro(): string;
  structure(key: StructureKey): StructureText & { cn: string };
}

export function baziText(overlay: ContentOverlay | null | undefined, locale: SupportedLocale): BaziText {
  return {
    dayMaster: (stem) => ctEntry(pick(DAY_MASTER_INFO[stem], DAY_MASTER_FIELDS), overlay, `dayMasters.${stem}`, DAY_MASTER_FIELDS),
    tenGod: (god) => ctEntry({ ...TEN_GOD_INFO[god] }, overlay, `tenGods.${god}`, TEN_GOD_FIELDS),
    nayin: (n) => ({ name: ct(overlay, `nayin.${n.id}.name`, n.western), classical: ct(overlay, `nayin.${n.id}.classical`, n.classical) }),
    colorName: (el) => ct(overlay, `colors.${el}`, ELEMENT_COLOR_NAME[el]),
    direction: (d) => ct(overlay, `directions.${d}`, d),
    careerHint: (el) => ct(overlay, `careerHints.${el}`, ELEMENT_CAREER_HINT[el]),
    luckyColorLine: ({ alignment, element }) =>
      fillTemplate(ct(overlay, `luckyColor.${alignment}`, LUCKY_COLOR_LINES[alignment]), {
        color: ct(overlay, `colors.${element}`, ELEMENT_COLOR_NAME[element]),
      }),
    luckTheme: (relation) => ct(overlay, `luckThemes.${relation}`, LUCK_THEMES[relation]),
    annualReading: (god) => ct(overlay, `annual.${god}`, ANNUAL_TEN_GOD_READING[god]),
    star: ({ id }) => ({
      name: ct(overlay, `stars.${id}.name`, SPIRIT_STARS[id].name),
      meaning: ct(overlay, `stars.${id}.meaning`, SPIRIT_STARS[id].meaning),
      classical: localizeHanzi(SPIRIT_STARS[id].classical, locale),
    }),
    relation: (r, elementName) => {
      const names = r.branches.map((b) => branchLabel(b, locale));
      return fillTemplate(ct(overlay, `relations.${r.type}`, BRANCH_RELATION_TEXT[r.type]), {
        a: names[0] ?? '',
        b: names[1] ?? '',
        branches: names.join(locale === 'en' ? ' + ' : ''),
        element: r.element ? elementName(r.element) : '',
      });
    },
    climate: (dominant) => ct(overlay, `climate.${dominant}`, CLIMATE_REMEDIES[dominant]),
    careers: (stem) => ctList(overlay, `careers.${stem}`, [...CAREER_BY_DAY_MASTER[stem]]),
    wealth: (keys, elementName) =>
      fillTemplate(ct(overlay, `wealth.${keys.wealthLevel}`, WEALTH_TEXT[keys.wealthLevel]), { element: elementName(keys.wealthElement) }),
    spouse: (keys) => ct(overlay, `spouse.${keys.spouseLevel}`, SPOUSE_TEXT[keys.spouseLevel]),
    health: (keys) => ct(overlay, `health.${keys.healthElement}`, HEALTH_BY_ELEMENT[keys.healthElement]),
    pillarNarrative: (p) => ct(overlay, `pillars.${p}`, PILLAR_NARRATIVES[p]),
    structureIntro: () => ct(overlay, 'structureIntro', STRUCTURE_INTRO),
    structure: (key) => ({
      ...ctEntry(pick(STRUCTURE_MEANINGS[key], STRUCTURE_FIELDS), overlay, `structures.${key}`, STRUCTURE_FIELDS),
      cn: localizeHanzi(STRUCTURE_MEANINGS[key].cn, locale),
    }),
  };
}

/** Every element, for callers that list them (the corpus test, the legend). */
export const BAZI_ELEMENTS = ELEMENTS;
