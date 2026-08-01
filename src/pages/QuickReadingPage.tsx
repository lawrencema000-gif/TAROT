import { useState, useCallback, useMemo } from 'react';
import { Sparkles, Send, AlertCircle, RefreshCw, Quote, Zap } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { ORACLE_SUGGESTIONS, type OracleContext } from '../data/oracleSuggestions';
import { localDateStr } from '../utils/localDate';

const ORACLE_CONTEXTS: { key: OracleContext; label: string }[] = [
  { key: 'general', label: 'Anything' },
  { key: 'love', label: 'Love' },
  { key: 'career', label: 'Career' },
  { key: 'tarot', label: 'Tarot' },
  { key: 'astrology', label: 'Astrology' },
  { key: 'bazi', label: 'Bazi' },
  { key: 'dice', label: 'Quick call' },
  { key: 'iching', label: 'I Ching' },
];

/**
 * AI 3-second reading — single-shot Q&A with a grounded oracle voice.
 * Draws a card in the server, weaves it with the user's natal signals,
 * returns a 2-paragraph reading in under 3 seconds (with Gemini 2.0 Flash).
 */

interface QuickReadingResponse {
  reading: string;
  card?: { name: string; meaning: string };
  memoryUsed: boolean;
}

export function QuickReadingPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickReadingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<OracleContext>('general');
  const { tryConsume, refund, EarnSheet } = useMoonstoneSpend('quick-reading');

  // "Guess what you want to ask" — 4 suggestion chips per lens, rotating
  // daily so the hub feels alive without any server round-trip.
  const suggestions = useMemo(() => {
    const pool = ORACLE_SUGGESTIONS[context] ?? [];
    const day = localDateStr();
    let h = 0;
    for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
    const start = Math.abs(h) % Math.max(1, pool.length);
    return Array.from({ length: Math.min(4, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
  }, [context]);

  const submit = useCallback(async () => {
    if (question.trim().length < 3) return;
    const ok = await tryConsume();
    if (!ok) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const userContext = {
      zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
      mbtiType: profile?.mbtiType ?? undefined,
      locale: getLocale(),
      displayName: profile?.displayName ?? undefined,
    };
    // Context lens rides inside the question so the server prompt stays
    // schema-stable; sliced to the 500-char contract.
    const label = ORACLE_CONTEXTS.find((c) => c.key === context)?.label ?? '';
    const sent = context === 'general'
      ? question.trim()
      : `[${label} question] ${question.trim()}`.slice(0, 500);
    const { data, error: err } = await supabase.functions.invoke('ai-quick-reading', {
      body: { question: sent, userContext },
    });
    setLoading(false);
    if (err) {
      await refund();
      const anyErr = err as { context?: { status?: number }; message?: string };
      if (anyErr?.context?.status === 429) setError('rate-limit');
      else if (anyErr?.context?.status === 503) setError('unavailable');
      else setError('generic');
      return;
    }
    const payload = (data?.data ?? data) as QuickReadingResponse | null;
    if (!payload?.reading) {
      await refund();
      setError('generic');
      return;
    }
    setResult(payload);
  }, [question, profile, tryConsume, refund]);

  const reset = () => {
    setResult(null);
    setError(null);
    setQuestion('');
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `"${question.trim()}"\n\n${result.reading}\n\n— ${result.card?.name ?? 'Arcana'}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        await navigator.clipboard.writeText(text);
        toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
    }
  };

  if (result) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-gold" />
          <h1 className="heading-display-lg text-mystic-100">
            {t('quickReading.title', { defaultValue: '3-second reading' })}
          </h1>
        </div>

        <Card padding="lg" variant="glow" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-cosmic-violet/5">
          <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-2">
            {t('quickReading.yourQuestion', { defaultValue: 'Your question' })}
          </p>
          <p className="text-sm text-mystic-200 italic leading-relaxed">"{question}"</p>
        </Card>

        {result.card && (
          <Card padding="lg" className="text-center bg-mystic-900/60 border-gold/20">
            <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
              {t('quickReading.cardLabel', { defaultValue: 'Card drawn' })}
            </p>
            <h2 className="font-display text-xl text-mystic-100 mb-2">{result.card.name}</h2>
            <p className="text-xs text-mystic-400 italic leading-relaxed">{result.card.meaning}</p>
          </Card>
        )}

        <Card padding="lg">
          <div className="flex items-start gap-2 mb-2">
            <Quote className="w-4 h-4 text-cosmic-violet flex-shrink-0 mt-0.5" />
            <p className="text-sm text-mystic-300 leading-relaxed whitespace-pre-line">{result.reading}</p>
          </div>
          {result.memoryUsed && (
            <p className="text-[10px] text-mystic-500 mt-3 italic">
              {t('quickReading.memoryUsed', { defaultValue: 'Drawing on what we\'ve talked about before.' })}
            </p>
          )}
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quickReading.share', { defaultValue: 'Share' })}
          </Button>
          <Button variant="primary" fullWidth onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('quickReading.askAnother', { defaultValue: 'Ask another' })}
          </Button>
        </div>

        <p className="text-[10px] text-center text-mystic-600 italic">
          {t('quickReading.disclaimer', {
            defaultValue: 'Readings are for self-reflection, not prediction or professional advice.',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-gold" />
        <h1 className="heading-display-lg text-mystic-100">
          {t('quickReading.title', { defaultValue: '3-second reading' })}
        </h1>
      </div>

      <Card padding="lg" variant="glow">
        <p className="text-sm text-mystic-300 leading-relaxed">
          {t('quickReading.intro', {
            defaultValue:
              'Ask anything. A single card is drawn, woven with your signals, and returned as a short reading to sit with.',
          })}
        </p>
      </Card>

      {/* Oracle lenses + daily-rotating suggestion chips */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {ORACLE_CONTEXTS.map((c) => (
            <button key={c.key} onClick={() => setContext(c.key)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${context === c.key ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-400 hover:border-mystic-500'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setQuestion(s)}
              className="px-3 py-1.5 rounded-xl text-xs bg-mystic-800/50 border border-mystic-700/40 text-mystic-300 hover:border-gold/30 hover:text-mystic-100 transition-colors text-left">
              {s}
            </button>
          ))}
        </div>
      </div>

      <Card padding="lg">
        <label className="block text-[10px] uppercase tracking-widest text-mystic-500 mb-2">
          {t('quickReading.questionLabel', { defaultValue: 'Your question' })}
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder={t('quickReading.questionPlaceholder', {
            defaultValue: 'What is mine to focus on this week? Where is the friction in my work coming from? What am I avoiding?',
          })}
          className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
        />
        <p className="text-[10px] text-mystic-500 mt-1 text-right">{question.length} / 500</p>
      </Card>

      {error && (
        <Card padding="md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-mystic-400">
              {error === 'rate-limit'
                ? t('quickReading.errorRateLimit', { defaultValue: 'You\'re asking fast — slow down and try again in a moment.' })
                : error === 'unavailable'
                  ? t('quickReading.errorUnavailable', { defaultValue: 'Readings are temporarily unavailable.' })
                  : t('quickReading.errorGeneric', { defaultValue: 'Could not generate a reading. Try again.' })}
            </p>
          </div>
        </Card>
      )}

      <MoonstoneCostLine />
      <Button
        variant="gold"
        fullWidth
        onClick={submit}
        disabled={loading || question.trim().length < 3}
        className="min-h-[52px]"
      >
        {loading ? (
          <>
            <div className="loading-constellation w-4 h-4 mr-2" />
            {t('quickReading.drawing', { defaultValue: 'Drawing…' })}
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            {t('quickReading.draw', { defaultValue: 'Draw and read' })}
          </>
        )}
      </Button>
      {EarnSheet}
    </div>
  );
}

export default QuickReadingPage;
