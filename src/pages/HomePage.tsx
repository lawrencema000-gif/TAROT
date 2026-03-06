import { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Sparkles,
  ChevronRight,
  Bookmark,
  Star,
  PenLine,
  TrendingUp,
} from 'lucide-react';
import { Card, Button, toast, HomePageSkeleton } from '../components/ui';
import { TarotFlipCard, HoroscopeCard, PromptCard } from '../components/ritual';
import { StreakCelebration } from '../components/celebration/StreakCelebration';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useRitual } from '../context/RitualContext';
import { useGamification } from '../context/GamificationContext';
import { supabase } from '../lib/supabase';
import { getZodiacSign } from '../utils/zodiac';
// horoscopes loaded lazily to keep main bundle small
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import type { TarotCard, SavedHighlight } from '../types';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { awardXP, getLevelThresholds, getXPProgress, checkAndAwardStreakMilestone } from '../services/levelSystem';
import { cacheDailyRitual, getCachedDailyRitual, cacheLastViewedCard } from '../services/offline';

interface RitualState {
  horoscopeViewed: boolean;
  tarotViewed: boolean;
  promptViewed: boolean;
  completed: boolean;
}

export function HomePage() {
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const { setActiveTab, openOverlay } = useUI();
  const { streak, setStreak, tarotRefreshTrigger } = useRitual();
  const { triggerLevelUp } = useGamification();
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
  const [tarotCards, setTarotCards] = useState<TarotCard[]>([]);
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
      const { data: ritual } = await supabase
        .from('daily_rituals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (ritual) {
        const state = {
          horoscopeViewed: ritual.horoscope_viewed,
          tarotViewed: ritual.tarot_viewed,
          promptViewed: ritual.prompt_viewed,
          completed: ritual.completed,
        };
        setRitualState(state);
        setRitualStarted(ritual.horoscope_viewed || ritual.tarot_viewed || ritual.prompt_viewed);
        // Cache for offline use
        cacheDailyRitual(user.id, { ...state, date: today });
      }

      const { data: saves } = await supabase
        .from('saved_highlights')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (saves) {
        const mappedSaves: SavedHighlight[] = saves.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          userId: s.user_id as string,
          highlightType: s.highlight_type as 'horoscope' | 'tarot' | 'prompt',
          date: s.date as string,
          content: s.content as Record<string, unknown>,
          createdAt: s.created_at as string,
        }));
        setSavedToday(mappedSaves);
        setTarotSaved(mappedSaves.some(s => s.highlightType === 'tarot'));
      }

      const { count } = await supabase
        .from('daily_rituals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setIsFirstTime(count === 0);
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

    await supabase.from('daily_rituals').upsert({
      user_id: user.id,
      date: today,
      horoscope_viewed: newState.horoscopeViewed,
      tarot_viewed: newState.tarotViewed,
      prompt_viewed: newState.promptViewed,
      completed: newState.horoscopeViewed && newState.tarotViewed && newState.promptViewed,
    });

    if (newState.horoscopeViewed && newState.tarotViewed && newState.promptViewed && !ritualState.completed) {
      const lastRitualDate = profile?.lastRitualDate;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak: number;
      if (lastRitualDate === today) {
        newStreak = profile?.streak || 1;
      } else if (lastRitualDate === yesterdayStr) {
        newStreak = (profile?.streak || 0) + 1;
      } else {
        newStreak = 1;
      }

      await updateProfile({ streak: newStreak, lastRitualDate: today });
      setStreak(newStreak);
      setRitualState(prev => ({ ...prev, completed: true }));

      const xpResult = await awardXP(user.id, 'ritual_complete');

      if (xpResult) {
        toast(`+${xpResult.xp_earned} XP earned!`, 'success');

        if (xpResult.level_up) {
          triggerLevelUp({
            newLevel: xpResult.new_level,
            seekerRank: xpResult.seeker_rank,
            xpEarned: xpResult.xp_earned,
          });
        }

        await checkAndAwardStreakMilestone(user.id, newStreak);
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
      await supabase
        .from('saved_highlights')
        .delete()
        .eq('user_id', user.id)
        .eq('date', today)
        .eq('highlight_type', 'tarot');
      setTarotSaved(false);
      setSavedToday(prev => prev.filter(s => s.highlightType !== 'tarot'));
      toast('Removed from saved', 'info');
    } else {
      await supabase.from('saved_highlights').insert({
        user_id: user.id,
        date: today,
        highlight_type: 'tarot',
        content: { card: drawnTarot.card, reversed: drawnTarot.reversed },
      });
      setTarotSaved(true);
      updateRitualProgress('tarotViewed');
      toast('Saved to highlights', 'success');
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
        toast('Copied to clipboard', 'success');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard', 'success');
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
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getDisplayName = () => {
    if (!profile?.displayName || profile.displayName.trim() === '') {
      return 'Seeker';
    }

    const name = profile.displayName.trim();

    if (name.includes('@')) {
      const emailName = name.split('@')[0];
      const formatted = emailName
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
      return formatted || 'Seeker';
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
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/20 to-mystic-800 flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-gold" />
        </div>

        <h1 className="font-display text-2xl text-mystic-100 mb-3">
          Your ritual is ready.
        </h1>
        <p className="text-mystic-400 mb-8 max-w-xs">
          Pull one card, then write one honest sentence.
        </p>

        <Button variant="gold" onClick={handleStartRitual} className="min-h-[52px] px-8">
          Start Today's Ritual
          <Sparkles className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-mystic-400 text-sm mb-0.5">{greeting()},</p>
          <h1 className="font-display text-2xl text-mystic-100">{displayName}.</h1>
          {profile?.seekerRank && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gold">Level {profile.level}</span>
              <span className="text-xs text-mystic-500">•</span>
              <span className="text-xs text-mystic-400">{profile.seekerRank}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCelebration(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-mystic-800/80 to-mystic-800/50 px-4 py-2.5 rounded-full active:scale-95 transition-transform border border-mystic-700/50"
        >
          <Flame className="w-5 h-5 text-gold" />
          <span className="font-semibold text-gold">{streak}</span>
          <span className="text-mystic-400 text-sm">day streak</span>
        </button>
      </div>

      {profile && xpProgress.required > 0 && (
        <div className="bg-mystic-900/60 border border-mystic-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-mystic-100">XP Progress</span>
            </div>
            <span className="text-xs text-mystic-400">
              {xpProgress.current} / {xpProgress.required} XP
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

      {!ritualStarted ? (
        <Card variant="glow" padding="lg" className="text-center">
          <div className="py-4">
            <Sparkles className="w-12 h-12 text-gold mx-auto mb-4" />
            <h2 className="font-display text-xl text-mystic-100 mb-2">Today's Ritual</h2>
            <p className="text-mystic-400 text-sm mb-6">Your daily dose of cosmic wisdom awaits</p>
            <Button variant="gold" onClick={handleStartRitual} className="min-h-[48px]">
              Start Today's Ritual
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-mystic-200">Today's Ritual</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${ritualState.horoscopeViewed ? 'bg-gold' : 'bg-mystic-700'}`} />
              <div className={`w-2 h-2 rounded-full ${ritualState.tarotViewed ? 'bg-gold' : 'bg-mystic-700'}`} />
              <div className={`w-2 h-2 rounded-full ${ritualState.promptViewed ? 'bg-gold' : 'bg-mystic-700'}`} />
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

      {savedToday.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-mystic-300">Saved today</h3>
            <button
              onClick={() => openOverlay('saved')}
              className="text-xs text-gold hover:text-gold-light transition-colors"
            >
              View all
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
            <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg text-gold">Ritual Complete!</h3>
              <p className="text-sm text-mystic-400">You're on a {streak}-day streak. Keep it going!</p>
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
