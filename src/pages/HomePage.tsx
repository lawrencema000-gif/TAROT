import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Sparkles,
  ChevronRight,
  Bookmark,
  Star,
  PenLine,
  TrendingUp,
  Zap,
  MessageCircle,
  Heart,
} from 'lucide-react';
import {
  Card,
  Button,
  toast,
  HomePageSkeleton,
  MysticalStar,
  OrnateDivider,
  EyebrowLabel,
  SectionDivider,
  SparkleFourPoint,
} from '../components/ui';
import { localizeSeekerRank } from '../i18n/localizeRank';
import { TarotFlipCard, HoroscopeCard, PromptCard } from '../components/ritual';
import { DailyMissionCard } from '../components/ritual/DailyMissionCard';
import { StreakCelebration } from '../components/celebration/StreakCelebration';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useRitual } from '../context/RitualContext';
import { useGamification } from '../context/GamificationContext';
import { dailyRituals, savedHighlights } from '../dal';
import { getZodiacSign } from '../utils/zodiac';
// horoscopes loaded lazily to keep main bundle small
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import type { TarotCard, SavedHighlight } from '../types';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { awardXP, getLevelThresholds, getXPProgress, checkAndAwardStreakMilestone } from '../services/levelSystem';
import { checkAchievementProgress } from '../services/achievements';
import { cacheDailyRitual, getCachedDailyRitual, cacheLastViewedCard } from '../services/offline';
import { useT } from '../i18n/useT';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { DailyWisdomCard } from '../components/home/DailyWisdomCard';
import { MoonstoneWidget } from '../components/home/MoonstoneWidget';
import { MoonPhaseCard } from '../components/home/MoonPhaseCard';

interface RitualState {
  horoscopeViewed: boolean;
  tarotViewed: boolean;
  promptViewed: boolean;
  completed: boolean;
}

export function HomePage() {
  const { t } = useT(['app', 'common']);
  const { profile, user, refreshProfile } = useAuth();
  const { setActiveTab, openOverlay } = useUI();
  const { streak, setStreak, tarotRefreshTrigger } = useRitual();
  const { triggerLevelUp } = useGamification();
  const dailyWisdomEnabled = useFeatureFlag('daily-wisdom');
  const moonstonesEnabled = useFeatureFlag('moonstones');
  const moonPhasesEnabled = useFeatureFlag('moon-phases');
  const quickReadingEnabled = useFeatureFlag('ai-quick-reading');
  const tarotCompanionEnabled = useFeatureFlag('ai-tarot-companion');
  const pickACardEnabled = useFeatureFlag('pick-a-card');
  const soulmateScoreEnabled = useFeatureFlag('soulmate-score');
  const dailyMissionEnabled = useFeatureFlag('daily-mission');
  const loveTreeEnabled = useFeatureFlag('love-tree');
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpProgress, setXpProgress] = useState({ current: 0, required: 100, percentage: 0 });
  const [levelThresholds, setLevelThresholds] = useState<Map<number, number>>(new Map());
  const [ritualState, setRitualState] = useState<RitualState>({
    horoscopeViewed: false,
    tarotViewed: false,
    promptViewed: false,
    completed: false,
  });
  const [drawnTarot, setDrawnTarot] = useState<{ card: TarotCard; reversed: boolean } | null>(null);
  const [tarotSaved, setTarotSaved] = useState(false);
  const [savedToday, setSavedToday] = useState<SavedHighlight[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [ritualStarted, setRitualStarted] = useState(false);
  const [, setTarotCards] = useState<TarotCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dailyPrompt, setDailyPrompt] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : 'aries';

  useImagePreloader(
    drawnTarot?.card.imageUrl ? [drawnTarot.card.imageUrl] : [],
    !!drawnTarot
  );

  const checkRitualStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Show cached ritual state instantly while network loads
    const cached = await getCachedDailyRitual(user.id, today);
    if (cached) {
      setRitualState(cached);
      setRitualStarted(cached.horoscopeViewed || cached.tarotViewed || cached.promptViewed);
      setIsLoading(false);
    }

    try {
      // Run all 3 queries in parallel instead of sequentially
      const [ritualResult, savesResult, countResult] = await Promise.all([
        dailyRituals.getByDate(user.id, today),
        savedHighlights.listForUserDate(user.id, today),
        dailyRituals.countForUser(user.id),
      ]);

      if (ritualResult.ok && ritualResult.data) {
        const state = ritualResult.data;
        setRitualState(state);
        setRitualStarted(state.horoscopeViewed || state.tarotViewed || state.promptViewed);
        cacheDailyRitual(user.id, { ...state, date: today });
      }

      if (savesResult.ok) {
        const mappedSaves: SavedHighlight[] = savesResult.data
          .filter((s): s is typeof s & { highlightType: 'horoscope' | 'tarot' | 'prompt' } =>
            s.highlightType === 'horoscope' || s.highlightType === 'tarot' || s.highlightType === 'prompt',
          )
          .map(s => ({
            id: s.id,
            userId: user.id,
            highlightType: s.highlightType,
            date: today,
            content: s.content,
            createdAt: s.createdAt,
          }));
        setSavedToday(mappedSaves);
        setTarotSaved(mappedSaves.some(s => s.highlightType === 'tarot'));
      }

      if (countResult.ok) {
        setIsFirstTime(countResult.data === 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    import('../data/horoscopes').then(m => setDailyPrompt(m.getDailyPrompt(today)));
  }, [today]);

  useEffect(() => {
    const loadAndDrawCard = async () => {
      const cards = await getAllTarotCards();
      setTarotCards(cards);
      const seed = `${user?.id || 'anonymous'}_${today}`;
      const [drawn] = drawSeededCards(1, seed, cards);
      setDrawnTarot(drawn);
      cacheLastViewedCard(drawn.card, drawn.reversed);
    };
    loadAndDrawCard();
    checkRitualStatus();
  }, [checkRitualStatus, tarotRefreshTrigger]);

  useEffect(() => {
    if (profile) {
      setStreak(profile.streak || 0);
    }
  }, [profile, setStreak]);

  useEffect(() => {
    const loadLevelData = async () => {
      const thresholds = await getLevelThresholds();
      setLevelThresholds(thresholds);

      if (profile) {
        const progress = getXPProgress(profile.xp || 0, profile.level || 1, thresholds);
        setXpProgress(progress);
      }
    };
    loadLevelData();
  }, [profile]);

  const handleStartRitual = () => {
    setRitualStarted(true);
  };

  const updateRitualProgress = async (field: keyof Omit<RitualState, 'completed'>) => {
    if (!user) return;

    const newState = { ...ritualState, [field]: true };
    setRitualState(newState);
    cacheDailyRitual(user.id, { ...newState, completed: newState.horoscopeViewed && newState.tarotViewed && newState.promptViewed, date: today });

    await dailyRituals.upsert({
      userId: user.id,
      date: today,
      horoscopeViewed: newState.horoscopeViewed,
      tarotViewed: newState.tarotViewed,
      promptViewed: newState.promptViewed,
      completed: newState.horoscopeViewed && newState.tarotViewed && newState.promptViewed,
    });

    if (newState.horoscopeViewed && newState.tarotViewed && newState.promptViewed && !ritualState.completed) {
      setRitualState(prev => ({ ...prev, completed: true }));

      const xpResult = await awardXP(user.id, 'ritual_complete');

      if (xpResult) {
        toast(t('home.xpEarned', { xp: xpResult.xp_earned }), 'success');

        if (xpResult.level_up) {
          triggerLevelUp({
            newLevel: xpResult.new_level,
            seekerRank: xpResult.seeker_rank,
            xpEarned: xpResult.xp_earned,
          });
        }

        // Streak is updated on app open; use current profile streak for milestone check
        const currentStreak = profile?.streak || 1;
        await checkAndAwardStreakMilestone(user.id, currentStreak);

        // Time-based achievements
        const hour = new Date().getHours();
        if (hour < 7) checkAchievementProgress(user.id, 'morning_ritual');
        if (hour >= 22) checkAchievementProgress(user.id, 'evening_ritual');
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) checkAchievementProgress(user.id, 'weekend_ritual');

        await refreshProfile();

        const progress = getXPProgress(xpResult.total_xp, xpResult.new_level, levelThresholds);
        setXpProgress(progress);
      }

      setShowCelebration(true);
    }
  };

  const handleReadHoroscope = () => {
    updateRitualProgress('horoscopeViewed');
    setActiveTab('readings');
  };

  const handleTarotSave = async () => {
    if (!user || !drawnTarot) return;

    if (tarotSaved) {
      const res = await savedHighlights.deleteByTypeAndDate(user.id, 'tarot', today);
      if (!res.ok) {
        toast(t('home.removedFromSaved'), 'error');
        return;
      }
      setTarotSaved(false);
      setSavedToday(prev => prev.filter(s => s.highlightType !== 'tarot'));
      toast(t('home.removedFromSaved'), 'info');
    } else {
      const res = await savedHighlights.insert({
        userId: user.id,
        date: today,
        highlightType: 'tarot',
        content: { card: drawnTarot.card, reversed: drawnTarot.reversed },
      });
      if (!res.ok) {
        toast(t('home.savedToHighlights'), 'error');
        return;
      }
      setTarotSaved(true);
      updateRitualProgress('tarotViewed');
      toast(t('home.savedToHighlights'), 'success');
      checkRitualStatus();
    }
  };

  const handleTarotShare = async () => {
    if (!drawnTarot) return;

    const text = `My card of the day: ${drawnTarot.card.name}${drawnTarot.reversed ? ' (Reversed)' : ''} - ${drawnTarot.reversed ? drawnTarot.card.meaningReversed : drawnTarot.card.meaningUpright}`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        await navigator.clipboard.writeText(text);
        toast(t('home.copiedToClipboard'), 'success');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast(t('home.copiedToClipboard'), 'success');
    }
  };

  const handleTarotMeaning = () => {
    updateRitualProgress('tarotViewed');
    setActiveTab('readings');
  };

  const handleWritePrompt = () => {
    updateRitualProgress('promptViewed');
    setActiveTab('journal');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 18) return t('home.greeting.afternoon');
    return t('home.greeting.evening');
  };

  const getDisplayName = () => {
    if (!profile?.displayName || profile.displayName.trim() === '') {
      return t('home.seeker');
    }

    const name = profile.displayName.trim();
    const local = name.includes('@') ? name.split('@')[0] : name;

    // Fallback to "Seeker" for obviously auto-generated handles —
    // long, digit-heavy, or dash-heavy strings (e.g. `arcana-qa-auth-1776994003021`
    // from signup fallback) look hostile in a welcome header.
    const tooManyDashes = (local.match(/-/g)?.length ?? 0) >= 3;
    const mostlyDigits = (local.match(/\d/g)?.length ?? 0) / local.length > 0.4;
    if (local.length > 20 || tooManyDashes || mostlyDigits) {
      return t('home.seeker');
    }

    if (name.includes('@') || /[._-]/.test(name)) {
      const formatted = local
        .split(/[._-]/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      return formatted || t('home.seeker');
    }

    return name;
  };

  const displayName = getDisplayName();

  if (isLoading) {
    return <HomePageSkeleton />;
  }

  if (!ritualStarted && isFirstTime) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="mb-6 text-gold drop-shadow-[0_0_20px_rgba(212,175,55,0.35)]">
          <MysticalStar size={96} spinning />
        </div>

        <h1 className="heading-display-xl text-gold-foil mb-2">
          {t('home.ritualReady.title')}
        </h1>
        <div className="mb-4 text-gold/60">
          <OrnateDivider width={140} />
        </div>
        <p className="text-mystic-300 mb-8 max-w-xs">
          {t('home.ritualReady.sub')}
        </p>

        <Button variant="gold" onClick={handleStartRitual} className="min-h-[52px] px-8">
          {t('home.startTodaysRitual')}
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EyebrowLabel className="!text-mystic-400">{greeting()}</EyebrowLabel>
          <h1 className="heading-display-xl text-mystic-100 mt-1 truncate">{displayName}.</h1>
          {profile?.seekerRank && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gold">{t('home.level', { n: profile.level })}</span>
              <span className="text-xs text-mystic-500">•</span>
              <span className="text-xs text-mystic-400">{localizeSeekerRank(profile.seekerRank)}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCelebration(true)}
          className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-mystic-800/80 to-mystic-800/50 px-4 py-2.5 rounded-full active:scale-95 transition-transform hairline-gold-soft hover:border-gold/30"
        >
          <Flame className="w-5 h-5 text-gold" />
          <span className="font-semibold text-gold">{streak}</span>
          <span className="text-mystic-400 text-sm">{t('home.dayStreakLabel')}</span>
        </button>
      </div>

      {/* Today's Ritual — hero placement. Before anything else on the page
          so the first thing a returning user sees is the call to start
          their daily practice. */}
      {!ritualStarted ? (
        <Card variant="ornate" padding="lg" className="relative overflow-hidden text-center nebula-veil aurora-veil floating-particles">
          <div className="relative z-[1] py-2">
            <div className="mb-3 text-gold drop-shadow-[0_0_18px_rgba(212,175,55,0.35)] inline-block animate-float-gentle">
              <MysticalStar size={72} />
            </div>
            <h2 className="heading-display-lg text-gold-foil mb-2">{t('home.todaysRitual')}</h2>
            <div className="flex justify-center mb-3 text-gold/60">
              <OrnateDivider width={120} />
            </div>
            <p className="text-mystic-300 text-sm mb-6">{t('home.subtitle')}</p>
            <Button variant="gold" onClick={handleStartRitual} className="min-h-[48px] gold-sweep breathe-glow">
              {t('home.startTodaysRitual')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="heading-display-lg text-gold-foil">{t('home.todaysRitual')}</h2>
            <div className="flex items-center gap-2 shrink-0">
              <SparkleFourPoint
                size={12}
                className={ritualState.horoscopeViewed ? 'text-gold' : 'text-mystic-700'}
              />
              <SparkleFourPoint
                size={12}
                className={ritualState.tarotViewed ? 'text-gold' : 'text-mystic-700'}
              />
              <SparkleFourPoint
                size={12}
                className={ritualState.promptViewed ? 'text-gold' : 'text-mystic-700'}
              />
            </div>
          </div>

          <HoroscopeCard sign={zodiacSign} onRead={handleReadHoroscope} />

          <Card padding="lg">
            {drawnTarot && (
              <TarotFlipCard
                card={drawnTarot.card}
                reversed={drawnTarot.reversed}
                saved={tarotSaved}
                onSave={handleTarotSave}
                onShare={handleTarotShare}
                onMeaning={handleTarotMeaning}
                cardBackUrl={profile?.card_back_url}
              />
            )}
          </Card>

          <PromptCard prompt={dailyPrompt} onWrite={handleWritePrompt} />
        </div>
      )}

      {moonstonesEnabled && <MoonstoneWidget />}

      {moonPhasesEnabled && <MoonPhaseCard />}

      {dailyMissionEnabled && <DailyMissionCard />}

      {/* Eyebrow + divider groups the secondary feature shortcuts below
          (pick-a-card, love tree, soulmate, quick reading, tarot
          companion) into an intentional "Beyond today's ritual" cluster
          rather than a loose stack of buttons. Only renders when at
          least one of those features is enabled, so the home stays
          tight when flags are off. */}
      {(pickACardEnabled || loveTreeEnabled || soulmateScoreEnabled || quickReadingEnabled || tarotCompanionEnabled) && (
        <div className="space-y-3 pt-2">
          <SectionDivider tone="mystic" />
          <EyebrowLabel className="block text-center">
            {t('home.exploreMore', { defaultValue: 'Beyond today\'s ritual' })}
          </EyebrowLabel>
        </div>
      )}

      {pickACardEnabled && (
        <button
          onClick={() => navigate('/pick-a-card')}
          className="w-full group relative overflow-hidden rounded-xl p-4 text-left active:scale-[0.98] transition-transform bg-gradient-to-br from-gold/10 via-mystic-900 to-cosmic-violet/10 border border-gold/25 hover:border-gold/50"
        >
          <div className="flex items-center gap-4">
            {/* Three fanned card-backs — uses the actual deck imagery so
                the preview matches what you'll see when you pick. */}
            <div className="relative w-14 h-20 flex-shrink-0">
              {[-12, 0, 12].map((rot, i) => (
                <div
                  key={rot}
                  className="absolute inset-0 rounded-md border border-gold/40 overflow-hidden shadow-glow origin-bottom transition-transform duration-300 group-hover:scale-105"
                  style={{ transform: `rotate(${rot}deg)`, zIndex: i }}
                >
                  <img
                    src={profile?.card_back_url || '/card-backs/default.svg'}
                    alt=""
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mystic-100 mb-0.5">
                {t('home.pickACardTitle', { defaultValue: 'Pick a card' })}
              </p>
              <p className="text-[11px] text-mystic-400 leading-relaxed">
                {t('home.pickACardSub', { defaultValue: '30-second daily draw. One card calls to you.' })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-mystic-500 group-hover:text-gold transition-colors flex-shrink-0" />
          </div>
        </button>
      )}

      {loveTreeEnabled && (
        <button
          onClick={() => navigate('/love-tree')}
          className="w-full group relative overflow-hidden rounded-xl p-4 text-left active:scale-[0.98] transition-transform bg-gradient-to-br from-emerald-500/10 via-mystic-900 to-pink-500/10 border border-emerald-400/25 hover:border-emerald-400/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-pink-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mystic-100 mb-0.5">
                {t('home.loveTreeTitle', { defaultValue: 'Love Tree' })}
              </p>
              <p className="text-[11px] text-mystic-400 leading-relaxed">
                {t('home.loveTreeSub', { defaultValue: '90 seconds, 12 questions → your attachment style as a living tree.' })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-mystic-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
          </div>
        </button>
      )}

      {soulmateScoreEnabled && (
        <button
          onClick={() => navigate('/soulmate-score')}
          className="w-full group relative overflow-hidden rounded-xl p-4 text-left active:scale-[0.98] transition-transform bg-gradient-to-br from-pink-500/10 via-mystic-900 to-cosmic-violet/10 border border-pink-400/25 hover:border-pink-400/50"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-cosmic-violet/20 border border-pink-400/30 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mystic-100 mb-0.5">
                {t('home.soulmateTitle', { defaultValue: 'Soulmate score' })}
              </p>
              <p className="text-[11px] text-mystic-400 leading-relaxed">
                {t('home.soulmateSub', { defaultValue: 'Compare charts with anyone — get a score out of 100.' })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-mystic-500 group-hover:text-pink-400 transition-colors flex-shrink-0" />
          </div>
        </button>
      )}

      {(quickReadingEnabled || tarotCompanionEnabled) && (
        <div className="grid grid-cols-2 gap-3">
          {quickReadingEnabled && (
            <button
              onClick={() => navigate('/ai/quick')}
              className="bg-gradient-to-br from-gold/10 to-mystic-900 border border-gold/25 rounded-xl p-4 text-left hover:border-gold/50 active:scale-[0.98] transition-all"
            >
              <Zap className="w-5 h-5 text-gold mb-2" />
              <p className="text-sm font-medium text-mystic-100">
                {t('home.quickReading', { defaultValue: '3-second reading' })}
              </p>
              <p className="text-[11px] text-mystic-400 mt-0.5 leading-relaxed">
                {t('home.quickReadingSub', { defaultValue: 'Ask anything' })}
              </p>
            </button>
          )}
          {tarotCompanionEnabled && (
            <button
              onClick={() => navigate('/ai/tarot')}
              className="bg-gradient-to-br from-cosmic-violet/10 to-mystic-900 border border-cosmic-violet/25 rounded-xl p-4 text-left hover:border-cosmic-violet/50 active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-5 h-5 text-cosmic-violet mb-2" />
              <p className="text-sm font-medium text-mystic-100">
                {t('home.tarotCompanion', { defaultValue: 'Tarot companion' })}
              </p>
              <p className="text-[11px] text-mystic-400 mt-0.5 leading-relaxed">
                {t('home.tarotCompanionSub', { defaultValue: 'Pull a card, talk it through' })}
              </p>
            </button>
          )}
        </div>
      )}

      {dailyWisdomEnabled && <DailyWisdomCard />}

      {profile && xpProgress.required > 0 && (
        <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-mystic-100">{t('home.xpProgress')}</span>
            </div>
            <span className="text-xs text-mystic-400">
              {t('home.xpValue', { current: xpProgress.current, required: xpProgress.required })}
            </span>
          </div>
          <div className="relative h-2 bg-mystic-800 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold via-gold-light to-gold rounded-full transition-all duration-500"
              style={{ width: `${xpProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {savedToday.length > 0 && (
        <div className="space-y-3">
          <SectionDivider tone="mystic" />
          <div className="flex items-center justify-between">
            <EyebrowLabel>{t('home.savedToday')}</EyebrowLabel>
            <button
              onClick={() => openOverlay('saved')}
              className="text-xs text-gold hover:text-gold-light transition-colors"
            >
              {t('common:actions.viewAll')}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {savedToday.map((item) => (
              <button
                key={item.id}
                onClick={() => openOverlay('saved')}
                className="flex items-center gap-2 px-3 py-2 bg-mystic-800/50 rounded-full border border-mystic-700/50 hover:border-gold/30 transition-colors flex-shrink-0"
              >
                {item.highlightType === 'horoscope' && <Star className="w-3.5 h-3.5 text-gold" />}
                {item.highlightType === 'tarot' && <Sparkles className="w-3.5 h-3.5 text-gold" />}
                {item.highlightType === 'prompt' && <PenLine className="w-3.5 h-3.5 text-gold" />}
                <span className="text-xs text-mystic-300 capitalize">{item.highlightType}</span>
                <Bookmark className="w-3 h-3 text-gold" />
              </button>
            ))}
          </div>
        </div>
      )}

      {ritualState.completed && (
        <Card padding="lg" className="bg-gradient-to-br from-gold/10 to-mystic-900/80 border-gold/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center ring-1 ring-gold/30">
              <Sparkles className="w-7 h-7 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="heading-display-md text-gold">{t('home.ritualComplete')}</h3>
              <p className="text-sm text-mystic-400 mt-0.5">{t('home.streak', { n: streak })}</p>
            </div>
          </div>
        </Card>
      )}

      <StreakCelebration
        streak={streak}
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
      />

    </div>
  );
}
