import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  const [result, setResult] = useState<QuickReadingResponse | null>(null);
  const [error, setError] = useState<Exclude<AiFailure, 'insufficient' | 'soft-cap'> | null>(null);
  const [context, setContext] = useState<OracleContext>('general');
  const { tryConsume, EarnSheet } = useMoonstoneSpend('quick-reading');
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

  const submit = useCallback(async () => {
    if (question.trim().length < 3) return;
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
    const body = { question: sent, userContext, deck };
    const signature = JSON.stringify(body);
    if (attempt.current?.body !== signature) {
      const ok = await tryConsume();
      if (!ok) return;
      attempt.current = { id: crypto.randomUUID(), body: signature };
    }
    const requestId = attempt.current.id;
    setLoading(true);
    setError(null);
    setResult(null);
    const { data, error: err } = await supabase.functions.invoke('ai-quick-reading', {
      body: { ...body, requestId },
    });
    setLoading(false);
    if (err) {
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
  }, [question, profile, tryConsume, context, deck, t, lensLabel]);

  const reset = () => {
    attempt.current = null;
    setResult(null);
    setError(null);
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
            <p className="reading-meta text-center">{t('quickReading.drawing', { defaultValue: 'Drawing…' })}</p>
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

      {/* Which pack the card comes from. Remembered per device. */}
      <div className="flex gap-2" role="group" aria-label={t('quickReading.deckLabel', { defaultValue: 'Deck' })}>
        <Chip
          selected={deck === 'tarot'}
          onSelect={() => setDeck('tarot')}
          icon={<TarotCardIcon className="w-4 h-4" />}
        >
          {t('quickReading.deckTarot', { defaultValue: 'Tarot' })}
        </Chip>
        <Chip
          selected={deck === 'playing'}
          onSelect={() => setDeck('playing')}
          icon={<PlayingCardIcon className="w-4 h-4" />}
        >
          {t('quickReading.deckPlaying', { defaultValue: 'Playing cards' })}
        </Chip>
      </div>

      {/* Oracle lenses + daily-rotating suggestion chips */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {ORACLE_CONTEXTS.map((c) => (
            <Chip key={c.key} label={lensLabel(c.key)} size="sm" selected={context === c.key} onSelect={() => setContext(c.key)} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <Chip key={s} label={s} size="sm" variant="outline" onClick={() => setQuestion(s)} className="text-left" />
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
              {error === 'rate-limit'
                ? t('quickReading.errorRateLimit', { defaultValue: 'You’re asking fast — slow down and try again in a moment.' })
                : error === 'unavailable'
                  ? t('quickReading.errorUnavailable', { defaultValue: 'Readings are temporarily unavailable.' })
                  : t('quickReading.errorGeneric', { defaultValue: 'Could not generate a reading. Try again.' })}
            </p>
            {/* Say only what is true for this failure: a request refused
                before the debit cost nothing; any other may have been
                charged, and then the retry (same request) is free. */}
            <p className="text-meta text-mystic-400 mt-1">
              {failedBeforeCharge(error)
                ? t('quickReading.errorNoCharge', { defaultValue: 'Nothing was charged for a reading you did not receive.' })
                : t('quickReading.errorRetryFree', {
                    defaultValue: 'If you were charged, Try again returns the same reading at no extra cost.',
                  })}
            </p>
          </div>
        </div>
      )}

      <MoonstoneCostLine />
      <Button
        variant="gold"
        size="lg"
        fullWidth
        onClick={submit}
        onPointerDown={keepFocusOnPress}
        onMouseDown={keepFocusOnPress}
        disabled={loading || question.trim().length < 3}
      >
        {error ? (
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
      {EarnSheet}
    </Page>
  );
}

export default QuickReadingPage;
