import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { Share2, Send, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import { Button, Chip, Page, PageHeader, ReadingProse, ResultSheet, AffirmationPanel, TarotFace, toast, KeywordRow } from '../components/ui';
import { TarotCardIcon, PlayingCardIcon } from '../components/ui/NavIcons';
import { PlayingCardFace } from '../components/cartomancy/PlayingCardFace';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { localizeCard } from '../i18n/localizeCard';
import { ct, useContentOverlay } from '../i18n/contentOverlay';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { ORACLE_SUGGESTIONS, type OracleContext } from '../data/oracleSuggestions';
import { localDateStr } from '../utils/localDate';
import { ALL_CARDS } from '../config/bundledImages';
import { getCardById } from '../data/tarotDeck';
import { getEnrichment } from '../data/tarotEnrichment';
import { getPlayingCard, getPlayingCardBySlug, PLAYING_CARDS_ALL } from '../data/cartomancy';
import { localizePlayingCard, useCartomancyCorpus } from '../i18n/localizePlayingCard';
import type { PlayingCard } from '../types/cartomancy';
import { aiFailureOf, failedBeforeCharge, keepFocusOnPress, splitReading, type AiFailure } from '../components/reports/aiReading';
import { PaperBlock } from '../components/reports/PaperBlock';
import { isNative } from '../utils/platform';
import { isShareCancel } from '../utils/nativeShare';

/** The lenses, English as the fallback; the label shown and sent is `quickReading.lens.<key>`. */
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
 * The lenses offered with a deck. The Tarot lens asks in tarot's idiom, so
 * it is not offered while the playing-card deck is picked: a "Tarot" chip
 * under "Playing cards" read as a second deck switch (p8 F66).
 */
function lensesFor(deck: Deck): typeof ORACLE_CONTEXTS {
  return deck === 'playing' ? ORACLE_CONTEXTS.filter((c) => c.key !== 'tarot') : ORACLE_CONTEXTS;
}

/**
 * Why the last press brought no reading. `spent`: the server answered this
 * request once already and can no longer replay it (409
 * REQUEST_ALREADY_USED), so pressing again is a new, charged reading — not
 * the free retry every other failure that may have been charged gets.
 */
type QuickFailure = Exclude<AiFailure, 'insufficient' | 'soft-cap'> | 'spent';

type Deck = 'tarot' | 'playing';
const DECK_KEY = 'arcana_quick_reading_deck';

function readDeck(): Deck {
  try {
    return localStorage.getItem(DECK_KEY) === 'playing' ? 'playing' : 'tarot';
  } catch {
    return 'tarot';
  }
}

/**
 * Quick reading — single-shot Q&A with a grounded oracle voice. The server
 * draws one card (tarot, or a playing card when `deck === 'playing'`),
 * weaves it with the user's natal signals and returns a two-paragraph
 * reading. `requestId` is stable per attempt so a retry after a dropped
 * connection returns the same reading instead of charging twice.
 */

/** How many times a request the server is still reading (409 REQUEST_IN_FLIGHT) is sent again. */
const MAX_IN_FLIGHT_RETRIES = 3;

/** The server's `retryAfterMs`, kept within 1–10 s; 3 s when it sends none. */
function inFlightWaitMs(retryAfterMs: unknown): number {
  const ms = Number(retryAfterMs);
  return Number.isFinite(ms) ? Math.min(10_000, Math.max(1_000, ms)) : 3_000;
}

/** The `{ code, details }` of a function's error envelope (a FunctionsHttpError keeps the Response on `context`). */
async function errorEnvelopeOf(error: unknown): Promise<{ code?: string; details?: Record<string, unknown> } | null> {
  const ctx = (error as { context?: unknown } | null)?.context;
  if (!ctx || typeof (ctx as Response).clone !== 'function') return null;
  try {
    const body = (await (ctx as Response).clone().json()) as { error?: unknown };
    const e = body?.error;
    return e && typeof e === 'object' ? (e as { code?: string; details?: Record<string, unknown> }) : null;
  } catch {
    return null;
  }
}

/**
 * Whether a bottom-sticky bar is pinned — held at its `bottom` offset above
 * the nav — rather than resting in the flow. Pinned, it takes the nav's
 * fill and a top rule, so the form passing under it reads as passing under
 * a dock, not as cut off; resting, it is part of the page.
 */
function usePinnedToBottom(ref: RefObject<HTMLElement | null>): boolean {
  const [pinned, setPinned] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const offset = parseFloat(getComputedStyle(el).bottom) || 0;
    setPinned(el.getBoundingClientRect().bottom >= window.innerHeight - offset - 0.5);
  }, [ref]);
  // Content above it changes height (an error panel, the chips' language).
  useLayoutEffect(check);
  useEffect(() => {
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    window.visualViewport?.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, [check]);
  return pinned;
}

interface QuickReadingCard {
  name: string;
  meaning: string;
  /* Honoured when the server sends them (the AI contract this round):
     `deck` names which pack the card came from, `id`/`slug` locate it. */
  id?: number;
  slug?: string;
  deck?: Deck;
  reversed?: boolean;
  imageUrl?: string;
}

interface QuickReadingResponse {
  reading: string;
  card?: QuickReadingCard;
  memoryUsed: boolean;
}

/*
 * The tarot face is in the bundle: resolve it by id when the server gives
 * one, else by name — the server's deck uses the same names as the bundled
 * cards — and draw it with <TarotFace>.
 */
/** "Wheel of Fortune" and "The Wheel of Fortune" are the same card: the server's deck drops the article. */
const cardKey = (name: string) => name.trim().toLowerCase().replace(/^the\s+/, '');

function tarotIdFor(card: QuickReadingCard): number | null {
  if (typeof card.id === 'number' && card.id >= 0 && card.id <= 77) return card.id;
  const wanted = cardKey(card.name);
  return ALL_CARDS.find((c) => cardKey(c.name) === wanted)?.id ?? null;
}

function playingCardFor(card: QuickReadingCard): PlayingCard | undefined {
  if (typeof card.id === 'number') {
    const byId = getPlayingCard(card.id);
    if (byId) return byId;
  }
  if (card.slug) {
    const bySlug = getPlayingCardBySlug(card.slug);
    if (bySlug) return bySlug;
  }
  const wanted = card.name.trim().toLowerCase();
  return PLAYING_CARDS_ALL.find((c) => c.name.toLowerCase() === wanted);
}

export function QuickReadingPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const location = useLocation();
  // Dice and other pages hand the question over in router state so the
  // oracle opens with it already written.
  const seeded = (location.state as { question?: string } | null)?.question;
  const [question, setQuestion] = useState(() => (typeof seeded === 'string' ? seeded.slice(0, 500) : ''));
  const [deck, setDeck] = useState<Deck>(readDeck);
  const [loading, setLoading] = useState(false);
  /** The server is still reading an earlier send of this same request; this screen waits for it. */
  const [stillReading, setStillReading] = useState(false);
  const [result, setResult] = useState<QuickReadingResponse | null>(null);
  /** Why the last press brought no reading, and the request (its exact body) it was about. */
  const [lastFailure, setLastFailure] = useState<{ kind: QuickFailure; body: string } | null>(null);
  const [context, setContext] = useState<OracleContext>('general');
  const { tryConsume, EarnSheet } = useMoonstoneSpend('quick-reading');
  /**
   * A press is being handled — from the moment it lands, through the
   * balance gate, until the request settles. The ref is set synchronously,
   * before anything is awaited, so a second press that lands while the
   * gate RPC is in flight is ignored; the state disables the button for
   * the same span. Without it a double tap passed the gate twice, minted
   * two request ids, and the server charged both (p8 F08).
   */
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  /** The bar holding the cost line and the call to action (sticky above the nav). */
  const ctaBar = useRef<HTMLDivElement>(null);
  const ctaPinned = usePinnedToBottom(ctaBar);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // The request this screen last sent and did not get a reading back for:
  // its id and the exact body. Pressing the button again with the same
  // body is a retry of that request — the server charges it at most once
  // and returns the same reading — so it goes straight out, without the
  // client balance gate: a first attempt that was charged and then lost on
  // the way back can leave the balance under the cost, and the gate would
  // then block the free retry of a reading already paid for (review #28).
  // A different question, lens or deck is a new request: new id, gate first.
  const attempt = useRef<{ id: string; body: string } | null>(null);
  // A drawn playing card's keywords come from the cartomancy corpus, which
  // ja/ko/zh fetch on demand: start when the playing deck is picked.
  const resultCard = result?.card;
  const resultIsPlaying = !!resultCard && (resultCard.deck ?? (typeof resultCard.id === 'number' && resultCard.id >= 100 ? 'playing' : 'tarot')) === 'playing';
  const cartoReady = useCartomancyCorpus(deck === 'playing' || resultIsPlaying);
  // The card's affirmation in ja/ko/zh comes from the enrichment overlay.
  const { overlay: enrichment, ready: enrichmentReady } = useContentOverlay('enrichment');

  useEffect(() => {
    try {
      localStorage.setItem(DECK_KEY, deck);
    } catch {
      /* private mode */
    }
  }, [deck]);

  /** The playing deck has no Tarot lens: a Tarot lens picked before falls back to Anything. */
  const pickDeck = (next: Deck) => {
    setDeck(next);
    if (!lensesFor(next).some((c) => c.key === context)) setContext('general');
  };

  const lensLabel = useCallback(
    (key: OracleContext) =>
      t(`quickReading.lens.${key}`, { defaultValue: ORACLE_CONTEXTS.find((c) => c.key === key)?.label ?? key }),
    [t],
  );

  // "Guess what you want to ask" — 4 suggestion chips per lens, rotating
  // daily so the hub feels alive without any server round-trip. Each one is
  // `quickReading.suggestions.<lens>.<index>`, so tapping it writes the
  // question — and sends it — in the reader's language.
  const suggestions = useMemo(() => {
    const pool = ORACLE_SUGGESTIONS[context] ?? [];
    const day = localDateStr();
    let h = 0;
    for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
    const start = Math.abs(h) % Math.max(1, pool.length);
    return Array.from({ length: Math.min(4, pool.length) }, (_, i) => {
      const idx = (start + i) % pool.length;
      return t(`quickReading.suggestions.${context}.${idx}`, { defaultValue: pool[idx] });
    });
  }, [context, t]);

  /** The request the form makes as it stands — the question, its lens and deck, and the reader's signals. */
  const bodyNow = useCallback(() => {
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const userContext = {
      zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
      mbtiType: profile?.mbtiType ?? undefined,
      locale: getLocale(),
      displayName: profile?.displayName ?? undefined,
    };
    // The lens rides inside the question so the server prompt stays
    // schema-stable, worded in the reader's language like the question;
    // sliced to the 500-char contract.
    const sent = context === 'general'
      ? question.trim()
      : t('quickReading.lensQuestion', {
          defaultValue: '[{{lens}} question] {{question}}',
          lens: lensLabel(context),
          question: question.trim(),
        }).slice(0, 500);
    return { question: sent, userContext, deck };
  }, [question, profile, context, deck, t, lensLabel]);
  /**
   * The failure panel and the "Try again" label speak for the request they
   * are about (p9 R10). Once the question, lens or deck is changed, pressing
   * the button is a new reading — new id, the gate, a new 50 — so the
   * promise that "Try again returns the same reading at no extra cost" goes
   * and the button reads "Draw and read" above the price. Changed back, the
   * unanswered request (and its free retry) is the one on screen again.
   */
  const error = lastFailure && lastFailure.body === JSON.stringify(bodyNow()) ? lastFailure.kind : null;

  /** One press: the balance gate (for a new request), the request, and what came back. */
  const read = useCallback(async () => {
    const body = bodyNow();
    const signature = JSON.stringify(body);
    const setError = (kind: QuickFailure | null) => setLastFailure(kind ? { kind, body: signature } : null);
    if (attempt.current?.body !== signature) {
      const ok = await tryConsume();
      if (!ok) return;
      attempt.current = { id: crypto.randomUUID(), body: signature };
    }
    const requestId = attempt.current.id;
    setLoading(true);
    setStillReading(false);
    setError(null);
    setResult(null);
    const invoke = () => supabase.functions.invoke('ai-quick-reading', { body: { ...body, requestId } });
    let res = await invoke();
    // 409 REQUEST_IN_FLIGHT: an earlier send of this very request (same id,
    // same body) is still being read — typically a retry after a dropped
    // connection. Wait as long as the server asks and send the same request
    // again; it then answers with that reading, charged once.
    for (let retry = 0; retry < MAX_IN_FLIGHT_RETRIES && res.error; retry++) {
      const envelope = await errorEnvelopeOf(res.error);
      if (envelope?.code !== 'REQUEST_IN_FLIGHT') break;
      if (!mounted.current) return;
      setStillReading(true);
      await new Promise((r) => setTimeout(r, inFlightWaitMs(envelope.details?.retryAfterMs)));
      if (!mounted.current) return;
      res = await invoke();
    }
    if (!mounted.current) return;
    setLoading(false);
    setStillReading(false);
    const { data, error: err } = res;
    if (err) {
      if ((await errorEnvelopeOf(err))?.code === 'REQUEST_ALREADY_USED') {
        // Answered before, but the answer can no longer be replayed: this id
        // is spent, and the next press is a new, charged request. Say that,
        // not "Try again returns the same reading at no extra cost" (p8 F13).
        attempt.current = null;
        setError('spent');
        return;
      }
      const failure = await aiFailureOf(err);
      if (failure === 'insufficient' || failure === 'soft-cap') {
        // Rejected before the debit: there is nothing to retry for free.
        // The gate opens the Earn sheet with the balance or the reset time.
        attempt.current = null;
        if (await tryConsume()) setError('generic');
        return;
      }
      setError(failure);
      return;
    }
    const payload = (data?.data ?? data) as QuickReadingResponse | null;
    if (!payload?.reading) {
      setError('generic');
      return;
    }
    attempt.current = null;
    setResult(payload);
  }, [bodyNow, tryConsume]);

  const submit = useCallback(async () => {
    // Re-entrancy is decided synchronously, before the gate is awaited (F08).
    if (submitting.current || question.trim().length < 3) return;
    submitting.current = true;
    setBusy(true);
    try {
      await read();
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [question, read]);

  const reset = () => {
    attempt.current = null;
    setResult(null);
    setLastFailure(null);
    setQuestion('');
  };

  /** The drawn card as this screen shows it: localized name, keywords and affirmation. */
  const shownCard = (() => {
    const card = result?.card;
    if (!card) return null;
    const cardDeck: Deck = card.deck ?? (typeof card.id === 'number' && card.id >= 100 ? 'playing' : 'tarot');
    const playingEn = cardDeck === 'playing' ? playingCardFor(card) : undefined;
    const playing = playingEn && cartoReady ? localizePlayingCard(playingEn) : playingEn;
    const tarotId = !playingEn ? tarotIdFor(card) : null;
    const tarotEn = tarotId !== null ? getCardById(tarotId) : undefined;
    const tarot = tarotEn ? localizeCard(tarotEn) : undefined;
    // Until the cartomancy corpus is in, a playing card shows no keywords
    // rather than English ones under a translated page; the tarot corpus
    // arrives with the locale.
    const keywords = playing ? (cartoReady ? playing.keywords.slice(0, 4) : []) : (tarot?.keywords.slice(0, 4) ?? []);
    const name = playing?.name ?? tarot?.name ?? card.name;
    // The affirmation: English in English; in ja/ko/zh only once the
    // enrichment overlay has it — an English line under a translated
    // reading is worse than none.
    const affirmationEn = tarotEn ? getEnrichment(tarotEn.name)?.affirmation : undefined;
    const affirmation = !affirmationEn
      ? undefined
      : getLocale() === 'en'
        ? affirmationEn
        : enrichmentReady
          ? ct(enrichment, `${tarotId}.affirmation`, '') || undefined
          : undefined;
    return { card, playing, tarotId, name, keywords, affirmation };
  })();

  const handleShare = async () => {
    if (!result) return;
    const text = `"${question.trim()}"\n\n${result.reading}\n\n— ${shownCard?.name ?? 'Arcana'}`;
    // The platform's share sheet when there is one: Capacitor's in the app
    // (its WebView has no navigator.share), the browser's on the web.
    // Closing the sheet is a choice, not a failure — nothing is copied and
    // nothing is said; the reading is private (p8 F57). A second tap while
    // the first sheet is still up (InvalidStateError) is the same.
    if (isNative() || typeof navigator.share === 'function') {
      try {
        if (isNative()) {
          const { Share } = await import('@capacitor/share');
          await Share.share({ text, dialogTitle: t('quickReading.share', { defaultValue: 'Share' }) });
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
      await navigator.clipboard.writeText(text);
      toast(t('common:actions.copied', { defaultValue: 'Copied' }), 'success');
    } catch {
      toast(t('common:actions.shareFailed', { defaultValue: 'Couldn’t share. Try again.' }), 'error');
    }
  };

  const title = t('quickReading.title', { defaultValue: 'Quick reading' });
  const yourQuestion = t('quickReading.yourQuestion', { defaultValue: 'Your question' });

  if (loading) {
    // The sheet the result will fill, with what is already known (the
    // question) set and quiet paper blocks where the card and prose land.
    return (
      <Page spacing="md">
        <PageHeader title={title} />
        <div role="status" aria-live="polite" aria-busy="true">
          <ResultSheet headingLevel="h2" glyph={<KeyRound strokeWidth={1.5} />} eyebrow={yourQuestion} title={question.trim()}>
            <p className="reading-meta text-center">
              {stillReading
                ? t('quickReading.stillReading', { defaultValue: 'Still reading…' })
                : t('quickReading.drawing', { defaultValue: 'Drawing…' })}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <PaperBlock w={80} h={120} className="shrink-0" />
              <div className="flex-1 space-y-2.5">
                <PaperBlock w="60%" h={20} />
                <PaperBlock w="40%" h={12} />
                <PaperBlock w="90%" h={12} />
              </div>
            </div>
            <div className="mt-8 space-y-2.5">
              <PaperBlock w="100%" h={14} />
              <PaperBlock w="96%" h={14} />
              <PaperBlock w="88%" h={14} />
              <PaperBlock w="70%" h={14} />
            </div>
          </ResultSheet>
        </div>
      </Page>
    );
  }

  if (result) {
    const { summary, rest } = splitReading(result.reading);
    const { card, playing, tarotId, name, keywords, affirmation } = shownCard ?? {
      card: undefined, playing: undefined, tarotId: null, name: '', keywords: [] as string[], affirmation: undefined,
    };
    return (
      <Page spacing="md">
        <PageHeader title={title} />
        <ResultSheet
          headingLevel="h2"
          glyph={<KeyRound strokeWidth={1.5} />}
          eyebrow={yourQuestion}
          title={question.trim()}
          summary={summary}
          disclaimer="ai"
        >
          <div className="space-y-7">
            {card && (
              <section
                className={`flex items-center gap-4 ${playing || tarotId !== null ? 'text-left' : 'justify-center text-center'}`}
                aria-label={t('quickReading.cardLabel', { defaultValue: 'Card drawn' })}
              >
                {playing ? (
                  <div className="w-20 shrink-0 text-gold">
                    <PlayingCardFace card={playing} detail="quiet" surface="paper" reversed={card.reversed} />
                  </div>
                ) : tarotId !== null ? (
                  <div className="w-20 shrink-0">
                    {/* The name sits beside the face, so the plate stays quiet
                        and the heading names the orientation. */}
                    <TarotFace
                      card={{ id: tarotId, name }}
                      size="fill"
                      detail="quiet"
                      reversed={card.reversed}
                      reversedTag={false}
                      alt=""
                    />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="reading-meta">{t('quickReading.cardLabel', { defaultValue: 'Card drawn' })}</p>
                  <h3 className="heading-display-md heading-strong text-ink">
                    {name}
                    {card.reversed && (
                      <span className="reading-meta ml-2 font-sans normal-case">
                        {t('readings.revealView.reversedParen')}
                      </span>
                    )}
                  </h3>
                  {/* Left-aligned beside the face. */}
                  {keywords.length > 0 && <KeywordRow keywords={keywords} align="start" />}
                </div>
              </section>
            )}

            {rest && <ReadingProse text={rest} lede={false} />}

            {result.memoryUsed && (
              <p className="reading-caption">
                {t('quickReading.memoryUsed', { defaultValue: 'Drawing on what we’ve talked about before.' })}
              </p>
            )}

            {affirmation && <AffirmationPanel text={affirmation} />}

            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                {t('quickReading.share', { defaultValue: 'Share' })}
              </Button>
              <Button variant="gold" fullWidth onClick={reset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('quickReading.askAnother', { defaultValue: 'Ask another' })}
              </Button>
            </div>
          </div>
        </ResultSheet>
      </Page>
    );
  }

  return (
    <Page spacing="md">
      <PageHeader
        title={title}
        subtitle={t('quickReading.intro', {
          defaultValue: 'Ask anything. One card is drawn and read against your own signals in a short reading to sit with.',
        })}
      />

      {/* Which pack the card comes from. Remembered per device. Each chip
          group is named on screen, so the deck's "Tarot" and the Tarot
          lens below cannot be taken for one another (p8 F66). */}
      <div>
        <p id="quick-reading-deck-label" className="block font-display-eyebrow text-mystic-400 mb-2">
          {t('quickReading.deckLabel', { defaultValue: 'Deck' })}
        </p>
        <div className="flex gap-2" role="group" aria-labelledby="quick-reading-deck-label">
          <Chip
            selected={deck === 'tarot'}
            onSelect={() => pickDeck('tarot')}
            icon={<TarotCardIcon className="w-4 h-4" />}
          >
            {t('quickReading.deckTarot', { defaultValue: 'Tarot' })}
          </Chip>
          <Chip
            selected={deck === 'playing'}
            onSelect={() => pickDeck('playing')}
            icon={<PlayingCardIcon className="w-4 h-4" />}
          >
            {t('quickReading.deckPlaying', { defaultValue: 'Playing cards' })}
          </Chip>
        </div>
      </div>

      {/* Oracle lenses + daily-rotating suggestion chips */}
      <div className="space-y-2.5">
        <p id="quick-reading-lens-label" className="block font-display-eyebrow text-mystic-400 mb-2">
          {t('quickReading.lensLabel', { defaultValue: 'Focus' })}
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="quick-reading-lens-label">
          {lensesFor(deck).map((c) => (
            <Chip key={c.key} label={lensLabel(c.key)} size="sm" selected={context === c.key} onSelect={() => setContext(c.key)} />
          ))}
        </div>
        {/* A suggestion is a whole question, and a chip does not shrink
            (flex-shrink-0): eight of the 80 ja suggestions are 333–357 px
            on one line against the 328 px row at 360 px, so one widened the
            page, the screen scrolled sideways and the nav fell below the
            fold (p9 Q30). Held to the row's width, a long one wraps — at a
            phrase, as every ja/zh/ko control does (index.css, F84). */}
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <Chip key={s} label={s} size="sm" variant="outline" onClick={() => setQuestion(s)} className="max-w-full text-left" />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="quick-reading-question" className="block font-display-eyebrow text-mystic-400 mb-2">
          {t('quickReading.questionLabel', { defaultValue: 'Your question' })}
        </label>
        <textarea
          id="quick-reading-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('quickReading.questionPlaceholder', { defaultValue: 'What’s on your mind?' })}
          className="w-full bg-mystic-850 border border-mystic-700 rounded-control p-3 text-mystic-100 text-ui placeholder-mystic-500 resize-none focus:outline-none focus:border-gold/40"
        />
        <p className="text-caption text-mystic-500 mt-1 text-right tabular-nums">{question.length} / 500</p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-card bg-mystic-850 border border-coral/30 p-4">
          <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-ui text-mystic-100">
              {error === 'spent'
                ? t('quickReading.errorSpent', { defaultValue: 'This question was already read once, and that reading can’t be shown again.' })
                : error === 'rate-limit'
                  ? t('quickReading.errorRateLimit', { defaultValue: 'You’re asking fast — slow down and try again in a moment.' })
                  : error === 'unavailable'
                    ? t('quickReading.errorUnavailable', { defaultValue: 'Readings are temporarily unavailable.' })
                    : t('quickReading.errorGeneric', { defaultValue: 'Could not generate a reading. Try again.' })}
            </p>
            {/* Say only what is true for this failure: a request refused
                before the debit cost nothing; a spent one cannot be
                replayed, so pressing again is a new reading; any other may
                have been charged, and then the retry (same request) is free. */}
            <p className="text-meta text-mystic-400 mt-1">
              {error === 'spent'
                ? t('quickReading.errorSpentNew', { defaultValue: 'Draw and read starts a new reading, charged as usual.' })
                : failedBeforeCharge(error)
                  ? t('quickReading.errorNoCharge', { defaultValue: 'Nothing was charged for a reading you did not receive.' })
                  : t('quickReading.errorRetryFree', {
                      defaultValue: 'If you were charged, Try again returns the same reading at no extra cost.',
                    })}
            </p>
          </div>
        </div>
      )}

      {/* The call to action rides just above the bottom nav (or, with the
          keyboard up and the nav hidden, the bottom edge). In the flow it
          ended in the nav's band on a phone: half the button showed, and a
          tap on its label landed on the nav tab behind it (P7 #20, p8
          O#20). Sticky, it is never under the nav — whatever the page's
          length, the language, or an error panel above it. Resting in the
          flow it is part of the page; pinned, it is a dock on the nav. */}
      <div
        ref={ctaBar}
        className={`sticky z-10 -mx-4 px-4 lg:-mx-8 lg:px-8 py-3 space-y-3 border-t bottom-[calc(6rem_+_env(safe-area-inset-bottom,0px))] [body.keyboard-open_&]:bottom-0 ${
          ctaPinned ? 'bg-mystic-900 border-mystic-700' : 'bg-mystic-950 border-transparent'
        }`}
      >
        <MoonstoneCostLine />
        <Button
          variant="gold"
          size="lg"
          fullWidth
          onClick={submit}
          onPointerDown={keepFocusOnPress}
          onMouseDown={keepFocusOnPress}
          disabled={busy || loading || question.trim().length < 3}
        >
          {error && error !== 'spent' ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('quickReading.tryAgain', { defaultValue: 'Try again' })}
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              {t('quickReading.draw', { defaultValue: 'Draw and read' })}
            </>
          )}
        </Button>
      </div>
      {EarnSheet}
    </Page>
  );
}

export default QuickReadingPage;
