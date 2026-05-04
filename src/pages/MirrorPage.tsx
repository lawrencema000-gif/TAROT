import { useEffect, useState } from 'react';
import { Aperture, TrendingUp, Layers, Hash, RotateCcw, Flame, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMirrorStats, type MirrorPeriod, type MirrorStats } from '../services/mirror';
import { setPageMeta } from '../utils/seo';

const PERIODS: { id: MirrorPeriod; label: string }[] = [
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

export function MirrorPage() {
  const { user } = useAuth();
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

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-mystic-300">Sign in to see your Mirror.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Aperture className="w-5 h-5 text-gold" />
          </div>
          <h1 className="heading-display-xl text-mystic-100">Mirror</h1>
        </div>
        <p className="text-sm text-mystic-400">
          What your reading history reveals about you. Aggregated patterns over your saved tarot pulls.
        </p>
      </header>

      <nav className="flex gap-2 mb-6" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={period === p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all ${
              period === p.id
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'text-mystic-400 hover:text-mystic-200 border border-transparent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {loading || !stats ? (
        <div className="text-center py-16 text-mystic-500">Reading the mirror…</div>
      ) : stats.totalReadings === 0 ? (
        <div className="text-center py-16">
          <p className="text-mystic-300 mb-2">No readings in this period yet.</p>
          <p className="text-sm text-mystic-500">Pull a card today and your patterns will start to surface here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Calendar} label="Readings" value={String(stats.totalReadings)} />
            <StatCard icon={Layers} label="Cards drawn" value={String(stats.totalCardsDrawn)} />
            <StatCard icon={RotateCcw} label="Reversals" value={`${stats.reversalPercent}%`} />
            <StatCard icon={Flame} label="Streak" value={`${stats.streakDays}d`} />
          </div>

          {stats.mostDrawnCard && (
            <Highlight
              icon={TrendingUp}
              label="Your card right now"
              value={stats.mostDrawnCard.name}
              caption={`${stats.mostDrawnCard.count} appearance${stats.mostDrawnCard.count > 1 ? 's' : ''}`}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.mostDrawnSuit && (
              <Highlight
                icon={Layers}
                label="Dominant suit"
                value={stats.mostDrawnSuit.suit}
                caption={`${stats.mostDrawnSuit.count} cards from this suit`}
              />
            )}
            {stats.mostDrawnNumber && (
              <Highlight
                icon={Hash}
                label="Recurring number"
                value={stats.mostDrawnNumber.value}
                caption={`${stats.mostDrawnNumber.count} occurrence${stats.mostDrawnNumber.count > 1 ? 's' : ''}`}
              />
            )}
          </div>

          {stats.topCards.length > 1 && (
            <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
              <h2 className="text-sm font-medium text-mystic-300 mb-3">Top 5 cards</h2>
              <ul className="space-y-2">
                {stats.topCards.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-mystic-800 text-mystic-400 text-xs flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-mystic-200">{c.name}</span>
                    <span className="text-mystic-500 tabular-nums">×{c.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
            <h2 className="text-sm font-medium text-mystic-300 mb-3">Suit balance (Minor Arcana)</h2>
            <SuitBars breakdown={stats.suitBreakdown} />
          </section>

          <section className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4">
            <h2 className="text-sm font-medium text-mystic-300 mb-2">Major vs Minor</h2>
            <p className="text-xs text-mystic-500 mb-3">Major Arcana = life themes; Minor = day-to-day energies.</p>
            <ArcanaBar major={stats.arcanaBreakdown.major} minor={stats.arcanaBreakdown.minor} />
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-3 text-center">
      <Icon className="w-4 h-4 text-gold mx-auto mb-1" />
      <div className="text-xl font-display text-mystic-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-mystic-500">{label}</div>
    </div>
  );
}

function Highlight({ icon: Icon, label, value, caption }: { icon: typeof Calendar; label: string; value: string; caption: string }) {
  return (
    <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-gold" />
        <span className="text-xs uppercase tracking-wider text-gold">{label}</span>
      </div>
      <div className="font-display text-xl text-mystic-100">{value}</div>
      <div className="text-xs text-mystic-500 mt-0.5">{caption}</div>
    </div>
  );
}

function SuitBars({ breakdown }: { breakdown: Record<string, number> }) {
  const total = Object.values(breakdown).reduce((s, n) => s + n, 0) || 1;
  return (
    <div className="space-y-2">
      {Object.entries(breakdown).map(([suit, count]) => {
        const pct = Math.round((count / total) * 100);
        return (
          <div key={suit} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-mystic-400">{suit}</span>
            <div className="flex-1 h-2 rounded-full bg-mystic-800/60 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-mystic-500 tabular-nums">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

function ArcanaBar({ major, minor }: { major: number; minor: number }) {
  const total = major + minor || 1;
  const majorPct = Math.round((major / total) * 100);
  return (
    <div className="space-y-1">
      <div className="h-3 rounded-full overflow-hidden flex">
        <div className="bg-gold h-full" style={{ width: `${majorPct}%` }} />
        <div className="bg-cosmic-blue h-full flex-1" />
      </div>
      <div className="flex justify-between text-xs text-mystic-500">
        <span><span className="text-gold">●</span> Major {major}</span>
        <span><span className="text-cosmic-blue">●</span> Minor {minor}</span>
      </div>
    </div>
  );
}
