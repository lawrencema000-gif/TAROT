// AI-generated Bazi reading panel.
//
// Lives below the existing computational chart on BaziPage. Premium-
// only. On first generate, calls the bazi-interpret edge function
// (~10s, $0.002 in Gemini calls). Cached server-side per user per
// year so subsequent loads are instant and free.
//
// The reading itself is written by the function in the UI language; every
// word of the panel around it is a bazi.ai.* string, and a failure is worded
// from the response's code and status (readingFailure), never from the
// function's English message.

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, RefreshCw, Crown } from 'lucide-react';
import type { BaziResult, BaziPhase1Deepening } from '../../data/bazi';
import type { BaziDeepResult, Gender } from '../../data/baziDeep';
import {
  generateBaziReading,
  readingFailure,
  type BaziAIReading,
  type BaziReadingFailure,
} from '../../services/baziInterpret';
import { Button, toast, ReadingProse } from '../ui';
import { useT } from '../../i18n/useT';

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

/** The reading's sections in order, with their English titles (bazi.ai.sections.<key>). */
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
  { key: 'annual', title: 'Year ahead ({{year}})' },
  { key: 'strategy', title: 'Best strategy for you' },
  { key: 'closing_summary', title: 'In closing' },
];

const FAILURE_TEXT: Record<BaziReadingFailure, string> = {
  signIn: 'Sign in to see your personalised reading.',
  premium: 'The personalised reading is part of Premium.',
  rateLimit: 'Too many requests at once. Wait a minute, then try again.',
  dailyLimit: 'You’ve reached today’s limit for AI readings. It resets within a day.',
  unavailable: 'Personalised readings are paused for the moment. Try again later.',
  generic: 'Your reading couldn’t be written just now. Try again in a moment.',
};

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
  const { t } = useT('app');
  const [reading, setReading] = useState<BaziAIReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<BaziReadingFailure | null>(null);
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
    setFailed(null);
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
        if (force) toast(t('bazi.ai.regenerated', { defaultValue: 'Reading regenerated' }), 'success');
      } else {
        setFailed(readingFailure(res));
      }
    } catch {
      setFailed('generic');
    } finally {
      setLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="rounded-card border border-gold/30 bg-gradient-to-br from-gold/10 via-mystic-900/40 to-mystic-900/40 p-6 sm:p-8 text-center">
        <Crown className="w-10 h-10 mx-auto mb-3 text-gold" />
        <h3 className="heading-display-md text-mystic-100 mb-2">
          {t('bazi.ai.upsellTitle', { defaultValue: 'Get your full personalised Bazi reading' })}
        </h3>
        <p className="text-ui text-mystic-300 text-left max-w-md mx-auto mb-5">
          {t('bazi.ai.upsellBody', {
            defaultValue:
              'A 14-section deep reading written specifically for your chart — covering personality, career, wealth, relationships, current luck pillar, year ahead, and a strategy designed around your strengths and clashes.',
          })}
        </p>
        <Button onClick={onUpgradeClick} className="px-6">
          <Crown className="w-4 h-4 mr-2" />
          {t('bazi.ai.upsellCta', { defaultValue: 'Unlock with Premium' })}
        </Button>
      </div>
    );
  }

  if (loading && !reading) {
    return (
      <div className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-8 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-3 text-gold animate-spin" />
        <p className="text-ui text-mystic-300 mb-1">{t('bazi.ai.loading', { defaultValue: 'Reading your chart…' })}</p>
        <p className="text-meta text-mystic-400">
          {t('bazi.ai.loadingNote', { defaultValue: 'This takes about 10 seconds the first time. Cached after that.' })}
        </p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-card border border-coral/25 bg-coral/10 p-5">
        <p className="text-ui text-coral mb-3" role="alert">
          {t(`bazi.ai.errors.${failed}`, { defaultValue: FAILURE_TEXT[failed] })}
        </p>
        {failed === 'premium' ? (
          <Button onClick={onUpgradeClick} variant="outline">
            <Crown className="w-4 h-4 mr-2" /> {t('bazi.ai.upsellCta', { defaultValue: 'Unlock with Premium' })}
          </Button>
        ) : failed !== 'signIn' && (
          <Button onClick={() => doFetch(false)} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> {t('bazi.ai.retry', { defaultValue: 'Try again' })}
          </Button>
        )}
      </div>
    );
  }

  if (!reading) return null;

  const year = new Date().getFullYear();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <h2 className="heading-display-lg text-mystic-100">
            {t('bazi.ai.heading', { defaultValue: 'Your personalised reading' })}
          </h2>
        </div>
        <button
          onClick={() => doFetch(true)}
          disabled={loading}
          className="text-meta text-mystic-400 hover:text-mystic-200 inline-flex items-center gap-1 disabled:opacity-50"
          title={t('bazi.ai.regenerateTitle', { defaultValue: 'Regenerate this reading' }) as string}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {t('bazi.ai.regenerate', { defaultValue: 'Regenerate' })}
        </button>
      </div>

      {SECTION_ORDER.map(({ key, title }) => {
        const text = reading[key];
        if (!text || !text.trim()) return null;
        return (
          <section
            key={key}
            className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-5"
          >
            <h3 className="heading-display-md text-mystic-100 mb-3">
              {t(`bazi.ai.sections.${key}`, { defaultValue: title, year })}
            </h3>
            <ReadingProse text={text} lede={key === 'core_summary'} />
          </section>
        );
      })}

      <p className="reading-caption pt-2">
        {t('bazi.ai.caption', {
          defaultValue: 'Written by AI in the classical BaZi tradition (子平真诠 / 滴天髓). Refreshes once a year.',
        })}
      </p>
    </div>
  );
}
