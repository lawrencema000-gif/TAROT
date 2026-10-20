/**
 * A card's Yes / No answer, as the card meaning page gives it.
 *
 * The verdict is read from the ENGLISH card: a fixed set of Majors by id,
 * else the English keywords against two English lists. The explanation then
 * names the keywords that decided it — by index, in the reader's language:
 * the ja, ko and zh keyword lists run in the English order (78 of 78 in
 * each). It used to put the English words inside a Japanese, Korean or
 * Chinese sentence ("このカードが持つEndingsとBetrayalのエネルギー…",
 * "Endings와/과 Betrayal", p8 F15).
 */
import type { TarotCard } from '../../../types';

export type YesNoVerdict = 'yes' | 'no' | 'maybe';

// By id. The set used to name "Wheel of Fortune", which is not the deck's
// spelling ("The Wheel of Fortune"), so that card was read as a Maybe.
const YES_CARDS = new Set([
  0, // The Fool
  1, // The Magician
  3, // The Empress
  4, // The Emperor
  6, // The Lovers
  7, // The Chariot
  8, // Strength
  10, // The Wheel of Fortune
  14, // Temperance
  17, // The Star
  19, // The Sun
  20, // Judgement
  21, // The World
]);
const NO_CARDS = new Set([
  12, // The Hanged Man
  13, // Death
  15, // The Devil
  16, // The Tower
]);
// Everything else is "Maybe" — depends on context.

const POSITIVE = ['success', 'joy', 'abundance', 'victory', 'celebration', 'love', 'harmony', 'fulfillment', 'completion'];
const NEGATIVE = ['loss', 'defeat', 'betrayal', 'grief', 'conflict', 'anxiety', 'burden', 'deception', 'stagnation'];

/** The verdict for the English card, and the indexes of the keywords that decided it. */
export function yesNoVerdict(enCard: Pick<TarotCard, 'id' | 'keywords'>): { verdict: YesNoVerdict; keywordIndexes: number[] } {
  if (YES_CARDS.has(enCard.id)) return { verdict: 'yes', keywordIndexes: [] };
  if (NO_CARDS.has(enCard.id)) return { verdict: 'no', keywordIndexes: [] };
  const kw = enCard.keywords.map((k) => k.toLowerCase());
  const posMatch = kw.some((k) => POSITIVE.some((p) => k.includes(p)));
  const negMatch = kw.some((k) => NEGATIVE.some((n) => k.includes(n)));
  const first2 = [0, 1].filter((i) => i < enCard.keywords.length);
  if (posMatch && !negMatch) return { verdict: 'yes', keywordIndexes: first2 };
  if (negMatch && !posMatch) return { verdict: 'no', keywordIndexes: first2 };
  return { verdict: 'maybe', keywordIndexes: [] };
}

/**
 * The localized answer and explanation. `card` is the localized card; its
 * keywords at the deciding indexes are named. When it lacks one of them,
 * the explanation without keywords is used rather than a half-English one.
 */
export function cardYesNo(
  enCard: Pick<TarotCard, 'id' | 'keywords'>,
  card: Pick<TarotCard, 'name' | 'keywords'>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): { verdict: YesNoVerdict; answer: string; explanation: string } {
  const { verdict, keywordIndexes } = yesNoVerdict(enCard);
  const answer = t(`cardMeaning.yesNo.answer.${verdict}`);
  const keywords = keywordIndexes.map((i) => card.keywords?.[i]?.trim()).filter((k): k is string => !!k);
  const named = keywords.length > 0 && keywords.length === keywordIndexes.length;
  const explanation = named
    ? t(`cardMeaning.yesNo.explanationKeywords.${verdict}`, {
        name: card.name,
        keywords: keywords.join(t('cardMeaning.yesNo.keywordSeparator', { defaultValue: ' and ' })),
      })
    : t(`cardMeaning.yesNo.explanation.${verdict}`, { name: card.name });
  return { verdict, answer, explanation };
}
