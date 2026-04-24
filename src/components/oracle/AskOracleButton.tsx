import { useState } from 'react';
import { Sparkles, Quote, RefreshCw, X } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, Card, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import i18n from '../../i18n/config';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';

interface AskOracleButtonProps {
  /**
   * Pre-seeded question context. The button wraps this into a natural-
   * language prompt — the user doesn't need to type anything. Examples:
   *   "the meaning of The Tower tarot card for me"
   *   "hexagram 29 (K'an) — The Abysmal — for my current situation"
   *   "what Mars square Saturn means for my chart"
   */
  context: string;
  /** Visual variant. `subtle` = text link. `card` = prominent card button. */
  variant?: 'subtle' | 'card';
  /** Label override — defaults to "Ask the Oracle about this" */
  label?: string;
}

/**
 * Drops a single button onto any static content surface. When tapped, opens
 * a sheet that auto-invokes ai-quick-reading with a seeded question like
 * "what does this card mean for me right now?" — pulling in the user's
 * chart + MBTI + pgvector memory.
 *
 * This is the single highest-leverage perceived-value change from the
 * audit — every surface that currently dead-ends on static content now
 * has a route into the AI companion pipeline.
 */
export function AskOracleButton({ context, variant = 'subtle', label }: AskOracleButtonProps) {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<{ reading: string; card?: { name: string; meaning: string } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError(false);
    setReading(null);
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const question = t('askOracle.question', {
      defaultValue: 'Read this for me — {{context}}. What is it pointing to in my life right now?',
      context,
    });
    const { data, error: err } = await supabase.functions.invoke('ai-quick-reading', {
      body: {
        question,
        userContext: {
          zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
          mbtiType: profile?.mbtiType,
          locale: i18n.language || 'en',
          displayName: profile?.displayName,
        },
      },
    });
    setLoading(false);
    if (err) {
      setError(true);
      return;
    }
    const payload = (data?.data ?? data) as { reading?: string; card?: { name: string; meaning: string } } | null;
    if (!payload?.reading) {
      setError(true);
      return;
    }
    setReading({ reading: payload.reading, card: payload.card });
  };

  const handleOpen = () => {
    setOpen(true);
    if (!reading && !loading) fetch();
  };

  const handleShare = async () => {
    if (!reading) return;
    const text = `${reading.reading}\n\n— Arcana · ${context}`;
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

  const resolvedLabel = label ?? t('askOracle.cta', { defaultValue: 'Ask the Oracle about this' });

  return (
    <>
      {variant === 'card' ? (
        <Card padding="md" className="bg-gradient-to-br from-cosmic-violet/10 to-mystic-900/80 border-cosmic-violet/30 cursor-pointer hover:border-cosmic-violet/60 transition-all">
          <button
            onClick={handleOpen}
            className="w-full flex items-center gap-3 text-left"
            aria-label={resolvedLabel}
          >
            <div className="w-10 h-10 rounded-lg bg-cosmic-violet/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-cosmic-violet" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mystic-100">{resolvedLabel}</p>
              <p className="text-[11px] text-mystic-400 mt-0.5 leading-relaxed">
                {t('askOracle.subtitle', {
                  defaultValue: 'Personalized read based on your chart and memory',
                })}
              </p>
            </div>
          </button>
        </Card>
      ) : (
        <button
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 text-xs text-cosmic-violet hover:text-cosmic-violet/80 underline underline-offset-2"
        >
          <Sparkles className="w-3 h-3" />
          {resolvedLabel}
        </button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('askOracle.sheetTitle', { defaultValue: 'The Oracle reads' })}
        variant="glow"
      >
        <div className="space-y-4 pb-4">
          <Card padding="md" className="bg-mystic-900/60 border-cosmic-violet/20">
            <p className="text-[10px] uppercase tracking-widest text-cosmic-violet mb-1">
              {t('askOracle.contextLabel', { defaultValue: 'Your question' })}
            </p>
            <p className="text-sm text-mystic-200 italic leading-relaxed">"{context}"</p>
          </Card>

          {loading && (
            <div className="py-8 text-center">
              <div className="loading-constellation mx-auto mb-3" />
              <p className="text-xs text-mystic-500">
                {t('askOracle.drawing', { defaultValue: 'Drawing…' })}
              </p>
            </div>
          )}

          {error && (
            <Card padding="md">
              <p className="text-sm text-mystic-400 mb-3">
                {t('askOracle.errorGeneric', {
                  defaultValue: 'Could not reach the Oracle. Try again.',
                })}
              </p>
              <Button variant="primary" onClick={fetch} size="sm">
                <RefreshCw className="w-3 h-3 mr-2" />
                {t('common:actions.retry', { defaultValue: 'Retry' })}
              </Button>
            </Card>
          )}

          {reading && (
            <>
              {reading.card && (
                <Card padding="md" className="text-center bg-mystic-900/60 border-gold/20">
                  <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
                    {t('askOracle.cardLabel', { defaultValue: 'Card drawn' })}
                  </p>
                  <p className="font-display text-lg text-mystic-100">{reading.card.name}</p>
                  <p className="text-[11px] text-mystic-400 italic mt-1">{reading.card.meaning}</p>
                </Card>
              )}
              <Card padding="lg">
                <div className="flex items-start gap-2 mb-2">
                  <Quote className="w-4 h-4 text-cosmic-violet flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-mystic-300 leading-relaxed whitespace-pre-line">
                    {reading.reading}
                  </p>
                </div>
              </Card>
              <div className="flex gap-2">
                <Button variant="outline" fullWidth onClick={handleShare}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('askOracle.share', { defaultValue: 'Share' })}
                </Button>
                <Button variant="primary" fullWidth onClick={fetch}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('askOracle.redraw', { defaultValue: 'New read' })}
                </Button>
              </div>
            </>
          )}

          <button
            onClick={() => setOpen(false)}
            className="w-full py-2 text-xs text-mystic-500 hover:text-mystic-300 flex items-center justify-center gap-1 pt-2 border-t border-mystic-800"
          >
            <X className="w-3 h-3" />
            {t('common:actions.close', { defaultValue: 'Close' })}
          </button>
        </div>
      </Sheet>
    </>
  );
}
