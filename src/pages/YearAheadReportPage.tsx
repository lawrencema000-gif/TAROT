import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, Lock, Moon, Gift, CheckCircle2, AlertCircle, TrendingUp, Clock, Star, Crown } from 'lucide-react';
import { Card, Button, toast, Page, PageHeader, EmptyState, Disclosure, ReadingProse, ResultSheet, Disclaimer } from '../components/ui';
import { useT } from '../i18n/useT';
import { isNative } from '../utils/platform';
import { getLocale } from '../i18n/config';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { reportUnlocks, moonstones } from '../dal';
import { supabase } from '../lib/supabase';
import { useNatalChart } from '../hooks/useAstrology';
import { useBirthTzBackfill, birthZoneOf, castParamsFor } from '../components/horoscope/birthZone';
import { PaywallSheet, WatchAdSheet } from '../components/premium';
import { useCanOfferAd } from '../components/moonstones/useAdCreditsLeft';
import { SectionDivider } from '../components/ui';
import { MOONSTONES_PER_AD } from '../services/rewardedAds';

/**
 * Year-Ahead Forecast — 300 Moonstones or Premium subscription.
 *
 * Monetization refactor 2026-04-25: one-off Stripe per-report purchases
 * removed. Premium unlocks every feature; Moonstones are the per-report
 * unlock currency; every rewarded ad credits +50 Moonstones.
 *
 * No chart, no sale (p9 QS R-3, as the natal report since Q01). The
 * forecast is drawn from the stored natal chart, which neither onboarding
 * casts. The page offered "Unlock for 300" on birth data alone, took the
 * Moonstones, and astrology-year-ahead then answered NATAL_CHART_MISSING:
 * a card with no header that said to re-enter birth data that was complete.
 * A missing chart is now cast here the way the Horoscope setup casts it
 * (the birth place's zone, castParamsFor), the unlock is offered only once
 * a chart exists, and the forecast is asked for only beside one.
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
  soft: 'text-teal border-teal/25 bg-teal/10',
  neutral: 'text-cosmic-blue border-cosmic-blue/30 bg-cosmic-blue/5',
  hard: 'text-coral border-coral/25 bg-coral/10',
};

export function YearAheadReportPage() {
  const { t } = useT('app');
  const { profile, user } = useAuth();
  const { chart, loading: chartLoading, error: chartError, fetchChart, computeChart } = useNatalChart();
  // A chart cast in the signup zone (before F21) is recast before the
  // forecast reads it; reload when the recast lands.
  useBirthTzBackfill(fetchChart);
  const natal = chart?.natalChart ?? null;
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

  // The birth data the forecast asks for. Having it is not having a chart:
  // the chart is read (useNatalChart) and, when there is none, cast below.
  const hasBirthData = !!profile?.birthDate && !!profile?.birthTime && !!profile?.birthPlace;
  const birthLat = profile?.birthLat;
  const birthLon = profile?.birthLon;
  const hasBirthPlace = typeof birthLat === 'number' && Number.isFinite(birthLat)
    && typeof birthLon === 'number' && Number.isFinite(birthLon);
  // 'done' and 'failed' both end the attempt; a retry goes back to 'idle'.
  const [castState, setCastState] = useState<'idle' | 'casting' | 'done' | 'failed'>('idle');
  // Guards the cast effect against a second cast (StrictMode runs it twice).
  const castTried = useRef(false);
  const castChart = useCallback(async () => {
    if (!profile?.birthDate || typeof profile.birthLat !== 'number' || typeof profile.birthLon !== 'number') return;
    castTried.current = true;
    setCastState('casting');
    try {
      const { tz } = await birthZoneOf(profile);
      const cast = await computeChart(castParamsFor({ ...profile, birthLat: profile.birthLat, birthLon: profile.birthLon }, tz));
      setCastState(cast?.natalChart ? 'done' : 'failed');
    } catch {
      setCastState('failed');
    }
  }, [profile, computeChart]);
  /** Read the chart again, and cast it when there is still none. */
  const retryChart = () => {
    castTried.current = false;
    setCastState('idle');
    void fetchChart();
  };
  const currentYear = new Date().getFullYear();
  // Rewarded ads only exist inside the native shell (R5 M-9).
  const adNative = isNative();
  // ...and an ad is offered only while one can still earn today: after the
  // sixth credited ad the server pays nothing until tomorrow (AD_DAILY_CAP).
  const adAvailable = useCanOfferAd();

  // The twelve months the forecast covers (the unlock reference is the
  // calendar year), named in the user's locale for the paywall's preview.
  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(getLocale(), { month: 'long' });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(currentYear, i, 15)));
  }, [currentYear]);

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
    // Premium includes every report; a subscriber needs no unlock row.
    if (unlockRes.ok) setUnlocked(unlockRes.data || Boolean(profile?.isPremium));
    if (balanceRes.ok) setBalance(balanceRes.data);
    setChecking(false);
  }, [user, currentYear, profile?.isPremium]);

  useEffect(() => { checkUnlock(); }, [checkUnlock]);

  // Once astrology-get-chart has answered "none", cast it (once; a retry
  // reloads and comes back here).
  useEffect(() => {
    if (!user || !hasBirthData || !hasBirthPlace || natal || chartLoading || chartError || castTried.current) return;
    void castChart();
  }, [user, hasBirthData, hasBirthPlace, natal, chartLoading, chartError, castChart]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    // The year this page unlocked (the unlock's reference): the function
    // checks that year's row, so a reader who bought it in an earlier year
    // as well is served, not refused (p9 R06).
    const { data: resp, error: err } = await supabase.functions.invoke('astrology-year-ahead', {
      body: { year: currentYear },
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
  }, [currentYear]);

  // The forecast is asked for once, beside a chart the server can read: not
  // while the chart is being read or cast, and not again by itself after a
  // failure — every failure used to start the next request, without end.
  // Each error state has its own retry.
  const castingChart = castState === 'casting';
  useEffect(() => {
    if (unlocked && natal && !chartLoading && !castingChart && !data && !loadingData && !error) void loadData();
  }, [unlocked, natal, chartLoading, castingChart, data, loadingData, error, loadData]);

  /** The server had no chart for the forecast: read (or cast) it again, then the forecast loads. */
  const retryMissingChart = () => {
    setError(null);
    retryChart();
  };

  const handleUnlock = async () => {
    // The unlock is offered only beside a chart; never charge without one.
    if (!natal || unlocking) return;
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
          defaultValue: 'Not enough Moonstones — you need {{n}}. Earn more from the daily check-in, an ad or an invite.',
          n: YEAR_AHEAD_COST,
        }),
        'error',
      );
    } else if (res.error === 'chart-missing') {
      // The server holds no chart for this account and refused before the
      // debit: read it again (and cast it), then the unlock is offered again.
      retryChart();
    } else {
      toast(
        t('yearAhead.unlockFailed', {
          defaultValue: 'Couldn’t unlock the forecast — check your connection and try again.',
        }),
        'error',
      );
    }
  };

  const yearHeader = (
    <PageHeader
      icon={<Calendar />}
      title={t('yearAhead.title', { defaultValue: 'Year Ahead' })}
    />
  );

  /** The chart could not be read or drawn: say so, and try again (a retry reads it and casts it when missing). */
  const chartRetryCard = (onRetry: () => void) => (
    <Card padding="lg" className="text-center">
      <p className="text-ui text-mystic-300 mb-4" role="alert">
        {t('natalReport.errorChartMissing', {
          defaultValue: 'We couldn’t draw your chart just now. Check your connection and try again.',
        })}
      </p>
      <Button variant="outline" onClick={onRetry}>
        {t('common:actions.retry', { defaultValue: 'Try again' })}
      </Button>
    </Card>
  );

  if (!hasBirthData) {
    return (
      <Page spacing="sm">
        {yearHeader}
        <EmptyState
          icon={<AlertCircle />}
          title={t('yearAhead.needsBirthData', { defaultValue: 'Add your full birth data first' })}
          description={t('yearAhead.needsBirthDataBody', {
            defaultValue:
              'Year-ahead forecasts need date, time, and place of birth to compute transits to your natal chart. Add them in Profile → Edit profile.',
          })}
        />
      </Page>
    );
  }

  // The chart is being cast here (or is about to be): the page, not a bare
  // loading line.
  if (castingChart
    || (castState === 'idle' && !natal && hasBirthPlace && !chartLoading && !checking && !chartError)) {
    return (
      <Page spacing="sm">
        {yearHeader}
        <Card padding="lg" className="text-center">
          <p className="text-ui text-mystic-300" role="status" aria-live="polite">
            {t('natalReport.computing', { defaultValue: 'Computing your chart…' })}
          </p>
        </Card>
      </Page>
    );
  }

  if (checking || chartLoading) {
    return (
      <div className="py-12 text-center text-mystic-500">
        {t('common:actions.loading', { defaultValue: 'Loading…' })}
      </div>
    );
  }

  // No chart: nothing is sold and no forecast is asked for. Either it could
  // not be read or cast — try again — or there is no birth place to cast it
  // for (a typed place with no coordinates).
  if (!natal) {
    return (
      <Page spacing="sm">
        {yearHeader}
        {chartError || hasBirthPlace ? chartRetryCard(retryChart) : (
          <EmptyState
            icon={<AlertCircle />}
            title={t('natalReport.needsBirthPlace', { defaultValue: 'Add your birth place' })}
            description={t('natalReport.needsBirthPlaceBody', {
              defaultValue: 'Your chart is drawn for the place you were born. Pick it in Profile → Edit profile, then open this page again.',
            })}
          />
        )}
      </Page>
    );
  }

  if (!unlocked) {
    return (
      <Page spacing="sm">
        <PageHeader
          icon={<Calendar />}
          title={t('yearAhead.title', { defaultValue: 'Year Ahead' })}
        />

        <Card padding="lg" variant="accent" className="text-center nebula-veil">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/25 to-cosmic-violet/25 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-gold" />
          </div>
          <h2 className="heading-display-lg text-mystic-100 mb-2">
            {t('yearAhead.cardTitle', { defaultValue: '{{year}} — 12 monthly briefings', year: currentYear })}
          </h2>
          <SectionDivider width="w-32" className="mx-auto mb-3" />
          <p className="text-ui text-mystic-200 italic mb-4">
            {t('yearAhead.cardSub', {
              defaultValue: 'A month-by-month map of the biggest transits to your natal chart.',
            })}
          </p>
          <ul className="text-ui text-mystic-300 text-left space-y-2 mb-5 max-w-[280px] mx-auto">
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
            size="lg"
          >
            <Crown className="w-4 h-4 mr-2" />
            {/* The natal report's label: one line beside the crown at 390 px
                in every locale (p8 F60); "See what Premium includes" took two. */}
            {t('yearAhead.upgradeToPremium', {
              defaultValue: 'See Premium plans',
            })}
          </Button>

          {moonstonesEnabled && (balance !== null && balance >= YEAR_AHEAD_COST ? (
            <Button
              variant="outline"
              fullWidth
              onClick={handleUnlock}
              disabled={unlocking}
              loading={unlocking}
              className="mt-3"
            >
              <Moon className="w-4 h-4 mr-2" />
              {t('yearAhead.unlockCta', {
                defaultValue: 'Unlock with {{n}} Moonstones',
                n: YEAR_AHEAD_COST,
              })}
            </Button>
          ) : (
            <div className="mt-3 space-y-2 text-left">
              <Button variant="outline" fullWidth disabled>
                <Moon className="w-4 h-4 mr-2" />
                {t('yearAhead.unlockCta', {
                  defaultValue: 'Unlock with {{n}} Moonstones',
                  n: YEAR_AHEAD_COST,
                })}
              </Button>
              <p className="text-meta text-mystic-400 text-center tabular-nums">
                {t('reportUnlock.shortfall', {
                  defaultValue: 'You have {{have}} Moonstones — {{need}} more needed.',
                  have: balance ?? 0,
                  need: Math.max(0, YEAR_AHEAD_COST - (balance ?? 0)),
                })}
              </p>
              {adAvailable ? (
                <Button
                  variant="outline"
                  fullWidth
                  size="sm"
                  onClick={() => setShowWatchAd(true)}
                >
                  <Gift className="w-3.5 h-3.5 mr-1.5" />
                  {t('yearAhead.earnNow', {
                    defaultValue: 'Watch an ad, earn {{n}} Moonstones',
                    n: MOONSTONES_PER_AD,
                  })}
                </Button>
              ) : (
                <p className="text-meta text-mystic-400 text-center">
                  {t('reportUnlock.earnHintWeb', {
                    defaultValue: 'Earn Moonstones with the daily check-in or an invite, or open everything with Premium.',
                  })}
                </p>
              )}
            </div>
          ))}
        </Card>

        {/* PaywallSheet, not SubscriptionSheet. SubscriptionSheet is the
            already-subscribed MANAGEMENT screen: it hardcodes
            Status = "Active", offers "Manage on Google Play", and never
            calls billing.purchase() at all. Pointing the upgrade CTA at
            it told a non-paying user they were already premium and gave
            them no way to buy — which is the likeliest reason the
            subscriptions table is empty. */}
        <PaywallSheet
          feature={t('yearAhead.title', { defaultValue: 'Year Ahead' }) as string}
          open={showSubscription}
          onClose={() => setShowSubscription(false)}
          // The proof is the report's own table of contents: the year's arc
          // and the twelve monthly briefings, masked toward the bottom.
          preview={
            <div
              aria-hidden
              className="pointer-events-none select-none w-full max-w-[280px] max-h-44 overflow-hidden [mask-image:linear-gradient(to_bottom,black_35%,transparent)]"
            >
              <p className="heading-display-md text-mystic-100 text-center mb-2">
                {t('yearAhead.cardTitle', { defaultValue: '{{year}} — 12 monthly briefings', year: currentYear })}
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2.5 text-ui text-mystic-200">
                  <Star className="w-3.5 h-3.5 text-gold shrink-0" />
                  {t('yearAhead.overall', { defaultValue: 'Overall arc' })}
                </li>
                {monthNames.map((month) => (
                  <li key={month} className="flex items-center gap-2.5 text-ui text-mystic-300">
                    <TrendingUp className="w-3.5 h-3.5 text-mystic-500 shrink-0" />
                    {month}
                  </li>
                ))}
              </ul>
            </div>
          }
        />
        {moonstonesEnabled && adNative && (
          <WatchAdSheet
            open={showWatchAd}
            onClose={() => setShowWatchAd(false)}
            onCredited={(newBalance) => setBalance(newBalance)}
            onShowPaywall={() => setShowSubscription(true)}
            earnOnly
            cost={YEAR_AHEAD_COST}
            itemName={t('yearAhead.title', { defaultValue: 'Year Ahead' }) as string}
          />
        )}
      </Page>
    );
  }

  if (loadingData) {
    return (
      <div className="py-12 text-center">
        <div className="loading-constellation mx-auto mb-3" />
        <p className="text-ui text-mystic-300">
          {t('yearAhead.computing', { defaultValue: 'Mapping your year…' })}
        </p>
      </div>
    );
  }

  // The server found no chart for the forecast (it was paid for, or Premium
  // covers it): the page, and a retry that reads or casts the chart again.
  // The birth data is not the problem, and is not asked for again.
  if (error === 'natal-missing') {
    return (
      <Page spacing="sm">
        {yearHeader}
        {chartRetryCard(retryMissingChart)}
      </Page>
    );
  }
  if (error) {
    return (
      <Page spacing="sm">
        {yearHeader}
        <Card padding="lg">
          <p className="text-ui text-mystic-300" role="alert">
            {t('yearAhead.errorGeneric', { defaultValue: 'Could not load forecast. Try again in a moment.' })}
          </p>
          <Button variant="primary" onClick={loadData} className="mt-3">
            {t('yearAhead.retry', { defaultValue: 'Reload the forecast' })}
          </Button>
        </Card>
      </Page>
    );
  }
  if (!data) return null;

  // The year's narrative opens the report on paper: first paragraph as the
  // summary, the rest as the body. The year itself is the eyebrow — a
  // number, so it stays in Inter rather than the display serif.
  const paragraphs = data.summary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const arcSummary = paragraphs[0] ?? data.summary;
  const arcRest = paragraphs.slice(1).join('\n\n');

  return (
    <Page spacing="md">
      <PageHeader
        icon={<Calendar />}
        title={t('yearAhead.title', { defaultValue: 'Year Ahead' })}
      />

      <ResultSheet
        headingLevel="h2"
        glyph={<Calendar strokeWidth={1.5} />}
        eyebrow={String(currentYear)}
        title={t('yearAhead.arcTitle', { defaultValue: 'The shape of your year' })}
        summary={arcSummary}
        summaryHeading={t('yearAhead.overall', { defaultValue: 'Overall arc' })}
      >
        {arcRest ? <ReadingProse text={arcRest} lede={false} /> : undefined}
      </ResultSheet>

      {/* Twelve months used to be twelve identical cards, which is roughly
          six screens of scroll before the second half of the year. Each
          month is now a row that opens; the current month starts open. */}
      <div className="space-y-3">
        {data.months.map((month) => (
          <Disclosure
            key={month.monthIso}
            // Every month stays open. The Disclosure is here for the
            // affordance and the semantics, not to hide eleven twelfths of a
            // report the user already paid attention to — collapsing them was
            // a content decision wearing a refactor's clothes.
            defaultOpen
            icon={<TrendingUp />}
            label={month.monthLabel}
            description={month.theme}
            meta={
              month.events.length > 0
                ? t('yearAhead.eventCount', { defaultValue: '{{n}} transits', n: month.events.length })
                : undefined
            }
            contentClassName="space-y-3"
          >
            {month.events.length === 0 ? (
              <EmptyState
                variant="inline"
                size="sm"
                title={t('yearAhead.emptyMonth', {
                  defaultValue: 'A quiet month, astrologically. Use it to rest.',
                })}
              />
            ) : (
              month.events.map((event, i) => (
                <div
                  key={`${event.transitPlanet}-${event.natalPlanet}-${event.aspectType}-${i}`}
                  className={`p-3 rounded-control border ${INTENSITY_COLORS[event.intensity]}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 mb-2">
                    <p className="text-ui font-medium tracking-wide">
                      {event.transitPlanet} {event.aspectType} {event.natalPlanet}
                    </p>
                    <div className="flex items-center gap-1 text-meta text-mystic-400 shrink-0 tabular-nums">
                      <Clock className="w-3 h-3" aria-hidden />
                      {event.startDate === event.endDate
                        ? event.startDate
                        : `${event.startDate} → ${event.endDate}`}
                    </div>
                  </div>
                  <ReadingProse text={event.interpretation} lede={false} />
                </div>
              ))
            )}
          </Disclosure>
        ))}
      </div>

      <Disclaimer kind="astrology" />
    </Page>
  );
}

export default YearAheadReportPage;
