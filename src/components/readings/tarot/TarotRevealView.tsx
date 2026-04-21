/**
 * TarotSection reveal view — extracted from the monolithic TarotSection.tsx
 * as part of the `tarot-section-split` rollout.
 *
 * This is the largest of the extracted views: card reveal flipping,
 * position labels, focus/traditional/AI interpretation tabs, save +
 * new-reading actions. All state and handlers are passed in from the
 * parent — this component is pure presentation.
 */
import {
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Info,
  Brain,
  Loader2,
  Heart,
  Briefcase,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, Button } from '../../ui';
import { useT } from '../../../i18n/useT';
import { CelticCrossLayout } from '../CelticCrossLayout';
import type { TarotCard } from '../../../types';
import type { FocusArea } from './types';

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
    onRevealCard,
    onRevealAll,
    onCardClick,
    onGetAIInterpretation,
    onHideAIInterpretation,
    onSetInterpretationView,
    onNewReading,
  } = props;

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
        <p className="text-xs text-mystic-500 uppercase tracking-wider">{focusReadingLabel}</p>
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
          {drawnCards.map((drawn, i) => (
            <div key={i} className="relative group">
              <button
                onClick={() => drawn.revealed ? onCardClick(drawn.card, drawn.reversed) : onRevealCard(i)}
                className="relative perspective-1000"
              >
                <div
                  className={`
                    w-24 h-36
                    rounded-xl border transition-all duration-700 overflow-hidden
                    ${drawn.revealed
                      ? 'border-gold/40 shadow-glow animate-flip-in'
                      : 'bg-gradient-to-br from-mystic-800 to-mystic-900 border-mystic-600 hover:border-gold/30 cursor-pointer hover:scale-105'
                    }
                    flex items-center justify-center relative
                  `}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {drawn.revealed ? (
                    getCardImage(drawn.card) ? (
                      <img
                        src={getCardImage(drawn.card)}
                        alt={drawn.card.name}
                        className={`w-full h-full object-cover ${drawn.reversed ? 'rotate-180' : ''}`}
                      />
                    ) : (
                      <div className={`text-center p-2 bg-gradient-to-br from-mystic-700 to-mystic-900 w-full h-full flex flex-col items-center justify-center ${drawn.reversed ? 'rotate-180' : ''}`}>
                        <Sparkles className="w-5 h-5 text-gold mx-auto mb-1" />
                        <p className="text-xs text-mystic-300 line-clamp-2">{drawn.card.name}</p>
                      </div>
                    )
                  ) : (
                    <>
                      {cardBackUrl ? (
                        <img src={cardBackUrl} alt="Card Back" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <div className="w-8 h-8 mx-auto rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                            <Sparkles className="w-4 h-4 text-gold/50 group-hover:text-gold transition-colors" />
                          </div>
                          <p className="text-xs text-mystic-500 mt-2">{t('readings.revealView.tapToReveal')}</p>
                        </div>
                      )}
                    </>
                  )}

                  {!drawn.revealed && (
                    <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/5 rounded-xl transition-all duration-300" />
                  )}
                </div>
                {drawn.revealed && (
                  <div className="absolute top-1 right-1 w-6 h-6 bg-mystic-900/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-gold/30 shadow-lg">
                    <Info className="w-3.5 h-3.5 text-gold" />
                  </div>
                )}
              </button>
              <p className="text-xs text-mystic-400 mt-1 text-center">
                {getPositionLabel(i)}
              </p>
            </div>
          ))}
        </div>
      )}

      {!allRevealed && (
        <Button variant="ghost" fullWidth onClick={onRevealAll} className="min-h-[44px]">
          {t('readings.revealView.revealAll')}
        </Button>
      )}

      {allRevealed && (
        <div className="space-y-6 animate-fade-in">
          <div className="border-t border-mystic-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-gold">{t('readings.interpretation')}</h3>
              {!showAIInterpretation && (
                <button
                  onClick={onGetAIInterpretation}
                  disabled={loadingAI}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gold/20 to-cosmic-blue/20 border border-gold/30 rounded-full text-xs text-gold hover:from-gold/30 hover:to-cosmic-blue/30 transition-all disabled:opacity-50"
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
                </button>
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
                      <p className="text-xs text-mystic-400">{t('readings.revealView.aiSubtitle')}</p>
                    </div>
                  </div>
                  <div className="text-sm text-mystic-200 leading-relaxed whitespace-pre-line">
                    {aiInterpretation}
                  </div>
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
                  <div className="flex gap-1 p-1 bg-mystic-800/50 rounded-lg mb-4">
                    <button
                      onClick={() => onSetInterpretationView('focus')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        interpretationView === 'focus'
                          ? 'bg-gold/20 text-gold'
                          : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/50'
                      }`}
                    >
                      {selectedFocus === 'Love' ? <Heart className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                      {selectedFocus === 'Love'
                        ? t('readings.revealView.loveFocus')
                        : selectedFocus === 'Career'
                          ? t('readings.revealView.careerFocus')
                          : t('readings.revealView.moneyFocus')}
                    </button>
                    <button
                      onClick={() => onSetInterpretationView('traditional')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                        interpretationView === 'traditional'
                          ? 'bg-gold/20 text-gold'
                          : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/50'
                      }`}
                    >
                      <ArrowUp className="w-4 h-4" />
                      {t('readings.revealView.traditional')}
                    </button>
                  </div>
                )}

                {drawnCards.map((drawn, i) => {
                  const focusInterp = getFocusInterpretation(drawn.card, selectedFocus, drawn.reversed);
                  const showFocusContent = interpretationView === 'focus' && focusInterp;

                  return (
                    <div key={i} className="mb-6 last:mb-0">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="px-2 py-0.5 bg-mystic-800 rounded text-xs text-mystic-400">
                          {getPositionLabel(i)}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-medium text-mystic-100">
                            {drawn.card.name}
                            {drawn.reversed && <span className="text-mystic-400 text-sm ml-2">{t('readings.revealView.reversedParen')}</span>}
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
                            <span className={`text-xs font-medium ${focusInterp.color === 'pink' ? 'text-pink-400' : 'text-blue-400'}`}>
                              {focusInterp.label}
                            </span>
                          </div>
                          <p className="text-sm text-mystic-200 leading-relaxed">
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
                            <span className={`text-xs font-medium ${drawn.reversed ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {drawn.reversed ? t('readings.revealView.reversed') : t('readings.revealView.upright')}
                            </span>
                          </div>
                          <p className="text-sm text-mystic-300 leading-relaxed whitespace-pre-line">
                            {(() => {
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
                          </p>
                        </div>
                      )}

                      {drawn.card.reflectionPrompt && showFocusContent && (
                        <div className="mt-3 p-2 bg-gold/5 border border-gold/20 rounded-lg">
                          <p className="text-xs text-gold flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="italic">{drawn.card.reflectionPrompt}</span>
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
            <p className="text-sm text-mystic-300 italic">
              {t('readings.revealView.cardsSpoken')}
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onSave} className="min-h-[44px]">
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              {isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}
            </Button>
            <Button variant="gold" onClick={onNewReading} className="min-h-[44px]">
              {t('readings.revealView.newReading')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
