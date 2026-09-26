import { useState, useCallback, useMemo } from 'react';
import { Share2, Send, AlertCircle, RefreshCw, Quote, Zap } from 'lucide-react';
import { Card, Button, Chip, Page, PageHeader, ReadingProse, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { ORACLE_SUGGESTIONS, type OracleContext } from '../data/oracleSuggestions';
import { localDateStr } from '../utils/localDate';
import { ALL_CARDS, getBundledCardPath } from '../config/bundledImages';

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

interface QuickReadingCard {
  name: string;
  meaning: string;
  /* The server sends a name and a meaning today; the rest are honoured
     if a later version sends them, so the face can be chosen directly. */
  id?: number;
  reversed?: boolean;
  imageUrl?: string;
}

interface QuickReadingResponse {
  reading: string;
  card?: QuickReadingCard;
  memoryUsed: boolean;
}

/*
 * The card was drawn and never shown. Its face is in the bundle: resolve
 * it by id when the server gives one, else by name — the server's deck
 * uses the same names as the bundled majors — else by any URL it sent.
 */
function faceFor(card: QuickReadingCard): string | null {
  const wanted = card.name.trim().toLowerCase();
  const id = typeof card.id === 'number' ? card.id : ALL_CARDS.find((c) => c.name.toLowerCase() === wanted)?.id;
  return (id !== undefined ? getBundledCardPath(id) : null) ?? card.imageUrl ?? null;
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
  }, [question, profile, tryConsume, refund, context]);

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
    const face = result.card ? faceFor(result.card) : null;
    return (
      <Page spacing="md">
        <PageHeader
          icon={<Zap />}
          title={t('quickReading.title', { defaultValue: '3-second reading' })}
        />

        <Card padding="lg" variant="glow" className="bg-gradient-to-br from-gold/5 via-mystic-900 to-cosmic-violet/5">
          <p className="font-display-eyebrow text-mystic-500 mb-2">
            {t('quickReading.yourQuestion', { defaultValue: 'Your question' })}
          </p>
          <p className="text-ui text-mystic-200 italic">"{question}"</p>
        </Card>

        {result.card && (
          <Card padding="lg" className="bg-mystic-900/60 border-gold/20">
            {/* The card, shown: its face beside its name and meaning. A
                reversed draw lies upside down, as it would on the table. */}
            <div className={`flex items-center gap-4 ${face ? 'text-left' : 'text-center justify-center'}`}>
              {face && (
                <img
                  src={face}
                  alt={result.card.name}
                  decoding="async"
                  draggable={false}
                  className={`w-20 shrink-0 aspect-[2/3] object-cover rounded-inset bg-mystic-850 select-none ${
                    result.card.reversed ? 'rotate-180' : ''
                  }`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display-eyebrow mb-1">
                  {t('quickReading.cardLabel', { defaultValue: 'Card drawn' })}
                </p>
                <h2 className="heading-display-md text-mystic-100 mb-1">
                  {result.card.name}
                  {result.card.reversed && (
                    <span className="text-meta text-mystic-400 ml-2">{t('readings.revealView.reversedParen')}</span>
                  )}
                </h2>
                <p className="text-ui text-mystic-300 italic">{result.card.meaning}</p>
              </div>
            </div>
          </Card>
        )}

        <Card padding="lg">
          <div className="flex items-start gap-2 mb-2">
            <Quote className="w-4 h-4 text-cosmic-violetLight flex-shrink-0 mt-1.5" />
            <ReadingProse text={result.reading} className="flex-1 min-w-0" />
          </div>
          {result.memoryUsed && (
            <p className="text-meta text-mystic-400 mt-3 italic">
              {t('quickReading.memoryUsed', { defaultValue: 'Drawing on what we\'ve talked about before.' })}
            </p>
          )}
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {t('quickReading.share', { defaultValue: 'Share' })}
          </Button>
          <Button variant="primary" fullWidth onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('quickReading.askAnother', { defaultValue: 'Ask another' })}
          </Button>
        </div>

        <p className="text-caption text-mystic-500 italic">
          {t('quickReading.disclaimer', {
            defaultValue: 'Readings are for self-reflection, not prediction or professional advice.',
          })}
        </p>
      </Page>
    );
  }

  return (
    <Page spacing="md">
      <PageHeader
        icon={<Zap />}
        title={t('quickReading.title', { defaultValue: '3-second reading' })}
      />

      <Card padding="lg" variant="glow">
        <p className="reading-copy">
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
            <Chip key={c.key} label={c.label} size="sm" selected={context === c.key} onSelect={() => setContext(c.key)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <Chip key={s} label={s} size="sm" variant="outline" onClick={() => setQuestion(s)} className="text-left" />
          ))}
        </div>
      </div>

      <Card padding="lg">
        <label className="block font-display-eyebrow text-mystic-500 mb-2">
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
          className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-ui placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
        />
        <p className="text-caption text-mystic-500 mt-1 text-right">{question.length} / 500</p>
      </Card>

      {error && (
        <Card padding="md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
            <p className="text-meta text-mystic-400">
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
        size="lg"
        fullWidth
        onClick={submit}
        disabled={loading || question.trim().length < 3}
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
    </Page>
  );
}

export default QuickReadingPage;
