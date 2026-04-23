import { useState, useEffect, useCallback } from 'react';
import { Calendar, Lock, Sparkles, CheckCircle2, AlertCircle, TrendingUp, Clock, Star } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { reportUnlocks, moonstones } from '../dal';
import { startReportCheckout } from '../services/reportCheckout';
import { supabase } from '../lib/supabase';
import { canPayWithCard } from '../utils/platform';

/**
 * Year-Ahead Forecast — pay-per-report #2. $12.99 / 300 Moonstones.
 *
 * Flow: server-side edge function walks 12 months of outer-planet transits
 * against the user's natal chart, returns 12 monthly briefings. Client just
 * gates + renders. Requires a computed natal chart — falls through to a CTA
 * if the user hasn't done the birth-chart step yet.
 */

const YEAR_AHEAD_COST = 300;
const YEAR_AHEAD_USD = 12.99;

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

        <Card padding="lg" variant="glow" className="text-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <h2 className="font-display text-xl text-mystic-100 mb-1">
            {t('yearAhead.cardTitle', { defaultValue: '{{year}} — 12 monthly briefings', year: currentYear })}
          </h2>
          <p className="text-sm text-mystic-400 italic mb-4">
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

          <Button
            variant="gold"
            fullWidth
            onClick={handleUnlock}
            disabled={unlocking || (balance !== null && balance < YEAR_AHEAD_COST)}
            className="min-h-[52px]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {unlocking
              ? t('yearAhead.unlocking', { defaultValue: 'Unlocking…' })
              : t('yearAhead.unlockCta', {
                  defaultValue: 'Unlock for {{n}} Moonstones',
                  n: YEAR_AHEAD_COST,
                })}
          </Button>

          {balance !== null && (
            <p className="text-[11px] text-mystic-500 mt-2">
              {t('yearAhead.balance', {
                defaultValue: 'Balance: {{n}} Moonstones',
                n: balance,
              })}
            </p>
          )}
          {canPayWithCard() && (
            <button
              onClick={async () => {
                const res = await startReportCheckout({ reportKey: 'year-ahead', reference: String(currentYear) });
                if (!res.ok && res.error !== 'already-unlocked') {
                  toast(t('yearAhead.stripeFailed', { defaultValue: 'Could not start checkout' }), 'error');
                }
              }}
              className="mt-3 text-xs text-mystic-400 hover:text-gold underline underline-offset-2"
            >
              {t('yearAhead.payWithStripe', {
                defaultValue: 'Or pay ${{price}} with card',
                price: YEAR_AHEAD_USD.toFixed(2),
              })}
            </button>
          )}
        </Card>
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
