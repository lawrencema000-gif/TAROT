import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, PenLine, Zap, MessageCircle, Heart, HeartHandshake } from 'lucide-react';
import {
  Card,
  Chip,
  Page,
  toast,
  HomePageSkeleton,
  EyebrowLabel,
  SectionDivider,
  SparkleFourPoint,
  TarotCardIcon,
  ListRow,
  ListRowGroup,
} from '../components/ui';
import { localizeSeekerRank } from '../i18n/localizeRank';
import { TarotFlipCard, HoroscopeCard, PromptCard } from '../components/ritual';
import { DailyMissionCard } from '../components/ritual/DailyMissionCard';
import { DailyCosmicScore } from '../components/ritual/DailyCosmicScore';
import { DailyMansionCard } from '../components/ritual/DailyMansionCard';
import { HomeHero } from '../components/home/HomeHero';
import { StreakCelebration } from '../components/celebration/StreakCelebration';
import { StreakConstellation, type ConstellationNight } from '../components/celebration/StreakConstellation';
import { nightsFromRituals } from '../utils/ritualNights';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useRitual } from '../context/RitualContext';
import { useGamification } from '../context/GamificationContext';
import { dailyRituals, savedHighlights } from '../dal';
import { getZodiacSign } from '../utils/zodiac';
import { localDateStr } from '../utils/localDate';
import { friendlyDisplayName } from '../utils/displayName';
import { getDailyPrompt } from '../data/dailyPrompts';
import { getAllTarotCards } from '../services/tarotCards';
import { drawSeededCards } from '../utils/cardDraw';
import type { TarotCard, SavedHighlight } from '../types';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { awardXP, checkAndAwardStreakMilestone } from '../services/levelSystem';
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

/** How many nights the constellation shows. */
const NIGHTS = 14;

/** ISO date `days` before an ISO date, in UTC — the base the ritual rows use. */
function isoDaysBefore(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
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
  const [celebrationReason, setCelebrationReason] = useState<'complete' | 'pill'>('pill');
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
  // `today` (UTC) keys the server-side ritual/highlight rows — keep it
  // UTC so reads and deletes match what was written. `localToday` keys
  // client-only daily content (card seed, prompt) so it rolls over at
  // the user's local midnight, not 4pm/9am depending on timezone.
  const today = new Date().toISOString().split('T')[0];
  const localToday = localDateStr();
  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : 'aries';
  const [nights, setNights] = useState<ConstellationNight[]>(() => nightsFromRituals([], today, NIGHTS));

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
      // All four queries in parallel instead of sequentially
      const [ritualResult, savesResult, countResult, rangeResult] = await Promise.all([
        dailyRituals.getByDate(user.id, today),
        savedHighlights.listForUserDate(user.id, today),
        dailyRituals.countForUser(user.id),
        dailyRituals.listRange(user.id, isoDaysBefore(today, NIGHTS - 1), today),
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

      if (rangeResult.ok) {
        setNights(nightsFromRituals(rangeResult.data, today, NIGHTS));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    setDailyPrompt(getDailyPrompt(localToday));
  }, [localToday]);

  useEffect(() => {
    const loadAndDrawCard = async () => {
      const cards = await getAllTarotCards();
      setTarotCards(cards);
      const seed = `${user?.id || 'anonymous'}_${localToday}`;
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

  const handleStartRitual = () => {
    setRitualStarted(true);
  };

  /** Keep tonight's star in step with what was just done, without a refetch. */
  const markTonight = (state: RitualState) => {
    const parts = ((state.horoscopeViewed ? 1 : 0) + (state.tarotViewed ? 1 : 0) + (state.promptViewed ? 1 : 0)) as 0 | 1 | 2 | 3;
    setNights(prev => prev.map(n => (n.date === today ? { ...n, parts, completed: state.completed } : n)));
  };

  const updateRitualProgress = async (field: keyof Omit<RitualState, 'completed'>) => {
    if (!user) return;

    const newState = { ...ritualState, [field]: true };
    const completed = newState.horoscopeViewed && newState.tarotViewed && newState.promptViewed;
    setRitualState(newState);
    markTonight({ ...newState, completed });
    cacheDailyRitual(user.id, { ...newState, completed, date: today });

    await dailyRituals.upsert({
      userId: user.id,
      date: today,
      horoscopeViewed: newState.horoscopeViewed,
      tarotViewed: newState.tarotViewed,
      promptViewed: newState.promptViewed,
      completed,
    });

    if (completed && !ritualState.completed) {
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
      }

      setCelebrationReason('complete');
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

    const name = drawnTarot.reversed
      ? `${drawnTarot.card.name} (${t('home.ritualCards.reversed')})`
      : drawnTarot.card.name;
    const text = t('home.shareCard', {
      name,
      meaning: drawnTarot.reversed ? drawnTarot.card.meaningReversed : drawnTarot.card.meaningUpright,
    });

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

  const displayName = friendlyDisplayName(profile?.displayName);

  const savedLabel = (type: SavedHighlight['highlightType']) =>
    type === 'horoscope'
      ? t('home.savedTypes.horoscope')
      : type === 'tarot'
        ? t('home.savedTypes.tarot')
        : t('home.savedTypes.prompt');

  if (isLoading) {
    return <HomePageSkeleton />;
  }

  const partsDone = [ritualState.horoscopeViewed, ritualState.tarotViewed, ritualState.promptViewed].filter(Boolean).length;
  const showFeed = ritualStarted || !isFirstTime;
  const hasShortcuts = pickACardEnabled || loveTreeEnabled || soulmateScoreEnabled || quickReadingEnabled || tarotCompanionEnabled;

  const openStreak = () => {
    setCelebrationReason('pill');
    setShowCelebration(true);
  };

  return (
    <Page spacing="md">
      <HomeHero
        greeting={greeting()}
        name={displayName}
        subline={
          profile?.seekerRank ? (
            <p className="text-caption text-mystic-400 mt-1.5">
              <span className="text-gold">{t('home.level', { n: profile.level })}</span>
              <span className="text-mystic-600"> · </span>
              {localizeSeekerRank(profile.seekerRank)}
            </p>
          ) : null
        }
        started={ritualStarted}
        progress={{ horoscope: ritualState.horoscopeViewed, tarot: ritualState.tarotViewed, prompt: ritualState.promptViewed }}
        progressLabel={t('home.ritualProgress', { n: partsDone })}
        title={isFirstTime && !ritualStarted ? t('home.ritualReady.title') : t('home.todaysRitual')}
        lede={isFirstTime ? t('home.ritualReady.sub') : t('home.subtitle')}
        cta={t('home.startTodaysRitual')}
        onStart={handleStartRitual}
        cardBackUrl={profile?.card_back_url}
        aside={
          <button
            type="button"
            onClick={openStreak}
            className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full bg-mystic-850 border border-mystic-700 text-meta text-mystic-300 transition-colors duration-fast [@media(hover:hover)]:hover:border-gold/30 motion-safe:active:scale-95 touch-manipulation [-webkit-tap-highlight-color:transparent]"
          >
            <SparkleFourPoint size={12} className="text-gold" />
            <span className="font-semibold text-gold">{streak}</span>
            <span>{t('home.dayStreakLabel')}</span>
          </button>
        }
      />

      {ritualStarted && (
        <div key="ritual" className="space-y-4 animate-fade-in">
          <HoroscopeCard sign={zodiacSign} onRead={handleReadHoroscope} />

          <Card padding="md">
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

          {ritualState.completed && (
            <Card padding="md" variant="accent">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="heading-display-md text-gold">{t('home.ritualComplete')}</h3>
                  <p className="text-meta text-mystic-400 mt-0.5">{t('home.streak', { n: streak })}</p>
                </div>
                <SparkleFourPoint size={20} className="text-gold shrink-0" />
              </div>
              <button type="button" onClick={openStreak} className="block w-full mt-3 text-gold" aria-label={t('celebration.streak.title')}>
                <StreakConstellation nights={nights} today={today} className="w-full" height={96} />
              </button>
            </Card>
          )}
        </div>
      )}

      {showFeed && (
        <>
          {moonstonesEnabled && <MoonstoneWidget />}

          {moonPhasesEnabled && <MoonPhaseCard />}

          {dailyMissionEnabled && <DailyMissionCard />}

          {/* Personal transit score — pure-compute, cached per local day */}
          <DailyCosmicScore />

          <DailyMansionCard />

          {/* The secondary features, as one list rather than five tiles in
              five colours: each is a row with a tinted glyph, and none of
              them is the size of the ritual itself. */}
          {hasShortcuts && (
            <div className="space-y-3 pt-2">
              <SectionDivider tone="mystic" />
              <EyebrowLabel className="block text-center">{t('home.exploreMore')}</EyebrowLabel>
              <ListRowGroup>
                {pickACardEnabled && (
                  <ListRow
                    icon={<TarotCardIcon />}
                    tone="gold"
                    label={t('home.pickACardTitle')}
                    meta={t('home.pickACardSub')}
                    onClick={() => navigate('/pick-a-card')}
                  />
                )}
                {loveTreeEnabled && (
                  <ListRow
                    icon={<Heart />}
                    tone="rose"
                    label={t('home.loveTreeTitle')}
                    meta={t('home.loveTreeSub')}
                    onClick={() => navigate('/love-tree')}
                  />
                )}
                {soulmateScoreEnabled && (
                  <ListRow
                    icon={<HeartHandshake />}
                    tone="violet"
                    label={t('home.soulmateTitle')}
                    meta={t('home.soulmateSub')}
                    onClick={() => navigate('/soulmate-score')}
                  />
                )}
                {quickReadingEnabled && (
                  <ListRow
                    icon={<Zap />}
                    tone="gold"
                    label={t('home.quickReading')}
                    meta={t('home.quickReadingSub')}
                    onClick={() => navigate('/ai/quick')}
                  />
                )}
                {tarotCompanionEnabled && (
                  <ListRow
                    icon={<MessageCircle />}
                    tone="blue"
                    label={t('home.tarotCompanion')}
                    meta={t('home.tarotCompanionSub')}
                    onClick={() => navigate('/ai/tarot')}
                  />
                )}
              </ListRowGroup>
            </div>
          )}

          {dailyWisdomEnabled && <DailyWisdomCard />}

          {savedToday.length > 0 && (
            <div className="space-y-3">
              <SectionDivider tone="mystic" />
              <div className="flex items-center justify-between">
                <EyebrowLabel align="left">{t('home.savedToday')}</EyebrowLabel>
                <button
                  type="button"
                  onClick={() => openOverlay('saved')}
                  className="text-meta text-gold hover:text-gold-light transition-colors min-h-[44px] px-2"
                >
                  {t('home.seeAllSaved')}
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {savedToday.map((item) => (
                  <Chip
                    key={item.id}
                    size="sm"
                    icon={
                      item.highlightType === 'horoscope' ? (
                        <Star aria-hidden />
                      ) : item.highlightType === 'tarot' ? (
                        <TarotCardIcon aria-hidden />
                      ) : (
                        <PenLine aria-hidden />
                      )
                    }
                    label={savedLabel(item.highlightType)}
                    onClick={() => openOverlay('saved')}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <StreakCelebration
        streak={streak}
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        nights={nights}
        today={today}
        justCompleted={celebrationReason === 'complete'}
      />
    </Page>
  );
}
