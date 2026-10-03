import { useRef, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Card, Button, Chip, ReadingProse, toast } from '../ui';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../moonstones/MoonstoneCostLine';
import { supabase } from '../../lib/supabase';
import { useT } from '../../i18n/useT';
import { getLocale } from '../../i18n/config';
import { aiFailureOf, failedBeforeCharge } from '../reports/aiReading';

const FOCUS = [
  { key: 'overview', label: 'Overview' },
  { key: 'love', label: 'Love' },
  { key: 'career', label: 'Career' },
  { key: 'growth', label: 'Growth' },
] as const;

type Focus = (typeof FOCUS)[number]['key'];

/**
 * AI chart reading for a saved person — Moonstone-gated (the server does the
 * authoritative debit; the hook only gate-checks and shows the Earn sheet).
 *
 * The reading is written in the reader's language: the request carries
 * `locale`, and the function closes its prompt with that language (without
 * it, the prompt said "Respond entirely in English" to everyone — review
 * #29). It also carries a `requestId` per attempt, kept until a reading
 * lands: a retry after a dropped connection is the same request, charged
 * at most once, and skips the client gate (a charged first attempt can
 * leave the balance under the cost).
 */
export function PersonAIReading({ personId, personName }: { personId: string; personName: string }) {
  const { t } = useT('app');
  const { tryConsume, EarnSheet } = useMoonstoneSpend('person-reading');
  const [focus, setFocus] = useState<Focus>('overview');
  const [reading, setReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** The attempt in flight or last failed: its id and the body it was sent with. */
  const attempt = useRef<{ id: string; body: string } | null>(null);

  const reveal = async () => {
    const body = { personId, focus, locale: getLocale() };
    const signature = JSON.stringify(body);
    if (attempt.current?.body !== signature) {
      const ok = await tryConsume();
      if (!ok) return;
      attempt.current = { id: crypto.randomUUID(), body: signature };
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('ai-person-reading', {
      body: { ...body, requestId: attempt.current.id },
    });
    setLoading(false);
    if (error) {
      const failure = await aiFailureOf(error);
      if (failure === 'insufficient' || failure === 'soft-cap') {
        // Refused before the debit; the gate opens the Earn sheet.
        attempt.current = null;
        if (!(await tryConsume())) return;
      }
      toast(
        failure === 'rate-limit'
          ? t('people.aiReading.errorRateLimit', { defaultValue: 'Too many readings at once — wait a moment and try again.' })
          : failure === 'unavailable'
            ? t('people.aiReading.errorUnavailable', { defaultValue: 'Readings are paused for a moment. Nothing was charged.' })
            : failedBeforeCharge(failure)
              ? t('people.aiReading.errorNoCharge', { defaultValue: 'The reading didn’t come through. Nothing was charged.' })
              : t('people.aiReading.errorRetryFree', {
                  defaultValue: 'The reading didn’t come through. If you were charged, Reveal reading again returns it at no extra cost.',
                }),
        'error',
      );
      return;
    }
    const text = (data?.data?.reading ?? data?.reading) as string | undefined;
    if (!text) {
      toast(t('people.aiReading.errorRetryFree', {
        defaultValue: 'The reading didn’t come through. If you were charged, Reveal reading again returns it at no extra cost.',
      }), 'error');
      return;
    }
    attempt.current = null;
    setReading(text);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold" aria-hidden />
        <h3 className="heading-display-md text-mystic-100">{t('people.aiReading.title', { defaultValue: 'AI reading' })}</h3>
      </div>

      {!reading && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('people.aiReading.focusLabel', { defaultValue: 'Focus' })}>
            {FOCUS.map((f) => (
              <Chip
                key={f.key}
                label={t(`people.aiReading.focus.${f.key}`, { defaultValue: f.label })}
                size="sm"
                selected={focus === f.key}
                onSelect={() => setFocus(f.key)}
              />
            ))}
          </div>
          <p className="text-sm text-mystic-400">
            {t('people.aiReading.intro', {
              defaultValue: 'A personal, chart-grounded interpretation of {{name}}’s stars.',
              name: personName,
            })}
          </p>
          <Button variant="primary" size="md" fullWidth onClick={reveal} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
                {t('people.aiReading.loading', { defaultValue: 'Reading the stars…' })}
              </>
            ) : (
              t('people.aiReading.reveal', { defaultValue: 'Reveal reading' })
            )}
          </Button>
          <MoonstoneCostLine cost={50} />
        </>
      )}

      {reading && (
        <div className="space-y-3">
          <ReadingProse text={reading} />
          <button
            type="button"
            onClick={() => setReading(null)}
            className="inline-flex items-center min-h-[44px] text-caption text-gold hover:text-gold-light"
          >
            {t('people.aiReading.another', { defaultValue: 'Read another focus →' })}
          </button>
        </div>
      )}
      {EarnSheet}
    </Card>
  );
}
