/**
 * The Human Design result in the reader's language: the 'humanDesign'
 * content overlay (src/i18n/locales/<lng>/content-humanDesign.json, read
 * through src/i18n/contentOverlay.ts).
 *
 * Two kinds of English feed the result, and both stay the source of truth
 * here in TypeScript:
 *
 *  - the client's own copy: the type texts (HD_TYPES), the strategy-in-
 *    practice cases (TYPE_CASES) and the decision scripts (AUTHORITY_SCRIPTS);
 *  - what the human-design-chart edge function returns in English. Its
 *    strategy, not-self theme and signature are fixed per Type, and its
 *    authority explanation per Authority: a closed vocabulary, mirrored in
 *    HD_CHART_TYPE_TEXT / HD_CHART_AUTHORITY_TEXT below and held to the
 *    function's source by humanDesignReading.test.ts. Those strings are
 *    translated by that identity (the type key, the authority id), never by
 *    matching the English; a Type or Authority outside the vocabulary, or a
 *    string the overlay lacks, shows what the function sent.
 *
 * Overlay shape (humanDesignCorpus() is the English of it):
 *   types.<type>.{percentOfPopulation, summary, strengths[], challenges[], affirmation, tarotPairing}
 *   cases.<type>.<i>.{scenario, wrongMove, alignedMove, signature}
 *   scripts.<authority>.{authorityName, decisionMakingScript[], commonMistake, realityCheck}
 *   chart.types.<type>.{strategy, notSelfTheme, signature}      the function's, per Type
 *   chart.authorities.<authority>.{name, explanation}           the function's, per Authority
 *   chart.bodies.{Earth, NorthNode, SouthNode}                  activation points that are not planets
 * The type names themselves are UI strings (humanDesign.types.<type>.name).
 */
import { ct, ctEntry, type ContentOverlay } from '../i18n/contentOverlay';
import { localizePlanetName } from '../i18n/localizeNames';
import { isPlanet } from '../lib/chart';
import { HD_TYPES, type HDType, type HumanDesignTypeInfo } from './humanDesign';
import {
  AUTHORITY_SCRIPTS,
  TYPE_CASES,
  type Authority,
  type AuthorityScript,
  type TypeStrategyCase,
} from './humanDesignCases';

/** The Type names the function returns, to the app's type keys. */
export const HD_TYPE_KEY: Readonly<Record<string, HDType>> = {
  Manifestor: 'manifestor',
  Generator: 'generator',
  'Manifesting Generator': 'manifesting-generator',
  Projector: 'projector',
  Reflector: 'reflector',
};

export type HdAuthorityId =
  | 'emotional' | 'sacral' | 'splenic' | 'ego-manifested'
  | 'ego-projected' | 'self-projected' | 'mental' | 'lunar';

/** The Authorities the function returns (AUTHORITY_SCRIPTS' keys), to the overlay's ids. */
export const HD_AUTHORITY_ID: Readonly<Record<Authority, HdAuthorityId>> = {
  Emotional: 'emotional',
  Sacral: 'sacral',
  Splenic: 'splenic',
  'Ego Manifested': 'ego-manifested',
  'Ego Projected': 'ego-projected',
  'Self-Projected': 'self-projected',
  Mental: 'mental',
  Lunar: 'lunar',
};

/** What the function says per Type (TYPE_INFO in supabase/functions/human-design-chart). */
export const HD_CHART_TYPE_TEXT: Readonly<Record<HDType, { strategy: string; notSelfTheme: string; signature: string }>> = {
  manifestor: { strategy: 'Inform before you act', notSelfTheme: 'Anger', signature: 'Peace' },
  generator: { strategy: 'Respond — wait for the gut yes', notSelfTheme: 'Frustration', signature: 'Satisfaction' },
  'manifesting-generator': { strategy: 'Respond, then inform', notSelfTheme: 'Frustration & Anger', signature: 'Satisfaction & Peace' },
  projector: { strategy: 'Wait for the invitation', notSelfTheme: 'Bitterness', signature: 'Success' },
  reflector: { strategy: 'Wait a lunar cycle before deciding', notSelfTheme: 'Disappointment', signature: 'Surprise' },
};

/** What the function says per Authority: the name it returns and its AUTHORITY_EXPLANATION. */
export const HD_CHART_AUTHORITY_TEXT: Readonly<Record<HdAuthorityId, { name: Authority; explanation: string }>> = {
  emotional: {
    name: 'Emotional',
    explanation: 'Wait through your emotional wave — clarity comes after the feeling has moved through you. Never decide in the spike.',
  },
  sacral: {
    name: 'Sacral',
    explanation: "Listen to the body's in-the-moment 'yes' (uh-huh) or 'no' (uh-uh). Your gut is the most reliable compass you have.",
  },
  splenic: {
    name: 'Splenic',
    explanation: "A quiet, soft, in-the-now intuition. It speaks once. If you miss it, it's gone — learn to trust the first whisper.",
  },
  'ego-manifested': {
    name: 'Ego Manifested',
    explanation: 'Decide from the heart — is your will genuinely behind this? If yes, speak and move.',
  },
  'ego-projected': {
    name: 'Ego Projected',
    explanation: 'Listen for what your voice says when you talk about the choice. Your own speech reveals the decision.',
  },
  'self-projected': {
    name: 'Self-Projected',
    explanation: "Talk it through with someone safe. What YOU say out loud reveals what's aligned with your identity.",
  },
  mental: {
    name: 'Mental',
    explanation: 'You have no inner authority — consult your trusted people. Decision comes from the mirror of conversation.',
  },
  lunar: {
    name: 'Lunar',
    explanation: 'Wait a full 28-day lunar cycle before any big decision. Let the decision move through every phase of you.',
  },
};

/** The activation points the function names that are not planets (planets use localizePlanetName). */
export const HD_POINT_NAMES = {
  Earth: 'Earth',
  NorthNode: 'North Node',
  SouthNode: 'South Node',
} as const;
type HdPoint = keyof typeof HD_POINT_NAMES;

/** The type copy the result shows, in the order it shows it. */
export const HD_TYPE_FIELDS = ['percentOfPopulation', 'summary', 'strengths', 'challenges', 'affirmation', 'tarotPairing'] as const;
export const HD_CASE_FIELDS = ['scenario', 'wrongMove', 'alignedMove', 'signature'] as const;
export const HD_SCRIPT_FIELDS = ['authorityName', 'decisionMakingScript', 'commonMistake', 'realityCheck'] as const;

type TypeCopy = Pick<HumanDesignTypeInfo, (typeof HD_TYPE_FIELDS)[number]>;

const pick = <T extends object, K extends keyof T>(o: T, keys: readonly K[]): Pick<T, K> =>
  Object.fromEntries(keys.map((k) => [k, Array.isArray(o[k]) ? [...(o[k] as unknown[])] : o[k]])) as Pick<T, K>;

/** The English the 'humanDesign' overlay translates, in exactly its shape. */
export function humanDesignCorpus() {
  const types = {} as Record<HDType, TypeCopy>;
  for (const k of Object.keys(HD_TYPES) as HDType[]) types[k] = pick(HD_TYPES[k], HD_TYPE_FIELDS);
  const cases = {} as Record<HDType, TypeStrategyCase[]>;
  for (const k of Object.keys(TYPE_CASES) as HDType[]) cases[k] = TYPE_CASES[k].map((c) => pick(c, HD_CASE_FIELDS));
  const scripts = {} as Record<HdAuthorityId, AuthorityScript>;
  for (const a of Object.keys(AUTHORITY_SCRIPTS) as Authority[]) scripts[HD_AUTHORITY_ID[a]] = pick(AUTHORITY_SCRIPTS[a], HD_SCRIPT_FIELDS);
  const chartTypes = {} as Record<HDType, { strategy: string; notSelfTheme: string; signature: string }>;
  for (const k of Object.keys(HD_CHART_TYPE_TEXT) as HDType[]) chartTypes[k] = { ...HD_CHART_TYPE_TEXT[k] };
  const authorities = {} as Record<HdAuthorityId, { name: string; explanation: string }>;
  for (const id of Object.keys(HD_CHART_AUTHORITY_TEXT) as HdAuthorityId[]) authorities[id] = { ...HD_CHART_AUTHORITY_TEXT[id] };
  return { types, cases, scripts, chart: { types: chartTypes, authorities, bodies: { ...HD_POINT_NAMES } } };
}

/** The strings of a chart the function returned, as it sent them. */
export interface HdChartStrings {
  type: string;
  strategy: string;
  notSelfTheme: string;
  signature: string;
  authority: string;
  authorityExplanation: string;
}

/** Everything the result reads out, in the reader's language. */
export interface HumanDesignText {
  /** The app's key for the Type, or null for one outside the function's vocabulary. */
  typeKey: HDType | null;
  strategy: string;
  notSelfTheme: string;
  signature: string;
  /** The Authority's name (the function sends 'Emotional', 'Ego Projected', …). */
  authority: string;
  authorityExplanation: string;
  /** The type's own copy; null for an unknown Type. */
  info: TypeCopy | null;
  cases: TypeStrategyCase[];
  script: AuthorityScript | null;
}

/** The function's Type string to the app's key, or null. */
export function hdTypeKey(type: string): HDType | null {
  return Object.prototype.hasOwnProperty.call(HD_TYPE_KEY, type) ? HD_TYPE_KEY[type] : null;
}

/** The function's Authority string to the overlay's id, or null. */
export function hdAuthorityId(authority: string): HdAuthorityId | null {
  return Object.prototype.hasOwnProperty.call(HD_AUTHORITY_ID, authority) ? HD_AUTHORITY_ID[authority as Authority] : null;
}

/**
 * The result's text in the overlay's language (English for a null overlay).
 * The function's strings are looked up by the chart's Type and Authority and
 * fall back to what the function sent.
 */
export function localizeHumanDesign(chart: HdChartStrings, overlay: ContentOverlay | null | undefined): HumanDesignText {
  const typeKey = hdTypeKey(chart.type);
  const authId = hdAuthorityId(chart.authority);
  const fromType = (field: 'strategy' | 'notSelfTheme' | 'signature') =>
    typeKey ? ct(overlay, `chart.types.${typeKey}.${field}`, chart[field]) : chart[field];
  const script = authId ? AUTHORITY_SCRIPTS[chart.authority as Authority] : undefined;
  return {
    typeKey,
    strategy: fromType('strategy'),
    notSelfTheme: fromType('notSelfTheme'),
    signature: fromType('signature'),
    authority: authId ? ct(overlay, `chart.authorities.${authId}.name`, chart.authority) : chart.authority,
    authorityExplanation: authId
      ? ct(overlay, `chart.authorities.${authId}.explanation`, chart.authorityExplanation)
      : chart.authorityExplanation,
    info: typeKey ? ctEntry(pick(HD_TYPES[typeKey], HD_TYPE_FIELDS), overlay, `types.${typeKey}`, HD_TYPE_FIELDS) : null,
    cases: typeKey
      ? (TYPE_CASES[typeKey] ?? []).map((c, i) => ctEntry(c, overlay, `cases.${typeKey}.${i}`, HD_CASE_FIELDS))
      : [],
    script: script && authId ? ctEntry(script, overlay, `scripts.${authId}`, HD_SCRIPT_FIELDS) : null,
  };
}

/** An activation's body (Sun, Earth, NorthNode, …) as the reader calls it. */
export function hdBodyName(body: string, overlay: ContentOverlay | null | undefined): string {
  if (Object.prototype.hasOwnProperty.call(HD_POINT_NAMES, body)) {
    return ct(overlay, `chart.bodies.${body}`, HD_POINT_NAMES[body as HdPoint]);
  }
  return isPlanet(body) ? localizePlanetName(body) : body;
}
