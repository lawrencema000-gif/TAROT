import { useState } from 'react';
import { Calendar, Star, Moon as MoonIcon, Sun, ArrowRight, Compass } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card, Skeleton, ReadingProse } from '../ui';
import { useWeeklyForecast, useMonthlyForecast } from '../../hooks/useAstrology';
import type { ZodiacSign, Planet } from '../../types/astrology';
import { ZodiacGlyph, PlanetGlyph } from '../icons';
import { localizeSignName, localizePlanetName } from '../../i18n/localizeNames';

type ForecastTab = 'weekly' | 'monthly';

export function Forecast() {
  const { t } = useT('app');
  const [tab, setTab] = useState<ForecastTab>('weekly');

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        {(['weekly', 'monthly'] as ForecastTab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              tab === key
                ? 'bg-gold/15 text-gold border border-gold/25'
                : 'bg-mystic-800/60 text-mystic-400 border border-transparent'
            }`}
          >
            {key === 'weekly' ? t('horoscope.forecastView.thisWeek') : t('horoscope.forecastView.thisMonth')}
          </button>
        ))}
      </div>

      {tab === 'weekly' ? <WeeklyView /> : <MonthlyView />}
    </div>
  );
}

function WeeklyView() {
  const { t } = useT('app');
  const { content, loading, error } = useWeeklyForecast();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="text-center py-8">
        <p className="text-ui text-mystic-400">{error || t('horoscope.forecastView.weeklyUnavailable')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-meta text-mystic-400">
        <Calendar className="w-3.5 h-3.5" />
        {content.weekStart} - {content.weekEnd}
      </div>

      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-gold" />
          <span className="heading-display-md text-mystic-100">{t('horoscope.forecastView.weeklyTheme')}</span>
        </div>
        <ReadingProse text={content.mainStoryline} />
      </Card>

      {content.keyMoments && content.keyMoments.length > 0 && (
        <div className="space-y-2">
          <h3 className="heading-display-md text-mystic-100">{t('horoscope.forecastView.keyMoments')}</h3>
          {content.keyMoments.map((m, i) => (
            <Card key={i} padding="sm">
              <div className="flex items-start gap-3">
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-meta font-medium text-gold">{m.day}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-ui font-medium text-mystic-100 mb-0.5">{m.event}</div>
                  <div className="reading-copy">{m.advice}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {content.bestDays && content.bestDays.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h3 className="heading-display-md text-mystic-100">{t('horoscope.forecastView.bestDaysFor')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {content.bestDays.map((b, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-mystic-800/40 rounded-lg">
                <ArrowRight className="w-3 h-3 text-teal flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-meta font-medium text-mystic-200 leading-snug">{b.activity}</div>
                  <div className="text-meta text-mystic-400">{b.day}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function MonthlyView() {
  const { t } = useT('app');
  const { content, loading, error } = useMonthlyForecast();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="text-center py-8">
        <p className="text-ui text-mystic-400">{error || t('horoscope.forecastView.monthlyUnavailable')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-meta text-mystic-400">
        <Calendar className="w-3.5 h-3.5" />
        {content.month}
      </div>

      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-gold" />
          <span className="heading-display-md text-mystic-100">{t('horoscope.forecastView.monthlyOverview')}</span>
        </div>
        <ReadingProse text={content.overview} />
      </Card>

      {/* Stacked on phones: two 116px columns cannot hold a 17px sentence —
          a single long word overhung the card. Side by side from sm up. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {content.newMoon && (
          <Card padding="sm" className="space-y-2">
            <div className="flex items-center gap-2">
              <MoonIcon className="w-4 h-4 text-mystic-300" />
              <span className="heading-display-md text-mystic-100">{t('horoscope.forecastView.newMoon')}</span>
            </div>
            <div className="text-meta text-mystic-400">{content.newMoon.date}</div>
            <div className="flex items-center gap-1.5">
              <ZodiacGlyph sign={content.newMoon.sign as ZodiacSign} size={16} className="text-mystic-300" />
              <span className="text-ui text-mystic-200">{localizeSignName(content.newMoon.sign as ZodiacSign)}</span>
            </div>
            <p className="reading-copy">{content.newMoon.theme}</p>
          </Card>
        )}
        {content.fullMoon && (
          <Card padding="sm" className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-gold" />
              <span className="heading-display-md text-mystic-100">{t('horoscope.forecastView.fullMoon')}</span>
            </div>
            <div className="text-meta text-mystic-400">{content.fullMoon.date}</div>
            <div className="flex items-center gap-1.5">
              <ZodiacGlyph sign={content.fullMoon.sign as ZodiacSign} size={16} className="text-gold" />
              <span className="text-ui text-mystic-200">{localizeSignName(content.fullMoon.sign as ZodiacSign)}</span>
            </div>
            <p className="reading-copy">{content.fullMoon.theme}</p>
          </Card>
        )}
      </div>

      {content.keyDates && content.keyDates.length > 0 && (
        <div className="space-y-2">
          <h3 className="heading-display-md text-mystic-100">{t('horoscope.forecastView.keyDates')}</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {content.keyDates.map((d, i) => (
              <Card key={i} padding="sm" className="flex-shrink-0 w-40 space-y-1">
                <div className="text-meta font-medium text-gold">{d.date}</div>
                <div className="text-ui text-mystic-200">{d.event}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {content.oneThingToDoThisMonth && (
        <Card variant="glow" padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Compass className="w-4 h-4 text-gold" />
            </div>
            <div>
              <div className="heading-display-md text-mystic-100 mb-1">{t('horoscope.forecastView.oneThingThisMonth')}</div>
              <p className="reading-copy">{content.oneThingToDoThisMonth}</p>
            </div>
          </div>
        </Card>
      )}

      {content.outerPlanetTransits && content.outerPlanetTransits.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h3 className="heading-display-md text-mystic-100">{t('horoscope.forecastView.outerPlanetThemes')}</h3>
          {content.outerPlanetTransits.map((tr, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-mystic-800/30 last:border-0">
              <PlanetGlyph planet={tr.planet as Planet} size={22} className="text-gold flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-ui font-medium text-mystic-100 flex items-center gap-1 flex-wrap">
                  {localizePlanetName(tr.planet as Planet)}
                  <ZodiacGlyph sign={tr.sign as ZodiacSign} size={14} className="text-mystic-300" />
                  {localizeSignName(tr.sign as ZodiacSign)}
                </div>
                <div className="reading-copy mt-0.5">{tr.theme}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
