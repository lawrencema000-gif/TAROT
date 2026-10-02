import { useState, useEffect } from 'react';
import { Star, Heart, Briefcase, Sun, Wind, Feather, Lock, Bookmark, BookmarkCheck, PenLine, Share2, TrendingUp, Gift, Globe, Shield, Flame, AlertTriangle, Droplets, Sword, Gem } from 'lucide-react';
import { TarotCardIcon } from '../ui/NavIcons';
import { Card, Button, Progress, toast, ReadingProse, Skeleton } from '../ui';
import { ZODIAC_ICONS } from '../icons';
import { TodayForYouView } from '../horoscope/TodayForYou';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { useNatalChart, useDailyHoroscope } from '../../hooks/useAstrology';
import { savedHighlights } from '../../dal';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';
import { localizeSignName } from '../../i18n/localizeNames';
import type { ZodiacSign as ZodiacSignPC } from '../../types/astrology';
import {
  generateDailyHoroscope,
  getPlanetaryTransit,
  getDailyAffirmation,
  getLuckyNumbers
} from '../../data/horoscopes';
import { generateDailyReading } from '../../services/dailyContent';
import { fullDeck } from '../../data/tarotDeck';
import { localizeCard } from '../../i18n/localizeCard';
import { shareToNative, copyToClipboard } from '../../services/share';
import { awardXP } from '../../services/levelSystem';
import { checkAchievementProgress } from '../../services/achievements';
import { appStorage } from '../../lib/appStorage';
import { useT } from '../../i18n/useT';
import { localDateStr } from '../../utils/localDate';


interface HoroscopeSectionProps {
  onShowPaywall: (feature: string) => void;
}

/**
 * The Readings tab's horoscope.
 *
 * One "today": a signed-in user with a natal chart reads the same
 * transit-based TodayForYou that /horoscope shows (m-4). The deterministic
 * sun-sign text below is the fallback for a user with no chart yet.
 */
export function HoroscopeSection({ onShowPaywall }: HoroscopeSectionProps) {
  const { user } = useAuth();
  const { chart, loading: chartLoading } = useNatalChart();

  if (user && chartLoading && !chart) {
    return (
      <div className="space-y-4" role="status" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-56 w-full rounded-sheet" />
        <Skeleton className="h-20 w-full rounded-card" />
      </div>
    );
  }

  if (user && chart?.natalChart) {
    return <TransitHoroscope onShowPaywall={onShowPaywall} />;
  }

  return <SunSignHoroscope onShowPaywall={onShowPaywall} />;
}

/** Shared action row: Save · Open the journal · Share (m-3: auto / 1fr / auto). */
function ActionRow({
  isSaved,
  onSave,
  onJournal,
  onShare,
}: {
  isSaved: boolean;
  onSave: () => void;
  onJournal: () => void;
  onShare: () => void;
}) {
  const { t } = useT('app');
  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-2">
      <Button variant="outline" onClick={onSave} aria-label={t('horoscope.saveLabel', { defaultValue: 'Save horoscope' })} aria-pressed={isSaved}>
        {isSaved ? <BookmarkCheck className="w-4 h-4" aria-hidden /> : <Bookmark className="w-4 h-4" aria-hidden />}
      </Button>
      <Button variant="outline" onClick={onJournal}>
        <PenLine className="w-4 h-4 mr-2" aria-hidden />
        {t('horoscope.journalButton')}
      </Button>
      <Button variant="outline" onClick={onShare} aria-label={t('horoscope.shareLabel', { defaultValue: 'Share horoscope' })}>
        <Share2 className="w-4 h-4" aria-hidden />
      </Button>
    </div>
  );
}

function PremiumUpsell({ onShowPaywall }: { onShowPaywall: (feature: string) => void }) {
  const { t } = useT('app');
  return (
    <Card
      padding="md"
      interactive
      onClick={() => onShowPaywall(t('horoscope.paywallFeatures.birthChart'))}
      className="flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <Lock className="w-5 h-5 text-mystic-500" aria-hidden />
        <div>
          <h3 className="text-ui font-medium text-mystic-100">{t('horoscope.birthChartCard.title')}</h3>
          <p className="text-meta text-mystic-400">{t('horoscope.birthChartCard.subtitle')}</p>
        </div>
      </div>
      <Button variant="gold" size="sm">{t('horoscope.birthChartCard.upgrade')}</Button>
    </Card>
  );
}

function useHoroscopeXp(today: string) {
  const { user, refreshProfile } = useAuth();
  useEffect(() => {
    if (!user) return;
    const key = `arcana_horoscope_xp_${today}`;
    appStorage.get(key).then((val) => {
      if (val) return;
      appStorage.set(key, '1');
      awardXP(user.id, 'horoscope_viewed').then(() => refreshProfile());
    });
    checkAchievementProgress(user.id, 'horoscope_viewed');
  }, [user, today]);
}

/** The transit-based reading, shared with /horoscope Today. */
function TransitHoroscope({ onShowPaywall }: HoroscopeSectionProps) {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const { setActiveTab } = useUI();
  const source = useDailyHoroscope();
  const [isSaved, setIsSaved] = useState(false);
  const today = localDateStr();
  useHoroscopeXp(today);

  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : 'aries';
  const signName = localizeSignName(zodiacData[zodiacSign].name as ZodiacSignPC);

  const handleSave = async () => {
    if (!user || !source.content) return;
    const res = await savedHighlights.insert({
      userId: user.id,
      date: today,
      highlightType: 'horoscope',
      content: { theme: source.content.theme, summary: source.content.summary, zodiacSign },
    });
    if (!res.ok) {
      toast(t('horoscope.toasts.saveFailed'), 'error');
    } else {
      setIsSaved(true);
      toast(t('horoscope.toasts.horoscopeSaved'), 'success');
    }
  };

  const handleShare = async () => {
    if (!source.content) return;
    const shareText = t('horoscope.share.template', {
      sign: signName,
      general: `${source.content.theme}. ${source.content.summary}`,
      affirmation: source.content.powerMove,
    });
    const success = await shareToNative(t('horoscope.share.title'), shareText);
    if (success) {
      toast(t('horoscope.toasts.shared'), 'success');
    } else {
      const copied = await copyToClipboard(shareText);
      toast(copied ? t('horoscope.toasts.copied') : t('horoscope.toasts.unableToShare'), copied ? 'success' : 'error');
    }
  };

  return (
    <div className="space-y-6">
      <TodayForYouView
        {...source}
        actions={
          source.content ? (
            <ActionRow isSaved={isSaved} onSave={handleSave} onJournal={() => setActiveTab('journal')} onShare={handleShare} />
          ) : undefined
        }
      />
      {!profile?.isPremium && <PremiumUpsell onShowPaywall={onShowPaywall} />}
    </div>
  );
}

/** Fallback: the deterministic sun-sign reading for a user without a chart. */
function SunSignHoroscope({ onShowPaywall }: HoroscopeSectionProps) {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const { setActiveTab } = useUI();
  const [isSaved, setIsSaved] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  // The local calendar date, like the Home ritual: a highlight saved after
  // midnight local time belongs to that day's "Saved today" strip.
  const today = localDateStr();
  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : 'aries';
  const zodiacInfo = zodiacData[zodiacSign];
  // Drawn, as on the Home ritual card: the text symbol is a colour emoji on Android.
  const SignGlyph = ZODIAC_ICONS[zodiacInfo.name as ZodiacSignPC];
  const signName = localizeSignName(zodiacInfo.name as ZodiacSignPC);
  const horoscope = generateDailyHoroscope(zodiacSign, today);
  const dailyReading = generateDailyReading({ sign: zodiacSign, date: today });
  const planetaryTransit = getPlanetaryTransit(today);
  const affirmation = getDailyAffirmation(zodiacSign, today);
  const luckyNumbers = getLuckyNumbers(today, 6);
  useHoroscopeXp(today);

  const getDailyTarotCard = () => {
    const dateNum = new Date(today).getTime();
    const signNum = zodiacSign.charCodeAt(0);
    const index = (dateNum + signNum) % fullDeck.length;
    return localizeCard(fullDeck[index]);
  };

  const tarotCard = getDailyTarotCard();

  const moodVibe =
    horoscope.energy >= 4
      ? t('horoscope.vibe.productive')
      : horoscope.energy >= 3
        ? t('horoscope.vibe.balanced')
        : t('horoscope.vibe.reflective');

  const vibeLabel =
    horoscope.energy >= 4
      ? t('horoscope.vibe.expansive')
      : horoscope.energy >= 3
        ? t('horoscope.vibe.steady')
        : t('horoscope.vibe.introspective');

  const handleSave = async () => {
    if (!user) return;

    const res = await savedHighlights.insert({
      userId: user.id,
      date: today,
      highlightType: 'horoscope',
      content: { horoscope, zodiacSign },
    });

    if (!res.ok) {
      toast(t('horoscope.toasts.saveFailed'), 'error');
    } else {
      setIsSaved(true);
      toast(t('horoscope.toasts.horoscopeSaved'), 'success');
    }
  };

  const handleShare = async () => {
    const shareText = t('horoscope.share.template', {
      sign: zodiacInfo.name,
      general: horoscope.general,
      affirmation,
    });
    const success = await shareToNative(t('horoscope.share.title'), shareText);
    if (success) {
      toast(t('horoscope.toasts.shared'), 'success');
    } else {
      const copied = await copyToClipboard(shareText);
      if (copied) {
        toast(t('horoscope.toasts.copied'), 'success');
      } else {
        toast(t('horoscope.toasts.unableToShare'), 'error');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-card bg-gold/10 text-gold flex items-center justify-center">
            <SignGlyph size={36} strokeWidth={1.5} aria-label={signName} />
          </div>
          <div className="flex-1">
            <h2 className="heading-display-lg heading-strong text-mystic-100">{signName}</h2>
            <p className="text-meta text-mystic-400">{zodiacInfo.dateRange}</p>
          </div>
          <button
            onClick={handleSave}
            aria-label={t('horoscope.saveLabel', { defaultValue: 'Save horoscope' })}
            aria-pressed={isSaved}
            className="p-3 rounded-full hover:bg-mystic-800 transition-colors active:scale-90"
          >
            {isSaved ? (
              <BookmarkCheck className="w-5 h-5 text-gold" />
            ) : (
              <Bookmark className="w-5 h-5 text-mystic-400" />
            )}
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <p className="text-meta text-mystic-400 uppercase tracking-wider">{t('horoscope.energyScore')}</p>
            <Progress
              value={horoscope.energy}
              max={5}
              size="md"
              tone="gold"
              label={t('horoscope.energyScore')}
              className="flex-1"
            />
            <span className="text-ui text-gold font-medium tabular-nums">{horoscope.energy}/5</span>
          </div>

          <div>
            <h3 className="heading-display-md text-mystic-100 mb-2">{t('horoscope.general')}</h3>
            <ReadingProse text={horoscope.general} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-3 p-3 bg-mystic-800/50 rounded-control">
              <Heart className="w-5 h-5 text-cosmic-rose flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.love')}</h4>
                <p className="reading-copy">{horoscope.love}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-mystic-800/50 rounded-control">
              <Briefcase className="w-5 h-5 text-cosmic-blue flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.work')}</h4>
                <p className="reading-copy">{horoscope.career}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-mystic-800/50 rounded-control">
              <Sun className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.mood')}</h4>
                <p className="reading-copy">
                  {t('horoscope.moodDescription', { vibe: moodVibe })}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-mystic-700 space-y-4">
            <div>
              <h4 className="heading-display-md text-mystic-100 mb-3">{t('horoscope.luckyFocus')}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-mystic-800/30 rounded-control">
                  <p className="text-meta text-mystic-400 mb-1">{t('horoscope.luckyLabels.color')}</p>
                  <p className="text-ui text-mystic-200 font-medium">{horoscope.luckyColor}</p>
                </div>
                <div className="text-center p-3 bg-mystic-800/30 rounded-control">
                  <p className="text-meta text-mystic-400 mb-1">{t('horoscope.luckyLabels.number')}</p>
                  <p className="text-title font-semibold text-gold tabular-nums">{horoscope.luckyNumber}</p>
                </div>
                <div className="text-center p-3 bg-mystic-800/30 rounded-control">
                  <p className="text-meta text-mystic-400 mb-1">{t('horoscope.luckyLabels.vibe')}</p>
                  <p className="text-ui text-mystic-200 font-medium">
                    {vibeLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-control">
              <Wind className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.todaysMood')}</h4>
                <p className="reading-copy">{dailyReading.mood}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-control">
              <Shield className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.shadowInsight')}</h4>
                <p className="reading-copy">{dailyReading.shadow}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gold/10 border border-gold/25 rounded-control">
              <AlertTriangle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.caution')}</h4>
                <p className="reading-copy">{dailyReading.caution}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 border border-mystic-700 rounded-control">
              <Globe className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.planetaryTransit')}</h4>
                <p className="reading-copy">{planetaryTransit}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 border border-cosmic-rose/20 rounded-control">
              <Feather className="w-5 h-5 text-cosmic-rose flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.dailyAffirmation')}</h4>
                <blockquote className="reading-quote my-0">{affirmation}</blockquote>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-control">
              <TarotCardIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-2">{t('horoscope.cardOfTheDay')}</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-control bg-mystic-800 flex items-center justify-center">
                      {tarotCard.arcana === 'major' ? <Star className="w-5 h-5 text-gold" aria-hidden /> : tarotCard.suit === 'wands' ? <Flame className="w-5 h-5 text-coral" aria-hidden /> : tarotCard.suit === 'cups' ? <Droplets className="w-5 h-5 text-cosmic-blue-ink" aria-hidden /> : tarotCard.suit === 'swords' ? <Sword className="w-5 h-5 text-mystic-300" aria-hidden /> : <Gem className="w-5 h-5 text-teal" aria-hidden />}
                    </div>
                  <div>
                    <p className="text-ui text-gold font-medium">{tarotCard.name}</p>
                    <p className="text-meta text-mystic-400 mt-0.5">{tarotCard.keywords.slice(0, 3).join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {showExtras && (
              <>
                <div className="flex items-start gap-3 p-4 bg-gold/5 border border-gold/20 rounded-control">
                  <Gift className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="heading-display-md text-mystic-200 mb-2">{t('horoscope.luckyNumbersLabel')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {luckyNumbers.map((num, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center"
                        >
                          <span className="text-ui font-semibold text-gold tabular-nums">{num}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-mystic-800/30 border border-gold/10 rounded-control">
                  <Flame className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.miniRitual')}</h4>
                    <p className="reading-copy">{dailyReading.miniRitual}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-control">
                  <TrendingUp className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.actionStep')}</h4>
                    <p className="reading-copy">{dailyReading.actionStep}</p>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setShowExtras(!showExtras)}
              aria-expanded={showExtras}
              className="w-full min-h-[44px] text-ui text-mystic-400 hover:text-gold transition-colors"
            >
              {showExtras ? t('horoscope.showLess') : t('horoscope.showMore')}
            </button>
          </div>
        </div>
      </Card>

      <ActionRow isSaved={isSaved} onSave={handleSave} onJournal={() => setActiveTab('journal')} onShare={handleShare} />

      {!profile?.isPremium && <PremiumUpsell onShowPaywall={onShowPaywall} />}
    </div>
  );
}
