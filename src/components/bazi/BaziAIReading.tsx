// AI-generated Bazi reading panel.
//
// Lives below the existing computational chart on BaziPage. Premium-
// only. On first generate, calls the bazi-interpret edge function
// (~10s, $0.002 in Gemini calls). Cached server-side per user per
// year so subsequent loads are instant and free.

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Crown } from 'lucide-react';
import type { BaziResult, BaziPhase1Deepening } from '../../data/bazi';
import type { BaziDeepResult, Gender } from '../../data/baziDeep';
import { generateBaziReading, type BaziAIReading } from '../../services/baziInterpret';
import { Button, toast } from '../ui';

interface Props {
  result: BaziResult;
  phase1: BaziPhase1Deepening;
  deep: BaziDeepResult | null;
  birthDate: string;
  birthTime: string | null;
  gender: Gender;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

const SECTION_ORDER: Array<{ key: keyof BaziAIReading; title: string }> = [
  { key: 'core_summary', title: 'Core summary' },
  { key: 'personality', title: 'Personality' },
  { key: 'elements', title: 'Element balance' },
  { key: 'career', title: 'Career & business' },
  { key: 'wealth', title: 'Wealth' },
  { key: 'relationships', title: 'Relationships' },
  { key: 'family', title: 'Family & early life' },
  { key: 'hidden_stems', title: 'Hidden stems' },
  { key: 'branch_relations', title: 'Branch interactions' },
  { key: 'health', title: 'Health & energy' },
  { key: 'luck_pillar', title: 'Current 10-year luck pillar' },
  { key: 'annual', title: `Year ahead (${new Date().getFullYear()})` },
  { key: 'strategy', title: 'Best strategy for you' },
  { key: 'closing_summary', title: 'In closing' },
];

export function BaziAIReadingPanel({
  result,
  phase1,
  deep,
  birthDate,
  birthTime,
  gender,
  isPremium,
  onUpgradeClick,
}: Props) {
  const [reading, setReading] = useState<BaziAIReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Auto-fetch on mount for premium users — they've already paid for the
  // depth, no point making them tap a button. Cached after first call so
  // this is a single SELECT for repeat visits.
  useEffect(() => {
    if (!isPremium || hasFetched) return;
    void doFetch(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, hasFetched, birthDate, gender]);

  const doFetch = async (force: boolean) => {
    setLoading(true);
    setError(null);
    setHasFetched(true);
    try {
      const res = await generateBaziReading({
        result,
        phase1,
        deep,
        birthDate,
        birthTime,
        gender,
        force,
      });
      if (res.ok && res.reading) {
        setReading(res.reading);
        if (force) toast('Reading regenerated', 'success');
      } else {
        setError(res.error || 'Failed to generate reading');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-6 sm:p-8 text-center">
        <Crown className="w-10 h-10 mx-auto mb-3 text-gold" />
        <h3 className="font-display text-xl text-mystic-100 mb-2">
          Get your full personalised Bazi reading
        </h3>
        <p className="text-sm text-mystic-300 max-w-md mx-auto mb-5">
          A 14-section deep reading written specifically for your chart — covering personality, career, wealth, relationships, current luck pillar, year ahead, and a strategy designed around your strengths and clashes.
        </p>
        <Button onClick={onUpgradeClick} className="px-6">
          <Crown className="w-4 h-4 mr-2" />
          Unlock with Premium
        </Button>
      </div>
    );
  }

  if (loading && !reading) {
    return (
      <div className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-3 text-gold animate-spin" />
        <p className="text-sm text-mystic-300 mb-1">Reading your chart…</p>
        <p className="text-xs text-mystic-500">This takes about 10 seconds the first time. Cached after that.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-5">
        <p className="text-sm text-red-300 mb-3">Couldn't generate reading: {error}</p>
        <Button onClick={() => doFetch(false)} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Try again
        </Button>
      </div>
    );
  }

  if (!reading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <h2 className="font-display text-xl text-mystic-100">Your personalised reading</h2>
        </div>
        <button
          onClick={() => doFetch(true)}
          disabled={loading}
          className="text-xs text-mystic-400 hover:text-mystic-200 inline-flex items-center gap-1 disabled:opacity-50"
          title="Regenerate (uses one Gemini call)"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Regenerate
        </button>
      </div>

      {SECTION_ORDER.map(({ key, title }) => {
        const text = reading[key];
        if (!text || !text.trim()) return null;
        return (
          <section
            key={key}
            className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-5"
          >
            <h3 className="text-xs uppercase tracking-wider text-gold mb-2">{title}</h3>
            <div className="text-sm text-mystic-200 leading-relaxed space-y-3 whitespace-pre-line">
              {text.split(/\n\n+/).filter(Boolean).map((para, i) => (
                <p key={i}>{para.trim()}</p>
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-[11px] text-mystic-600 text-center pt-2">
        Reading generated with Gemini using authentic BaZi tradition (子平真诠 / 滴天髓). Refreshes annually.
      </p>
    </div>
  );
}
