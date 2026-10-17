import type { ReactNode } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { Disclosure, EyebrowLabel, KeywordRow, ReadingProse } from '../ui';
import { useT } from '../../i18n/useT';
import { getLocale, type SupportedLocale } from '../../i18n/config';
import type { CartoSpread, PlayingCard } from '../../types/cartomancy';
import { getCartoSpread, getPlayingCard, isWishVerdict, type CombinationHit } from '../../data/cartomancy';
import { localizeCombinationHit, localizedYesNoLabel } from '../../i18n/localizePlayingCard';
import { PlayingCardFace } from './PlayingCardFace';
import { cartoMainMeaning, cartoSectionText, combinationLines, splitAiReading, verdictTone, type CartoFocus, type CartoVerdict } from './cartoFlow';

/**
 * The pieces of a playing-card result that the live reveal
 * (CartomancyRevealView) and a saved reading reopened from the Library
 * (SavedReadingSheet) both print: the verdict, one section per card, and
 * the combinations. The Library's sheet used to be a second copy of the
 * reveal, and the copies drifted — it printed the summary's sentences again
 * under every card (p8 F17), its Wish verdict in English (F12) — so both now
 * render these.
 */

export type TFn = (key: string, opts?: Record<string, unknown>) => string;

/** A 44 px round icon control on the canvas (the reveal's chrome). */
export const ICON_BUTTON =
  'w-11 h-11 inline-flex items-center justify-center rounded-full transition-[background-color,transform] duration-fast ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-800 motion-safe:active:scale-90 disabled:opacity-40 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50';

/**
 * Share, with the reveal's busy state: while the share image renders the
 * control is disabled, announced busy and spinning, so one tap shares once.
 */
export function ShareIconButton({ onShare, sharing, disabled = false }: { onShare: () => void; sharing: boolean; disabled?: boolean }) {
  const { t } = useT('app');
  return (
    <button
      type="button"
      onClick={onShare}
      disabled={disabled || sharing}
      aria-busy={sharing || undefined}
      aria-label={
        sharing
          ? t('readings.revealView.sharing', { defaultValue: 'Preparing the share image' })
          : t('readings.revealView.share', { defaultValue: 'Share this reading' })
      }
      className={`${ICON_BUTTON} text-mystic-300 ${sharing ? 'disabled:opacity-100' : ''}`}
    >
      {sharing ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden /> : <Share2 className="w-5 h-5" aria-hidden />}
    </button>
  );
}

const HEAD = '\u0001';
const BODY = '\u0002';

/**
 * A run-in head and its text, punctuated as the locale sets it: "Advice.
 * Speak first." in English, 「アドバイス：先に話す。」 in Japanese. The
 * separator was a hard-coded Latin ". ", which read "ハートのクイーン. 愛し方の…"
 * in every Japanese card page (p8 F86). The template is
 * cartomancy.card.runIn ("{{head}}. {{body}}"); the head stays a node (a
 * <strong>, a <Link>) and the body plain text, never parsed as markup.
 */
export function runInParts(t: TFn): { before: string; between: string; after: string } {
  const filled = t('cartomancy.card.runIn', { head: HEAD, body: BODY, defaultValue: '{{head}}. {{body}}' });
  const h = filled.indexOf(HEAD);
  const b = filled.indexOf(BODY);
  if (h < 0 || b < h) return { before: '', between: '. ', after: '' };
  return { before: filled.slice(0, h), between: filled.slice(h + 1, b), after: filled.slice(b + 1) };
}

export function RunIn({ head, children }: { head: ReactNode; children: ReactNode }) {
  const { t } = useT('app');
  const { before, between, after } = runInParts(t);
  return (
    <>
      {before}
      {head}
      {between}
      {children}
      {after}
    </>
  );
}

const VERDICT_FILL = {
  yes: 'bg-ink-teal text-paper',
  no: 'bg-ink-coral text-paper',
  between: 'bg-ink-gold text-paper',
} as const;

/**
 * The verdict's words in the reader's language, by its result: the Yes or No
 * and the Wish labels both come from the corpus's verdictLabels, whichever
 * spread the verdict was computed from (the Library computed a saved Wish
 * from the English spread and printed "Favored" in ja, ko and zh, p8 F12).
 * English reads the spread data's own label for the result.
 */
export function verdictLabel(spread: CartoSpread, verdict: CartoVerdict, locale: SupportedLocale = getLocale()): string {
  const rules = getCartoSpread(spread.slug)?.verdict;
  const english =
    verdict.kind === 'wish' && rules && isWishVerdict(rules)
      ? rules.rules.find((r) => r.result === verdict.outcome.result)?.label ?? verdict.outcome.label
      : verdict.outcome.label;
  return localizedYesNoLabel(spread.slug, verdict.outcome.result, english, locale);
}

/** The verdict pill and its one-line why, on paper. */
export function CartoVerdictBlock({ spread, verdict }: { spread: CartoSpread; verdict: CartoVerdict }) {
  const { t } = useT('app');
  return (
    <div className="text-center">
      <span className={`inline-flex items-center rounded-full px-5 py-2 text-ui font-semibold ${VERDICT_FILL[verdictTone(verdict)]}`}>
        {verdictLabel(spread, verdict)}
      </span>
      <p className="mt-2 text-meta text-ink-muted">
        {verdict.kind === 'yes-no'
          ? [
              t('cartomancy.verdict.redCount', {
                defaultValue: '{{reds}} of {{total}} cards red',
                reds: verdict.outcome.reds,
                total: verdict.outcome.total,
              }),
              verdict.outcome.qualifier ? t('cartomancy.verdict.dependsOnPerson', { defaultValue: 'depends on a person or on time' }) : null,
            ]
              .filter(Boolean)
              .join(' · ')
          : verdict.outcome.wishIndex !== null
            ? t('cartomancy.verdict.wishOnTable', { defaultValue: 'The Nine of Hearts is on the table' })
            : t('cartomancy.verdict.heartsSpades', {
                defaultValue: '{{hearts}} Hearts, {{spades}} Spades',
                hearts: verdict.outcome.hearts,
                spades: verdict.outcome.spades,
              })}
      </p>
    </div>
  );
}

/**
 * A Wish or Yes or No table's head on paper: the verdict, then the reading
 * summary under its own heading (the ResultSheet's summary slot stays empty
 * so the verdict leads).
 */
export function CartoVerdictSummary({ spread, verdict, summary, heading }: { spread: CartoSpread; verdict: CartoVerdict; summary: string; heading: string }) {
  return (
    <section className="space-y-5 text-center">
      <CartoVerdictBlock spread={spread} verdict={verdict} />
      {summary && (
        <div>
          <h3 className="heading-display-md heading-strong text-ink text-center">{heading}</h3>
          <p className="reading-lede mx-auto mt-3">{summary}</p>
        </div>
      )}
    </section>
  );
}

export interface CartoSectionCard {
  /** The card as dealt (its face is drawn from this). */
  source: PlayingCard;
  /** The same card with the reader's language's prose. */
  card: PlayingCard;
  reversed: boolean;
}

/**
 * One section per card under the summary: the face, the position, the name,
 * the keywords, the next two sentences after the ones the summary quoted
 * (cartoSectionText), and "Read the full meaning" with the whole meaning
 * and the card's advice, timing and reversed meaning.
 */
export function CartoCardSections({
  cards,
  focus,
  positionLabel,
  onCardClick,
}: {
  cards: CartoSectionCard[];
  focus: CartoFocus;
  positionLabel: (index: number) => string;
  /** Open card `index` (the live reveal's detail sheet); omit for a face that is not a control. */
  onCardClick?: (index: number) => void;
}) {
  const { t } = useT('app');
  const reversedLabel = t('readings.revealView.reversed');
  const faceClass = 'w-12 shrink-0 rounded-inset overflow-hidden [&>svg]:w-full [&>svg]:h-auto [&>svg]:block';

  return (
    <div className="divide-y divide-paper-hairline">
      {cards.map(({ source, card, reversed }, i) => {
        const { text: main, focused } = cartoMainMeaning(card, reversed, focus);
        const { short, more } = cartoSectionText(main, i, cards.length);
        const extra: ReactNode[] = [];
        if (focused && reversed && card.meaningReversed) {
          extra.push(
            <p key="rev" className="reading-copy">
              <RunIn head={<strong>{reversedLabel}</strong>}>{card.meaningReversed}</RunIn>
            </p>,
          );
        }
        if (!focused && card.adviceMeaning) {
          extra.push(
            <p key="advice" className="reading-copy">
              <RunIn head={<strong>{t('cartomancy.card.advice', { defaultValue: 'Advice' })}</strong>}>{card.adviceMeaning}</RunIn>
            </p>,
          );
        }
        if (card.timing) {
          extra.push(
            <p key="timing" className="reading-copy">
              <RunIn head={<strong>{t('cartomancy.card.timing', { defaultValue: 'Timing' })}</strong>}>{card.timing}</RunIn>
            </p>,
          );
        }
        const face = <PlayingCardFace card={source} detail="quiet" surface="paper" reversed={reversed} />;
        return (
          <section key={i} className="py-5 first:pt-0 space-y-3">
            <div className="flex items-start gap-4">
              {onCardClick ? (
                <button
                  type="button"
                  onClick={() => onCardClick(i)}
                  aria-label={t('readings.revealView.openCard', { name: card.name, defaultValue: 'Open {{name}}' })}
                  className={`${faceClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-gold/50`}
                >
                  {face}
                </button>
              ) : (
                <div className={faceClass} aria-hidden>
                  {face}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <EyebrowLabel tone="ink" align="left" className="block">
                  {positionLabel(i)}
                </EyebrowLabel>
                <h3 className="heading-display-md heading-strong text-ink mt-1 text-balance lining-nums">
                  {card.name}
                  {reversed && <span className="ml-2 text-meta font-sans font-medium tracking-normal text-ink-coral">{reversedLabel}</span>}
                </h3>
              </div>
            </div>
            <KeywordRow keywords={card.keywords} align="start" />
            {short && <p className="reading-copy">{short}</p>}
            {(more || extra.length > 0) && (
              <Disclosure surface="paper" variant="row" lazy label={t('cartomancy.result.readFull', { defaultValue: 'Read the full meaning' })}>
                <div className="space-y-3">
                  {more && <p className="reading-copy">{main}</p>}
                  {extra}
                </div>
              </Disclosure>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * An AI reading's body under its summary: each block the model headed
 * ("The situation — Seven of Clubs") under its heading, the rest as prose.
 * The summary above is the opening paragraph (cartoSummary), so it is not
 * repeated here.
 */
export function CartoAiSections({ text }: { text: string }) {
  const { sections } = splitAiReading(text);
  if (sections.length === 0) return null;
  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div key={i}>
          {section.heading && <h3 className="text-ui font-semibold text-ink">{section.heading}</h3>}
          {section.body && <ReadingProse text={section.body} lede={false} className={section.heading ? 'mt-1' : ''} />}
        </div>
      ))}
    </div>
  );
}

/** "Combinations": what the tables found, folded one line per rule (cartoFlow.combinationLines). */
export function CartoCombinationList({ hits, localize }: { hits: CombinationHit[]; localize: (card: PlayingCard) => PlayingCard }) {
  const { t } = useT('app');
  if (hits.length === 0) return null;
  return (
    <section className="border-t border-paper-hairline pt-6">
      <h3 className="heading-display-md heading-strong text-ink">{t('cartomancy.result.combinations', { defaultValue: 'Combinations' })}</h3>
      <p className="reading-meta mt-1">{t('cartomancy.result.combinationsLede', { defaultValue: 'What the tables say about these cards together.' })}</p>
      <ul className="mt-4 space-y-4">
        {combinationLines(
          hits,
          (hit) => localizeCombinationHit(hit),
          (id) => {
            const card = getPlayingCard(id);
            return card ? localize(card).name : '';
          },
          getLocale(),
        ).map((line) => (
          <li key={line.key}>
            <p className="text-ui font-semibold text-ink">{line.label}</p>
            <p className="reading-copy mt-0.5">{line.meaning}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
