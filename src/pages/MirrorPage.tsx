import { useEffect, useMemo, useState } from 'react';
import { Aperture, TrendingUp, Layers, Hash, RotateCcw, Flame, Calendar } from 'lucide-react';
import { PageHeader, Page, Tabs, EyebrowLabel, Card, Section, EmptyState, Tag } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getMirrorStats, type MirrorPeriod, type MirrorStats } from '../services/mirror';
import { setPageMeta } from '../utils/seo';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';

const PERIODS: { id: MirrorPeriod; label: string }[] = [
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

/** Five muted hues for the two bar charts (design cues §6.7). */
const BAR_HUES = ['bg-cosmic-violet', 'bg-coral-dark', 'bg-cosmic-blue', 'bg-gold-dark', 'bg-teal-dark'];

const SUIT_DEFAULT: Record<string, string> = {
  Wands: 'Wands',
  Cups: 'Cups',
  Swords: 'Swords',
  Pentacles: 'Pentacles',
};

export function MirrorPage() {
  const { user } = useAuth();
  const { t } = useT('app');
  const fmt = useMemo(() => new Intl.NumberFormat(getLocale()), []);
  const [period, setPeriod] = useState<MirrorPeriod>('month');
  const [stats, setStats] = useState<MirrorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta('Mirror — your reading patterns', 'Aggregate stats from your tarot readings: most-drawn cards, suit balance, reversal rate, and streaks.');
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getMirrorStats(user.id, period)
      .then((s) => { if (!cancelled) setStats(s); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, period]);

  const suitName = (suit: string) => t(`mirror.suits.${suit.toLowerCase()}`, { defaultValue: SUIT_DEFAULT[suit] ?? suit });

  if (!user) {
    return (
      <Page className="py-10 text-center">
        <p className="text-body text-mystic-300">{t('mirror.signIn', { defaultValue: 'Sign in to see your mirror.' })}</p>
      </Page>
    );
  }

  return (
    <Page className="py-6 sm:py-10">
      <PageHeader
        icon={<Aperture />}
        title={t('mirror.title', { defaultValue: 'Mirror' })}
        subtitle={t('mirror.subtitle', { defaultValue: 'What your reading history reveals about you. Aggregated patterns over your saved tarot pulls.' })}
      />

      <Tabs<MirrorPeriod>
        items={PERIODS.map((p) => ({ id: p.id, label: t(`mirror.period.${p.id}`, { defaultValue: p.label }) }))}
        value={period}
        onChange={setPeriod}
        aria-label={t('mirror.periodAria', { defaultValue: 'Period' })}
        size="sm"
        idPrefix="mirror-period"
      />

      {loading || !stats ? (
        <div className="text-center py-16 text-meta text-mystic-500" role="status">{t('mirror.loading', { defaultValue: 'Reading the mirror…' })}</div>
      ) : stats.totalReadings === 0 ? (
        <EmptyState
          icon={<Aperture />}
          title={t('mirror.emptyTitle', { defaultValue: 'No readings in this period yet.' })}
          description={t('mirror.emptyBody', { defaultValue: 'Pull a card today and your patterns will start to surface here.' })}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Calendar} label={t('mirror.stats.readings', { defaultValue: 'Readings' })} value={fmt.format(stats.totalReadings)} />
            <StatCard icon={Layers} label={t('mirror.stats.cardsDrawn', { defaultValue: 'Cards drawn' })} value={fmt.format(stats.totalCardsDrawn)} />
            <StatCard icon={RotateCcw} label={t('mirror.stats.reversals', { defaultValue: 'Reversals' })} value={`${stats.reversalPercent}%`} />
            <StatCard icon={Flame} label={t('mirror.stats.streak', { defaultValue: 'Streak' })} value={fmt.format(stats.streakDays)} />
          </div>

          {stats.mostDrawnCard && (
            <Highlight
              icon={TrendingUp}
              label={t('mirror.highlights.cardNow', { defaultValue: 'Your card right now' })}
              value={stats.mostDrawnCard.name}
              caption={t('mirror.captions.appearances', { defaultValue: '{{n}} appearances', n: fmt.format(stats.mostDrawnCard.count) })}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.mostDrawnSuit && (
              <Highlight
                icon={Layers}
                label={t('mirror.highlights.dominantSuit', { defaultValue: 'Dominant suit' })}
                value={suitName(stats.mostDrawnSuit.suit)}
                caption={t('mirror.captions.fromSuit', { defaultValue: '{{n}} cards from this suit', n: fmt.format(stats.mostDrawnSuit.count) })}
              />
            )}
            {stats.mostDrawnNumber && (
              <Highlight
                icon={Hash}
                label={t('mirror.highlights.recurringNumber', { defaultValue: 'Recurring number' })}
                value={stats.mostDrawnNumber.value}
                caption={t('mirror.captions.occurrences', { defaultValue: '{{n}} occurrences', n: fmt.format(stats.mostDrawnNumber.count) })}
              />
            )}
          </div>

          {stats.topCards.length > 1 && (
            <Section headingLevel="h2" title={t('mirror.sections.topCards', { defaultValue: 'Common cards' })}>
              <Card padding="md">
                <ol className="space-y-3">
                  {stats.topCards.map((c, i) => {
                    const max = stats.topCards[0].count || 1;
                    const pct = Math.round((c.count / max) * 100);
                    return (
                      <li key={c.name}>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="flex items-center gap-2 min-w-0">
                            <Tag tone="neutral" className="tabular-nums shrink-0">{i + 1}</Tag>
                            <span className="text-ui text-mystic-200 truncate">{c.name}</span>
                          </span>
                          <span className="text-meta text-mystic-400 tabular-nums shrink-0">
                            {t('mirror.captions.times', { defaultValue: '{{n}}×', n: fmt.format(c.count) })}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-mystic-800 overflow-hidden" role="presentation">
                          <div className={`h-full rounded-full ${BAR_HUES[i % BAR_HUES.length]}`} style={{ width: `${Math.max(4, pct)}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </Section>
          )}

          <Section
            headingLevel="h2"
            title={t('mirror.sections.suitBalance', { defaultValue: 'Common suits' })}
            description={t('mirror.sections.suitBalanceNote', { defaultValue: 'Minor Arcana only.' })}
          >
            <Card padding="md">
              <SuitBars breakdown={stats.suitBreakdown} suitName={suitName} fmt={fmt} />
            </Card>
          </Section>

          <Section
            headingLevel="h2"
            title={t('mirror.sections.majorMinor', { defaultValue: 'Major and Minor' })}
            description={t('mirror.sections.majorMinorNote', { defaultValue: 'Major Arcana are life themes; Minor are day-to-day energies.' })}
          >
            <Card padding="md">
              <ArcanaBar
                major={stats.arcanaBreakdown.major}
                minor={stats.arcanaBreakdown.minor}
                majorLabel={t('mirror.major', { defaultValue: 'Major' })}
                minorLabel={t('mirror.minor', { defaultValue: 'Minor' })}
                fmt={fmt}
              />
            </Card>
          </Section>
        </div>
      )}
    </Page>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <Card padding="sm" className="text-center">
      <Icon className="w-4 h-4 text-gold mx-auto mb-1" aria-hidden />
      <div className="text-title font-semibold tabular-nums text-mystic-100">{value}</div>
      <EyebrowLabel className="block !text-mystic-500">{label}</EyebrowLabel>
    </Card>
  );
}

function Highlight({ icon: Icon, label, value, caption }: { icon: typeof Calendar; label: string; value: string; caption: string }) {
  return (
    <Card variant="accent" padding="md">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gold" aria-hidden />
        <EyebrowLabel>{label}</EyebrowLabel>
      </div>
      <div className="heading-display-md heading-strong text-mystic-100">{value}</div>
      <div className="text-meta text-mystic-500 mt-0.5 tabular-nums">{caption}</div>
    </Card>
  );
}

function SuitBars({
  breakdown,
  suitName,
  fmt,
}: {
  breakdown: Record<string, number>;
  suitName: (suit: string) => string;
  fmt: Intl.NumberFormat;
}) {
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0) || 1;
  return (
    <ul className="space-y-3">
      {Object.entries(breakdown).map(([suit, count], i) => {
        const pct = Math.round((count / total) * 100);
        return (
          <li key={suit}>
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-ui text-mystic-200">{suitName(suit)}</span>
              <span className="text-meta text-mystic-400 tabular-nums">{fmt.format(count)} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-mystic-800 overflow-hidden" role="presentation">
              <div className={`h-full rounded-full ${BAR_HUES[i % BAR_HUES.length]}`} style={{ width: `${Math.max(count ? 4 : 0, pct)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ArcanaBar({
  major,
  minor,
  majorLabel,
  minorLabel,
  fmt,
}: {
  major: number;
  minor: number;
  majorLabel: string;
  minorLabel: string;
  fmt: Intl.NumberFormat;
}) {
  const total = major + minor || 1;
  const majorPct = Math.round((major / total) * 100);
  return (
    <div className="space-y-2">
      <div className="h-2 bg-mystic-800 rounded-full overflow-hidden flex" role="presentation">
        <div className="bg-gold-dark h-full transition-[width] duration-deliberate ease-out" style={{ width: `${majorPct}%` }} />
        <div className="bg-cosmic-blue h-full flex-1" />
      </div>
      <div className="flex justify-between text-meta text-mystic-400 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gold-dark" aria-hidden />
          {majorLabel} {fmt.format(major)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cosmic-blue" aria-hidden />
          {minorLabel} {fmt.format(minor)}
        </span>
      </div>
    </div>
  );
}
