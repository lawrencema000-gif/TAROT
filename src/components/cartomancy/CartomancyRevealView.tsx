import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, Bookmark, BookmarkCheck, Share2, Brain, Loader2 } from 'lucide-react';
import { Button, Chip, EyebrowLabel, KeywordRow, ReadingProse, ResultSheet, Tag } from '../ui';
import { useT } from '../../i18n/useT';
import { flipHaptics } from '../../utils/haptics';
import type { CartoSpread, PlayingCard, PlayingSuit } from '../../types/cartomancy';
import type { CombinationHit } from '../../data/cartomancy';
import { localizedYesNoLabel } from '../../i18n/localizePlayingCard';
import { PlayingCardFace } from './PlayingCardFace';
import { SuitGlyph } from './SuitGlyph';
import { CartomancyLayout, tileFor } from './CartomancyLayout';
import { FlipTile, FLIP_MS, FLIP_SETTLE_MS, FLIP_STAGGER_MS, DEFAULT_BACK } from './FlipTile';
import { PaperDisclosure } from './PaperDisclosure';
import { cartoSummary, firstSentences, verdictTone, type CartoFocus, type CartoVerdict, type DealtCard } from './cartoFlow';

/**
 * The reveal: the table on navy, then the reading on paper.
 *
 * TarotRevealView's shape (chrome → spread title → faces → Reveal all →
 * result) with the playing deck's own table (CartomancyLayout) and a
 * ResultSheet for the result: glyph → "Your question" → title → ✦ ✦ ✦ →
 * verdict pill (Wish, Yes or No) → Reading summary → one section per
 * position (keywords, a short meaning, the full meaning folded) → the
 * combinations the tables found → a Reflect panel → the actions → the
 * cartomancy Disclaimer. Pure presentation: every handler is the section's.
 */

export interface CartomancyRevealViewProps {
  spread: CartoSpread;
  drawnCards: DealtCard[];
  /** The reader's question, if they typed one. */
  question: string;
  /** "{Focus} reading", or an empty string for a general reading. */
  focusLabel: string;
  focus: CartoFocus;
  allRevealed: boolean;
  isSaved: boolean;
  isPremium: boolean;
  cardBackUrl: string | null | undefined;
  significator: PlayingCard | null;
  verdict: CartoVerdict | null;
  combinations: CombinationHit[];
  showAIInterpretation: boolean;
  aiInterpretation: string | null;
  loadingAI: boolean;
  getPositionLabel: (index: number) => string;
  /** The card with the active locale's prose. */
  localize: (card: PlayingCard) => PlayingCard;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
  onRevealCard: (index: number) => void;
  onRevealAll: () => void;
  onCardClick: (index: number) => void;
  onGetAIInterpretation: () => void;
  onNewReading: () => void;
}

const VERDICT_FILL = {
  yes: 'bg-ink-teal text-paper',
  no: 'bg-ink-coral text-paper',
  between: 'bg-ink-gold text-paper',
} as const;

export function CartomancyRevealView(props: CartomancyRevealViewProps) {
  const { t } = useT('app');
  const {
    spread,
    drawnCards,
    question,
    focusLabel,
    focus,
    allRevealed,
    isSaved,
    isPremium,
    cardBackUrl,
    significator,
    verdict,
    combinations,
    showAIInterpretation,
    aiInterpretation,
    loadingAI,
    getPositionLabel,
    localize,
    onBack,
    onSave,
    onShare,
    onRevealCard,
    onRevealAll,
    onCardClick,
    onGetAIInterpretation,
    onNewReading,
  } = props;

  const reduceMotion = !!useReducedMotion();
  const backSrc = cardBackUrl || DEFAULT_BACK;
  const count = drawnCards.length;
  const tile = tileFor(spread, count);
  const small = tile === 'sm' || tile === 'xs';

  const cancelHaptic = useRef<() => void>(() => {});
  useEffect(() => () => cancelHaptic.current(), []);
  const feelTheTurn = () => {
    cancelHaptic.current();
    cancelHaptic.current = flipHaptics(FLIP_MS, reduceMotion);
  };
  const revealCard = (index: number) => {
    feelTheTurn();
    onRevealCard(index);
  };
  const revealAll = () => {
    feelTheTurn();
    onRevealAll();
  };

  // Stagger per reveal event, not per index (TarotRevealView.tsx:164-188).
  const prevRevealed = useRef<boolean[]>([]);
  const flipDelays = useRef<number[]>([]);
  {
    const newly: number[] = [];
    drawnCards.forEach((d, i) => {
      if (!d.revealed) flipDelays.current[i] = 0;
      else if (!prevRevealed.current[i]) newly.push(i);
    });
    newly.forEach((idx, rank) => {
      flipDelays.current[idx] = newly.length > 1 ? rank * FLIP_STAGGER_MS : 0;
    });
    prevRevealed.current = drawnCards.map((d) => d.revealed);
  }
  const revealTailMs = drawnCards.reduce((max, _, i) => Math.max(max, flipDelays.current[i] ?? 0), 0) + FLIP_MS + FLIP_SETTLE_MS;

  const reversedLabel = t('readings.revealView.reversed');

  const renderTile = (index: number, opts: { tile: typeof tile; number?: number }) => {
    const drawn = drawnCards[index];
    if (!drawn) return null;
    const card = localize(drawn.card);
    const quiet = opts.tile === 'sm' || opts.tile === 'xs';
    const position = getPositionLabel(index);
    return (
      <FlipTile
        revealed={drawn.revealed}
        delayMs={flipDelays.current[index] ?? 0}
        backSrc={backSrc}
        radius={opts.tile === 'hero' ? 'rounded-card' : 'rounded-inset'}
        className="w-full"
        number={opts.number}
        infoBadge={!quiet}
        aria-label={
          drawn.revealed
            ? t('readings.revealView.openCard', { name: drawn.reversed ? `${card.name}, ${reversedLabel}` : card.name, defaultValue: 'Open {{name}}' })
            : t('readings.revealView.revealPosition', { position, defaultValue: 'Reveal {{position}}' })
        }
        onClick={() => (drawn.revealed ? onCardClick(index) : revealCard(index))}
        face={<PlayingCardFace card={drawn.card} detail={quiet ? 'quiet' : 'full'} reversed={drawn.reversed} />}
      />
    );
  };

  const captionFor = (index: number) => {
    const drawn = drawnCards[index];
    const delay = flipDelays.current[index] ?? 0;
    return (
      <>
        <p className="text-caption text-mystic-400 leading-tight">{getPositionLabel(index)}</p>
        <p
          className="text-caption text-gold leading-tight transition-opacity duration-base ease-out"
          style={{ opacity: drawn?.revealed && drawn.reversed ? 1 : 0, transitionDelay: `${delay + FLIP_MS - 140}ms` }}
          aria-hidden={!(drawn?.revealed && drawn.reversed)}
        >
          {drawn?.reversed ? reversedLabel : ' '}
        </p>
      </>
    );
  };

  const legend = {
    label: getPositionLabel,
    trailing: (index: number) => {
      const drawn = drawnCards[index];
      if (!drawn?.revealed) return null;
      const name = localize(drawn.card).name;
      return drawn.reversed ? (
        <>
          {name} <span className="text-gold">· {reversedLabel}</span>
        </>
      ) : (
        name
      );
    },
    onSelect: (index: number) => {
      const drawn = drawnCards[index];
      if (!drawn) return;
      if (drawn.revealed) onCardClick(index);
      else revealCard(index);
    },
  };

  // The result ------------------------------------------------------------

  const firstSuited = drawnCards.map((d) => d.card).find((c) => c.suit !== 'joker');
  const glyph = firstSuited ? <SuitGlyph suit={firstSuited.suit as PlayingSuit} size={28} /> : undefined;
  const eyebrow = question
    ? t('cartomancy.result.yourQuestion', { defaultValue: 'Your question' })
    : focusLabel || t('cartomancy.title', { defaultValue: 'Playing cards' });
  const title = question || spread.name;
  const summary = cartoSummary(showAIInterpretation ? aiInterpretation : null, spread);
  const summaryHeading = t('common:resultSheet.summaryHeading', { defaultValue: 'Reading summary' });

  const meaningFor = (card: PlayingCard, reversed: boolean): { short: string; full: string; extra: ReactNode[] } => {
    const focused = focus === 'love' ? card.loveMeaning : focus === 'career' ? card.careerMeaning : undefined;
    const main = focused || (reversed ? card.meaningReversed ?? card.meaningUpright : card.meaningUpright);
    const short = firstSentences(main, 2);
    const extra: ReactNode[] = [];
    if (focused && reversed && card.meaningReversed) {
      extra.push(
        <p key="rev" className="reading-copy">
          <strong>{reversedLabel}.</strong> {card.meaningReversed}
        </p>,
      );
    }
    if (!focused && card.adviceMeaning) {
      extra.push(
        <p key="advice" className="reading-copy">
          <strong>{t('cartomancy.card.advice', { defaultValue: 'Advice' })}.</strong> {card.adviceMeaning}
        </p>,
      );
    }
    if (card.timing) {
      extra.push(
        <p key="timing" className="reading-copy">
          <strong>{t('cartomancy.card.timing', { defaultValue: 'Timing' })}.</strong> {card.timing}
        </p>,
      );
    }
    return { short, full: main, extra };
  };

  const verdictBlock = verdict && (
    <div className="text-center">
      <span className={`inline-flex items-center rounded-full px-5 py-2 text-ui font-semibold ${VERDICT_FILL[verdictTone(verdict)]}`}>
        {verdict.kind === 'yes-no'
          ? localizedYesNoLabel(spread.slug, verdict.outcome.result, verdict.outcome.label)
          : verdict.outcome.label}
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

  const aiRest = showAIInterpretation && aiInterpretation ? aiInterpretation.split(/\n\s*\n/).slice(1).join('\n\n').trim() : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          {t('readings.back')}
        </button>
        <button
          onClick={onSave}
          disabled={!allRevealed}
          aria-label={isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}
          className="p-3 rounded-full hover:bg-mystic-800 transition-[background-color,transform] duration-fast active:scale-90 disabled:opacity-50"
        >
          {isSaved ? <BookmarkCheck className="w-5 h-5 text-gold" /> : <Bookmark className="w-5 h-5 text-mystic-400" />}
        </button>
      </div>

      <div className="text-center space-y-2">
        <p className="font-display-eyebrow text-mystic-400">{focusLabel || t('cartomancy.title', { defaultValue: 'Playing cards' })}</p>
        <h2 className="heading-display-md text-mystic-100">{spread.name}</h2>
        {significator && (
          <div className="flex justify-center">
            <Tag tone="neutral" size="md">
              {t('cartomancy.settings.significatorTag', { defaultValue: 'Significator: {{name}}', name: localize(significator).name })}
            </Tag>
          </div>
        )}
      </div>

      <CartomancyLayout spread={spread} count={count} renderTile={renderTile} captionFor={small ? undefined : captionFor} legend={legend} />

      {!allRevealed && (
        <Button variant="ghost" fullWidth onClick={revealAll}>
          {t('readings.revealView.revealAll')}
        </Button>
      )}

      {allRevealed && (
        <div
          className="space-y-4 animate-fade-in"
          style={{ animationDuration: '320ms', animationDelay: `${revealTailMs}ms`, animationFillMode: 'both' }}
        >
          {!showAIInterpretation && (
            <div className="flex justify-end">
              <Chip
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!loadingAI) onGetAIInterpretation();
                }}
                className={loadingAI ? 'opacity-50 pointer-events-none' : ''}
              >
                {loadingAI ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('readings.revealView.generating')}
                  </>
                ) : (
                  <>
                    <Brain className="w-3.5 h-3.5" />
                    {isPremium ? t('readings.revealView.getAIInsight') : t('readings.revealView.premiumAI')}
                  </>
                )}
              </Chip>
            </div>
          )}

          <ResultSheet
            glyph={glyph}
            eyebrow={eyebrow}
            title={title}
            summary={verdict ? undefined : summary}
            summaryHeading={summaryHeading}
            disclaimer="cartomancy"
            headingLevel="h2"
          >
            <div className="space-y-7">
              {verdict && (
                <section className="space-y-5 text-center">
                  {verdictBlock}
                  <div>
                    <h3 className="heading-display-md heading-strong text-ink text-center">{summaryHeading}</h3>
                    <p className="reading-lede mx-auto mt-3">{summary}</p>
                  </div>
                </section>
              )}

              <div className="divide-y divide-paper-hairline">
                {drawnCards.map((drawn, i) => {
                  const card = localize(drawn.card);
                  const { short, full, extra } = meaningFor(card, drawn.reversed);
                  return (
                    <section key={i} className="py-5 first:pt-0 space-y-3">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => onCardClick(i)}
                          aria-label={t('readings.revealView.openCard', { name: card.name, defaultValue: 'Open {{name}}' })}
                          className="w-12 shrink-0 rounded-inset overflow-hidden [&>svg]:w-full [&>svg]:h-auto [&>svg]:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-gold/50"
                        >
                          <PlayingCardFace card={drawn.card} detail="quiet" surface="paper" reversed={drawn.reversed} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <EyebrowLabel tone="ink" align="left" className="block">
                            {getPositionLabel(i)}
                          </EyebrowLabel>
                          <h3 className="heading-display-md heading-strong text-ink mt-1 text-balance">
                            {card.name}
                            {drawn.reversed && <span className="ml-2 text-meta font-sans font-medium tracking-normal text-ink-coral">{reversedLabel}</span>}
                          </h3>
                        </div>
                      </div>
                      <div className="[&>div]:justify-start">
                        <KeywordRow keywords={card.keywords} />
                      </div>
                      <p className="reading-copy">{short}</p>
                      {(full !== short || extra.length > 0) && (
                        <PaperDisclosure label={t('cartomancy.result.readFull', { defaultValue: 'Read the full meaning' })}>
                          <div className="space-y-3">
                            {full !== short && <p className="reading-copy">{full}</p>}
                            {extra}
                          </div>
                        </PaperDisclosure>
                      )}
                    </section>
                  );
                })}
              </div>

              {combinations.length > 0 && (
                <section className="border-t border-paper-hairline pt-6">
                  <h3 className="heading-display-md heading-strong text-ink">{t('cartomancy.result.combinations', { defaultValue: 'Combinations' })}</h3>
                  <p className="reading-meta mt-1">{t('cartomancy.result.combinationsLede', { defaultValue: 'What the tables say about these cards together.' })}</p>
                  <ul className="mt-4 space-y-4">
                    {combinations.map((hit) => (
                      <li key={`${hit.id}:${hit.cardIds.join('-')}`}>
                        <p className="text-ui font-semibold text-ink">{hit.label}</p>
                        <p className="reading-copy mt-0.5">{hit.meaning}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {aiRest && (
                <section className="border-t border-paper-hairline pt-6">
                  <EyebrowLabel tone="ink" align="left" className="block">
                    {t('readings.revealView.aiInterpretation')}
                  </EyebrowLabel>
                  <div className="mt-3">
                    <ReadingProse text={aiRest} lede={false} />
                  </div>
                </section>
              )}

              {drawnCards[0] && (
                <aside className="rounded-control border border-paper-hairline p-5 text-center">
                  <EyebrowLabel tone="ink" className="tracking-[0.18em]">
                    {t('cartomancy.result.reflect', { defaultValue: 'Reflect' })}
                  </EyebrowLabel>
                  <p className="mt-3 font-display font-semibold text-title text-ink text-balance">{localize(drawnCards[0].card).reflectionPrompt}</p>
                </aside>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" onClick={onSave}>
                  {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span className="text-caption">{isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}</span>
                </Button>
                <Button variant="secondary" onClick={onShare}>
                  <Share2 className="w-4 h-4" />
                  <span className="text-caption">{t('readings.revealView.share', { defaultValue: 'Share this reading' })}</span>
                </Button>
                <Button variant="gold" onClick={onNewReading}>
                  <span className="text-caption">{t('readings.revealView.newReading')}</span>
                </Button>
              </div>
            </div>
          </ResultSheet>
        </div>
      )}
    </div>
  );
}
