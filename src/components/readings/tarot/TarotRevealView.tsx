/**
 * The reveal: the cards on the table, then the reading on paper.
 *
 * The faces stay on navy — this is the reading table, Arcana's "green
 * ground" — laid out as the spread: the spread's own layout coordinates
 * place each card on a grid (a cross is a cross, a horseshoe an arch),
 * the Celtic Cross keeps its dedicated layout, and a lone card sits large
 * in the middle. Every face is a TarotFace; face down it is the Arcana
 * back the reader drew by.
 *
 * Once every card is up, the result arrives as a ResultSheet (see
 * TarotReadingResult): the question or the spread as the title, a
 * summary, one short section per card, the affirmation, "Start a new
 * reading", the disclaimer. Save and share are icon buttons in the header.
 * The AI chip sits above the sheet as the only secondary control.
 *
 * All state and handlers come from TarotSection; this is presentation.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft, Bookmark, BookmarkCheck, Share2, Info, Brain, Loader2 } from 'lucide-react';
import { Button, Chip, TarotFace } from '../../ui';
import { useT } from '../../../i18n/useT';
import { CelticCrossLayout } from '../CelticCrossLayout';
import { flipHaptics } from '../../../utils/haptics';
import type { TarotCard } from '../../../types';
import type { SpreadLayoutPosition } from '../../../data/tarotSpreads';
import type { DrawnCard, FocusArea } from './types';
import { TarotReadingResult } from './TarotReadingResult';

/*
 * The flip.
 *
 * This is the moment the whole product is built around, so it is a real
 * card turning over — two faces on one `preserve-3d` plane, rotated on Y
 * — not a fade between two states. 520ms is above the UI-feedback budget
 * on purpose: the user is watching this one, deliberately.
 *
 * A reversed card turns INTO its reversal: the plane's end state adds a
 * half-turn on Z, so the card lands upside down as part of the same
 * motion rather than arriving already inverted (the plate turns with it,
 * as a real card's would; the label beneath names the orientation). Both
 * transforms are always written out, at rest and turned, so the browser
 * interpolates them function by function instead of falling back to a
 * matrix.
 *
 * Only `transform` and `opacity` move. The easing is a plain ease-out
 * with a long tail so the card decelerates into place instead of
 * arriving and stopping dead; no overshoot, because a card that
 * bounces past 180° reads as a glitch rather than as weight.
 *
 * Reduced motion needs nothing here: the global block in index.css
 * pins transition-duration/-delay with `!important`, which beats these
 * inline declarations, so the card snaps to its revealed face. The
 * JS-timed haptic is gated separately, in flipHaptics.
 */
const FLIP_MS = 520;
const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';
/** Multi-card reveals land in sequence rather than as one slab. */
const FLIP_STAGGER_MS = 120;
/** A beat after the last card has landed before the reading arrives. */
const FLIP_SETTLE_MS = 120;
const DEFAULT_BACK = '/card-backs/default.svg';

const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

const AT_REST = 'rotateY(0deg) rotateZ(0deg)';
const turned = (reversed: boolean) => `rotateY(180deg) rotateZ(${reversed ? 180 : 0}deg)`;

const ICON_BUTTON =
  'w-11 h-11 inline-flex items-center justify-center rounded-full transition-[background-color,transform] duration-fast ' +
  '[@media(hover:hover)]:[&:hover:not(:active)]:bg-mystic-800 motion-safe:active:scale-90 disabled:opacity-40 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50';

interface TarotRevealViewProps {
  drawnCards: DrawnCard[];
  currentSpread: string;
  spreadTitle: string;
  /** The spread's glyph layout, one entry per card, used to lay the table. */
  spreadLayout?: SpreadLayoutPosition[];
  selectedFocus: FocusArea | null;
  question?: string | null;
  allRevealed: boolean;
  isSaved: boolean;
  isPremium: boolean;
  cardBackUrl: string | null | undefined;
  showAIInterpretation: boolean;
  aiInterpretation: string | null;
  loadingAI: boolean;
  focusReadingLabel: string;
  getPositionLabel: (index: number) => string;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
  onRevealCard: (index: number) => void;
  onRevealAll: () => void;
  onCardClick: (card: TarotCard, reversed: boolean) => void;
  onGetAIInterpretation: () => void;
  onHideAIInterpretation: () => void;
  onNewReading: () => void;
}

/** Rows of three, for a spread that brought no layout. */
function rowsOfThree(n: number): SpreadLayoutPosition[] {
  const cols = n <= 3 ? n : 3;
  return Array.from({ length: n }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) }));
}

export function TarotRevealView(props: TarotRevealViewProps) {
  const { t } = useT('app');
  const {
    drawnCards,
    currentSpread,
    spreadTitle,
    spreadLayout,
    selectedFocus,
    question,
    allRevealed,
    isSaved,
    isPremium,
    cardBackUrl,
    showAIInterpretation,
    aiInterpretation,
    loadingAI,
    focusReadingLabel,
    getPositionLabel,
    onBack,
    onSave,
    onShare,
    onRevealCard,
    onRevealAll,
    onCardClick,
    onGetAIInterpretation,
    onHideAIInterpretation,
    onNewReading,
  } = props;

  const reduceMotion = !!useReducedMotion();
  const backSrc = cardBackUrl || DEFAULT_BACK;

  /*
   * The hand feels every turn: a tap as the card is pressed, a thump as
   * it passes edge-on. Held in a ref so an unmount mid-flip cannot buzz a
   * phone whose card is gone.
   */
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

  /*
   * Stagger is assigned per *reveal event*, not per card index. Tapping
   * the third card alone must flip it immediately — inheriting a 240ms
   * index-based delay would read as lag. So only the cards that turned
   * over in this render get a delay, ranked among themselves, which
   * means "reveal all" cascades and a single tap does not.
   *
   * A ref rather than state: these values must be on the element in the
   * same commit that flips it, and re-rendering to apply a delay would
   * be a frame too late. Re-running this block (StrictMode) is a no-op —
   * by then nothing is newly revealed, so no delay is rewritten.
   */
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

  /*
   * The interpretation arrives after the LAST card has finished turning:
   * the longest delay in the event that completed the reveal, plus the
   * flip itself, plus a beat.
   */
  const revealTailMs =
    drawnCards.reduce((max, _, i) => Math.max(max, flipDelays.current[i] ?? 0), 0) + FLIP_MS + FLIP_SETTLE_MS;

  const count = drawnCards.length;
  const single = count === 1;

  /*
   * The table. The spread's layout places each card on a CSS grid; a
   * layout with half-cells (an arc, a staircase) doubles the grid so the
   * halves land on whole tracks. The container narrows with the number of
   * cards across, so two cards do not become two slabs.
   */
  const layout = spreadLayout && spreadLayout.length === count ? spreadLayout : rowsOfThree(count);
  const fractional = layout.some((p) => !Number.isInteger(p.x) || !Number.isInteger(p.y));
  const scale = fractional ? 2 : 1;
  const across = Math.max(...layout.map((p) => p.x)) + 1;
  const gridCols = Math.round(across * scale);
  const tableWidth =
    across <= 1 ? 'max-w-[10rem]' : across <= 2 ? 'max-w-[15.75rem]' : across <= 3 ? 'max-w-sm' : 'max-w-md';
  const radius: 'inset' | 'card' = single ? 'card' : 'inset';

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
          <button
            type="button"
            onClick={onShare}
            disabled={!allRevealed}
            aria-label={t('readings.revealView.share', { defaultValue: 'Share this reading' })}
            className={`${ICON_BUTTON} text-mystic-300`}
          >
            <Share2 className="w-5 h-5" aria-hidden />
          </button>
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

      <div className="text-center">
        {focusReadingLabel && <p className="font-display-eyebrow text-mystic-300">{focusReadingLabel}</p>}
        <h2 className="heading-display-md text-mystic-100">{spreadTitle}</h2>
      </div>

      {currentSpread === 'celtic-cross' ? (
        <CelticCrossLayout
          drawnCards={drawnCards}
          onRevealCard={onRevealCard}
          onCardClick={(card, reversed) => onCardClick(card, reversed)}
          getPositionLabel={getPositionLabel}
          cardBackUrl={cardBackUrl ?? undefined}
        />
      ) : (
        <div
          className={`grid gap-x-3 gap-y-4 mx-auto w-full ${tableWidth}`}
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {drawnCards.map((drawn, i) => {
            const delay = flipDelays.current[i] ?? 0;
            const position = getPositionLabel(i);
            const p = layout[i];
            const cell: CSSProperties = {
              gridColumn: `${Math.round(p.x * scale) + 1} / span ${scale}`,
              gridRow: `${Math.round(p.y * scale) + 1} / span ${scale}`,
            };
            return (
              <div key={i} className="flex flex-col items-center gap-2 min-w-0" style={cell}>
                {/*
                  Perspective and press feedback live on this wrapper; the
                  flip lives on the child. Two transforms on one element
                  would fight — the scale would overwrite the rotation.
                */}
                <button
                  type="button"
                  onClick={() => drawn.revealed ? onCardClick(drawn.card, drawn.reversed) : revealCard(i)}
                  aria-label={
                    drawn.revealed
                      ? t('readings.revealView.openCard', { name: drawn.card.name, defaultValue: 'Open {{name}}' })
                      : t('readings.revealView.revealPosition', { position, defaultValue: 'Reveal {{position}}' })
                  }
                  className={`relative w-full aspect-[2/3] ${radius === 'card' ? 'rounded-card' : 'rounded-inset'} select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-transform duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
                    drawn.revealed ? '' : 'motion-safe:hover:scale-[1.03] motion-safe:active:scale-95'
                  }`}
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: drawn.revealed ? turned(drawn.reversed) : AT_REST,
                      transition: `transform ${FLIP_MS}ms ${FLIP_EASE}`,
                      transitionDelay: `${delay}ms`,
                    }}
                  >
                    {/* Back — the Arcana back the reader drew this card by. */}
                    <div
                      className={`absolute inset-0 ${radius === 'card' ? 'rounded-card' : 'rounded-inset'} overflow-hidden bg-mystic-850 border border-gold/30`}
                      style={BACKFACE}
                    >
                      <img
                        src={backSrc}
                        alt=""
                        decoding="async"
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none select-none"
                      />
                    </div>

                    {/*
                      Face — mounted from the start, pre-turned 180° and
                      hidden by backface-visibility, so the bitmap is decoded
                      before the hinge moves. The plane carries the reversal,
                      so the face itself is drawn upright.
                    */}
                    <div
                      className="absolute inset-0"
                      style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
                      aria-hidden={!drawn.revealed}
                    >
                      <TarotFace card={drawn.card} size="fill" radius={radius} reversedTag={false} loading="eager" alt="" />
                    </div>
                  </div>
                  {/*
                    The "there is more here" badge arrives as the card
                    settles, not with it — causality: the card turned, so
                    now it has an affordance.
                  */}
                  <div
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-mystic-900/80 rounded-full flex items-center justify-center pointer-events-none transition-opacity duration-base ease-out"
                    style={{
                      opacity: drawn.revealed ? 1 : 0,
                      transitionDelay: `${delay + FLIP_MS - 140}ms`,
                    }}
                    aria-hidden
                  >
                    <Info className="w-3.5 h-3.5 text-gold" />
                  </div>
                </button>
                <div className="text-center min-w-0 w-full">
                  <p className="text-caption text-mystic-400 leading-tight">{position}</p>
                  {/* Named as well as shown: an upside-down plate is not a label. */}
                  <p
                    className="text-caption text-gold leading-tight transition-opacity duration-base ease-out"
                    style={{
                      opacity: drawn.revealed && drawn.reversed ? 1 : 0,
                      transitionDelay: `${delay + FLIP_MS - 140}ms`,
                    }}
                    aria-hidden={!(drawn.revealed && drawn.reversed)}
                  >
                    {drawn.reversed ? t('readings.revealView.reversed') : ' '}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!allRevealed && (
        <Button variant="ghost" fullWidth onClick={revealAll}>
          {t('readings.revealView.revealAll')}
        </Button>
      )}

      {/*
        The reading arrives *after* the last card has turned, so the
        sequence reads as cause and effect rather than as two things
        happening at once. `both` fill keeps it invisible during the delay;
        without it the block would flash in at full opacity first.
      */}
      {allRevealed && (
        <div
          className="space-y-4 animate-fade-in"
          style={{ animationDuration: '320ms', animationDelay: `${revealTailMs}ms`, animationFillMode: 'both' }}
        >
          <div className="flex items-center justify-between gap-3 pt-2">
            <h3 className="text-ui font-medium text-mystic-200">{t('readings.interpretation')}</h3>
            {showAIInterpretation && aiInterpretation ? (
              <button
                type="button"
                onClick={onHideAIInterpretation}
                className="inline-flex items-center min-h-[44px] text-meta text-mystic-400 hover:text-mystic-300 transition-colors duration-fast"
              >
                {t('readings.revealView.showCardMeanings')}
              </button>
            ) : (
              <Chip
                variant="outline"
                size="sm"
                onClick={() => { if (!loadingAI) onGetAIInterpretation(); }}
                disabled={loadingAI}
                icon={loadingAI ? <Loader2 className="animate-spin" /> : <Brain />}
                label={
                  loadingAI
                    ? t('readings.revealView.generating')
                    : isPremium
                      ? t('readings.revealView.getAIInsight')
                      : t('readings.revealView.premiumAI')
                }
              />
            )}
          </div>

          <TarotReadingResult
            cards={drawnCards}
            getPositionLabel={getPositionLabel}
            selectedFocus={selectedFocus}
            question={question}
            eyebrow={focusReadingLabel || spreadTitle}
            title={spreadTitle}
            aiInterpretation={showAIInterpretation ? aiInterpretation : null}
            headingLevel="h2"
            actions={
              <Button variant="gold" size="lg" fullWidth onClick={onNewReading}>
                {t('readings.revealView.newReading')}
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
