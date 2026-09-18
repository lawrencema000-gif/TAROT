/**
 * TarotSection reveal view — extracted from the monolithic TarotSection.tsx
 * as part of the `tarot-section-split` rollout.
 *
 * This is the largest of the extracted views: card reveal flipping,
 * position labels, focus/traditional/AI interpretation tabs, save +
 * new-reading actions. All state and handlers are passed in from the
 * parent — this component is pure presentation.
 */
import { useRef, type CSSProperties } from 'react';
import {
  Eye,
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
  ArrowDown,
} from 'lucide-react';
import { MysticalStar } from '../../ui/MysticalStar';
import { Card, Button, Chip, Tabs, Tag, ReadingProse } from '../../ui';
import { useT } from '../../../i18n/useT';
import { CelticCrossLayout } from '../CelticCrossLayout';
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
 * Only `transform` and `opacity` move. The easing is a plain ease-out
 * with a long tail so the card decelerates into place instead of
 * arriving and stopping dead; no overshoot, because a card that
 * bounces past 180° reads as a glitch rather than as weight.
 *
 * Reduced motion needs nothing here: the global block in index.css
 * pins transition-duration/-delay with `!important`, which beats these
 * inline declarations, so the card snaps to its revealed face.
 */
const FLIP_MS = 520;
const FLIP_EASE = 'cubic-bezier(0.22, 0.68, 0.24, 1)';
/** Multi-card reveals land in sequence rather than as one slab. */
const FLIP_STAGGER_MS = 80;

const BACKFACE: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

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

  /*
   * Stagger is assigned per *reveal event*, not per card index. Tapping
   * the third card alone must flip it immediately — inheriting a 160ms
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          {t('readings.back')}
        </button>
        <button
          onClick={onSave}
          disabled={!allRevealed}
          className="p-2 rounded-full hover:bg-mystic-800 transition-all active:scale-90"
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
        <h2 className="font-display text-xl text-mystic-100">{spreadTitle}</h2>
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
        <div className="flex flex-wrap justify-center gap-4">
          {drawnCards.map((drawn, i) => {
            const delay = flipDelays.current[i] ?? 0;
            const face = getCardImage(drawn.card);
            return (
            <div key={i} className="relative group">
              <button
                onClick={() => drawn.revealed ? onCardClick(drawn.card, drawn.reversed) : onRevealCard(i)}
                className="relative"
              >
                {/*
                  Perspective and press feedback live on this wrapper; the
                  flip lives on the child. Two transforms on one element
                  would fight — the scale would overwrite the rotation.
                */}
                <div
                  className={`w-24 h-36 transition-transform duration-base ease-out ${
                    drawn.revealed ? '' : 'cursor-pointer hover:scale-105 active:scale-95'
                  }`}
                  style={{ perspective: '1000px' }}
                >
                  <div
                    className="relative w-full h-full"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: drawn.revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: `transform ${FLIP_MS}ms ${FLIP_EASE}`,
                      transitionDelay: `${delay}ms`,
                    }}
                  >
                    {/* Back — what you see before the turn. */}
                    <div
                      className="absolute inset-0 rounded-xl overflow-hidden border border-mystic-600 group-hover:border-gold/30 bg-gradient-to-br from-mystic-800 to-mystic-900 flex items-center justify-center transition-colors duration-base"
                      style={BACKFACE}
                    >
                      {cardBackUrl ? (
                        <img src={cardBackUrl} alt="Card Back" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors duration-base">
                            <Eye className="w-4 h-4 text-gold/50 group-hover:text-gold transition-colors duration-base" />
                          </div>
                          <p className="text-xs text-mystic-500 mt-2">{t('readings.revealView.tapToReveal')}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 rounded-xl transition-colors duration-base" />
                    </div>

                    {/*
                      Face — mounted from the start, pre-turned 180° and
                      hidden by backface-visibility. Rendering it only on
                      reveal would mean decoding the image mid-flip, which
                      is exactly when a mid-range phone can least afford it.
                    */}
                    <div
                      className="absolute inset-0 rounded-xl overflow-hidden border border-gold/40 flex items-center justify-center"
                      style={{ ...BACKFACE, transform: 'rotateY(180deg)' }}
                      aria-hidden={!drawn.revealed}
                    >
                      {face ? (
                        <img
                          src={face}
                          alt={drawn.card.name}
                          className={`w-full h-full object-cover ${drawn.reversed ? 'rotate-180' : ''}`}
                        />
                      ) : (
                        <div className={`text-center p-2 bg-gradient-to-br from-mystic-700 to-mystic-900 w-full h-full flex flex-col items-center justify-center ${drawn.reversed ? 'rotate-180' : ''}`}>
                          <MysticalStar size={20} halo={false} className="text-gold mx-auto mb-1" />
                          <p className="text-xs text-mystic-300 line-clamp-2">{drawn.card.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/*
                  The "there is more here" badge arrives as the card
                  settles, not with it — causality: the card turned, so
                  now it has an affordance.
                */}
                <div
                  className="absolute top-1 right-1 w-6 h-6 bg-mystic-900/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-gold/30 pointer-events-none transition-opacity duration-base ease-out"
                  style={{
                    opacity: drawn.revealed ? 1 : 0,
                    transitionDelay: `${delay + FLIP_MS - 140}ms`,
                  }}
                  aria-hidden={!drawn.revealed}
                >
                  <Info className="w-3.5 h-3.5 text-gold" />
                </div>
              </button>
              <p className="text-meta text-mystic-400 mt-1 text-center">
                {getPositionLabel(i)}
              </p>
            </div>
            );
          })}
        </div>
      )}

      {!allRevealed && (
        <Button variant="ghost" fullWidth onClick={onRevealAll}>
          {t('readings.revealView.revealAll')}
        </Button>
      )}

      {/*
        The interpretation arrives *after* the last card has turned, so the
        sequence reads as cause and effect rather than as two things
        happening at once. `both` fill keeps it invisible during the delay;
        without it the block would flash in at full opacity first.
      */}
      {allRevealed && (
        <div
          className="space-y-6 animate-fade-in"
          style={{ animationDuration: '320ms', animationDelay: '260ms', animationFillMode: 'both' }}
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
                      <h4 className="font-medium text-mystic-100 mb-1">{t('readings.revealView.aiInterpretation')}</h4>
                      <p className="text-meta text-mystic-400">{t('readings.revealView.aiSubtitle')}</p>
                    </div>
                  </div>
                  <ReadingProse text={aiInterpretation} />
                </Card>
                <button
                  onClick={onHideAIInterpretation}
                  className="text-xs text-mystic-400 hover:text-mystic-300 transition-colors"
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
                          <h4 className="font-medium text-mystic-100">
                            {drawn.card.name}
                            {drawn.reversed && <span className="text-meta text-mystic-400 ml-2">{t('readings.revealView.reversedParen')}</span>}
                          </h4>
                        </div>
                      </div>

                      {showFocusContent ? (
                        <div className={`rounded-lg p-3 ${
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
                        <div className="mt-3 p-3 bg-gold/5 border border-gold/20 rounded-lg">
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

          <Card padding="md" className="bg-gold/5 border-gold/20">
            <p className="reading-copy">
              {t('readings.revealView.cardsSpoken')}
            </p>
          </Card>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={onSave}>
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span className="text-xs">{isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={onShare}
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs">{t('readings.revealView.share', { defaultValue: 'Share' })}</span>
            </Button>
            <Button variant="gold" onClick={onNewReading}>
              <span className="text-xs">{t('readings.revealView.newReading')}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
