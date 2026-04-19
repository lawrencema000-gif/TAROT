import { useState } from 'react';
import { Calendar, Star, Moon as MoonIcon, Sun, ArrowRight, Sparkles } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card, Skeleton } from '../ui';
import { useWeeklyForecast, useMonthlyForecast } from '../../hooks/useAstrology';
import { SIGN_SYMBOLS, PLANET_SYMBOLS } from '../../types/astrology';
import type { ZodiacSign, Planet } from '../../types/astrology';

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
        <p className="text-mystic-400 text-sm">{error || t('horoscope.forecastView.weeklyUnavailable')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-mystic-500">
        <Calendar className="w-3.5 h-3.5" />
        {content.weekStart} - {content.weekEnd}
      </div>

      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-gold">{t('horoscope.forecastView.weeklyTheme')}</span>
        </div>
        <p className="text-sm text-mystic-200 leading-relaxed">{content.mainStoryline}</p>
      </Card>

      {content.keyMoments && content.keyMoments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-mystic-300">{t('horoscope.forecastView.keyMoments')}</h3>
          {content.keyMoments.map((m, i) => (
            <Card key={i} padding="sm">
              <div className="flex items-start gap-3">
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-xs font-medium text-gold">{m.day}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-mystic-200 mb-0.5">{m.event}</div>
                  <div className="text-xs text-mystic-400">{m.advice}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {content.bestDays && content.bestDays.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-medium text-mystic-300">{t('horoscope.forecastView.bestDaysFor')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {content.bestDays.map((b, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-mystic-800/40 rounded-lg">
                <ArrowRight className="w-3 h-3 text-teal flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-medium text-mystic-200 truncate">{b.activity}</div>
                  <div className="text-[10px] text-mystic-500">{b.day}</div>
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
        <p className="text-mystic-400 text-sm">{error || t('horoscope.forecastView.monthlyUnavailable')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-mystic-500">
        <Calendar className="w-3.5 h-3.5" />
        {content.month}
      </div>

      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-gold">{t('horoscope.forecastView.monthlyOverview')}</span>
        </div>
        <p className="text-sm text-mystic-200 leading-relaxed">{content.overview}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {content.newMoon && (
          <Card padding="sm" className="space-y-2">
            <div className="flex items-center gap-2">
              <MoonIcon className="w-4 h-4 text-mystic-300" />
              <span className="text-xs font-medium text-mystic-300">{t('horoscope.forecastView.newMoon')}</span>
            </div>
            <div className="text-xs text-mystic-500">{content.newMoon.date}</div>
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: 'serif' }}>
                {SIGN_SYMBOLS[content.newMoon.sign as ZodiacSign]}
              </span>
              <span className="text-xs text-mystic-200">{content.newMoon.sign}</span>
            </div>
            <p className="text-xs text-mystic-400">{content.newMoon.theme}</p>
          </Card>
        )}
        {content.fullMoon && (
          <Card padding="sm" className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-gold" />
              <span className="text-xs font-medium text-gold">{t('horoscope.forecastView.fullMoon')}</span>
            </div>
            <div className="text-xs text-mystic-500">{content.fullMoon.date}</div>
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: 'serif' }}>
                {SIGN_SYMBOLS[content.fullMoon.sign as ZodiacSign]}
              </span>
              <span className="text-xs text-mystic-200">{content.fullMoon.sign}</span>
            </div>
            <p className="text-xs text-mystic-400">{content.fullMoon.theme}</p>
          </Card>
        )}
      </div>

      {content.keyDates && content.keyDates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-mystic-300">{t('horoscope.forecastView.keyDates')}</h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {content.keyDates.map((d, i) => (
              <Card key={i} padding="sm" className="flex-shrink-0 w-40 space-y-1">
                <div className="text-xs font-medium text-gold">{d.date}</div>
                <div className="text-xs text-mystic-300">{d.event}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {content.oneThingToDoThisMonth && (
        <Card variant="glow" padding="md">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-gold" />
            </div>
            <div>
              <div className="text-xs font-medium text-gold mb-1">{t('horoscope.forecastView.oneThingThisMonth')}</div>
              <p className="text-sm text-mystic-200">{content.oneThingToDoThisMonth}</p>
            </div>
          </div>
        </Card>
      )}

      {content.outerPlanetTransits && content.outerPlanetTransits.length > 0 && (
        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-medium text-mystic-300">{t('horoscope.forecastView.outerPlanetThemes')}</h3>
          {content.outerPlanetTransits.map((t, i) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b border-mystic-800/30 last:border-0">
              <span className="text-lg" style={{ fontFamily: 'serif' }}>
                {PLANET_SYMBOLS[t.planet as Planet]}
              </span>
              <div className="flex-1">
                <div className="text-xs font-medium text-mystic-200">
                  {t.planet} in {SIGN_SYMBOLS[t.sign as ZodiacSign]} {t.sign}
                </div>
                <div className="text-xs text-mystic-400 mt-0.5">{t.theme}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
