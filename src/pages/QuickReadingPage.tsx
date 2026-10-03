import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Share2, Send, AlertCircle, RefreshCw, KeyRound } from 'lucide-react';
import {
  Button,
  Chip,
  Page,
  PageHeader,
  ReadingProse,
  ResultSheet,
  Tag,
  AffirmationPanel,
  TarotFace,
  toast,
} from '../components/ui';
import { TarotCardIcon, PlayingCardIcon } from '../components/ui/NavIcons';
import { PlayingCardFace } from '../components/cartomancy/PlayingCardFace';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { ORACLE_SUGGESTIONS, type OracleContext } from '../data/oracleSuggestions';
import { localDateStr } from '../utils/localDate';
import { ALL_CARDS } from '../config/bundledImages';
import { fullDeck } from '../data/tarotDeck';
import { getEnrichment } from '../data/tarotEnrichment';
import { getPlayingCard, getPlayingCardBySlug, PLAYING_CARDS_ALL } from '../data/cartomancy';
import type { PlayingCard } from '../types/cartomancy';

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

function tarotKeywordsFor(name: string): string[] {
  const wanted = cardKey(name);
  return fullDeck.find((c) => cardKey(c.name) === wanted)?.keywords.slice(0, 4) ?? [];
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

/**
 * The summary is the opening of the first paragraph — at most two
 * sentences, the lede the sheet centres — and everything after it is the
 * body. The model's first paragraph runs to ninety words; centring all of
 * it reads as a wall.
 */
function splitReading(text: string): { summary: string; rest: string } {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { summary: text.trim(), rest: '' };
  const sentences = parts[0].split(/(?<=[.!?…][’”"')\]]?)\s+(?=\S)/);
  const summary = sentences.slice(0, 2).join(' ');
  const tail = sentences.slice(2).join(' ');
  const rest = [tail, ...parts.slice(1)].filter(Boolean).join('\n\n');
  return { summary, rest };
}

/**
 * A placeholder block for the paper sheet. The shared Skeleton is a navy
 * sweep for the navy canvas; on cream it reads as a row of dark bars, so
 * the loading sheet uses the paper hairline tone instead, still (nothing
 * on a reading surface loops).
 */
function PaperBlock({ w, h, className = '' }: { w: number | string; h: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-paper-hairline rounded-inset ${className}`.trim()}
      style={{ width: typeof w === 'number' ? `${w}px` : w, height: `${h}px` }}
    />
  );
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
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<OracleContext>('general');
  const { tryConsume, refund, EarnSheet } = useMoonstoneSpend('quick-reading');
  // One id per attempt. It survives a failure so "Try again" is the same
  // request (and the same charge); it is cleared once a reading lands.
  const attemptId = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DECK_KEY, deck);
    } catch {
      /* private mode */
    }
  }, [deck]);

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
    if (!attemptId.current) attemptId.current = crypto.randomUUID();
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
      body: { question: sent, userContext, deck, requestId: attemptId.current },
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
    attemptId.current = null;
    setResult(payload);
  }, [question, profile, tryConsume, refund, context, deck]);

  const reset = () => {
    attemptId.current = null;
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
    const card = result.card;
    const cardDeck: Deck = card?.deck ?? (card && typeof card.id === 'number' && card.id >= 100 ? 'playing' : 'tarot');
    const playing = card && cardDeck === 'playing' ? playingCardFor(card) : undefined;
    const tarotId = card && !playing ? tarotIdFor(card) : null;
    const keywords = card ? (playing ? playing.keywords.slice(0, 4) : tarotKeywordsFor(card.name)) : [];
    const affirmation = card && !playing ? getEnrichment(card.name)?.affirmation : undefined;
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
                      card={{ id: tarotId, name: card.name }}
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
                    {card.name}
                    {card.reversed && (
                      <span className="reading-meta ml-2 font-sans normal-case">
                        {t('readings.revealView.reversedParen')}
                      </span>
                    )}
                  </h3>
                  {keywords.length > 0 && (
                    // Left-aligned beside the face (KeywordRow centres its pills).
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((k) => (
                        <Tag key={k} variant="keyword">{k}</Tag>
                      ))}
                    </div>
                  )}
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
            <Chip key={c.key} label={c.label} size="sm" selected={context === c.key} onSelect={() => setContext(c.key)} />
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
            <p className="text-meta text-mystic-400 mt-1">
              {t('quickReading.errorNoCharge', { defaultValue: 'Nothing was charged for a reading you did not receive.' })}
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
