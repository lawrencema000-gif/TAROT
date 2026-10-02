import { useEffect, useRef, type ReactNode } from 'react';
import { RefreshCw, Moon, Zap, Heart, Briefcase, DollarSign, Flame, Check, X, BookOpen } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card, Skeleton, ResultSheet, Disclaimer, Button } from '../ui';
import { useDailyHoroscope } from '../../hooks/useAstrology';
import { useAuth } from '../../context/AuthContext';
import { adsService } from '../../services/ads';
import type { AspectType, DailyContent, ZodiacSign } from '../../types/astrology';
import { ZodiacGlyph, ZODIAC_ICONS } from '../icons';
import { localizeSignName, localizePlanetName, localizeAspectName } from '../../i18n/localizeNames';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';
import { getLocale } from '../../i18n/config';

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'text-gold border-gold/20 bg-gold/5',
  trine: 'text-teal border-teal/20 bg-teal/5',
  sextile: 'text-cosmic-blue border-cosmic-blue/20 bg-cosmic-blue/5',
  square: 'text-coral border-coral/20 bg-coral/5',
  opposition: 'text-cosmic-rose border-cosmic-rose/20 bg-cosmic-rose/5',
};

const CATEGORY_ICONS = {
  love: Heart,
  career: Briefcase,
  money: DollarSign,
  energy: Flame,
};

const CATEGORY_COLORS = {
  love: 'text-cosmic-rose',
  career: 'text-cosmic-blue',
  money: 'text-teal',
  energy: 'text-gold',
};

export interface TodayForYouViewProps {
  content: DailyContent | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Save / journal / share — rendered after the tiles, before the Disclaimer closes the reading. */
  actions?: ReactNode;
}

/**
 * Today for you — the transit-based daily reading, the one "today" in the
 * app. `TodayForYou` owns its data; `TodayForYouView` takes it as props so
 * the Readings tab (HoroscopeSection) can share the same fetch and reuse
 * the content for save and share.
 */
export function TodayForYou() {
  const source = useDailyHoroscope();
  return <TodayForYouView {...source} />;
}

export function TodayForYouView({ content, loading, error, refresh, actions }: TodayForYouViewProps) {
  const { t } = useT('app');
  const { profile } = useAuth();
  const adShownRef = useRef(false);

  useEffect(() => {
    if (content && !adShownRef.current) {
      adShownRef.current = true;
      adsService.checkAndShowAd(profile?.isPremium || false, 'horoscope', profile?.isAdFree || false);
    }
  }, [content]);

  if (loading) {
    return (
      <div className="pt-2 space-y-4" role="status" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-56 w-full rounded-sheet" />
        <Skeleton className="h-20 w-full rounded-card" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="py-10 text-center space-y-4">
        <p className="text-ui text-mystic-300">
          {error
            ? t('horoscope.todayForYou.loadFailed', { defaultValue: 'Couldn’t load today’s reading — check your connection and try again.' })
            : t('horoscope.todayForYou.noDailyContent')}
        </p>
        <Button variant="outline" size="sm" onClick={() => refresh()}>
          <RefreshCw className="w-4 h-4 mr-2" aria-hidden />
          {t('horoscope.todayForYou.tryAgain')}
        </Button>
      </div>
    );
  }

  // The user's own sign is the sheet's glyph and eyebrow: "Today, Leo".
  const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : null;
  const sunSignName = sunSign ? (zodiacData[sunSign].name as ZodiacSign) : null;
  const SignGlyph = sunSignName ? ZODIAC_ICONS[sunSignName] : null;
  const eyebrow = sunSignName
    ? t('horoscope.todayForYou.eyebrowSign', { defaultValue: 'Today, {{sign}}', sign: localizeSignName(sunSignName) })
    : t('horoscope.todayForYou.eyebrow', { defaultValue: 'Today' });
  const dateLabel = new Intl.DateTimeFormat(getLocale(), { weekday: 'long', month: 'long', day: 'numeric' }).format(
    content.date ? new Date(`${content.date}T12:00:00`) : new Date(),
  );

  return (
    <div className="pt-2 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-meta text-mystic-400">{dateLabel}</p>
        <button
          type="button"
          onClick={() => refresh()}
          aria-label={t('common:actions.refresh', { defaultValue: 'Refresh' })}
          className="min-h-[44px] min-w-[44px] -mr-3 flex items-center justify-center rounded-control text-mystic-400 hover:text-mystic-200 hover:bg-mystic-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden />
        </button>
      </div>

      <ResultSheet
        headingLevel="h2"
        glyph={SignGlyph ? <SignGlyph size={28} strokeWidth={1.5} /> : undefined}
        eyebrow={eyebrow}
        title={content.theme}
        summary={content.summary}
      />

      <Card padding="md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-control bg-mystic-800 flex items-center justify-center" aria-hidden>
            <Moon className="w-5 h-5 text-mystic-300" />
          </div>
          <div>
            <div className="text-meta text-mystic-400">{t('horoscope.todayForYou.moonIn')}</div>
            <div className="flex items-center gap-1.5">
              <ZodiacGlyph sign={content.moonSign as ZodiacSign} size={20} className="text-gold" />
              <span className="text-ui font-medium text-mystic-100">{localizeSignName(content.moonSign as ZodiacSign)}</span>
              {content.moonHouse && (
                <span className="text-meta text-mystic-400 tabular-nums">{t('horoscope.todayForYou.houseParen', { num: content.moonHouse })}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {content.transitHighlights && content.transitHighlights.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-meta font-medium text-mystic-300 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" aria-hidden />
            {t('horoscope.todayForYou.activeTransits')}
          </h3>
          <div className="space-y-2">
            {content.transitHighlights.map((tr, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 rounded-control border ${ASPECT_COLORS[tr.aspect] || 'text-mystic-300 border-mystic-700 bg-mystic-850'}`}
              >
                <div className="text-meta font-medium mb-0.5">
                  {localizePlanetName(tr.planet)} {localizeAspectName(tr.aspect)} {localizePlanetName(tr.natalPlanet)}
                </div>
                <div className="text-meta text-mystic-300">{tr.brief}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(Object.entries(content.categories) as [keyof typeof CATEGORY_ICONS, string][]).map(([key, text]) => {
          const Icon = CATEGORY_ICONS[key];
          const color = CATEGORY_COLORS[key];
          return (
            <Card key={key} padding="sm" className="space-y-2">
              <div className={`flex items-center gap-2 ${color}`}>
                <Icon className="w-4 h-4" aria-hidden />
                <span className="text-meta font-medium">{t(`horoscope.todayForYou.categories.${key}`)}</span>
              </div>
              <p className="text-meta text-mystic-300">{text}</p>
            </Card>
          );
        })}
      </div>

      {content.powerMove && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-control bg-gold/10 flex items-center justify-center flex-shrink-0" aria-hidden>
              <Zap className="w-4 h-4 text-gold" />
            </div>
            <div>
              <div className="text-meta font-medium text-gold mb-1">{t('horoscope.todayForYou.powerMove')}</div>
              <p className="text-ui text-mystic-200">{content.powerMove}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {content.doList && content.doList.length > 0 && (
          <Card padding="sm" className="space-y-2">
            <div className="text-meta font-medium text-teal flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" aria-hidden /> {t('horoscope.todayForYou.doLabel')}
            </div>
            <ul className="space-y-1">
              {content.doList.map((item, i) => (
                <li key={i} className="text-meta text-mystic-300">{item}</li>
              ))}
            </ul>
          </Card>
        )}
        {content.avoidList && content.avoidList.length > 0 && (
          <Card padding="sm" className="space-y-2">
            <div className="text-meta font-medium text-coral flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" aria-hidden /> {t('horoscope.todayForYou.avoidLabel')}
            </div>
            <ul className="space-y-1">
              {content.avoidList.map((item, i) => (
                <li key={i} className="text-meta text-mystic-300">{item}</li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {content.ritual && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-control bg-mystic-800 flex items-center justify-center flex-shrink-0" aria-hidden>
              <Flame className="w-4 h-4 text-mystic-300" />
            </div>
            <div>
              <div className="text-meta font-medium text-mystic-400 mb-1">{t('horoscope.todayForYou.miniRitual')}</div>
              <p className="text-ui text-mystic-200">{content.ritual}</p>
            </div>
          </div>
        </Card>
      )}

      {content.journalPrompt && (
        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-control bg-mystic-800 flex items-center justify-center flex-shrink-0" aria-hidden>
              <BookOpen className="w-4 h-4 text-mystic-300" />
            </div>
            <div>
              <div className="text-meta font-medium text-mystic-400 mb-1">{t('horoscope.todayForYou.journalPrompt')}</div>
              <p className="text-ui text-mystic-200 italic">{content.journalPrompt}</p>
            </div>
          </div>
        </Card>
      )}

      {actions}

      <Disclaimer kind="astrology" />
    </div>
  );
}
