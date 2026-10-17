import { useEffect, useRef, useState } from 'react';
import { Sparkles, Quote, RefreshCw, Share2, X, AlertCircle } from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button, Card, ReadingProse, toast } from '../ui';
import { useT } from '../../i18n/useT';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getLocale } from '../../i18n/config';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../moonstones/MoonstoneCostLine';
import { failedBeforeCharge } from '../reports/aiReading';
import { isNative } from '../../utils/platform';
import { isShareCancel } from '../../utils/nativeShare';
import { paidFailureOf, sendPaid, type PaidFailure } from './paidRequest';

interface AskOracleButtonProps {
  /**
   * Pre-seeded question context, in the reader's language (the host words
   * it with an `askOracle.context.*` key). It is shown as "Your question" and
   * wrapped into the question sent — the user doesn't need to type anything.
   */
  context: string;
  /** Visual variant. `subtle` = text link. `card` = prominent card button. */
  variant?: 'subtle' | 'card';
  /** Label override — defaults to "Ask the Oracle about this" */
  label?: string;
}

interface OracleReading {
  reading: string;
  card?: { name: string; meaning: string };
}

/** Why the last press brought no reading. A short balance never lands here: the gate opens the Earn sheet. */
type OracleFailure = Exclude<PaidFailure, 'insufficient' | 'soft-cap'>;

/**
 * The request ids of Oracle readings that were sent and not answered, by
 * user and exact body. Module scope, so a retry is the same request even
 * after the sheet was closed or the page left and come back to: the server
 * charges a request at most once and answers a retry with the first
 * reading. An id leaves when its reading arrives, when the server says it
 * can no longer replay it, and when the request was refused for the balance.
 */
const unanswered = new Map<string, string>();

/**
 * Drops a single button onto any static content surface. It opens a sheet
 * that asks ai-quick-reading a seeded question ("what does this card mean
 * for me right now?"), pulling in the user's chart, MBTI and memory.
 *
 * The reading is paid (the quick-reading price, 50 Moonstones), so the sheet
 * opens without asking anything: it shows the question, the price and the
 * balance, and asks only when "Draw and read" is pressed — behind the
 * balance gate, once per press, with a request id kept until the reading
 * arrives (p8 R3; opening the sheet used to charge silently, and below 50
 * it showed a connection error).
 */
export function AskOracleButton({ context, variant = 'subtle', label }: AskOracleButtonProps) {
  const { t } = useT('app');
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [reading, setReading] = useState<OracleReading | null>(null);
  const [failure, setFailure] = useState<OracleFailure | null>(null);
  const { tryConsume, EarnSheet } = useMoonstoneSpend('quick-reading');
  /**
   * A press is being handled — from the moment it lands, through the
   * balance gate, until the request settles. Set synchronously, before
   * anything is awaited, so a second tap while the gate is answering is
   * ignored; the state swaps the button for the drawing indicator.
   */
  const pressing = useRef(false);
  const [busy, setBusy] = useState(false);
  /** The server is still reading an earlier send of this same request. */
  const [stillReading, setStillReading] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Another card, hexagram or result on the same screen is another
  // question: the reading shown was for the one before it.
  const asked = useRef(context);
  useEffect(() => {
    if (asked.current === context) return;
    asked.current = context;
    setReading(null);
    setFailure(null);
  }, [context]);

  /** One press: the balance gate (for a new request), the request, and what came back. */
  const read = async () => {
    const askedFor = context;
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const body = {
      // The schema takes at most 500 characters: a long result line must
      // not turn the request into a 400.
      question: t('askOracle.question', {
        defaultValue: 'Read this for me — {{context}}. What is it pointing to in my life right now?',
        context,
      }).slice(0, 500),
      userContext: {
        zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
        // The profile holds null for an unset field and the schema takes a
        // string or nothing: null was a 400 — "Couldn’t reach the Oracle" —
        // for everyone without an MBTI type.
        mbtiType: profile?.mbtiType ?? undefined,
        locale: getLocale(),
        displayName: profile?.displayName ?? undefined,
      },
    };
    const key = `${user?.id ?? ''}|${JSON.stringify(body)}`;
    let requestId = unanswered.get(key);
    if (!requestId) {
      if (!(await tryConsume())) return;
      requestId = crypto.randomUUID();
      unanswered.set(key, requestId);
    }
    const id = requestId;
    setFailure(null);
    const res = await sendPaid(
      () => supabase.functions.invoke('ai-quick-reading', { body: { ...body, requestId: id } }),
      { live: () => mounted.current, onStillReading: () => setStillReading(true) },
    );
    // Left, or moved to another question meanwhile: nothing is shown, and the
    // id stays, so asking this one again is the free replay of this answer.
    if (!res || asked.current !== askedFor) return;
    setStillReading(false);
    const payload = (res.error ? null : (res.data?.data ?? res.data)) as OracleReading | null;
    if (payload?.reading) {
      unanswered.delete(key);
      setReading({ reading: payload.reading, card: payload.card });
      return;
    }
    const why = res.error ? await paidFailureOf(res.error) : 'generic';
    if (why === 'insufficient' || why === 'soft-cap') {
      // Rejected before the debit: the gate opens the Earn sheet.
      unanswered.delete(key);
      if (await tryConsume()) setFailure('generic');
      return;
    }
    // Spent: answered once and no longer replayable, so the next press is a
    // new request. Anything else keeps the id: the retry is free if charged.
    if (why === 'spent') unanswered.delete(key);
    setFailure(why);
  };

  const submit = async () => {
    // Re-entrancy is decided synchronously, before the gate is awaited.
    if (pressing.current) return;
    pressing.current = true;
    setBusy(true);
    try {
      await read();
    } finally {
      pressing.current = false;
      if (mounted.current) {
        setBusy(false);
        setStillReading(false);
      }
    }
  };

  const handleShare = async () => {
    if (!reading) return;
    const text = `${reading.reading}\n\n— Arcana · ${context}`;
    // The platform's share sheet when there is one: Capacitor's in the app
    // (its WebView has no navigator.share), the browser's on the web.
    // Closing the sheet is a choice, not a failure: nothing is copied and
    // nothing is said — the reading is private (p8 R4). A second tap while
    // the first sheet is still up (InvalidStateError) is the same.
    if (isNative() || typeof navigator.share === 'function') {
      try {
        if (isNative()) {
          const { Share } = await import('@capacitor/share');
          await Share.share({ text, dialogTitle: t('askOracle.share', { defaultValue: 'Share this reading' }) });
        } else {
          await navigator.share({ text });
        }
        return;
      } catch (err) {
        if (isShareCancel(err) || (err as { name?: unknown } | null)?.name === 'InvalidStateError') return;
        // The sheet could not open (no user activation left, blocked): copy instead.
      }
    }
    try {
      // No clipboard (an insecure context, an old WebView) throws here too:
      // that is a failure, never "Copied".
      await navigator.clipboard.writeText(text);
      toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
    } catch {
      toast(t('common:actions.shareFailed', { defaultValue: 'Couldn’t share. Try again.' }), 'error');
    }
  };

  const resolvedLabel = label ?? t('askOracle.cta', { defaultValue: 'Ask the Oracle about this' });

  return (
    <>
      {variant === 'card' ? (
        <Card padding="md" className="bg-gradient-to-br from-cosmic-violet/10 to-mystic-900/80 border-cosmic-violet/30 cursor-pointer hover:border-cosmic-violet/60 transition-all">
          <button
            onClick={() => setOpen(true)}
            className="w-full flex items-center gap-3 text-left"
            aria-label={resolvedLabel}
          >
            <div className="w-10 h-10 rounded-lg bg-cosmic-violet/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-cosmic-violetLight" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-mystic-100">{resolvedLabel}</p>
              <p className="text-meta text-mystic-400 mt-0.5">
                {t('askOracle.subtitle', {
                  defaultValue: 'Personalized read based on your chart and memory',
                })}
              </p>
            </div>
          </button>
        </Card>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-caption text-cosmic-violetLight hover:text-cosmic-violetLight/80 underline underline-offset-2"
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
            <p className="font-display-eyebrow text-cosmic-violetLight mb-1">
              {t('askOracle.contextLabel', { defaultValue: 'Your question' })}
            </p>
            <p className="text-ui text-mystic-200 italic">{context}</p>
          </Card>

          {busy && (
            <div className="py-8 text-center" role="status" aria-live="polite">
              <div className="loading-constellation mx-auto mb-3" />
              <p className="text-caption text-mystic-500">
                {stillReading
                  ? t('askOracle.stillReading', { defaultValue: 'Still reading…' })
                  : t('askOracle.drawing', { defaultValue: 'Drawing…' })}
              </p>
            </div>
          )}

          {!busy && !reading && (
            <div className="space-y-3">
              {failure && (
                <div role="alert" className="flex items-start gap-3 rounded-card bg-mystic-900/60 border border-coral/30 p-4">
                  <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-ui text-mystic-100">
                      {failure === 'spent'
                        ? t('askOracle.errorSpent', { defaultValue: 'This was already read once, and that reading can’t be shown again.' })
                        : failure === 'rate-limit'
                          ? t('askOracle.errorRateLimit', { defaultValue: 'You’re asking fast — slow down and try again in a moment.' })
                          : failure === 'unavailable'
                            ? t('askOracle.errorUnavailable', { defaultValue: 'Readings are temporarily unavailable.' })
                            : t('askOracle.errorGeneric', {
                                defaultValue: 'Couldn’t reach the Oracle — check your connection and try again.',
                              })}
                    </p>
                    {/* Only what is true for this failure: refused before
                        the debit cost nothing; a spent request cannot be
                        replayed, so the next press is new; any other may
                        have been charged, and the retry is then free. */}
                    <p className="text-meta text-mystic-400 mt-1">
                      {failure === 'spent'
                        ? t('askOracle.errorSpentNew', { defaultValue: 'Draw and read starts a new reading, charged as usual.' })
                        : failedBeforeCharge(failure)
                          ? t('askOracle.errorNoCharge', { defaultValue: 'Nothing was charged for a reading you did not receive.' })
                          : t('askOracle.errorRetryFree', {
                              defaultValue: 'If you were charged, asking again returns the same reading at no extra cost.',
                            })}
                    </p>
                  </div>
                </div>
              )}
              {/* The price and the balance before the press; hidden for
                  Premium, who are not charged. */}
              <MoonstoneCostLine />
              <Button variant="primary" fullWidth onClick={submit}>
                {failure && failure !== 'spent' ? (
                  <>
                    <RefreshCw className="w-4 h-4" aria-hidden />
                    {t('askOracle.retry', { defaultValue: 'Ask the Oracle again' })}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden />
                    {t('askOracle.read', { defaultValue: 'Draw and read' })}
                  </>
                )}
              </Button>
            </div>
          )}

          {reading && (
            <>
              {reading.card && (
                <Card padding="md" className="text-center bg-mystic-900/60 border-gold/20">
                  <p className="font-display-eyebrow mb-1">
                    {t('askOracle.cardLabel', { defaultValue: 'Card drawn' })}
                  </p>
                  <p className="font-display text-lg text-mystic-100">{reading.card.name}</p>
                  <p className="text-ui text-mystic-300 italic mt-1">{reading.card.meaning}</p>
                </Card>
              )}
              <Card padding="lg">
                <div className="flex items-start gap-2 mb-2">
                  <Quote className="w-4 h-4 text-cosmic-violetLight flex-shrink-0 mt-1.5" />
                  <ReadingProse text={reading.reading} className="flex-1 min-w-0" />
                </div>
              </Card>
              {/* No "Draw again": the draw is fixed per question and day, so
                  it could only sell the same card and the same reading again. */}
              <Button variant="outline" fullWidth onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                {t('askOracle.share', { defaultValue: 'Share this reading' })}
              </Button>
            </>
          )}

          <button
            onClick={() => setOpen(false)}
            className="w-full py-2 min-h-[44px] text-caption text-mystic-500 hover:text-mystic-300 flex items-center justify-center gap-1 pt-2 border-t border-mystic-800"
          >
            <X className="w-3 h-3" />
            {t('askOracle.close', { defaultValue: 'Close the Oracle' })}
          </button>
        </div>
      </Sheet>
      {/* A sibling of the Oracle sheet, not a child: the sheet's panel is
          transformed, and a fixed sheet inside it would be laid out in it. */}
      {EarnSheet}
    </>
  );
}
