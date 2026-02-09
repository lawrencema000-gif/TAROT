import { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronRight,
  Lock,
  Bookmark,
  BookmarkCheck,
  Grid3X3,
  Layers,
  Info,
  Shuffle,
  Brain,
  Loader2,
  Play,
  Heart,
  Briefcase,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, Button, Sheet, Chip, toast } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { getAllTarotCards } from '../../services/tarotCards';
import { TarotCardDetail } from './TarotCardDetail';
import { CelticCrossLayout } from './CelticCrossLayout';
import { generatePremiumReading, tarotCardToReadingCard, getSpreadPositions } from '../../services/readingInterpretation';
import { getZodiacSign } from '../../utils/zodiac';
import type { TarotCard } from '../../types';
import { useImagePreloader } from '../../hooks/useImagePreloader';
import { adsService } from '../../services/ads';
import { awardXP } from '../../services/levelSystem';
import { checkAchievementProgress } from '../../services/achievements';
import { getBundledCardPath } from '../../config/bundledImages';
import { WatchAdSheet } from '../premium';
import { rewardedAdsService } from '../../services/rewardedAds';
import { spreadTypeToFeature, FREE_TIER, type PremiumFeature } from '../../services/premium';
import { isNative } from '../../utils/platform';
import { ratePromptService } from '../../services/ratePrompt';

const DAILY_READINGS_KEY = 'arcana_daily_readings';
const DAILY_READINGS_DATE_KEY = 'arcana_daily_readings_date';

function getDailyReadingCount(): number {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = localStorage.getItem(DAILY_READINGS_DATE_KEY);
    if (storedDate !== today) {
      localStorage.setItem(DAILY_READINGS_DATE_KEY, today);
      localStorage.setItem(DAILY_READINGS_KEY, '0');
      return 0;
    }
    return parseInt(localStorage.getItem(DAILY_READINGS_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementDailyReadingCount(): void {
  try {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(DAILY_READINGS_DATE_KEY, today);
    const current = getDailyReadingCount();
    localStorage.setItem(DAILY_READINGS_KEY, (current + 1).toString());
  } catch {
    // silent
  }
}

type TarotView = 'home' | 'focus' | 'shuffle' | 'select' | 'reveal' | 'browse';
type FocusArea = 'Love' | 'Career' | 'Self' | 'Money' | 'Health' | 'General';

interface TarotSectionProps {
  onShowPaywall: (feature: string) => void;
}

const focusAreas: FocusArea[] = ['Love', 'Career', 'Self', 'Money', 'Health', 'General'];

const spreadConfigs = [
  { id: 'single', name: '1-Card Daily', description: 'Quick guidance', free: true, count: 1 },
  { id: 'three-card', name: 'Past/Present/Future', description: '3-card spread', free: true, count: 3 },
  { id: 'celtic-cross', name: 'Celtic Cross', description: '10-card deep reading', free: false, count: 10 },
  { id: 'relationship', name: 'Relationship Spread', description: '5-card love reading', free: false, count: 5 },
  { id: 'career', name: 'Career Decision', description: '6-card career insight', free: false, count: 6 },
  { id: 'shadow', name: 'Shadow Work', description: '7-card inner work', free: false, count: 7 },
];

export function TarotSection({ onShowPaywall }: TarotSectionProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { tarotRefreshTrigger, openRatePrompt } = useApp();
  const [view, setView] = useState<TarotView>('home');
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [drawnCards, setDrawnCards] = useState<{ card: TarotCard; reversed: boolean; revealed: boolean }[]>([]);
  const [currentSpread, setCurrentSpread] = useState<string>('single');
  const [selectedCard, setSelectedCard] = useState<{ card: TarotCard; reversed: boolean } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseFilter, setBrowseFilter] = useState<'all' | 'major' | 'swords' | 'cups' | 'wands' | 'pentacles'>('all');
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShuffling, setIsShuffling] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [deckCards, setDeckCards] = useState<number[]>([]);
  const [aiInterpretation, setAiInterpretation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAIInterpretation, setShowAIInterpretation] = useState(false);
  const [interpretationView, setInterpretationView] = useState<'focus' | 'traditional'>('focus');
  const [showWatchAdSheet, setShowWatchAdSheet] = useState(false);
  const [pendingFeature, setPendingFeature] = useState<PremiumFeature | null>(null);
  const [pendingSpreadId, setPendingSpreadId] = useState<string | null>(null);
  const [hasTemporaryAccess, setHasTemporaryAccess] = useState<Record<string, boolean>>({});
  const [dailyReadingCount, setDailyReadingCount] = useState(getDailyReadingCount);

  const today = new Date().toISOString().split('T')[0];
  const isAtDailyLimit = !profile?.isPremium && dailyReadingCount >= FREE_TIER.dailyReadings;

  const getCardImage = (card: TarotCard): string | undefined => {
    const bundledPath = getBundledCardPath(card.id);
    return bundledPath || card.imageUrl;
  };

  useEffect(() => {
    const loadCards = async () => {
      setLoading(true);
      const cards = await getAllTarotCards();
      setTarotCards(cards);
      setLoading(false);
    };
    loadCards();
  }, [tarotRefreshTrigger]);

  const filteredDeck = tarotCards.filter(card => {
    if (browseFilter === 'all') return true;
    if (browseFilter === 'major') return card.arcana === 'major';
    return card.suit === browseFilter;
  });

  useImagePreloader(
    filteredDeck.slice(0, 6).map(card => card.imageUrl).filter((url): url is string => !!url),
    showBrowse
  );

  useEffect(() => {
    const checkTemporaryAccess = async () => {
      if (profile?.isPremium) return;

      const premiumSpreads = spreadConfigs.filter(s => !s.free);
      const accessMap: Record<string, boolean> = {};

      for (const spread of premiumSpreads) {
        const feature = spreadTypeToFeature(spread.id);
        if (feature) {
          accessMap[spread.id] = await rewardedAdsService.hasTemporaryAccess(feature);
        }
      }

      setHasTemporaryAccess(accessMap);
    };

    checkTemporaryAccess();
  }, [profile?.isPremium, showWatchAdSheet]);

  const shuffleArray = <T,>(input: T[]): T[] => {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const handleStartDraw = () => {
    if (isAtDailyLimit) {
      if (isNative() && rewardedAdsService.canWatchAd()) {
        setPendingFeature('extra_reading');
        setPendingSpreadId(null);
        setShowWatchAdSheet(true);
      } else {
        onShowPaywall('Unlimited Readings');
      }
      return;
    }

    setView('focus');
    setSelectedFocus(null);
    setIsSaved(false);
    setInterpretationView('focus');
    setShowAIInterpretation(false);
    setAiInterpretation(null);
  };

  const handleFocusSelect = (focus: FocusArea) => {
    setSelectedFocus(focus);
  };

  const handleDraw = () => {
    if (!selectedFocus) return;
    const spread = spreadConfigs.find(s => s.id === currentSpread);
    if (!spread) return;

    if (!spread.free && !profile?.isPremium && !hasTemporaryAccess[currentSpread]) {
      const feature = spreadTypeToFeature(currentSpread);
      if (feature && isNative() && rewardedAdsService.canWatchAd()) {
        setPendingFeature(feature);
        setPendingSpreadId(currentSpread);
        setShowWatchAdSheet(true);
      } else {
        onShowPaywall(spread.name);
      }
      return;
    }

    setView('shuffle');
  };

  const handleAdUnlocked = async () => {
    setShowWatchAdSheet(false);

    if (pendingFeature === 'extra_reading') {
      setView('focus');
      setSelectedFocus(null);
      setIsSaved(false);
      setInterpretationView('focus');
      setShowAIInterpretation(false);
      setAiInterpretation(null);
    } else if (pendingSpreadId) {
      setHasTemporaryAccess(prev => ({ ...prev, [pendingSpreadId]: true }));
      setView('shuffle');
    }

    setPendingFeature(null);
    setPendingSpreadId(null);
  };

  const handleShuffleComplete = () => {
    setIsShuffling(true);

    setTimeout(() => {
      const baseIds =
        tarotCards.length > 0
          ? tarotCards.map(c => c.id)
          : Array.from({ length: 78 }, (_, i) => i);

      const shuffledIds = shuffleArray(baseIds);

      setDeckCards(shuffledIds);
      setSelectedIndices([]);
      setAiInterpretation(null);
      setShowAIInterpretation(false);
      setIsSaved(false);

      setIsShuffling(false);
      setView('select');
    }, 2000);
  };

  const handleCardSelect = (cardId: number) => {
    const spread = spreadConfigs.find(s => s.id === currentSpread);
    if (!spread) return;

    if (selectedIndices.includes(cardId)) {
      setSelectedIndices(prev => prev.filter(id => id !== cardId));
    } else if (selectedIndices.length < spread.count) {
      setSelectedIndices(prev => [...prev, cardId]);
    }
  };

  const handleRevealSelected = () => {
    const spread = spreadConfigs.find(s => s.id === currentSpread);
    if (!spread || selectedIndices.length !== spread.count) return;
    if (tarotCards.length === 0) return;

    const cardById = new Map(tarotCards.map(c => [c.id, c]));
    const selectedCards = selectedIndices
      .map(id => cardById.get(id))
      .filter((c): c is TarotCard => !!c);

    if (selectedCards.length !== spread.count) {
      toast('Some selected cards could not be found. Please reshuffle and try again.', 'error');
      return;
    }

    const reversedChance = 0.35;

    setDrawnCards(
      selectedCards.map(card => ({
        card,
        reversed: Math.random() < reversedChance,
        revealed: false,
      }))
    );

    incrementDailyReadingCount();
    setDailyReadingCount(getDailyReadingCount());
    setAiInterpretation(null);
    setShowAIInterpretation(false);
    setView('reveal');

    if (user) {
      awardXP(user.id, 'reading_complete').then(() => refreshProfile());
      checkAchievementProgress(user.id, 'reading_complete');
      if (currentSpread === 'celtic-cross') {
        checkAchievementProgress(user.id, 'celtic_cross_complete');
      }
      checkAchievementProgress(user.id, 'spread_types_used');
    }
  };

  const handleRevealCard = (index: number) => {
    setDrawnCards(prev =>
      prev.map((c, i) => (i === index ? { ...c, revealed: true } : c))
    );
  };

  const revealAll = () => {
    setDrawnCards(prev => prev.map(c => ({ ...c, revealed: true })));
  };

  const allRevealed = drawnCards.every(c => c.revealed);

  const handleSaveReading = async () => {
    if (!user || drawnCards.length === 0) return;

    const { error } = await supabase.from('tarot_readings').insert({
      user_id: user.id,
      date: today,
      spread_type: currentSpread,
      focus_area: selectedFocus,
      cards: drawnCards.map((d, i) => ({
        cardId: d.card.id,
        cardName: d.card.name,
        reversed: d.reversed,
        position: getPositionLabel(i),
      })),
      saved: true,
    });

    if (error) {
      toast('Failed to save reading', 'error');
    } else {
      setIsSaved(true);
      toast('Reading saved', 'success');

      awardXP(user.id, 'reading_saved').then(() => refreshProfile());
      checkAchievementProgress(user.id, 'reading_saved');
      await adsService.checkAndShowAd(profile?.isPremium || false, 'reading', profile?.isAdFree || false);

      await ratePromptService.incrementPositiveActions(user.id);
      const shouldShow = await ratePromptService.shouldShowPrompt(user.id);
      if (shouldShow) {
        await ratePromptService.recordPromptShown(user.id);
        openRatePrompt();
      }
    }
  };

  const handleGetAIInterpretation = async () => {
    if (!profile?.isPremium) {
      onShowPaywall('AI Interpretation');
      return;
    }

    if (!user || drawnCards.length === 0) return;

    setLoadingAI(true);
    try {
      const readingCards = drawnCards.map(d => tarotCardToReadingCard(d.card, d.reversed));
      const zodiacSign = profile.birthDate ? getZodiacSign(profile.birthDate) : undefined;

      const focusForAI: 'love' | 'career' | 'general' =
        selectedFocus === 'Love' ? 'love' : selectedFocus === 'Career' ? 'career' : 'general';

      const result = await generatePremiumReading({
        cards: readingCards,
        spreadType: currentSpread,
        focusArea: focusForAI,
        zodiacSign: zodiacSign,
        goals: profile.goals,
      });

      setAiInterpretation(result.interpretation);
      setShowAIInterpretation(true);
      toast(result.usedLlm ? 'AI interpretation ready' : 'Interpretation ready', 'success');
    } catch (error) {
      console.error('Failed to generate AI interpretation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate interpretation';
      toast(errorMessage, 'error');
    } finally {
      setLoadingAI(false);
    }
  };

  const getPositionLabel = (index: number): string => {
    if (currentSpread === 'single') return 'Your Card';
    if (currentSpread === 'three-card') return ['Past', 'Present', 'Future'][index] || `Position ${index + 1}`;

    const positions = getSpreadPositions(currentSpread);
    return positions[index] || `Position ${index + 1}`;
  };

  const getFocusInterpretation = (card: TarotCard, focus: FocusArea | null, reversed: boolean): { content: string; icon: typeof Heart; label: string; color: string } | null => {
    if (focus === 'Love' && card.loveMeaning) {
      return {
        content: card.loveMeaning,
        icon: Heart,
        label: 'Love & Relationships',
        color: 'pink',
      };
    }
    if ((focus === 'Career' || focus === 'Money') && card.careerMeaning) {
      return {
        content: card.careerMeaning,
        icon: Briefcase,
        label: 'Career & Finance',
        color: 'blue',
      };
    }
    return null;
  };

  const handleSpreadSelect = (spreadId: string) => {
    const spread = spreadConfigs.find(s => s.id === spreadId);
    if (!spread) return;

    if (!spread.free && !profile?.isPremium && !hasTemporaryAccess[spreadId]) {
      const feature = spreadTypeToFeature(spreadId);
      if (feature && isNative() && rewardedAdsService.canWatchAd()) {
        setPendingFeature(feature);
        setPendingSpreadId(spreadId);
        setCurrentSpread(spreadId);
        setShowWatchAdSheet(true);
      } else {
        onShowPaywall(spread.name);
      }
      return;
    }

    setCurrentSpread(spreadId);
    handleStartDraw();
  };

  if (view === 'focus') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView('home')}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center space-y-3">
          <Sparkles className="w-12 h-12 text-gold mx-auto animate-pulse" />
          <h2 className="font-display text-2xl text-mystic-100">What's your focus?</h2>
          <p className="text-mystic-400">Choose an area to guide your reading</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {focusAreas.map(focus => (
            <Chip
              key={focus}
              label={focus}
              selected={selectedFocus === focus}
              onSelect={() => handleFocusSelect(focus)}
            />
          ))}
        </div>

        <Button
          variant="gold"
          fullWidth
          disabled={!selectedFocus}
          onClick={handleDraw}
          className="min-h-[52px]"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (view === 'shuffle') {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView('focus')}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center space-y-6 py-12">
          <div className="relative flex justify-center items-center min-h-[160px]">
            <div className="relative">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-20 h-28 bg-gradient-to-br from-mystic-800 to-mystic-900 rounded-xl border-2 border-gold/30 shadow-glow overflow-hidden"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(-50%, -50%) translateX(${i * 2}px) translateY(${i * -1}px) rotate(${i * 0.5}deg)`,
                    zIndex: i,
                    animation: isShuffling ? `shuffle-card ${0.6 + i * 0.05}s ease-in-out infinite` : 'none',
                  }}
                >
                  {profile?.card_back_url ? (
                    <img src={profile.card_back_url} alt="Card Back" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent rounded-xl" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-xl text-mystic-100">
              {isShuffling ? 'Shuffling the deck...' : 'Clear your mind'}
            </h2>
            <p className="text-mystic-400 text-sm">
              {isShuffling ? 'Spreading all 78 cards' : 'Focus on your question'}
            </p>
          </div>

          {!isShuffling && (
            <Button
              variant="gold"
              onClick={handleShuffleComplete}
              className="min-h-[52px]"
            >
              <Shuffle className="w-4 h-4" />
              Shuffle Deck
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'select') {
    const spread = spreadConfigs.find(s => s.id === currentSpread);
    const needsMore = spread ? spread.count - selectedIndices.length : 0;

    return (
      <div className="flex flex-col h-full space-y-4">
        <button
          onClick={() => setView('shuffle')}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          ← Back
        </button>

        <div className="text-center space-y-2 sticky top-0 bg-mystic-950 z-10 pb-3">
          <h2 className="font-display text-xl text-mystic-100">
            {needsMore > 0
              ? `Choose ${needsMore} more ${needsMore === 1 ? 'card' : 'cards'}`
              : 'Ready to reveal!'
            }
          </h2>
          <p className="text-mystic-400 text-sm">Trust your intuition • All 78 cards</p>
        </div>

        <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-20">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {deckCards.map((cardId) => {
              const isSelected = selectedIndices.includes(cardId);
              const selectionOrder = selectedIndices.indexOf(cardId) + 1;

              return (
                <button
                  key={cardId}
                  onClick={() => handleCardSelect(cardId)}
                  className="relative group"
                >
                  <div
                    className={`
                      aspect-[2/3] rounded-lg border-2 transition-all duration-300 overflow-hidden
                      ${isSelected
                        ? 'border-gold bg-gradient-to-br from-gold/20 to-mystic-800 shadow-gold scale-105'
                        : 'border-mystic-600 bg-gradient-to-br from-mystic-800 to-mystic-900 hover:border-gold/50 hover:scale-105'
                      }
                      flex items-center justify-center
                      active:scale-95 relative
                    `}
                  >
                    {!isSelected && profile?.card_back_url && (
                      <img src={profile.card_back_url} alt="Card Back" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    <div className="relative z-10">
                      {isSelected ? (
                        <div className="w-7 h-7 rounded-full bg-gold flex items-center justify-center text-mystic-950 font-bold text-sm shadow-lg">
                          {selectionOrder}
                        </div>
                      ) : (
                        <Sparkles className="w-5 h-5 text-gold/30 group-hover:text-gold/60 transition-colors" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-20 left-0 right-0 px-4 bg-gradient-to-t from-mystic-950 via-mystic-950 to-transparent pt-4 pb-4">
          <Button
            variant="gold"
            fullWidth
            disabled={needsMore > 0}
            onClick={handleRevealSelected}
            className="min-h-[52px] shadow-xl"
          >
            {needsMore > 0 ? `Select ${needsMore} More` : 'Reveal Cards'}
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'reveal') {
    const spread = spreadConfigs.find(s => s.id === currentSpread);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('home')}
            className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={handleSaveReading}
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
          <p className="text-xs text-mystic-500 uppercase tracking-wider">{selectedFocus} Reading</p>
          <h2 className="font-display text-xl text-mystic-100">{spread?.name}</h2>
        </div>

        {currentSpread === 'celtic-cross' ? (
          <CelticCrossLayout
            drawnCards={drawnCards}
            onRevealCard={handleRevealCard}
            onCardClick={(card, reversed) => setSelectedCard({ card, reversed })}
            getPositionLabel={getPositionLabel}
            cardBackUrl={profile?.card_back_url}
          />
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {drawnCards.map((drawn, i) => (
              <div key={i} className="relative group">
                <button
                  onClick={() => drawn.revealed ? setSelectedCard({ card: drawn.card, reversed: drawn.reversed }) : handleRevealCard(i)}
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
                    style={{
                      transformStyle: 'preserve-3d',
                    }}
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
                        {profile?.card_back_url ? (
                          <img src={profile.card_back_url} alt="Card Back" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center">
                            <div className="w-8 h-8 mx-auto rounded-full bg-gold/10 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                              <Sparkles className="w-4 h-4 text-gold/50 group-hover:text-gold transition-colors" />
                            </div>
                            <p className="text-xs text-mystic-500 mt-2">Tap to reveal</p>
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
          <Button variant="ghost" fullWidth onClick={revealAll} className="min-h-[44px]">
            Reveal All
          </Button>
        )}

        {allRevealed && (
          <div className="space-y-6 animate-fade-in">
            <div className="border-t border-mystic-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-gold">Interpretation</h3>
                {!showAIInterpretation && (
                  <button
                    onClick={handleGetAIInterpretation}
                    disabled={loadingAI}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gold/20 to-cosmic-blue/20 border border-gold/30 rounded-full text-xs text-gold hover:from-gold/30 hover:to-cosmic-blue/30 transition-all disabled:opacity-50"
                  >
                    {loadingAI ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" />
                        {profile?.isPremium ? 'Get AI Insight' : 'Premium AI'}
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
                        <h4 className="font-medium text-mystic-100 mb-1">AI Interpretation</h4>
                        <p className="text-xs text-mystic-400">Personalized insight based on your cards and profile</p>
                      </div>
                    </div>
                    <div className="text-sm text-mystic-200 leading-relaxed whitespace-pre-line">
                      {aiInterpretation}
                    </div>
                  </Card>
                  <button
                    onClick={() => setShowAIInterpretation(false)}
                    className="text-xs text-mystic-400 hover:text-mystic-300 transition-colors"
                  >
                    ← Show card meanings
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(selectedFocus === 'Love' || selectedFocus === 'Career' || selectedFocus === 'Money') &&
                   drawnCards.some(d => getFocusInterpretation(d.card, selectedFocus, d.reversed)) && (
                    <div className="flex gap-1 p-1 bg-mystic-800/50 rounded-lg mb-4">
                      <button
                        onClick={() => setInterpretationView('focus')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          interpretationView === 'focus'
                            ? 'bg-gold/20 text-gold'
                            : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/50'
                        }`}
                      >
                        {selectedFocus === 'Love' ? <Heart className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                        {selectedFocus} Focus
                      </button>
                      <button
                        onClick={() => setInterpretationView('traditional')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          interpretationView === 'traditional'
                            ? 'bg-gold/20 text-gold'
                            : 'text-mystic-400 hover:text-mystic-200 hover:bg-mystic-700/50'
                        }`}
                      >
                        <ArrowUp className="w-4 h-4" />
                        Traditional
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
                              {drawn.reversed && <span className="text-mystic-400 text-sm ml-2">(Reversed)</span>}
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
                                {drawn.reversed ? 'Reversed' : 'Upright'}
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
                                    ? `\n\nReversal note: ${drawn.card.meaningReversed}`
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
                "The cards have spoken. What small action can you take today that aligns with this guidance?"
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleSaveReading} className="min-h-[44px]">
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {isSaved ? 'Saved' : 'Save'}
              </Button>
              <Button variant="gold" onClick={() => setView('home')} className="min-h-[44px]">
                New Reading
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        variant="glow"
        padding="lg"
        interactive
        onClick={handleStartDraw}
        className="text-center active:scale-[0.98] transition-transform hover:shadow-gold"
      >
        <div className="w-20 h-28 mx-auto mb-4 bg-gradient-to-br from-gold/20 to-mystic-800 rounded-xl border-2 border-gold/30 flex items-center justify-center shadow-glow hover:scale-105 transition-transform overflow-hidden">
          {profile?.card_back_url ? (
            <img src={profile.card_back_url} alt="Card Back" className="w-full h-full object-cover" />
          ) : (
            <Sparkles className="w-10 h-10 text-gold animate-pulse" />
          )}
        </div>
        <h2 className="font-display text-xl text-mystic-100 mb-1">Daily Draw</h2>
        <p className="text-mystic-400 text-sm">Tap to begin your reading</p>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-mystic-200">Spreads</h3>
          <Layers className="w-4 h-4 text-mystic-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {spreadConfigs.map(spread => (
            <Card
              key={spread.id}
              interactive
              padding="md"
              onClick={() => handleSpreadSelect(spread.id)}
              className="relative active:scale-[0.98] transition-all hover:border-gold/30"
            >
              {!spread.free && !profile?.isPremium && !hasTemporaryAccess[spread.id] && (
                isNative() && rewardedAdsService.canWatchAd() ? (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-mystic-800/80 rounded-full">
                    <Play className="w-3 h-3 text-gold" />
                    <span className="text-[10px] text-gold">Try</span>
                  </div>
                ) : (
                  <Lock className="absolute top-2 right-2 w-4 h-4 text-gold" />
                )
              )}
              {!spread.free && hasTemporaryAccess[spread.id] && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                  <span className="text-[10px] text-emerald-400">Unlocked</span>
                </div>
              )}
              <h4 className="font-medium text-mystic-100 text-sm">{spread.name}</h4>
              <p className="text-xs text-mystic-400 mt-1">{spread.description}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-mystic-200">Browse Deck</h3>
          <Grid3X3 className="w-4 h-4 text-mystic-500" />
        </div>
        <Card
          interactive
          padding="md"
          onClick={() => setShowBrowse(true)}
          className="flex items-center justify-between active:scale-[0.98] transition-all hover:border-gold/30"
        >
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-8 h-11 bg-gradient-to-br from-mystic-700 to-mystic-900 rounded border border-mystic-600 hover:border-gold/40 transition-colors overflow-hidden"
                >
                  {profile?.card_back_url && (
                    <img src={profile.card_back_url} alt="Card Back" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium text-mystic-100 text-sm">All 78 Cards</h4>
              <p className="text-xs text-mystic-400">Learn card meanings</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-mystic-400" />
        </Card>
      </div>

      <Sheet open={showBrowse} onClose={() => setShowBrowse(false)} title="Browse Deck">
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'major', 'swords', 'cups', 'wands', 'pentacles'] as const).map(filter => (
              <Chip
                key={filter}
                label={
                  filter === 'all' ? 'All' :
                  filter === 'major' ? 'Major Arcana' :
                  filter === 'swords' ? 'Swords' :
                  filter === 'cups' ? 'Cups' :
                  filter === 'wands' ? 'Wands' :
                  'Pentacles'
                }
                selected={browseFilter === filter}
                onSelect={() => setBrowseFilter(filter)}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto pb-4">
            {filteredDeck.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard({ card, reversed: false });
                  setShowBrowse(false);
                }}
                className="relative aspect-[2/3] rounded-xl border border-mystic-600 hover:border-gold/50 hover:scale-105 active:scale-95 transition-all overflow-hidden group min-h-[140px]"
              >
                {getCardImage(card) ? (
                  <>
                    <img
                      src={getCardImage(card)}
                      alt={card.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-mystic-900/90 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-xs text-center text-white font-medium drop-shadow-lg">{card.name}</p>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-mystic-700 to-mystic-900 flex flex-col items-center justify-center p-2">
                    <Sparkles className="w-6 h-6 text-gold/50 mb-2 group-hover:text-gold transition-colors" />
                    <p className="text-xs text-center text-mystic-300 line-clamp-2">{card.name}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition-colors rounded-xl" />
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      <Sheet open={!!selectedCard} onClose={() => setSelectedCard(null)} title={selectedCard?.card.name}>
        {selectedCard && (
          <TarotCardDetail
            card={selectedCard.card}
            reversed={selectedCard.reversed}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </Sheet>

      {pendingFeature && (
        <WatchAdSheet
          open={showWatchAdSheet}
          onClose={() => {
            setShowWatchAdSheet(false);
            setPendingFeature(null);
            setPendingSpreadId(null);
          }}
          feature={pendingFeature}
          onUnlocked={handleAdUnlocked}
          onShowPaywall={() => {
            setShowWatchAdSheet(false);
            setPendingFeature(null);
            setPendingSpreadId(null);
            const spread = spreadConfigs.find(s => s.id === pendingSpreadId);
            if (spread) {
              onShowPaywall(spread.name);
            }
          }}
        />
      )}
    </div>
  );
}
