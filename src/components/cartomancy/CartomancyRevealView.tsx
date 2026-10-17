import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, Bookmark, BookmarkCheck, Brain } from 'lucide-react';
import { Button, Chip, EyebrowLabel, ResultSheet, Tag } from '../ui';
import { useT } from '../../i18n/useT';
import { flipHaptics } from '../../utils/haptics';
import { cardBackSrc } from '../../utils/imageUrl';
import type { CartoSpread, PlayingCard, PlayingSuit } from '../../types/cartomancy';
import type { CombinationHit } from '../../data/cartomancy';
import { PlayingCardFace } from './PlayingCardFace';
import { SuitGlyph } from './SuitGlyph';
import { CartomancyLayout, tileFor } from './CartomancyLayout';
import { FlipTile, FLIP_MS, FLIP_SETTLE_MS, FLIP_STAGGER_MS } from './FlipTile';
import { AiInterpretationChip } from '../readings/tarot/AiInterpretationChip';
import { CartoAiSections, CartoCardSections, CartoCombinationList, CartoVerdictSummary, ICON_BUTTON, ShareIconButton } from './CartomancyResultParts';
import { cartoSummary, type CartoFocus, type CartoVerdict, type DealtCard } from './cartoFlow';

/**
 * The reveal: the table on navy, then the reading on paper.
 *
 * TarotRevealView's shape (chrome → spread title → faces → Reveal all →
 * result) with the playing deck's own table (CartomancyLayout) and a
 * ResultSheet for the result: glyph → "Your question" → title → ✦ ✦ ✦ →
 * verdict pill (Wish, Yes or No) → Reading summary → one section per
 * position (keywords, the sentences after the summary's, the full meaning
 * folded) → the combinations the tables found → a Reflect panel → the
 * actions → the cartomancy Disclaimer. The verdict, the sections and the
 * combinations are CartomancyResultParts, which the Library's saved reading
 * prints too. Pure presentation: every handler is the section's.
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
  /** A share image is rendering: the share control waits (one tap, one share). */
  sharing: boolean;
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
  /** Show or hide an AI reading already paid for (never spends again). */
  onToggleAI: (show: boolean) => void;
  onNewReading: () => void;
}

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
    sharing,
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
    onToggleAI,
    onNewReading,
  } = props;

  const reduceMotion = !!useReducedMotion();
  const count = drawnCards.length;
  const tile = tileFor(spread, count);
  const small = tile === 'sm' || tile === 'xs';
  // The hero card is 160 px wide (w-40), a small tile 60 px, any other 120 px at most.
  const backSrc = cardBackSrc(cardBackUrl, tile === 'hero' ? 160 : small ? 60 : 120);

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
        badgeCorner={drawn.reversed ? 'bottom-left' : 'top-right'}
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

  const captionFor = (index: number, { named }: { named: boolean }) => {
    const drawn = drawnCards[index];
    const delay = flipDelays.current[index] ?? 0;
    return (
      <>
        {named && <p className="text-caption text-mystic-400 leading-tight">{getPositionLabel(index)}</p>}
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
      // Two lines, so a long name never truncates the word that changes its reading.
      return drawn.reversed ? (
        <>
          <span>{name}</span>
          <span className="text-caption text-gold">{reversedLabel}</span>
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
  const summary = cartoSummary(
    showAIInterpretation ? aiInterpretation : null,
    drawnCards.map((d) => ({ card: localize(d.card), reversed: d.reversed })),
    focus,
    (name, sentence) => t('cartomancy.result.summaryLead', { name, sentence, defaultValue: '{{name}}: {{sentence}}' }),
  );
  const summaryHeading = t('common:resultSheet.summaryHeading', { defaultValue: 'Reading summary' });

  const aiOn = showAIInterpretation && !!aiInterpretation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center min-h-[44px] -ml-1 pr-2"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          {t('readings.back')}
        </button>
        <div className="flex items-center gap-1">
          <ShareIconButton onShare={onShare} sharing={sharing} disabled={!allRevealed} />
          <button
            type="button"
            onClick={onSave}
            disabled={!allRevealed}
            aria-label={isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}
            aria-pressed={isSaved}
            className={`${ICON_BUTTON} ${isSaved ? 'text-gold' : 'text-mystic-300'}`}
          >
            {isSaved ? <BookmarkCheck className="w-5 h-5" aria-hidden /> : <Bookmark className="w-5 h-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="font-display-eyebrow text-mystic-400">{focusLabel || t('cartomancy.title', { defaultValue: 'Playing cards' })}</p>
        <h2 className="heading-display-md text-mystic-100 lining-nums">{spread.name}</h2>
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
          <div className="flex items-center justify-between gap-3 pt-2">
            <h3 className="text-ui font-medium text-mystic-200">{t('readings.interpretation')}</h3>
            {aiOn ? (
              <button
                type="button"
                onClick={() => onToggleAI(false)}
                className="inline-flex items-center min-h-[44px] text-meta text-mystic-400 hover:text-mystic-300 transition-colors duration-fast"
              >
                {t('cartomancy.result.showCardMeanings', { defaultValue: 'Show card meanings' })}
              </button>
            ) : aiInterpretation ? (
              <Chip variant="outline" size="sm" onClick={() => onToggleAI(true)} icon={<Brain />} label={t('readings.revealView.aiInterpretation')} />
            ) : (
              // The price is on the chip for a reader who pays it: it used to
              // say "Premium AI" and spend 50 Moonstones on the first tap (p8 F50).
              <AiInterpretationChip isPremium={isPremium} loading={loadingAI} onClick={onGetAIInterpretation} />
            )}
          </div>

          <ResultSheet
            glyph={glyph}
            eyebrow={eyebrow}
            title={title}
            summary={verdict ? undefined : summary}
            summaryHeading={summaryHeading}
            disclaimer={aiOn ? 'ai' : 'cartomancy'}
            headingLevel="h2"
          >
            <div className="space-y-7">
              {verdict && <CartoVerdictSummary spread={spread} verdict={verdict} summary={summary} heading={summaryHeading} />}

              {/* With an AI reading on screen its body takes the place of the
                  card sections, as on the tarot result; the cards stay one
                  tap away ("Show card meanings" or the faces above). */}
              {aiOn ? (
                <CartoAiSections text={aiInterpretation!} />
              ) : (
                <CartoCardSections
                  cards={drawnCards.map((drawn) => ({ source: drawn.card, card: localize(drawn.card), reversed: drawn.reversed }))}
                  focus={focus}
                  positionLabel={getPositionLabel}
                  onCardClick={onCardClick}
                />
              )}

              <CartoCombinationList hits={combinations} localize={localize} />

              {drawnCards[0] && (
                <aside className="rounded-control border border-paper-hairline p-5 text-center">
                  <EyebrowLabel tone="ink" className="tracking-[0.18em]">
                    {t('cartomancy.result.reflect', { defaultValue: 'Reflect' })}
                  </EyebrowLabel>
                  <p className="mt-3 font-display font-semibold text-title text-ink text-balance">{localize(drawnCards[0].card).reflectionPrompt}</p>
                </aside>
              )}

              <Button variant="gold" size="lg" fullWidth onClick={onNewReading}>
                {t('readings.revealView.newReading')}
              </Button>
            </div>
          </ResultSheet>
        </div>
      )}
    </div>
  );
}
