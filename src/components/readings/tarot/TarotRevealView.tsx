/**
 * TarotSection reveal view — extracted from the monolithic TarotSection.tsx
 * as part of the `tarot-section-split` rollout.
 *
 * This is the largest of the extracted views: card reveal flipping,
 * position labels, focus/traditional/AI interpretation tabs, save +
 * new-reading actions. All state and handlers are passed in from the
 * parent — this component is pure presentation.
 *
 * The cards are laid out as the spread, not as a wrapped row: one card
 * sits alone and large; two or three share a row; five, six and seven
 * fall into rows of three. Every card is 2:3 with its position named
 * beneath it, and the face-down side is the Arcana back — the same
 * object the reader shuffled and drew, turned over.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronLeft,
  Feather,
  Bookmark,
  BookmarkCheck,
  Share2,
  Info,
  Brain,
  Loader2,
  Heart,
  Briefcase,
  ArrowUp,
  ArrowDown } from 'lucide-react';
import { Card, Button, Chip, Tabs, Tag, ReadingProse } from '../../ui';
import { useT } from '../../../i18n/useT';
import { CelticCrossLayout } from '../CelticCrossLayout';
import { getBundledFullPath } from '../../../config/bundledImages';
import { flipHaptics } from '../../../utils/haptics';
import type { TarotCard } from '../../../types';
import type { FocusArea } from './types';

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
 * motion rather than arriving already inverted. Both transforms are
 * always written out, at rest and turned, so the browser interpolates
 * them function by function instead of falling back to a matrix.
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

interface RevealCard { card: TarotCard; reversed: boolean; revealed: boolean; }
interface FocusInterp { content: string; icon: typeof Heart; label: string; color: string; }

interface TarotRevealViewProps {
  drawnCards: RevealCard[];
  currentSpread: string;
  spreadTitle: string;
  selectedFocus: FocusArea | null;
  allRevealed: boolean;
  isSaved: boolean;
  isPremium: boolean;
  cardBackUrl: string | null | undefined;
  showAIInterpretation: boolean;
  aiInterpretation: string | null;
  loadingAI: boolean;
  interpretationView: 'focus' | 'traditional';
  focusReadingLabel: string;
  getCardImage: (card: TarotCard) => string | undefined;
  getPositionLabel: (index: number) => string;
  getFocusInterpretation: (card: TarotCard, focus: FocusArea | null, reversed: boolean) => FocusInterp | null;
  onBack: () => void;
  onSave: () => void;
  onShare: () => void;
  onRevealCard: (index: number) => void;
  onRevealAll: () => void;
  onCardClick: (card: TarotCard, reversed: boolean) => void;
  onGetAIInterpretation: () => void;
  onHideAIInterpretation: () => void;
  onSetInterpretationView: (view: 'focus' | 'traditional') => void;
  onNewReading: () => void;
}

export function TarotRevealView(props: TarotRevealViewProps) {
  const { t } = useT('app');
  const {
    drawnCards,
    currentSpread,
    spreadTitle,
    selectedFocus,
    allRevealed,
    isSaved,
    isPremium,
    cardBackUrl,
    showAIInterpretation,
    aiInterpretation,
    loadingAI,
    interpretationView,
    focusReadingLabel,
    getCardImage,
    getPositionLabel,
    getFocusInterpretation,
    onBack,
    onSave,
    onShare,
    onRevealCard,
    onRevealAll,
    onCardClick,
    onGetAIInterpretation,
    onHideAIInterpretation,
    onSetInterpretationView,
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
   * flip itself, plus a beat. For a reveal-all of n cards that is
   * stagger × (n − 1) + 520 + 120. Earlier events only ever hold smaller
   * delays, so the maximum over every card is the tail of the last one.
   */
  const revealTailMs =
    drawnCards.reduce((max, _, i) => Math.max(max, flipDelays.current[i] ?? 0), 0) + FLIP_MS + FLIP_SETTLE_MS;

  const count = drawnCards.length;
  const single = count === 1;
  const spreadLayout = single
    ? 'flex justify-center'
    : count === 2
      ? 'grid grid-cols-2 gap-x-3 gap-y-4 max-w-[15.75rem] mx-auto'
      : 'grid grid-cols-3 gap-x-3 gap-y-4 max-w-sm mx-auto';
  const radius = single ? 'rounded-card' : 'rounded-inset';
  /*
   * The single card is the hero and gets the 512×768 face; a grid card
   * is at most ~125px wide, which the 400×600 `full` variant covers at
   * 3× without decoding a 1.5 MB bitmap per slot.
   */
  const faceFor = (card: TarotCard) =>
    single ? getCardImage(card) : (getBundledFullPath(card.id) ?? getCardImage(card));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-ui text-mystic-400 hover:text-mystic-300 transition-colors duration-fast inline-flex items-center"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          {t('readings.back')}
        </button>
        <button
          onClick={onSave}
          disabled={!allRevealed}
          aria-label={isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}
          className="p-2 rounded-full hover:bg-mystic-800 transition-[background-color,transform] duration-fast active:scale-90 disabled:opacity-50"
        >
          {isSaved ? (
            <BookmarkCheck className="w-5 h-5 text-gold" />
          ) : (
            <Bookmark className="w-5 h-5 text-mystic-400" />
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="font-display-eyebrow text-mystic-400">{focusReadingLabel}</p>
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
        <div className={spreadLayout}>
          {drawnCards.map((drawn, i) => {
            const delay = flipDelays.current[i] ?? 0;
            const face = faceFor(drawn.card);
            const position = getPositionLabel(i);
            return (
              <div key={i} className={`flex flex-col items-center gap-2 ${single ? 'w-40' : 'w-full'}`}>
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
                  className={`relative w-full aspect-[2/3] ${radius} select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition-transform duration-base ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 ${
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
                      className={`absolute inset-0 ${radius} overflow-hidden bg-mystic-850`}
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
                      hidden by backface-visibility. Rendering it only on
                      reveal would mean decoding the image mid-flip, which
                      is exactly when a mid-range phone can least afford it.
                      The art carries its own matte, rule and name plate, so
                      it gets rounded corners and nothing else.
                    */}
                    <div
                      className={`absolute inset-0 ${radius} overflow-hidden bg-mystic-850`}
                      style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
                      aria-hidden={!drawn.revealed}
                    >
                      {face ? (
                        <img
                          src={face}
                          alt={drawn.card.name}
                          decoding="async"
                          draggable={false}
                          className="w-full h-full object-cover pointer-events-none select-none"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 text-center">
                          <p className="text-caption text-mystic-300 line-clamp-3">{drawn.card.name}</p>
                        </div>
                      )}
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
                <div className="text-center">
                  <p className="text-caption text-mystic-400 leading-tight">{position}</p>
                  {/* Named as well as shown: an upside-down plate is not a label. */}
                  <p
                    className="text-caption text-amber-400 leading-tight transition-opacity duration-base ease-out"
                    style={{
                      opacity: drawn.revealed && drawn.reversed ? 1 : 0,
                      transitionDelay: `${delay + FLIP_MS - 140}ms`,
                    }}
                    aria-hidden={!(drawn.revealed && drawn.reversed)}
                  >
                    {drawn.reversed ? t('readings.revealView.reversed') : ' '}
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
        The interpretation arrives *after* the last card has turned, so the
        sequence reads as cause and effect rather than as two things
        happening at once. `both` fill keeps it invisible during the delay;
        without it the block would flash in at full opacity first. The
        delay is computed above from the flip that completed the reveal.
      */}
      {allRevealed && (
        <div
          className="space-y-6 animate-fade-in"
          style={{ animationDuration: '320ms', animationDelay: `${revealTailMs}ms`, animationFillMode: 'both' }}
        >
          <div className="border-t border-mystic-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="heading-display-md text-mystic-100">{t('readings.interpretation')}</h3>
              {!showAIInterpretation && (
                <Chip
                  variant="outline"
                  size="sm"
                  onClick={() => { if (!loadingAI) onGetAIInterpretation(); }}
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
              )}
            </div>

            {showAIInterpretation && aiInterpretation ? (
              <div className="space-y-4">
                <Card padding="lg" className="bg-gradient-to-br from-gold/5 via-cosmic-blue/5 to-gold/5 border-gold/20">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                      <Brain className="w-4 h-4 text-gold" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-ui font-medium text-mystic-100 mb-1">{t('readings.revealView.aiInterpretation')}</h4>
                      <p className="text-meta text-mystic-400">{t('readings.revealView.aiSubtitle')}</p>
                    </div>
                  </div>
                  <ReadingProse text={aiInterpretation} />
                </Card>
                <button
                  onClick={onHideAIInterpretation}
                  className="text-caption text-mystic-400 hover:text-mystic-300 transition-colors duration-fast"
                >
                  {t('readings.revealView.showCardMeanings')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {(selectedFocus === 'Love' || selectedFocus === 'Career' || selectedFocus === 'Money') &&
                 drawnCards.some(d => getFocusInterpretation(d.card, selectedFocus, d.reversed)) && (
                  <Tabs
                    size="sm"
                    idPrefix="interp"
                    aria-label={t('readings.interpretation')}
                    className="mb-4"
                    value={interpretationView}
                    onChange={onSetInterpretationView}
                    items={[
                      {
                        id: 'focus',
                        icon: selectedFocus === 'Love' ? Heart : Briefcase,
                        label: selectedFocus === 'Love'
                          ? t('readings.revealView.loveFocus')
                          : selectedFocus === 'Career'
                            ? t('readings.revealView.careerFocus')
                            : t('readings.revealView.moneyFocus'),
                      },
                      { id: 'traditional', icon: ArrowUp, label: t('readings.revealView.traditional') },
                    ]}
                  />
                )}

                {drawnCards.map((drawn, i) => {
                  const focusInterp = getFocusInterpretation(drawn.card, selectedFocus, drawn.reversed);
                  const showFocusContent = interpretationView === 'focus' && focusInterp;

                  return (
                    <div key={i} className="mb-6 last:mb-0">
                      <div className="flex items-start gap-3 mb-2">
                        <Tag tone="neutral" size="md">
                          {getPositionLabel(i)}
                        </Tag>
                        <div className="flex-1">
                          <h4 className="text-ui font-medium text-mystic-100">
                            {drawn.card.name}
                            {drawn.reversed && <span className="text-meta text-mystic-400 ml-2">{t('readings.revealView.reversedParen')}</span>}
                          </h4>
                        </div>
                      </div>

                      {showFocusContent ? (
                        <div className={`rounded-control p-3 ${
                          focusInterp.color === 'pink'
                            ? 'bg-pink-500/10 border border-pink-500/20'
                            : 'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            <focusInterp.icon className={`w-4 h-4 ${focusInterp.color === 'pink' ? 'text-pink-400' : 'text-blue-400'}`} />
                            <span className={`text-meta font-medium ${focusInterp.color === 'pink' ? 'text-pink-400' : 'text-blue-400'}`}>
                              {focusInterp.label}
                            </span>
                          </div>
                          <p className="reading-copy">
                            {focusInterp.content}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {drawn.reversed ? (
                              <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            <span className={`text-meta font-medium ${drawn.reversed ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {drawn.reversed ? t('readings.revealView.reversed') : t('readings.revealView.upright')}
                            </span>
                          </div>
                          <ReadingProse
                            lede={false}
                            text={(() => {
                              const focus = selectedFocus;
                              const focusMeaning =
                                focus === 'Love'
                                  ? drawn.card.loveMeaning
                                  : focus === 'Career'
                                    ? drawn.card.careerMeaning
                                    : undefined;
                              const mainText =
                                focusMeaning ||
                                (drawn.reversed ? drawn.card.meaningReversed : drawn.card.meaningUpright);
                              const reversalAddon =
                                focusMeaning && drawn.reversed
                                  ? `\n\n${t('readings.revealView.reversalNote', { text: drawn.card.meaningReversed })}`
                                  : '';
                              return `${mainText}${reversalAddon}`;
                            })()}
                          />
                        </div>
                      )}

                      {drawn.card.reflectionPrompt && showFocusContent && (
                        <div className="mt-3 p-3 bg-gold/5 border border-gold/20 rounded-control">
                          <p className="reading-copy text-mystic-100 flex items-start gap-2">
                            <Feather className="w-4 h-4 mt-1.5 flex-shrink-0 text-gold" />
                            <span>{drawn.card.reflectionPrompt}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={onSave}>
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span className="text-caption">{isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={onShare}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-caption">{t('readings.revealView.share', { defaultValue: 'Share this reading' })}</span>
            </Button>
            <Button variant="gold" onClick={onNewReading}>
              <span className="text-caption">{t('readings.revealView.newReading')}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
