/**
 * The Partner compatibility result in the reader's language: the 'compat'
 * content overlay (src/i18n/locales/<lng>/content-compat.json, read through
 * src/i18n/contentOverlay.ts).
 *
 * The English stays the source of truth here in TypeScript:
 *
 *  - what partner-synastry-adhoc returns. Each cross-aspect's interpretation
 *    is either the function's text for that planet pair and aspect
 *    (ASPECT_INTERPRETATIONS there, mirrored in SYNASTRY_ASPECT_TEXT and
 *    held to the function's source by compatReading.test.ts) or, for a pair
 *    it has no text for, one of three templates chosen by the aspect's
 *    flavour. Both are translated by that identity (the function's own key,
 *    the flavour), never by matching the English; a string the overlay
 *    lacks shows what the function sent;
 *  - what this client writes: the composite-chart readings
 *    (COMPOSITE_PAIRING_READINGS) and the MBTI note.
 *
 * Overlay shape (compatCorpus() is the English of it):
 *   aspects.<Planet-Planet-type>     the function's interpretation for that key
 *   generic.<flavour>                its fallback templates, {{mine}} / {{theirs}} = planet names
 *   composite.<key>                  COMPOSITE_PAIRING_READINGS
 *   compositeTitles.<key>            the two observations that are not a planet pair
 *   mbti.<note>                      the MBTI note's sentences and the two perception words
 * Planet and aspect names come from src/i18n/localizeNames.ts.
 */
import { ct, type ContentOverlay } from '../i18n/contentOverlay';
import { localizePlanetName } from '../i18n/localizeNames';
import { isPlanet } from '../lib/chart';
import { COMPOSITE_PAIRING_READINGS } from './humanDesignCases';
import type { MbtiType } from './partnerCompat';

export type AspectFlavour = 'harmonious' | 'challenging' | 'intense';

/** The fields of a cross-aspect the function returned that the text depends on. */
export interface CrossAspectText {
  myPlanet: string;
  partnerPlanet: string;
  type: string;
  flavour: string;
  interpretation: string;
}

/** What the function says per planet pair and aspect (ASPECT_INTERPRETATIONS in partner-synastry-adhoc). */
export const SYNASTRY_ASPECT_TEXT: Readonly<Record<string, string>> = {
  "Sun-Sun-conjunction": "You share a core identity — same sun sign or close. Deep resonance; watch for ego collision since your selfhoods are shaped by the same light.",
  "Sun-Sun-trine": "Your identities rhyme easily. You recognise each other's direction without needing to explain it.",
  "Sun-Sun-square": "Your core selfhoods push against each other. This is the relationship that will ask you to grow into who you really are — if you both stay curious.",
  "Sun-Sun-opposition": "You embody opposing approaches to selfhood. Classic attract-each-other-then-drive-each-other-crazy pairing. The opposition is also the completion.",
  "Sun-Moon-conjunction": "One's identity nurtures the other's feelings directly. One of the most stable binding aspects — natural emotional rapport.",
  "Sun-Moon-trine": "A warm, intuitive flow — one feels held by the other's very presence without having to ask.",
  "Sun-Moon-square": "Your needs don't map onto your partner's identity easily. This asks for emotional translation work but has deep pay-off.",
  "Sun-Moon-opposition": "You meet each other across a polarity — one rational-directional, the other emotional-receptive. Can be deeply complementary or deeply wearing.",
  "Sun-Venus-conjunction": "Instant affection. Their sense of beauty/love aligns with your identity — you feel seen at first sight.",
  "Sun-Venus-trine": "Natural enjoyment of each other. Easy to be around.",
  "Sun-Venus-square": "Attraction + misalignment — you each value different things. Can create a love-hate pull.",
  "Sun-Mars-conjunction": "Direct energetic connection. Sparky, active, sometimes combative.",
  "Sun-Mars-trine": "Your drive ignites theirs. You get things done together.",
  "Sun-Mars-square": "Repeated small friction about pace, assertion, and who leads. Generative if you can name it.",
  "Sun-Saturn-conjunction": "Serious, commitment-oriented. One person is the grounding force for the other, which can feel stable or constraining.",
  "Sun-Saturn-square": "Duty, criticism, or authority-figure dynamics can surface. Real maturity required.",
  "Sun-Saturn-trine": "A steady, adult bond. Builds slowly, lasts.",
  "Moon-Moon-conjunction": "You feel at home with each other from the start. The emotional frequency matches.",
  "Moon-Moon-trine": "Emotional ease — you can be quiet together without distance.",
  "Moon-Moon-square": "Emotional needs differ in rhythm — one wants depth when the other wants space. Solvable with care.",
  "Moon-Moon-opposition": "Your emotional poles are opposite. Can complete each other or perpetually pass in the night.",
  "Moon-Venus-conjunction": "Tender, loving feeling. Soft aspect — very romantic.",
  "Moon-Venus-trine": "Easy affection. Natural tenderness between you.",
  "Moon-Mars-conjunction": "Passion but volatility. Emotion and drive tangle — powerful sexually, tricky in argument.",
  "Moon-Mars-square": "Emotional flare-ups. Anger and feeling get confused. Requires boundary work.",
  "Moon-Saturn-conjunction": "One person provides emotional structure, sometimes at the cost of warmth. Watch for parent-child dynamic.",
  "Moon-Saturn-square": "Feelings feel restricted. One partner is emotionally available; the other struggles to receive.",
  "Venus-Venus-conjunction": "Shared values around love, pleasure, beauty. Easy shared taste.",
  "Venus-Venus-trine": "You enjoy the same things. Dates come naturally.",
  "Venus-Venus-square": "Different love languages — you express affection in ways the other doesn't always receive.",
  "Venus-Mars-conjunction": "Classic chemistry aspect. Sexual attraction with real staying power when present.",
  "Venus-Mars-trine": "Easy flow of desire. Each ignites the other without friction.",
  "Venus-Mars-square": "Hot-and-cold. Pursuit and withdrawal dynamics.",
  "Venus-Saturn-conjunction": "Commitment-ready love. Slow to warm but stays.",
  "Venus-Saturn-square": "Love feels effortful. One partner's caution dampens the other's warmth.",
  "Mars-Mars-conjunction": "Shared drive — can be a power couple or a power struggle depending on whether the goals are aligned.",
  "Mars-Mars-square": "Competing energy. Watch for repeated arguments about who goes first.",
  "Mars-Saturn-square": "Drive meets delay. One pushes, the other brakes — can create chronic frustration.",
  "Saturn-Saturn-conjunction": "You share the same life-lesson teacher. Parallel development.",
  "Saturn-Saturn-square": "Your life-structures pressure each other. Good work possible if both commit to maturing.",
  "Pluto-Sun-conjunction": "Transformation through the relationship. One person will change profoundly here.",
  "Pluto-Moon-conjunction": "Emotional depth bordering on obsession. Healing or consuming depending on self-awareness.",
  "Pluto-Venus-conjunction": "Intense love — fated-feeling, all-consuming, potentially controlling. Handle with care.",
};

/** The function's text for a pair it has none for, by flavour: {{mine}} / {{theirs}} are the two planets. */
export const SYNASTRY_GENERIC_TEXT: Readonly<Record<AspectFlavour, string>> = {
  harmonious: 'Your {{mine}} and their {{theirs}} flow together — this aspect supports easy cooperation in the life-area they each rule.',
  challenging: 'Your {{mine}} and their {{theirs}} pull against each other. Growth edge, not deal-breaker.',
  intense: 'Your {{mine}} and their {{theirs}} press on each other directly. Amplifies whatever energy is alive between you.',
};

/** The composite observations that are not a planet pair, by COMPOSITE_PAIRING_READINGS key. */
export const COMPOSITE_TITLES = {
  'Saturn-conjunct': 'Saturn binding',
  'Pluto-strong': 'Pluto contact',
} as const;
type CompositeTitleKey = keyof typeof COMPOSITE_TITLES;

/** The MBTI note: one sentence per relation of the two types, and the two words for perception. */
export const MBTI_NOTE_TEXT = {
  same: 'You share the same type ({{type}}). Deep understanding, natural resonance — watch for a shared blind spot neither of you catches.',
  samePerception: 'You perceive the world similarly (both {{perception}}) but decide differently ({{mine}} vs {{theirs}}). One of the classic strong-pairing patterns.',
  differentPerception: 'You perceive very differently — one concrete (S), one abstract (N). High-potential pairing if you both stay curious about how the other sees the world.',
  sameFunctions: 'You share both perception and judgment functions. Similar worldview — also similar blind spots.',
  intuitive: 'intuitive',
  sensing: 'sensing',
} as const;
type MbtiNoteKey = keyof typeof MBTI_NOTE_TEXT;

/** The English the 'compat' overlay translates, in exactly its shape. */
export function compatCorpus() {
  return {
    aspects: { ...SYNASTRY_ASPECT_TEXT },
    generic: { ...SYNASTRY_GENERIC_TEXT },
    composite: { ...COMPOSITE_PAIRING_READINGS },
    compositeTitles: { ...COMPOSITE_TITLES },
    mbti: { ...MBTI_NOTE_TEXT },
  };
}

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** `{{name}}` → vars[name]; an unknown name is left as it is. */
export function fillTemplate(text: string, vars: Readonly<Record<string, string>>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (own(vars, k) ? vars[k] : m));
}

/** A planet as the reader calls it; a name outside the ten is shown as sent. */
export function compatPlanetName(planet: string): string {
  return isPlanet(planet) ? localizePlanetName(planet) : planet;
}

/**
 * The function's key holding a text for this pair and aspect, or null when
 * it answered with a generic template: the same lookup as its
 * interpretationFor (the pair sorted, then reversed).
 */
export function synastryTextKey(myPlanet: string, partnerPlanet: string, type: string): string | null {
  const [a, b] = [myPlanet, partnerPlanet].sort();
  for (const key of [`${a}-${b}-${type}`, `${b}-${a}-${type}`]) if (own(SYNASTRY_ASPECT_TEXT, key)) return key;
  return null;
}

/** A cross-aspect's interpretation in the overlay's language (what the function sent, without one). */
export function localizeInterpretation(aspect: CrossAspectText, overlay: ContentOverlay | null | undefined): string {
  const key = synastryTextKey(aspect.myPlanet, aspect.partnerPlanet, aspect.type);
  if (key) return ct(overlay, `aspects.${key}`, aspect.interpretation);
  if (!own(SYNASTRY_GENERIC_TEXT, aspect.flavour)) return aspect.interpretation;
  const template = ct(overlay, `generic.${aspect.flavour}`, '');
  return template
    ? fillTemplate(template, { mine: compatPlanetName(aspect.myPlanet), theirs: compatPlanetName(aspect.partnerPlanet) })
    : aspect.interpretation;
}

/** One composite observation: its COMPOSITE_PAIRING_READINGS key, and the planet pair it names (if it is one). */
export interface CompositeInsight {
  key: string;
  planets: [string, string] | null;
}

/**
 * Composite-chart-style observations derived from the cross-aspects: the
 * named planet pairings in COMPOSITE_PAIRING_READINGS, a Saturn conjunction,
 * a Pluto conjunction to the Sun, Moon or Venus. Up to five.
 */
export function compositeInsights(crossAspects: readonly CrossAspectText[]): CompositeInsight[] {
  const insights: CompositeInsight[] = [];
  const seen = new Set<string>();
  for (const a of crossAspects) {
    const pair = [a.myPlanet, a.partnerPlanet].sort().join('-');
    if (seen.has(pair)) continue;

    // Direct pairings. The readings are keyed in their own order ('Sun-Moon',
    // 'Venus-Mars'), not alphabetically, so look the pair up both ways: the
    // sorted lookup alone never found those two.
    const forward = `${a.myPlanet}-${a.partnerPlanet}`;
    const backward = `${a.partnerPlanet}-${a.myPlanet}`;
    const key = own(COMPOSITE_PAIRING_READINGS, forward) ? forward : own(COMPOSITE_PAIRING_READINGS, backward) ? backward : null;
    if (key) {
      insights.push({ key, planets: key.split('-') as [string, string] });
      seen.add(pair);
      continue;
    }

    // Saturn aspects (any conjunction with Saturn): heavy commitment energy.
    if ((a.myPlanet === 'Saturn' || a.partnerPlanet === 'Saturn') && a.type === 'conjunction') {
      if (!seen.has('Saturn-strong')) {
        insights.push({ key: 'Saturn-conjunct', planets: null });
        seen.add('Saturn-strong');
      }
    }

    // Pluto contacts to personal planets: transformational.
    if ((a.myPlanet === 'Pluto' || a.partnerPlanet === 'Pluto') &&
        ['Sun', 'Moon', 'Venus'].includes(a.myPlanet === 'Pluto' ? a.partnerPlanet : a.myPlanet) &&
        a.type === 'conjunction') {
      if (!seen.has('Pluto-strong')) {
        insights.push({ key: 'Pluto-strong', planets: null });
        seen.add('Pluto-strong');
      }
    }

    if (insights.length >= 5) break;
  }
  return insights;
}

/** A composite observation's title (for one that is not a planet pair) in the overlay's language. */
export function compositeTitle(key: string, overlay: ContentOverlay | null | undefined): string {
  return own(COMPOSITE_TITLES, key) ? ct(overlay, `compositeTitles.${key}`, COMPOSITE_TITLES[key as CompositeTitleKey]) : key;
}

/** A composite observation's reading in the overlay's language. */
export function compositeReading(key: string, overlay: ContentOverlay | null | undefined): string {
  return own(COMPOSITE_PAIRING_READINGS, key) ? ct(overlay, `composite.${key}`, COMPOSITE_PAIRING_READINGS[key]) : '';
}

/** The MBTI layer's note for two types, in the overlay's language. */
export function mbtiNote(me: MbtiType, partner: MbtiType, overlay: ContentOverlay | null | undefined): string {
  const tr = (k: MbtiNoteKey) => ct(overlay, `mbti.${k}`, MBTI_NOTE_TEXT[k]);
  if (me === partner) return fillTemplate(tr('same'), { type: me });
  const sameN = me[1] === partner[1];
  const sameTF = me[2] === partner[2];
  if (sameN && !sameTF) {
    return fillTemplate(tr('samePerception'), {
      perception: tr(me[1] === 'N' ? 'intuitive' : 'sensing'),
      mine: me[2],
      theirs: partner[2],
    });
  }
  if (!sameN) return tr('differentPerception');
  return tr('sameFunctions');
}
