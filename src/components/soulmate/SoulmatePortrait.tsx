import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Download, RefreshCw, Heart } from 'lucide-react';
import { Card, Button, Chip, toast, ReadingProse } from '../ui';
import { useMoonstoneSpend } from '../../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../moonstones/MoonstoneCostLine';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n/useT';
import { localizePlanetName, localizeSignName } from '../../i18n/localizeNames';
import type { Planet, ZodiacSign } from '../../types/astrology';

interface Symbolism { label: string; value: string; meaning: string }
interface PortraitData { image: string; imageMime?: string; symbolism: Symbolism[]; caption: string }

const VIBES = [
  { key: 'romantic', label: 'Romantic' },
  { key: 'grounded', label: 'Grounded' },
  { key: 'electric', label: 'Electric' },
  { key: 'soulful', label: 'Soulful' },
] as const;
type Vibe = (typeof VIBES)[number]['key'];

const PORTRAIT_COST = 150;
/** When the waiting copy steps up — "still painting", then "nearly there". */
const WAIT_STEP_1_MS = 10_000;
const WAIT_STEP_2_MS = 30_000;
/** How long one tap keeps collecting an in-flight portrait before handing back to the user. */
const COLLECT_FOR_MS = 3 * 60_000;
/** A paint attempt the server may still hold a portrait for (its replay store keeps two days). */
const PENDING_TTL_MS = 24 * 60 * 60_000;

/*
 * The symbolism the server returns is keyed by stable values — the label
 * ('Descendant', 'Venus', 'Mars', 'Moon') and an English sign name — so the
 * text is rebuilt here, localized, with the server's English as defaults.
 * Moods and loves mirror SIGN_ART / VENUS_LOVE in
 * supabase/functions/ai-soulmate-portrait/index.ts.
 */
const SIGNS: readonly ZodiacSign[] = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
const SIGN_MOOD: Record<ZodiacSign, string> = {
  Aries: 'bold, kinetic, unafraid', Taurus: 'sensual, still, unhurried', Gemini: 'quick, curious, doubled',
  Cancer: 'tender, protective, moonlit', Leo: 'radiant, generous, theatrical', Virgo: 'precise, devoted, quietly warm',
  Libra: 'graceful, balanced, beautiful', Scorpio: 'magnetic, private, transformative', Sagittarius: 'adventurous, candid, wide-horizoned',
  Capricorn: 'steady, ambitious, quietly loyal', Aquarius: 'unconventional, luminous, free', Pisces: 'dreamlike, compassionate, boundless',
};
const SIGN_LOVE: Record<ZodiacSign, string> = {
  Aries: 'directness and spark', Taurus: 'steadiness and touch', Gemini: 'wit and conversation',
  Cancer: 'safety and devotion', Leo: 'warmth and being adored', Virgo: 'care shown in details',
  Libra: 'harmony and beauty', Scorpio: 'depth and total honesty', Sagittarius: 'freedom and shared adventure',
  Capricorn: 'commitment and reliability', Aquarius: 'friendship and originality', Pisces: 'tenderness and imagination',
};
const isSign = (v: string): v is ZodiacSign => (SIGNS as readonly string[]).includes(v);

/** A paint attempt in progress: the same requestId makes a retry free (server replay, p7 #11/#31). */
interface PendingPaint { requestId: string; vibe: Vibe; at: number }

const pendingKey = (uid: string) => `arcana:soulmate-portrait:pending:${uid}`;
function loadPending(uid: string | undefined): PendingPaint | null {
  if (!uid) return null;
  try {
    const raw = localStorage.getItem(pendingKey(uid));
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingPaint;
    if (!p?.requestId || Date.now() - p.at > PENDING_TTL_MS) {
      localStorage.removeItem(pendingKey(uid));
      return null;
    }
    return p;
  } catch {
    return null;
  }
}
function savePending(uid: string | undefined, p: PendingPaint | null): void {
  if (!uid) return;
  try {
    if (p) localStorage.setItem(pendingKey(uid), JSON.stringify(p));
    else localStorage.removeItem(pendingKey(uid));
  } catch {
    /* storage unavailable: the attempt simply is not resumable */
  }
}
function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/** The edge envelope's error code, or null when the request never got an answer (network). */
async function errorCode(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).json !== 'function') return null;
  try {
    const body = await (ctx as Response).clone().json();
    return (body as { error?: { code?: string } })?.error?.code ?? 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Soulmate Portrait — a symbolic, illustrated artwork of the qualities your
 * chart reaches for in a partner (Descendant + Venus + Mars + Moon).
 *
 * It is deliberately NOT a photorealistic face. We show the exact symbolism
 * that shaped the image, so it reads as an interpretation of your chart
 * rather than a claim about a real person you'll meet.
 *
 * The generation is slow (≈54 s on the image model). Each paint attempt
 * carries a requestId that is kept until the portrait arrives: if the
 * connection drops, the page is left, or the wait runs long, tapping again
 * collects the SAME portrait — the server serves it from its replay store
 * and never charges twice (p7 #11). The request is never aborted from here:
 * an abort cannot stop the painting, it only lost the result.
 */
export function SoulmatePortrait() {
  const { tryConsume, EarnSheet, error: gateError } = useMoonstoneSpend('soulmate-portrait', { cost: PORTRAIT_COST });
  const { user } = useAuth();
  const { t } = useT('app');
  const [vibe, setVibe] = useState<Vibe>('romantic');
  const [data, setData] = useState<PortraitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [waitStep, setWaitStep] = useState<0 | 1 | 2>(0);
  const [pending, setPending] = useState<PendingPaint | null>(() => loadPending(user?.id));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setPending(loadPending(user?.id));
  }, [user?.id]);

  // Step the waiting copy while a request is in flight.
  useEffect(() => {
    if (!loading) {
      setWaitStep(0);
      return;
    }
    const t1 = window.setTimeout(() => setWaitStep(1), WAIT_STEP_1_MS);
    const t2 = window.setTimeout(() => setWaitStep(2), WAIT_STEP_2_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [loading]);

  const remember = useCallback((p: PendingPaint | null) => {
    savePending(user?.id, p);
    if (mounted.current) setPending(p);
  }, [user?.id]);

  const paint = async () => {
    // Resume the attempt in progress (free — the server replays it), or start a new one.
    let attempt = pending;
    if (!attempt) {
      const ok = await tryConsume();
      if (!ok) return;
      attempt = { requestId: newRequestId(), vibe, at: Date.now() };
      remember(attempt);
    }
    setLoading(true);
    const started = Date.now();
    try {
      for (;;) {
        const { data: res, error } = await supabase.functions.invoke('ai-soulmate-portrait', {
          body: { vibe: attempt.vibe, requestId: attempt.requestId },
        });
        if (!error) {
          const payload = (res?.data ?? res) as PortraitData;
          if (payload?.image && !mounted.current) {
            // Painted while the user was elsewhere: keep the attempt, so the
            // next visit collects this portrait from the server for free.
            return;
          }
          remember(null);
          if (payload?.image) {
            setData(payload);
          } else {
            toast(t('soulmatePortrait.failed', { defaultValue: 'The portrait couldn’t be painted — try again.' }), 'error');
          }
          return;
        }
        const code = await errorCode(error);
        if (code === 'REQUEST_IN_FLIGHT' && Date.now() - started < COLLECT_FOR_MS) {
          // Still painting server-side (it waited ~20 s for it); keep collecting.
          continue;
        }
        if (code === 'REQUEST_IN_FLIGHT') {
          toast(t('soulmatePortrait.stillPainting', { defaultValue: 'Still painting. Tap “Show my portrait” in a minute to collect it — you won’t be charged again.' }), 'info');
          return;
        }
        if (code === null) {
          // No answer: the painting may still be running. Keep the attempt so
          // the next tap collects it instead of paying again.
          toast(t('soulmatePortrait.connectionDropped', { defaultValue: 'The connection dropped while painting. Tap “Show my portrait” to collect it — you won’t be charged twice.' }), 'error');
          return;
        }
        remember(null);
        if (code === 'INSUFFICIENT_BALANCE') {
          toast(t('soulmatePortrait.notEnough', { defaultValue: 'Not enough Moonstones' }), 'error');
        } else if (code === 'REQUEST_ALREADY_USED') {
          toast(t('soulmatePortrait.expired', { defaultValue: 'That portrait can’t be shown again. Paint a new one.' }), 'error');
        } else {
          // The server refunds a paint that fails.
          toast(t('soulmatePortrait.failedNotCharged', { defaultValue: 'The portrait couldn’t be painted, and your Moonstones weren’t charged. Try again in a moment.' }), 'error');
        }
        return;
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const download = () => {
    if (!data) return;
    const a = document.createElement('a');
    const mime = data.imageMime || 'image/jpeg';
    a.href = `data:${mime};base64,${data.image}`;
    a.download = `arcana-soulmate-portrait.${mime === 'image/png' ? 'png' : 'jpg'}`;
    a.click();
    toast(t('soulmatePortrait.saved', { defaultValue: 'Saved' }), 'success');
  };

  /** The symbol's label, localized: Descendant is a key; the planets have names. */
  const symbolLabel = (label: string): string =>
    label === 'Descendant'
      ? t('soulmatePortrait.symbol.descendant', { defaultValue: 'Descendant' })
      : localizePlanetName(label as Planet);

  /** The symbol's meaning, rebuilt from its sign so it reads in the user's language. */
  const symbolMeaning = (s: Symbolism): string => {
    if (!isSign(s.value)) return s.meaning;
    const sign = s.value.toLowerCase();
    const mood = t(`soulmatePortrait.moods.${sign}`, { defaultValue: SIGN_MOOD[s.value] });
    const love = t(`soulmatePortrait.loves.${sign}`, { defaultValue: SIGN_LOVE[s.value] });
    switch (s.label) {
      case 'Descendant':
        return t('soulmatePortrait.meaning.descendant', { defaultValue: 'You’re drawn to what feels {{mood}}.', mood });
      case 'Venus':
        return t('soulmatePortrait.meaning.venus', { defaultValue: 'You love through {{love}}.', love });
      case 'Mars':
        return t('soulmatePortrait.meaning.mars', {
          defaultValue: 'Attraction sparks for you in a {{register}} register.',
          register: t(`soulmatePortrait.registers.${sign}`, { defaultValue: SIGN_MOOD[s.value].split(',')[0] }),
        });
      case 'Moon':
        return t('soulmatePortrait.meaning.moon', { defaultValue: 'Emotionally you need {{love}}.', love });
      default:
        return s.meaning;
    }
  };

  const caption = (d: PortraitData): string => {
    const desc = d.symbolism.find((s) => s.label === 'Descendant')?.value;
    const venus = d.symbolism.find((s) => s.label === 'Venus')?.value;
    if (desc && isSign(desc)) {
      return venus && isSign(venus)
        ? t('soulmatePortrait.captionDescVenus', {
            defaultValue: 'Drawn from your {{desc}} Descendant and Venus in {{venus}} — the qualities your chart reaches for in a partner.',
            desc: localizeSignName(desc),
            venus: localizeSignName(venus),
          })
        : t('soulmatePortrait.captionDesc', {
            defaultValue: 'Drawn from your {{desc}} Descendant — the qualities your chart reaches for in a partner.',
            desc: localizeSignName(desc),
          });
    }
    if (venus && isSign(venus)) {
      return t('soulmatePortrait.captionVenus', {
        defaultValue: 'Drawn from Venus in {{venus}} — the qualities you love through.',
        venus: localizeSignName(venus),
      });
    }
    return d.caption;
  };

  // The button keeps one short label; the wait speaks in the line under it,
  // stepping up at 10 s and 30 s (a portrait takes about a minute).
  const waitLine =
    waitStep === 2
      ? t('soulmatePortrait.waitNearly', { defaultValue: 'Nearly there — portraits take up to 90 seconds' })
      : waitStep === 1
        ? t('soulmatePortrait.waitStill', { defaultValue: 'Still painting — this usually takes about a minute' })
        : null;

  return (
    <Card padding="lg" className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-gold" aria-hidden />
        <h3 className="heading-display-md text-mystic-100">{t('soulmatePortrait.title', { defaultValue: 'Your soulmate portrait' })}</h3>
      </div>

      {!data && (
        <>
          <p className="text-ui text-mystic-300">
            {t('soulmatePortrait.intro', { defaultValue: 'An illustrated portrait of the qualities your chart reaches for in love — painted from your Descendant, Venus, Mars, and Moon. Symbolic art, not a photo of a real person.' })}
          </p>
          {!pending && (
            <div className="flex flex-wrap gap-1.5">
              {VIBES.map((v) => (
                <Chip key={v.key} label={t(`soulmatePortrait.vibe.${v.key}`, { defaultValue: v.label })} selected={vibe === v.key} onSelect={() => setVibe(v.key)} size="sm" disabled={loading} />
              ))}
            </div>
          )}
          <Button variant="gold" fullWidth onClick={paint} disabled={loading}>
            {loading
              ? t('soulmatePortrait.painting', { defaultValue: 'Painting your portrait…' })
              : pending
                ? <><Sparkles className="w-4 h-4" aria-hidden /> {t('soulmatePortrait.collect', { defaultValue: 'Show my portrait' })}</>
                : <><Sparkles className="w-4 h-4" aria-hidden /> {t('soulmatePortrait.paint', { defaultValue: 'Paint the portrait' })}</>}
          </Button>
          {loading ? (
            <p className="text-meta text-mystic-300 text-center" role="status" aria-live="polite">
              {waitLine && <span className="block text-mystic-100">{waitLine}</span>}
              {t('soulmatePortrait.waitNote', { defaultValue: 'You can keep reading — the portrait appears here when it is done.' })}
            </p>
          ) : pending ? (
            <p className="text-meta text-mystic-300 text-center" role="status">
              {t('soulmatePortrait.pendingNote', { defaultValue: 'Your last portrait was still being painted. Tap to collect it — it is already paid for.' })}
            </p>
          ) : (
            <MoonstoneCostLine cost={PORTRAIT_COST} wording="portrait" />
          )}
          {gateError && <p className="text-meta text-coral" role="alert">{gateError}</p>}
        </>
      )}

      {data && (
        <div className="space-y-3">
          <img
            src={`data:${data.imageMime || 'image/jpeg'};base64,${data.image}`}
            alt={t('soulmatePortrait.alt', { defaultValue: 'Symbolic illustrated portrait generated from your chart’s relationship symbolism' })}
            className="w-full rounded-card border border-gold/20"
          />
          <ReadingProse text={caption(data)} lede={false} />

          <div className="space-y-2 pt-1 border-t border-mystic-800/40">
            <p className="font-display-eyebrow pt-2">{t('soulmatePortrait.why', { defaultValue: 'Why it looks like this' })}</p>
            <div className="reading-copy">
              {data.symbolism.map((s) => (
                <p key={s.label}>
                  <span className="text-gold">
                    {t('soulmatePortrait.symbolIn', {
                      defaultValue: '{{label}} in {{sign}}',
                      label: symbolLabel(s.label),
                      sign: isSign(s.value) ? localizeSignName(s.value) : s.value,
                    })}
                  </span>{' — '}{symbolMeaning(s)}
                </p>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={download}>
              <Download className="w-4 h-4" aria-hidden /> {t('soulmatePortrait.save', { defaultValue: 'Save the image' })}
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setData(null)}>
              <RefreshCw className="w-4 h-4" aria-hidden /> {t('soulmatePortrait.repaint', { defaultValue: 'Paint it again' })}
            </Button>
          </div>

          <p className="text-caption text-mystic-500 italic">
            {t('soulmatePortrait.disclaimer', { defaultValue: 'An artistic interpretation of your chart’s symbolism — not a depiction of a real person.' })}
          </p>
        </div>
      )}
      {EarnSheet}
    </Card>
  );
}
