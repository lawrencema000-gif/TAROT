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
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { useRitual } from '../../context/RitualContext';
import { useGamification } from '../../context/GamificationContext';
import { tarotReadings } from '../../dal';
import { getAllTarotCards } from '../../services/tarotCards';
import { TarotCardDetail } from './TarotCardDetail';
import { CelticCrossLayout } from './CelticCrossLayout';
import { generatePremiumReading, tarotCardToReadingCard, getSpreadPositions } from '../../services/readingInterpretation';
import { getZodiacSign } from '../../utils/zodiac';
import type { TarotCard } from '../../types';
import { useImagePreloader } from '../../hooks/useImagePreloader';
import { adsService } from '../../services/ads';
import { awardXP } from '../../services/levelSystem';
import { checkAchievementProgress, checkSpecificCardAchievement } from '../../services/achievements';
import { isFullMoon } from '../../utils/moonPhase';
import { getBundledCardPath } from '../../config/bundledImages';
import { WatchAdSheet } from '../premium';
import { rewardedAdsService } from '../../services/rewardedAds';
import { spreadTypeToFeature, FREE_TIER, type PremiumFeature } from '../../services/premium';
import { isNative } from '../../utils/platform';
import { ratePromptService } from '../../services/ratePrompt';
import { appStorage } from '../../lib/appStorage';
import { useFeatureFlag } from '../../context/FeatureFlagContext';
import { TarotFocusView } from './tarot/TarotFocusView';
import { TarotShuffleView } from './tarot/TarotShuffleView';
import { TarotSelectView } from './tarot/TarotSelectView';
import { TarotRevealView } from './tarot/TarotRevealView';
import { TarotHomeView } from './tarot/TarotHomeView';

const DAILY_READINGS_KEY = 'arcana_daily_readings';
const DAILY_READINGS_DATE_KEY = 'arcana_daily_readings_date';

async function getDailyReadingCount(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const storedDate = await appStorage.get(DAILY_READINGS_DATE_KEY);
    if (storedDate !== today) {
      await appStorage.set(DAILY_READINGS_DATE_KEY, today);
      await appStorage.set(DAILY_READINGS_KEY, '0');
      return 0;
    }
    return parseInt((await appStorage.get(DAILY_READINGS_KEY)) || '0', 10);
  } catch {
    return 0;
  }
}

async function incrementDailyReadingCount(): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    await appStorage.set(DAILY_READINGS_DATE_KEY, today);
    const current = await getDailyReadingCount();
    await appStorage.set(DAILY_READINGS_KEY, (current + 1).toString());
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

const focusAreaI18nKey: Record<FocusArea, string> = {
  Love: 'readings.focusAreas.love',
  Career: 'readings.focusAreas.career',
  Self: 'readings.focusAreas.self',
  Money: 'readings.focusAreas.money',
  Health: 'readings.focusAreas.health',
  General: 'readings.focusAreas.general',
};

// Source-of-truth spread configs with i18n keys; .name/.description resolved at render time.
const spreadConfigs = [
  { id: 'single',        i18n: 'single',       free: true,  count: 1  },
  { id: 'three-card',    i18n: 'threeCard',    free: true,  count: 3  },
  { id: 'celtic-cross',  i18n: 'celticCross',  free: false, count: 10 },
  { id: 'relationship',  i18n: 'relationship', free: false, count: 5  },
  { id: 'career',        i18n: 'careerSpread', free: false, count: 6  },
  { id: 'shadow',        i18n: 'shadow',       free: false, count: 7  },
] as const;

type SpreadConfig = typeof spreadConfigs[number];

export function TarotSection({ onShowPaywall }: TarotSectionProps) {
  const { t } = useT('app');
  // Phase-5 rollout: when ON, render the extracted view components
  // from ./tarot/. Starts OFF at 0% — flip rollout_percent in the DB to
  // 10/50/100 after smoke-testing in prod.
  const useSplitViews = useFeatureFlag('tarot-section-split');
  const spreadName = (s: SpreadConfig) => t(`readings.spreads.${s.i18n}.name`);
  const spreadDesc = (s: SpreadConfig) => t(`readings.spreads.${s.i18n}.description`);
  const focusLabel = (f: FocusArea) => t(focusAreaI18nKey[f]);
  const { user, profile, refreshProfile } = useAuth();
  const { tarotRefreshTrigger } = useRitual();
  const { openRatePrompt } = useGamification();
  const [view, setView] = useState<TarotView>('home');
  const [selectedFocus, setSelectedFocus] = useState<FocusArea | null>(null);
  const [drawnCards, setDrawnCards] = useState<{ card: TarotCard; reversed: boolean; revealed: boolean }[]>([]);
  const [currentSpread, setCurrentSpread] = useState<string>('single');
  const [selectedCard, setSelectedCard] = useState<{ card: TarotCard; reversed: boolean } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [browseFilter, setBrowseFilter] = useState<'all' | 'major' | 'swords' | 'cups' | 'wands' | 'pentacles'>('all');
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
  const [, setLoading] = useState(true);
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
  const [dailyReadingCount, setDailyReadingCount] = useState(0);
  const [canWatchAd, setCanWatchAd] = useState(false);

  useEffect(() => {
    getDailyReadingCount().then(setDailyReadingCount);
    if (isNative()) {
      rewardedAdsService.canWatchAd().then(setCanWatchAd);
    }
  }, []);

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
          accessMap[spread.id] = await rewardedAdsService.hasTemporaryAccess(feature, spread.id);
        }
      }

      accessMap['extra_reading'] = await rewardedAdsService.hasTemporaryAccess('extra_reading');

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
      if (hasTemporaryAccess['extra_reading']) {
        setView('focus');
        setSelectedFocus(null);
        setIsSaved(false);
        setInterpretationView('focus');
        setShowAIInterpretation(false);
        setAiInterpretation(null);
        return;
      }
      if (isNative() && canWatchAd) {
        setPendingFeature('extra_reading');
        setPendingSpreadId(null);
        setShowWatchAdSheet(true);
      } else {
        onShowPaywall(t('readings.paywall.unlimited'));
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
      if (feature && isNative() && canWatchAd) {
        setPendingFeature(feature);
        setPendingSpreadId(currentSpread);
        setShowWatchAdSheet(true);
      } else {
        onShowPaywall(spreadName(spread));
      }
      return;
    }

    setView('shuffle');
  };

  const handleAdUnlocked = async () => {
    setShowWatchAdSheet(false);

    if (pendingFeature === 'extra_reading') {
      setHasTemporaryAccess(prev => ({ ...prev, extra_reading: true }));
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

  const handleRevealSelected = async () => {
    const spread = spreadConfigs.find(s => s.id === currentSpread);
    if (!spread || selectedIndices.length !== spread.count) return;
    if (tarotCards.length === 0) return;

    const cardById = new Map(tarotCards.map(c => [c.id, c]));
    const selectedCards = selectedIndices
      .map(id => cardById.get(id))
      .filter((c): c is TarotCard => !!c);

    if (selectedCards.length !== spread.count) {
      toast(t('readings.toasts.cardsNotFound'), 'error');
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

    await incrementDailyReadingCount();
    setDailyReadingCount(await getDailyReadingCount());

    if (!profile?.isPremium) {
      if (!spread.free && hasTemporaryAccess[currentSpread]) {
        const feature = spreadTypeToFeature(currentSpread);
        if (feature) {
          await rewardedAdsService.consumeTemporaryAccess(feature, currentSpread);
          setHasTemporaryAccess(prev => ({ ...prev, [currentSpread]: false }));
        }
      }

      if (isAtDailyLimit && hasTemporaryAccess['extra_reading']) {
        await rewardedAdsService.consumeTemporaryAccess('extra_reading');
        setHasTemporaryAccess(prev => ({ ...prev, extra_reading: false }));
      }
    }

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

      // Calendar/time achievements
      const now = new Date();
      if (isFullMoon(now)) checkAchievementProgress(user.id, 'full_moon_reading');
      if (now.getMonth() === 0 && now.getDate() === 1) checkAchievementProgress(user.id, 'new_year_reading');
      const hour = now.getHours();
      if (hour >= 0 && hour < 3) checkAchievementProgress(user.id, 'witching_hour_reading');

      // Specific card achievements
      for (const drawn of selectedCards) {
        checkSpecificCardAchievement(user.id, drawn.name);
      }
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

    const res = await tarotReadings.insert({
      userId: user.id,
      date: today,
      spreadType: currentSpread,
      focusArea: selectedFocus,
      cards: drawnCards.map((d, i) => ({
        cardId: d.card.id,
        cardName: d.card.name,
        reversed: d.reversed,
        position: getPositionLabel(i),
      })),
      saved: true,
    });

    if (!res.ok) {
      toast(t('readings.toasts.saveFailed'), 'error');
    } else {
      setIsSaved(true);
      toast(t('readings.toasts.readingSaved'), 'success');

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
      onShowPaywall(t('readings.paywall.aiInterpretation'));
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
      toast(
        result.usedLlm ? t('readings.toasts.aiReady') : t('readings.toasts.interpretationReady'),
        'success',
      );
    } catch (error) {
      console.error('Failed to generate AI interpretation:', error);
      const errorMessage = error instanceof Error ? error.message : t('readings.toasts.aiFailed');
      toast(errorMessage, 'error');
    } finally {
      setLoadingAI(false);
    }
  };

  const getPositionLabel = (index: number): string => {
    if (currentSpread === 'single') return t('readings.positions.yourCard');
    if (currentSpread === 'three-card') {
      const keys = ['past', 'present', 'future'] as const;
      const key = keys[index];
      return key
        ? t(`readings.positions.${key}`)
        : t('readings.positions.generic', { index: index + 1 });
    }

    const positions = getSpreadPositions(currentSpread);
    return positions[index] || t('readings.positions.generic', { index: index + 1 });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getFocusInterpretation = (card: TarotCard, focus: FocusArea | null, _reversed: boolean): { content: string; icon: typeof Heart; label: string; color: string } | null => {
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
      if (feature && isNative() && canWatchAd) {
        setPendingFeature(feature);
        setPendingSpreadId(spreadId);
        setCurrentSpread(spreadId);
        setShowWatchAdSheet(true);
      } else {
        onShowPaywall(spreadName(spread));
      }
      return;
    }

    setCurrentSpread(spreadId);
    handleStartDraw();
  };

  if (view === 'focus') {
    if (useSplitViews) {
      return (
        <TarotFocusView
          selectedFocus={selectedFocus}
          onBack={() => setView('home')}
          onSelect={handleFocusSelect}
          onContinue={handleDraw}
        />
      );
    }
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView('home')}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          {t('readings.back')}
        </button>

        <div className="text-center space-y-3">
          <Sparkles className="w-12 h-12 text-gold mx-auto animate-pulse" />
          <h2 className="font-display text-2xl text-mystic-100">{t('readings.focusView.title')}</h2>
          <p className="text-mystic-400">{t('readings.focusView.subtitle')}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {focusAreas.map(focus => (
            <Chip
              key={focus}
              label={focusLabel(focus)}
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
          {t('readings.focusView.continue')}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  if (view === 'shuffle') {
    if (useSplitViews) {
      return (
        <TarotShuffleView
          isShuffling={isShuffling}
          cardBackUrl={profile?.card_back_url}
          onBack={() => setView('focus')}
          onShuffle={handleShuffleComplete}
        />
      );
    }
    return (
      <div className="space-y-6">
        <button
          onClick={() => setView('focus')}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          {t('readings.back')}
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
              {isShuffling ? t('readings.shuffleView.inProgress') : t('readings.shuffleView.clearMind')}
            </h2>
            <p className="text-mystic-400 text-sm">
              {isShuffling ? t('readings.shuffleView.spreading') : t('readings.shuffleView.focusQuestion')}
            </p>
          </div>

          {!isShuffling && (
            <Button
              variant="gold"
              onClick={handleShuffleComplete}
              className="min-h-[52px]"
            >
              <Shuffle className="w-4 h-4" />
              {t('readings.shuffleView.shuffleDeck')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'select') {
    const spread = spreadConfigs.find(s => s.id === currentSpread);
    const needsMore = spread ? spread.count - selectedIndices.length : 0;

    if (useSplitViews) {
      return (
        <TarotSelectView
          deckCards={deckCards}
          selectedIndices={selectedIndices}
          needsMore={needsMore}
          cardBackUrl={profile?.card_back_url}
          onBack={() => setView('shuffle')}
          onCardSelect={handleCardSelect}
          onReveal={handleRevealSelected}
        />
      );
    }

    return (
      <div className="flex flex-col h-full space-y-4">
        <button
          onClick={() => setView('shuffle')}
          className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
        >
          {t('readings.back')}
        </button>

        <div className="text-center space-y-2 sticky top-0 bg-mystic-950 z-10 pb-3">
          <h2 className="font-display text-xl text-mystic-100">
            {needsMore > 0
              ? t('readings.selectView.chooseMore', { count: needsMore })
              : t('readings.selectView.readyReveal')
            }
          </h2>
          <p className="text-mystic-400 text-sm">{t('readings.selectView.trustIntuition')}</p>
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
            {needsMore > 0 ? t('readings.selectView.selectMore', { count: needsMore }) : t('readings.selectView.revealCards')}
            <Sparkles className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'reveal') {
    const spread = spreadConfigs.find(s => s.id === currentSpread);

    if (useSplitViews) {
      return (
        <TarotRevealView
          drawnCards={drawnCards}
          currentSpread={currentSpread}
          spreadTitle={spread ? spreadName(spread) : ''}
          selectedFocus={selectedFocus}
          allRevealed={allRevealed}
          isSaved={isSaved}
          isPremium={!!profile?.isPremium}
          cardBackUrl={profile?.card_back_url}
          showAIInterpretation={showAIInterpretation}
          aiInterpretation={aiInterpretation}
          loadingAI={loadingAI}
          interpretationView={interpretationView}
          focusReadingLabel={selectedFocus ? t('readings.revealView.focusReading', { focus: focusLabel(selectedFocus) }) : ''}
          getCardImage={getCardImage}
          getPositionLabel={getPositionLabel}
          getFocusInterpretation={getFocusInterpretation}
          onBack={() => setView('home')}
          onSave={handleSaveReading}
          onRevealCard={handleRevealCard}
          onRevealAll={revealAll}
          onCardClick={(card, reversed) => setSelectedCard({ card, reversed })}
          onGetAIInterpretation={handleGetAIInterpretation}
          onHideAIInterpretation={() => setShowAIInterpretation(false)}
          onSetInterpretationView={setInterpretationView}
          onNewReading={() => setView('home')}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView('home')}
            className="text-sm text-mystic-400 hover:text-mystic-300 transition-colors"
          >
            {t('readings.back')}
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
          <p className="text-xs text-mystic-500 uppercase tracking-wider">{selectedFocus ? t('readings.revealView.focusReading', { focus: focusLabel(selectedFocus) }) : ''}</p>
          <h2 className="font-display text-xl text-mystic-100">{spread ? spreadName(spread) : ''}</h2>
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
          <Button variant="ghost" fullWidth onClick={revealAll} className="min-h-[44px]">
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
                    onClick={handleGetAIInterpretation}
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
                        {profile?.isPremium ? t('readings.revealView.getAIInsight') : t('readings.revealView.premiumAI')}
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
                    onClick={() => setShowAIInterpretation(false)}
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
                        onClick={() => setInterpretationView('focus')}
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
                        onClick={() => setInterpretationView('traditional')}
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
              <Button variant="outline" onClick={handleSaveReading} className="min-h-[44px]">
                {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                {isSaved ? t('readings.revealView.saved') : t('readings.revealView.save')}
              </Button>
              <Button variant="gold" onClick={() => setView('home')} className="min-h-[44px]">
                {t('readings.revealView.newReading')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {useSplitViews ? (
        <TarotHomeView
          spreads={spreadConfigs.map((s) => ({ id: s.id, i18n: s.i18n, free: s.free, count: s.count }))}
          isPremium={!!profile?.isPremium}
          canWatchAd={canWatchAd}
          cardBackUrl={profile?.card_back_url}
          hasTemporaryAccess={hasTemporaryAccess}
          spreadName={(s) => t(`readings.spreads.${s.i18n}.name`)}
          spreadDesc={(s) => t(`readings.spreads.${s.i18n}.description`)}
          onStartDraw={handleStartDraw}
          onSpreadSelect={handleSpreadSelect}
          onOpenBrowse={() => setShowBrowse(true)}
        />
      ) : (
        <>
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
            <h2 className="font-display text-xl text-mystic-100 mb-1">{t('readings.dailyDraw.title')}</h2>
            <p className="text-mystic-400 text-sm">{t('readings.dailyDraw.subtitle')}</p>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-mystic-200">{t('readings.spreadsSection')}</h3>
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
                    isNative() && canWatchAd ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-mystic-800/80 rounded-full">
                        <Play className="w-3 h-3 text-gold" />
                        <span className="text-[10px] text-gold">{t('readings.status.try')}</span>
                      </div>
                    ) : (
                      <Lock className="absolute top-2 right-2 w-4 h-4 text-gold" />
                    )
                  )}
                  {!spread.free && hasTemporaryAccess[spread.id] && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full">
                      <span className="text-[10px] text-emerald-400">{t('readings.status.unlocked')}</span>
                    </div>
                  )}
                  <h4 className="font-medium text-mystic-100 text-sm">{spreadName(spread)}</h4>
                  <p className="text-xs text-mystic-400 mt-1">{spreadDesc(spread)}</p>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-mystic-200">{t('readings.browse.title')}</h3>
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
                  <h4 className="font-medium text-mystic-100 text-sm">{t('readings.browse.allCards')}</h4>
                  <p className="text-xs text-mystic-400">{t('readings.browse.learnMeanings')}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-mystic-400" />
            </Card>
          </div>
        </>
      )}

      <Sheet open={showBrowse} onClose={() => setShowBrowse(false)} title={t('readings.browse.title')}>
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'major', 'swords', 'cups', 'wands', 'pentacles'] as const).map(filter => (
              <Chip
                key={filter}
                label={t(`readings.browse.filters.${filter}`)}
                selected={browseFilter === filter}
                onSelect={() => setBrowseFilter(filter)}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[70dvh] overflow-y-auto pb-4">
            {filteredDeck.map(card => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard({ card, reversed: false });
                  setShowBrowse(false);
                  // Track card exploration for achievements
                  if (user) checkAchievementProgress(user.id, 'cards_explored');
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
          spreadType={pendingSpreadId || undefined}
          onUnlocked={handleAdUnlocked}
          onShowPaywall={() => {
            setShowWatchAdSheet(false);
            setPendingFeature(null);
            setPendingSpreadId(null);
            const spread = spreadConfigs.find(s => s.id === pendingSpreadId);
            if (spread) {
              onShowPaywall(spreadName(spread));
            }
          }}
        />
      )}
    </div>
  );
}
