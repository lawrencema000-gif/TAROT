import { useState, useCallback, useRef } from 'react';
import { RotateCcw, Share2, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Card,
  Button,
  Page,
  Section,
  toast,
  PageHeader,
  SparkleFourPoint,
  ResultSheet,
  ReadingProse,
  Paper,
} from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getLocale } from '../i18n/config';
import { getZodiacSign, zodiacData } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { castRunes, type RuneCastResult } from '../data/runes';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { getCardById } from '../data/tarotDeck';
import { localizeCard } from '../i18n/localizeCard';
import { aiFailureOf, failedBeforeCharge, keepFocusOnPress, type AiFailure } from '../components/reports/aiReading';
import { PaperBlock } from '../components/reports/PaperBlock';

type Stage = 'intro' | 'casting' | 'result';

interface OracleReading {
  reading: string;
  card?: { name: string; meaning: string; id?: number; deck?: string };
}

type OracleState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: OracleReading }
  | { status: 'error'; failure: AiFailure };

/** The tarot card the oracle drew alongside, named in the reader's language. */
function drawnCardName(card: NonNullable<OracleReading['card']>): string {
  if (typeof card.id === 'number' && card.deck !== 'playing') {
    const en = getCardById(card.id);
    if (en) return localizeCard(en).name;
  }
  return card.name;
}

/** The first paragraph is the sheet's summary; the rest is the body. */
function splitProse(text: string): { summary: string; rest: string } {
  const parts = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length <= 1) return { summary: parts[0] ?? text.trim(), rest: '' };
  return { summary: parts[0], rest: parts.slice(1).join('\n\n') };
}

export function RunesPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('intro');
  const [question, setQuestion] = useState('');
  const [cast, setCast] = useState<RuneCastResult | null>(null);
  // One id per cast: the AI reading of this cast is one request however
  // many times the network drops. A retry with the same id returns the
  // same reading without a second debit (R7 "Read the cast as a whole").
  const [castId, setCastId] = useState<string | null>(null);
  const [oracle, setOracle] = useState<OracleState>({ status: 'idle' });
  const { tryConsume, EarnSheet } = useMoonstoneSpend('quick-reading');
  // The cast id whose reading has been requested. A second request under
  // it is a retry of the same body, which the server charges at most once
  // — so it skips the client balance gate, which a charged-then-lost first
  // attempt could otherwise leave closed (review #28).
  const sentCastId = useRef<string | null>(null);

  const startCast = async () => {
    setStage('casting');
    setCast(null);
    setOracle({ status: 'idle' });
    await new Promise((r) => setTimeout(r, 1200));
    setCast(castRunes());
    setCastId(crypto.randomUUID());
    setStage('result');
  };

  const reset = () => {
    sentCastId.current = null;
    setStage('intro');
    setQuestion('');
    setCast(null);
    setCastId(null);
    setOracle({ status: 'idle' });
  };

  const readCast = useCallback(async () => {
    if (!cast || !castId) return;
    if (sentCastId.current !== castId) {
      const ok = await tryConsume();
      if (!ok) return;
      sentCastId.current = castId;
    }
    setOracle({ status: 'loading' });
    // The cast is described to the Oracle in the reader's language, like
    // the question it rides in.
    const runes = cast.runes
      .map((r) => {
        const position = t(`runes.positions.${r.position}`, { defaultValue: r.position });
        return r.reversed
          ? t('runes.aiRuneReversed', { defaultValue: '{{rune}} (reversed) in {{position}}', rune: r.rune.name, position })
          : t('runes.aiRune', { defaultValue: '{{rune}} in {{position}}', rune: r.rune.name, position });
      })
      .join(t('runes.aiJoin', { defaultValue: ', ' }));
    const context = question.trim()
      ? t('runes.aiCastAsked', { defaultValue: 'my rune cast — {{runes}}, asked about: {{question}}', runes, question: question.trim() })
      : t('runes.aiCast', { defaultValue: 'my rune cast — {{runes}}', runes });
    const sunSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const sent = t('askOracle.question', {
      defaultValue: 'Read this for me — {{context}}. What is it pointing to in my life right now?',
      context,
    }).slice(0, 500);
    const { data, error } = await supabase.functions.invoke('ai-quick-reading', {
      body: {
        question: sent,
        requestId: castId,
        userContext: {
          zodiacSign: sunSign ? zodiacData[sunSign].name : undefined,
          mbtiType: profile?.mbtiType ?? undefined,
          locale: getLocale(),
          displayName: profile?.displayName ?? undefined,
        },
      },
    });
    if (error) {
      const failure = await aiFailureOf(error);
      if (failure === 'insufficient' || failure === 'soft-cap') {
        // Refused before the debit: the next request needs the gate again,
        // which opens the Earn sheet with the balance or the reset time.
        sentCastId.current = null;
        setOracle({ status: 'idle' });
        if (await tryConsume()) setOracle({ status: 'error', failure: 'generic' });
        return;
      }
      setOracle({ status: 'error', failure });
      return;
    }
    const payload = (data?.data ?? data) as OracleReading | null;
    if (!payload?.reading) {
      setOracle({ status: 'error', failure: 'generic' });
      return;
    }
    setOracle({ status: 'done', result: payload });
  }, [cast, castId, question, profile, tryConsume, t]);

  if (stage === 'intro') {
    return (
      <Page spacing="md">
        <PageHeader title={t('runes.title', { defaultValue: 'Runes' })} icon={<SparkleFourPoint size={20} />} />
        <Section
          spacing="lg"
        >
          <Card variant="glow" padding="lg">
            <p className="reading-copy mb-4">
              {t('runes.intro', {
                defaultValue:
                  'The Elder Futhark — 24 staves carved with the oldest written wisdom of Northern Europe. Hold a question in mind. Three runes fall: past, present, future. Some may appear reversed (merkstave), softening or turning their meaning.',
              })}
            </p>
            <label htmlFor="runes-question" className="block text-ui text-mystic-400 mb-2">
              {t('runes.questionLabel', { defaultValue: 'Your question (optional)' })}
            </label>
            <textarea
              id="runes-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-ui placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
              placeholder={t('runes.questionPlaceholder', {
                defaultValue: 'What do I most need to understand right now?',
              }) as string}
            />
          </Card>
        </Section>

        <Button variant="primary" size="lg" fullWidth onClick={startCast} onPointerDown={keepFocusOnPress} onMouseDown={keepFocusOnPress}>
          <SparkleFourPoint size={18} className="mr-2" />
          {t('runes.castButton', { defaultValue: 'Cast the runes' })}
        </Button>
      </Page>
    );
  }

  if (stage === 'casting') {
    return (
      <Page spacing="md" className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-gold animate-spin mb-3" aria-hidden />
        <p className="text-mystic-200 text-lede font-display text-center">
          {t('runes.casting', { defaultValue: 'Casting...' })}
        </p>
      </Page>
    );
  }

  if (stage === 'result' && cast) {
    const positionLabels: Record<string, string> = {
      past: t('runes.positions.past', { defaultValue: 'Past' }) as string,
      present: t('runes.positions.present', { defaultValue: 'Present' }) as string,
      future: t('runes.positions.future', { defaultValue: 'Future' }) as string,
    };

    const handleShare = async () => {
      try {
        const firstRune = cast.runes[0];
        const blob = await renderShareCard({
          title: cast.runes.map((r) => r.rune.glyph).join(' · '),
          subtitle: t('runes.castLabel', { defaultValue: 'Three-rune cast' }) as string,
          tagline: `${firstRune.rune.name} · ${cast.runes[1].rune.name} · ${cast.runes[2].rune.name}`,
          affirmation: firstRune.rune.prompt,
          brand: t('share.brand.runes', { defaultValue: 'Runes' }) as string,
        });
        const out = await shareOrDownload(blob, 'arcana-runes.png', t('runes.shareTitle', { defaultValue: 'My rune cast' }));
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        else if (out === 'failed') toast(t('common:actions.shareFailed'), 'error');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    const castTitle = question.trim() || `${cast.runes.map((r) => r.rune.name).join(' · ')}`;

    return (
      <Page spacing="sm">
        <PageHeader
          title={t('runes.title', { defaultValue: 'Runes' })}
          eyebrow={t('runes.castLabel', { defaultValue: 'Three-rune cast' })}
          onBack={reset}
          backLabel={t('runes.back', { defaultValue: 'Cast again' }) as string}
        />

        {question && (
          <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
            <p className="text-meta text-mystic-400 mb-1">
              {t('runes.yourQuestion', { defaultValue: 'Your question' })}
            </p>
            <p className="text-ui text-mystic-200 italic">"{question}"</p>
          </Card>
        )}

        {/* Three-rune display */}
        <Card variant="glow" padding="lg">
          <div className="grid grid-cols-3 gap-3 mb-2">
            {cast.runes.map((r, i) => (
              <div key={i} className="text-center">
                <div className={`text-6xl font-display text-gold ${r.reversed ? 'rotate-180' : ''} transition-transform`}>
                  {r.rune.glyph}
                </div>
                <p className="text-meta text-mystic-400 uppercase tracking-widest mt-1">
                  {positionLabels[r.position]}
                </p>
                <p className="text-ui text-mystic-100 font-medium mt-1">{r.rune.name}</p>
                {r.reversed && (
                  <div className="inline-flex items-center gap-1 text-caption text-coral mt-1">
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>{t('runes.reversed', { defaultValue: 'merkstave' })}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Detailed meanings */}
        {cast.runes.map((r, i) => (
          <Card key={i} padding="lg">
            <div className="flex items-start gap-3 mb-3">
              <div className={`text-4xl font-display text-gold flex-shrink-0 ${r.reversed ? 'rotate-180' : ''}`}>
                {r.rune.glyph}
              </div>
              <div>
                <p className="text-meta text-mystic-400 uppercase tracking-widest">{positionLabels[r.position]}</p>
                <h3 className="heading-display-md text-mystic-100">{r.rune.name}</h3>
                <p className="text-meta text-mystic-400 italic mt-1">{r.rune.element}</p>
              </div>
            </div>
            <p className="text-ui text-gold/80 italic mb-2">
              {r.reversed && r.rune.reversed
                ? r.rune.reversed
                : r.rune.upright}
            </p>
            <p className="reading-copy mb-3">{r.rune.interpretation}</p>
            <div className="p-3 mb-3 rounded-control bg-mystic-800/40 border border-mystic-700/30">
              <p className="font-display-eyebrow text-cosmic-blue mb-1">
                {t('runes.whenItLandsLabel', { defaultValue: 'When this lands for you' })}
              </p>
              <p className="reading-copy">{r.rune.whenItLands}</p>
            </div>
            <div className="pt-3 border-t border-mystic-800/50">
              <p className="text-meta text-mystic-400 uppercase tracking-wider mb-1">
                {t('runes.promptLabel', { defaultValue: 'Journal prompt' })}
              </p>
              <p className="reading-quote my-0">{r.rune.prompt}</p>
            </div>
          </Card>
        ))}

        {/* The cast as a whole — one AI reading of the three staves together.
            Never charges without delivering: the request id is the cast's,
            so "Try again" after a dropped connection is the same request. */}
        {oracle.status === 'idle' && (
          <Card padding="md" className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-control bg-cosmic-violet/15 flex items-center justify-center flex-shrink-0" aria-hidden>
                <Sparkles className="w-5 h-5 text-cosmic-violet-ink" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-ui font-medium text-mystic-100">
                  {t('runes.askOracleCta', { defaultValue: 'Read the cast as a whole' })}
                </h3>
                <p className="text-meta text-mystic-400 mt-0.5">
                  {t('runes.oracleSubtitle', { defaultValue: 'One reading of all three staves together, grounded in your chart.' })}
                </p>
              </div>
            </div>
            <MoonstoneCostLine />
            <Button variant="gold" fullWidth onClick={readCast}>
              <Sparkles className="w-4 h-4 mr-2" aria-hidden />
              {t('runes.readCast', { defaultValue: 'Read the cast' })}
            </Button>
          </Card>
        )}

        {oracle.status === 'loading' && (
          <div role="status" aria-live="polite" aria-busy="true">
            {/* Still paper blocks, not the canvas Skeleton: its navy shimmer
                reads as dark bars on cream, and a reading surface never
                loops (review #163). */}
            <Paper as="article">
              <p className="sr-only">{t('askOracle.drawing', { defaultValue: 'Drawing…' })}</p>
              <div className="mx-auto flex flex-col items-center gap-3">
                <PaperBlock w={96} h={12} />
                <PaperBlock w="70%" h={28} />
              </div>
              <div className="mt-8 space-y-2.5">
                <PaperBlock w="100%" h={14} />
                <PaperBlock w="96%" h={14} />
                <PaperBlock w="88%" h={14} />
                <PaperBlock w="60%" h={14} />
              </div>
            </Paper>
          </div>
        )}

        {oracle.status === 'error' && (
          <div role="alert" className="flex items-start gap-3 rounded-card bg-mystic-850 border border-coral/30 p-4">
            <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-ui text-mystic-100">
                  {oracle.failure === 'rate-limit'
                    ? t('quickReading.errorRateLimit', { defaultValue: 'You’re asking fast — slow down and try again in a moment.' })
                    : oracle.failure === 'unavailable'
                      ? t('quickReading.errorUnavailable', { defaultValue: 'Readings are temporarily unavailable.' })
                      : t('runes.oracleFailed', { defaultValue: 'The reading didn’t come through.' })}
                </p>
                <p className="text-meta text-mystic-400 mt-1">
                  {failedBeforeCharge(oracle.failure)
                    ? t('quickReading.errorNoCharge', { defaultValue: 'Nothing was charged for a reading you did not receive.' })
                    : t('runes.oracleFailedBody', {
                        defaultValue: 'Check your connection and try again — this cast is one request, so you won’t be charged twice.',
                      })}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={readCast}>
                <RefreshCw className="w-3.5 h-3.5 mr-2" aria-hidden />
                {t('runes.tryAgain', { defaultValue: 'Try again' })}
              </Button>
            </div>
          </div>
        )}

        {oracle.status === 'done' && (() => {
          const { summary, rest } = splitProse(oracle.result.reading);
          return (
            <ResultSheet
              headingLevel="h2"
              glyph={<Sparkles strokeWidth={1.5} />}
              eyebrow={t('runes.oracleEyebrow', { defaultValue: 'The cast as a whole' })}
              title={castTitle}
              summary={summary}
              disclaimer="ai"
            >
              <div className="space-y-6">
                {rest && <ReadingProse text={rest} lede={false} />}
                {oracle.result.card && (
                  <p className="reading-caption">
                    {t('runes.oracleCard', { defaultValue: 'Card drawn alongside: {{name}}', name: drawnCardName(oracle.result.card) })}
                  </p>
                )}
              </div>
            </ResultSheet>
          );
        })()}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            {t('runes.share', { defaultValue: 'Share this cast' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset}>
            {t('runes.castAgain', { defaultValue: 'Cast again' })}
          </Button>
        </div>
        {EarnSheet}
      </Page>
    );
  }

  return null;
}

export default RunesPage;
