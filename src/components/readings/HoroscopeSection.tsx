import { useState, useEffect } from 'react';
import { Star, Heart, Briefcase, Sun, Wind, Feather, Lock, Bookmark, BookmarkCheck, PenLine, Share2, TrendingUp, Gift, Globe, Shield, Flame, AlertTriangle, Droplets, Sword, Gem } from 'lucide-react';
import { TarotCardIcon } from '../ui/NavIcons';
import { Card, Button, Progress, toast, ReadingProse } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { savedHighlights } from '../../dal';
import { getZodiacSign, zodiacData, getElementColor } from '../../utils/zodiac';
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


interface HoroscopeSectionProps {
  onShowPaywall: (feature: string) => void;
}

export function HoroscopeSection({ onShowPaywall }: HoroscopeSectionProps) {
  const { t } = useT('app');
  const { user, profile, refreshProfile } = useAuth();
  const { setActiveTab } = useUI();
  const [isSaved, setIsSaved] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  // Arrays of weekly / monthly insight strings pulled from translation bundle.

  const today = new Date().toISOString().split('T')[0];
  const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : 'aries';
  const zodiacInfo = zodiacData[zodiacSign];
  const horoscope = generateDailyHoroscope(zodiacSign, today);
  const dailyReading = generateDailyReading({ sign: zodiacSign, date: today });
  const planetaryTransit = getPlanetaryTransit(today);
  const affirmation = getDailyAffirmation(zodiacSign, today);
  const luckyNumbers = getLuckyNumbers(today, 6);

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

  const handleJournalPrompt = () => {
    setActiveTab('journal');
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
          <div className={`w-16 h-16 rounded-2xl bg-mystic-800 flex items-center justify-center text-3xl ${getElementColor(zodiacInfo.element)}`}>
            {zodiacInfo.symbol}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl text-gold">{localizeSignName(zodiacInfo.name as ZodiacSignPC)}</h2>
            <p className="text-meta text-mystic-400">{zodiacInfo.dateRange}</p>
          </div>
          <button
            onClick={handleSave}
            className="p-2 rounded-full hover:bg-mystic-800 transition-colors active:scale-90"
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
            <span className="text-sm text-gold font-medium">{horoscope.energy}/5</span>
          </div>

          <div>
            <h3 className="heading-display-md text-mystic-100 mb-2">{t('horoscope.general')}</h3>
            <ReadingProse text={horoscope.general} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-3 p-3 bg-mystic-800/50 rounded-xl">
              <Heart className="w-5 h-5 text-cosmic-rose flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.love')}</h4>
                <p className="reading-copy">{horoscope.love}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-mystic-800/50 rounded-xl">
              <Briefcase className="w-5 h-5 text-cosmic-blue flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.work')}</h4>
                <p className="reading-copy">{horoscope.career}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-mystic-800/50 rounded-xl">
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
                <div className="text-center p-3 bg-mystic-800/30 rounded-xl">
                  <p className="text-meta text-mystic-400 mb-1">{t('horoscope.luckyLabels.color')}</p>
                  <p className="text-sm text-mystic-200 font-medium">{horoscope.luckyColor}</p>
                </div>
                <div className="text-center p-3 bg-mystic-800/30 rounded-xl">
                  <p className="text-meta text-mystic-400 mb-1">{t('horoscope.luckyLabels.number')}</p>
                  <p className="text-lg font-display text-gold">{horoscope.luckyNumber}</p>
                </div>
                <div className="text-center p-3 bg-mystic-800/30 rounded-xl">
                  <p className="text-meta text-mystic-400 mb-1">{t('horoscope.luckyLabels.vibe')}</p>
                  <p className="text-sm text-mystic-200 font-medium">
                    {vibeLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-xl">
              <Wind className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.todaysMood')}</h4>
                <p className="reading-copy">{dailyReading.mood}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-xl">
              <Shield className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.shadowInsight')}</h4>
                <p className="reading-copy">{dailyReading.shadow}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-orange-900/10 border border-orange-500/20 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.caution')}</h4>
                <p className="reading-copy">{dailyReading.caution}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gold/10 to-cosmic-blue/10 border border-gold/20 rounded-xl">
              <Globe className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.planetaryTransit')}</h4>
                <p className="reading-copy">{planetaryTransit}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-cosmic-rose/10 to-gold/10 border border-cosmic-rose/20 rounded-xl">
              <Feather className="w-5 h-5 text-cosmic-rose flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.dailyAffirmation')}</h4>
                <blockquote className="reading-quote my-0">{affirmation}</blockquote>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-xl">
              <TarotCardIcon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="heading-display-md text-mystic-200 mb-2">{t('horoscope.cardOfTheDay')}</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-control bg-mystic-800 flex items-center justify-center">
                      {tarotCard.arcana === 'major' ? <Star className="w-5 h-5 text-gold" aria-hidden /> : tarotCard.suit === 'wands' ? <Flame className="w-5 h-5 text-coral" aria-hidden /> : tarotCard.suit === 'cups' ? <Droplets className="w-5 h-5 text-cosmic-blue-ink" aria-hidden /> : tarotCard.suit === 'swords' ? <Sword className="w-5 h-5 text-mystic-300" aria-hidden /> : <Gem className="w-5 h-5 text-teal" aria-hidden />}
                    </div>
                  <div>
                    <p className="text-sm text-gold font-medium">{tarotCard.name}</p>
                    <p className="text-meta text-mystic-400 mt-0.5">{tarotCard.keywords.slice(0, 3).join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {showExtras && (
              <>
                <div className="flex items-start gap-3 p-4 bg-gold/5 border border-gold/20 rounded-xl">
                  <Gift className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="heading-display-md text-mystic-200 mb-2">{t('horoscope.luckyNumbersLabel')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {luckyNumbers.map((num, i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center"
                        >
                          <span className="text-sm font-bold text-gold">{num}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gold/5 to-mystic-800/30 border border-gold/10 rounded-xl">
                  <Flame className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.miniRitual')}</h4>
                    <p className="reading-copy">{dailyReading.miniRitual}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-mystic-800/30 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="heading-display-md text-mystic-200 mb-1">{t('horoscope.actionStep')}</h4>
                    <p className="reading-copy">{dailyReading.actionStep}</p>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => setShowExtras(!showExtras)}
              className="w-full text-sm text-mystic-400 hover:text-gold transition-colors"
            >
              {showExtras ? t('horoscope.showLess') : t('horoscope.showMore')}
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={handleSave}>
          {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </Button>
        <Button variant="outline" onClick={handleJournalPrompt}>
          <PenLine className="w-4 h-4" />
          {t('horoscope.journalButton')}
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {!profile?.isPremium && (
        <Card
          padding="md"
          interactive
          onClick={() => onShowPaywall(t('horoscope.paywallFeatures.birthChart'))}
          className="flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-mystic-500" />
            <div>
              <h3 className="font-medium text-mystic-200">{t('horoscope.birthChartCard.title')}</h3>
              <p className="text-ui text-mystic-400">{t('horoscope.birthChartCard.subtitle')}</p>
            </div>
          </div>
          <Button variant="gold" size="sm">{t('horoscope.birthChartCard.upgrade')}</Button>
        </Card>
      )}
    </div>
  );
}
