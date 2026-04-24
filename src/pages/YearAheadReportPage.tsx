import { useState, useEffect, useCallback } from 'react';
import { Calendar, Lock, Sparkles, CheckCircle2, AlertCircle, TrendingUp, Clock, Star, Crown } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { reportUnlocks, moonstones } from '../dal';
import { supabase } from '../lib/supabase';
import { SubscriptionSheet, WatchAdSheet } from '../components/premium';
import { OrnateDivider } from '../components/ui';

/**
 * Year-Ahead Forecast — 300 Moonstones or Premium subscription.
 *
 * Monetization refactor 2026-04-25: one-off Stripe per-report purchases
 * removed. Premium unlocks every feature; Moonstones are the per-report
 * unlock currency; every rewarded ad credits +50 Moonstones.
 */

const YEAR_AHEAD_COST = 300;

interface YearAheadEvent {
  startDate: string;
  endDate: string;
  monthIso: string;
  transitPlanet: string;
  natalPlanet: string;
  aspectType: string;
  transitSign: string;
  interpretation: string;
  intensity: 'soft' | 'neutral' | 'hard';
}

interface MonthBriefing {
  monthIso: string;
  monthLabel: string;
  events: YearAheadEvent[];
  theme: string;
}

interface YearAheadData {
  generatedAt: string;
  monthsCovered: number;
  months: MonthBriefing[];
  summary: string;
}

const INTENSITY_COLORS: Record<'soft' | 'neutral' | 'hard', string> = {
  soft: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
  neutral: 'text-cosmic-blue border-cosmic-blue/30 bg-cosmic-blue/5',
  hard: 'text-pink-400 border-pink-400/30 bg-pink-400/5',
};

export function YearAheadReportPage() {
  const { t } = useT('app');
  const { profile, user } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showWatchAd, setShowWatchAd] = useState(false);
  const moonstonesEnabled = useFeatureFlag('moonstones');
  const [data, setData] = useState<YearAheadData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasNatalChart = !!profile?.birthDate && !!profile?.birthTime && !!profile?.birthPlace;
  const currentYear = new Date().getFullYear();

  const checkUnlock = useCallback(async () => {
    if (!user) {
      setChecking(false);
      return;
    }
    setChecking(true);
    const reference = String(currentYear);
    const [unlockRes, balanceRes] = await Promise.all([
      reportUnlocks.isUnlocked('year-ahead', reference),
      moonstones.getBalance(user.id),
    ]);
    if (unlockRes.ok) setUnlocked(unlockRes.data);
    if (balanceRes.ok) setBalance(balanceRes.data);
    setChecking(false);
  }, [user, currentYear]);

  useEffect(() => { checkUnlock(); }, [checkUnlock]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    const { data: resp, error: err } = await supabase.functions.invoke('astrology-year-ahead', {
      body: {},
    });
    setLoadingData(false);
    if (err) {
      const anyErr = err as { context?: { status?: number }; message?: string };
      if (anyErr?.context?.status === 404) {
        setError('natal-missing');
      } else if (anyErr?.context?.status === 402) {
        setError('not-unlocked');
      } else {
        setError('generic');
      }
      return;
    }
    const payload = (resp?.data ?? resp) as YearAheadData | null;
    if (!payload) {
      setError('generic');
      return;
    }
    setData(payload);
  }, []);

  useEffect(() => {
    if (unlocked && !data && !loadingData) loadData();
  }, [unlocked, data, loadingData, loadData]);

  const handleUnlock = async () => {
    setUnlocking(true);
    const res = await reportUnlocks.unlockWithMoonstones(
      'year-ahead',
      String(currentYear),
      YEAR_AHEAD_COST,
    );
    setUnlocking(false);
    if (res.ok) {
      setUnlocked(true);
      setBalance(res.data.newBalance);
      toast(t('yearAhead.unlocked', { defaultValue: 'Forecast unlocked' }), 'success');
    } else if (res.error === 'insufficient-balance') {
      toast(
        t('yearAhead.insufficientBalance', {
          defaultValue: 'Not enough Moonstones — earn more via daily check-in or invites',
        }),
        'error',
      );
    } else {
      toast(t('yearAhead.unlockFailed', { defaultValue: 'Could not unlock' }), 'error');
    }
  };

  if (!hasNatalChart) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('yearAhead.title', { defaultValue: 'Year Ahead' })}
          </h1>
        </div>
        <Card padding="lg" variant="glow">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display text-lg text-mystic-100 mb-1">
                {t('yearAhead.needsBirthData', { defaultValue: 'Add your full birth data first' })}
              </h3>
              <p className="text-sm text-mystic-400 leading-relaxed">
                {t('yearAhead.needsBirthDataBody', {
                  defaultValue:
                    'Year-ahead forecasts need date, time, and place of birth to compute transits to your natal chart. Add them in Profile → Edit profile.',
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="py-12 text-center text-mystic-500">
        {t('common:actions.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('yearAhead.title', { defaultValue: 'Year Ahead' })}
          </h1>
        </div>

        <Card padding="lg" variant="ornate" className="text-center nebula-veil">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <h2 className="font-display-hero text-2xl text-gold-foil mb-2">
            {t('yearAhead.cardTitle', { defaultValue: '{{year}} — 12 monthly briefings', year: currentYear })}
          </h2>
          <div className="flex justify-center mb-3 text-gold/60">
            <OrnateDivider width={120} />
          </div>
          <p className="text-sm text-mystic-300 italic mb-4">
            {t('yearAhead.cardSub', {
              defaultValue: 'A month-by-month map of the biggest transits to your natal chart.',
            })}
          </p>
          <ul className="text-xs text-mystic-400 text-left space-y-2 mb-5 max-w-[280px] mx-auto">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('yearAhead.locked.feat1', { defaultValue: '12 monthly theme briefings' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('yearAhead.locked.feat2', { defaultValue: 'Outer-planet transits to your personal planets' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('yearAhead.locked.feat3', { defaultValue: 'Start/end dates for each transit window' })}
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-gold mt-0.5 flex-shrink-0" />
              {t('yearAhead.locked.feat4', { defaultValue: 'Overall year-long narrative' })}
            </li>
          </ul>

          {/*
            Monetization refactor 2026-04-25 — two-option paywall:
              1. PRIMARY: Upgrade to Premium → unlocks EVERY feature
              2. SECONDARY: Unlock with Moonstones (or earn them via ads)
            One-off Stripe per-report purchases have been removed to
            keep the transactional surface small + unambiguous.
          */}
          <Button
            variant="gold"
            fullWidth
            onClick={() => setShowSubscription(true)}
            className="min-h-[52px]"
          >
            <Crown className="w-4 h-4 mr-2" />
            {t('yearAhead.upgradeToPremium', {
              defaultValue: 'Upgrade to Premium — unlocks everything',
            })}
          </Button>

          {moonstonesEnabled && (balance !== null && balance >= YEAR_AHEAD_COST ? (
            <Button
              variant="outline"
              fullWidth
              onClick={handleUnlock}
              disabled={unlocking}
              loading={unlocking}
              className="min-h-[48px] mt-3"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('yearAhead.unlockCta', {
                defaultValue: 'Unlock with {{n}} Moonstones',
                n: YEAR_AHEAD_COST,
              })}
            </Button>
          ) : (
            <div className="mt-3 p-3 rounded-xl bg-mystic-900/40 border border-mystic-700/30 text-left">
              <p className="text-xs text-mystic-300 mb-2">
                {t('yearAhead.orEarnMoonstones', {
                  defaultValue: 'Or unlock with {{n}} Moonstones',
                  n: YEAR_AHEAD_COST,
                })}
              </p>
              <p className="text-[11px] text-mystic-500 mb-3">
                {t('yearAhead.balanceShort', { defaultValue: 'Balance: {{n}}', n: balance ?? 0 })}
                {' · '}
                {t('yearAhead.earnHint', {
                  defaultValue: 'Earn Moonstones via daily check-in, watching ads, or inviting friends.',
                })}
              </p>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => setShowWatchAd(true)}
                className="min-h-[40px]"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {t('yearAhead.earnNow', {
                  defaultValue: 'Earn 50 Moonstones — watch ad',
                })}
              </Button>
            </div>
          ))}
        </Card>

        <SubscriptionSheet open={showSubscription} onClose={() => setShowSubscription(false)} />
        {moonstonesEnabled && (
          <WatchAdSheet
            open={showWatchAd}
            onClose={() => setShowWatchAd(false)}
            onCredited={(newBalance) => setBalance(newBalance)}
            onShowPaywall={() => setShowSubscription(true)}
          />
        )}
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="py-12 text-center">
        <div className="loading-constellation mx-auto mb-3" />
        <p className="text-mystic-400 text-sm">
          {t('yearAhead.computing', { defaultValue: 'Mapping your year…' })}
        </p>
      </div>
    );
  }

  if (error === 'natal-missing') {
    return (
      <Card padding="lg" variant="glow">
        <p className="text-sm text-mystic-400">
          {t('yearAhead.errorNatalMissing', {
            defaultValue: 'We could not find your computed natal chart. Please re-enter your birth data in Profile.',
          })}
        </p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card padding="lg">
        <p className="text-sm text-mystic-400">
          {t('yearAhead.errorGeneric', { defaultValue: 'Could not load forecast. Try again in a moment.' })}
        </p>
        <Button variant="primary" onClick={loadData} className="mt-3">
          {t('common:actions.retry', { defaultValue: 'Retry' })}
        </Button>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-gold" />
        <h1 className="font-display text-2xl text-mystic-100">
          {t('yearAhead.title', { defaultValue: 'Year Ahead' })}
        </h1>
      </div>

      <Card padding="lg" variant="glow" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-mystic-900">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 text-gold" />
          <p className="text-[10px] uppercase tracking-widest text-gold">
            {t('yearAhead.overall', { defaultValue: 'Overall arc' })}
          </p>
        </div>
        <p className="text-sm text-mystic-200 leading-relaxed">{data.summary}</p>
      </Card>

      {data.months.map((month) => (
        <Card key={month.monthIso} padding="lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-lg text-mystic-100">{month.monthLabel}</h3>
            <TrendingUp className="w-4 h-4 text-mystic-500" />
          </div>
          <p className="text-xs text-mystic-400 italic mb-4">{month.theme}</p>
          {month.events.length === 0 ? (
            <p className="text-xs text-mystic-500">
              {t('yearAhead.emptyMonth', {
                defaultValue: 'A quiet month, astrologically. Use it to rest.',
              })}
            </p>
          ) : (
            <div className="space-y-3">
              {month.events.map((event, i) => (
                <div
                  key={`${event.transitPlanet}-${event.natalPlanet}-${event.aspectType}-${i}`}
                  className={`p-3 rounded-xl border ${INTENSITY_COLORS[event.intensity]}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium tracking-wide">
                      {event.transitPlanet} {event.aspectType} {event.natalPlanet}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-mystic-500">
                      <Clock className="w-3 h-3" />
                      {event.startDate === event.endDate
                        ? event.startDate
                        : `${event.startDate} → ${event.endDate}`}
                    </div>
                  </div>
                  <p className="text-xs text-mystic-300 leading-relaxed">
                    {event.interpretation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      <p className="text-[10px] text-center text-mystic-600 italic">
        {t('yearAhead.disclaimer', {
          defaultValue:
            'Astrology is a symbolic lens, not a prediction. Transits describe the archetypal weather — what you do within it is yours.',
        })}
      </p>
    </div>
  );
}

export default YearAheadReportPage;
