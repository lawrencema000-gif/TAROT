import { useState, useMemo, useRef, useEffect } from 'react';
import { Sparkles, Moon, AlertTriangle, AlertCircle, Palette, Hash, Compass, Globe, Eye, BookOpen, Feather, Share2, RefreshCw } from 'lucide-react';
import { Card, Button, toast, Page, PageHeader, Section, Disclosure, ResultSheet, KeywordRow, EyebrowLabel } from '../components/ui';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { interpretDream, type DreamReading } from '../data/dreamSymbols';
import { detectAll, CULTURAL_DREAM_LORE, LUCID_TECHNIQUES, NIGHTMARE_CATEGORIES } from '../data/dreamSubsystems';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { getZodiacSign } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';
import { failedBeforeCharge } from '../components/reports/aiReading';
import { paidFailureOf, sendPaid } from '../components/oracle/paidRequest';

/**
 * Dream interpretation page.
 *
 * Primary path: `ai-dream-interpret` edge function (OpenAI gpt-4o-mini
 * primary, Gemini 2.5 Flash fallback, strict-JSON Jungian prompt).
 * Falls back to the local 80-symbol keyword dictionary when the
 * edge fn fails or is unreachable so the feature degrades gracefully
 * offline.
 *
 * The AI response structure:
 *   - coreTheme paragraph
 *   - emotionalTone phrase
 *   - 2-4 archetypes
 *   - 2-5 symbols (verbatim from dream, meaning, reflection question)
 *   - shadowPrompt
 *   - integrationSuggestion
 *
 * Local fallback uses the existing keyword matcher + the expanded
 * 80-entry dictionary and adapts its output into the same UI shape.
 *
 * Both results are read on paper (ResultSheet). The AI one closes with the
 * `ai` disclaimer — a model wrote it — the dictionary one with `general`.
 *
 * Money (p8 R1): the server charges 50 Moonstones per request and replays a
 * request that carries the same `requestId` and body for free. So a press is
 * guarded synchronously (a second tap during the balance gate is ignored),
 * the request keeps its id until it is answered, and the dictionary fallback
 * only says "No Moonstones were taken" when the server refused the request
 * before the debit. When the answer was lost on the way back (the charge may
 * have landed), the dictionary reading says so and offers Try again — the
 * same request, which returns the paid interpretation at no extra cost.
 */

type Stage = 'input' | 'result';

interface AiReading {
  source: 'ai';
  coreTheme: string;
  emotionalTone: string;
  archetypes: string[];
  symbols: { text: string; meaning: string; reflection: string }[];
  shadowPrompt: string;
  integrationSuggestion: string;
  /** New 2026-04-25 — what waking attitude the dream is compensating
   *  for. Optional because older AI responses without the field still
   *  validate. */
  compensatoryMove?: string;
}

interface LocalReading {
  source: 'local';
  reading: DreamReading;
}

type Reading = AiReading | LocalReading;

/** The dream as the sheet's title: the first ~90 characters, cut at a word. */
function dreamTitle(text: string, max = 90): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${cut.slice(0, at > 40 ? at : max)}…`;
}

export function DreamInterpreterPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('input');
  const [dreamText, setDreamText] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const { tryConsume, EarnSheet, error: gateError } = useMoonstoneSpend('dream-interpret');
  /**
   * A press is being handled — from the moment it lands, through the
   * balance gate, until the request settles. The ref is set synchronously,
   * before anything is awaited, so a second tap that lands while the gate is
   * answering is ignored; the state disables the button and the text for
   * the same span. Without it a double tap passed the gate twice and the
   * server charged both requests (p8 R1).
   */
  const pressing = useRef(false);
  const [busy, setBusy] = useState(false);
  /** The server is still reading an earlier send of this same request; the page waits for it. */
  const [stillReading, setStillReading] = useState(false);
  /**
   * The request this page last sent and got no interpretation back for: its
   * id and its exact body. Sending the same body again is a retry of that
   * request — charged at most once, answered with the same interpretation —
   * so it goes out without the client gate (a charge that landed can leave
   * the balance under the price). A different dream is a new request.
   */
  const attempt = useRef<{ id: string; body: string } | null>(null);
  /** The dictionary reading stands in for an interpretation that may have been charged: Try again is free. */
  const [lostAnswer, setLostAnswer] = useState(false);
  /** The server answered this request once and can no longer show it (409 REQUEST_ALREADY_USED). */
  const [spent, setSpent] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** The symbol dictionary's reading. `lost`: the paid interpretation may have been charged. */
  const showDictionary = (lost: boolean) => {
    if (!lost) {
      // Refused before the debit (rate limit, readings paused): true.
      toast(
        t('dream.aiFallback', {
          defaultValue: 'The interpretation service didn’t answer, so this reading comes from the symbol dictionary instead. No Moonstones were taken.',
        }),
        'info',
      );
    }
    setLostAnswer(lost);
    setReading({ source: 'local', reading: interpretDream(dreamText) });
    setStage('result');
  };

  /** One press: the balance gate (for a new request), the request, and what came back. */
  const read = async () => {
    const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
    const body = {
      dreamText: dreamText.trim(),
      userContext: {
        zodiacSign,
        mbtiType: profile?.mbtiType ?? undefined,
        // The app's language, not the device's (P7 #49).
        locale: getLocale(),
      },
    };
    const signature = JSON.stringify(body);
    if (attempt.current?.body !== signature) {
      if (!(await tryConsume())) return;
      attempt.current = { id: crypto.randomUUID(), body: signature };
    }
    const requestId = attempt.current.id;
    setSpent(false);
    const res = await sendPaid(
      () => supabase.functions.invoke('ai-dream-interpret', { body: { ...body, requestId } }),
      { live: () => mounted.current, onStillReading: () => setStillReading(true) },
    );
    if (!res) return;
    setStillReading(false);

    if (!res.error) {
      // Unwrap { data, correlationId } envelope.
      const data = res.data as { data?: Omit<AiReading, 'source'> } | Omit<AiReading, 'source'> | null;
      const payload = (data as { data?: Omit<AiReading, 'source'> } | null)?.data ?? (data as Omit<AiReading, 'source'> | null);
      if (payload?.coreTheme) {
        attempt.current = null;
        setLostAnswer(false);
        setReading({ ...payload, source: 'ai' });
        setStage('result');
        return;
      }
    }

    const failure = res.error ? await paidFailureOf(res.error) : 'generic';
    console.warn('[Dream] AI interpretation failed:', failure, res.error);
    if (failure === 'spent') {
      // Answered once, and the answer can no longer be replayed: this id is
      // spent. Stay on the dream and say the next press is a new reading.
      attempt.current = null;
      setSpent(true);
      return;
    }
    if (failure === 'insufficient' || failure === 'soft-cap') {
      // Rejected before the debit. The gate opens the Earn sheet with the
      // balance or the reset time; if it now lets the reading through, the
      // balance moved in between and the dictionary stands in, free.
      attempt.current = null;
      if (await tryConsume()) showDictionary(false);
      return;
    }
    if (failedBeforeCharge(failure)) {
      attempt.current = null;
      showDictionary(false);
      return;
    }
    // No answer (network), or the server failed after it may have charged:
    // keep the request, so Try again is its free replay.
    showDictionary(true);
  };

  const interpret = async () => {
    // Re-entrancy is decided synchronously, before the gate is awaited.
    if (pressing.current) return;
    if (dreamText.trim().length < 20) {
      toast(
        t('dream.needLonger', {
          defaultValue: 'Please share a bit more about the dream (at least a few sentences).',
        }),
        'error',
      );
      return;
    }
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

  /** Try again from the dictionary reading: the same request, so a charge that landed is not taken twice. */
  const retry = () => {
    setStage('input');
    void interpret();
  };

  // The unanswered request is kept: the same dream sent again is still its
  // free retry, and any other dream does not match it and starts a new one.
  const reset = () => {
    setStage('input');
    setDreamText('');
    setReading(null);
    setLostAnswer(false);
    setSpent(false);
  };

  if (stage === 'input') {
    return (
      <Page spacing="md">
        <PageHeader
          icon={<Moon />}
          title={t('dream.title', { defaultValue: 'Dream Interpreter' })}
        />

        <Card variant="glow" padding="lg">
          <p className="reading-copy mb-4">
            {t('dream.intro', {
              defaultValue:
                'Describe your dream in as much detail as you remember. Don’t worry about order or clarity — the mind works in symbols. We’ll read it through a Jungian lens and offer you the core theme, the key symbols, and questions to sit with. Dreams don’t have single meanings; they have invitations.',
            })}
          </p>

          <label htmlFor="dream-text" className="block text-ui font-medium text-mystic-300 mb-2">
            {t('dream.label', { defaultValue: 'Tell me about your dream' })}
          </label>
          <textarea
            id="dream-text"
            value={dreamText}
            onChange={(e) => {
              setDreamText(e.target.value);
              // A changed dream is a new request: the spent notice was about the old one.
              setSpent(false);
            }}
            rows={8}
            disabled={busy}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-ui placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40 disabled:opacity-50"
            placeholder={t('dream.placeholder', {
              defaultValue:
                'I was standing by a dark ocean and couldn’t find my way home. A bird flew overhead carrying something in its beak…',
            }) as string}
          />
          <p className="reading-caption mt-2 italic">
            {t('dream.privacy', {
              defaultValue:
                'Your dream text is sent to the interpretation service and is not stored server-side. If offline, we fall back to a local symbol dictionary.',
            })}
          </p>
        </Card>

        {spent && (
          <div role="alert" className="flex items-start gap-3 rounded-card bg-mystic-850 border border-coral/30 p-4">
            <AlertCircle className="w-4 h-4 text-coral flex-shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-ui text-mystic-100">
                {t('dream.errorSpent', { defaultValue: 'This dream was already read once, and that reading can’t be shown again.' })}
              </p>
              <p className="text-meta text-mystic-400 mt-1">
                {t('dream.errorSpentNew', { defaultValue: 'Interpret my dream starts a new reading, charged as usual.' })}
              </p>
            </div>
          </div>
        )}
        <MoonstoneCostLine />
        {gateError && <p className="text-meta text-coral" role="alert">{gateError}</p>}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={interpret}
          disabled={busy}
          loading={busy}
        >
          {!busy && <Sparkles className="w-5 h-5" aria-hidden />}
          {busy
            ? stillReading
              ? t('dream.stillReading', { defaultValue: 'Still reading the dream…' })
              : t('dream.interpreting', { defaultValue: 'Reading the dream…' })
            : t('dream.interpret', { defaultValue: 'Interpret my dream' })}
        </Button>
        {EarnSheet}
      </Page>
    );
  }

  if (stage === 'result' && reading) {
    return reading.source === 'ai' ? (
      <AiResultView reading={reading} onReset={reset} dreamText={dreamText} />
    ) : (
      <LocalResultView
        reading={reading.reading}
        onReset={reset}
        dreamText={dreamText}
        onRetry={lostAnswer ? retry : undefined}
      />
    );
  }

  return null;
}

// ─── AI result view ──────────────────────────────────────────────
function AiResultView({
  reading,
  onReset,
  dreamText,
}: {
  reading: AiReading;
  onReset: () => void;
  dreamText: string;
}) {
  const { t } = useT('app');

  const handleShare = async () => {
    try {
      const blob = await renderShareCard({
        title:
          reading.symbols[0]?.text?.slice(0, 32) ??
          (t('dream.genericTitle', { defaultValue: 'Dream Reading' }) as string),
        subtitle: reading.emotionalTone,
        tagline: reading.coreTheme.slice(0, 180),
        affirmation: reading.integrationSuggestion,
        brand: t('share.brand.dream', { defaultValue: 'Dream interpreter' }) as string,
      });
      const out = await shareOrDownload(blob, 'arcana-dream-reading.png', 'My dream reading on Arcana');
      if (out === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } else if (out === 'failed') {
        toast(t('common:actions.shareFailed'), 'error');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  return (
    <Page spacing="sm">
      <PageHeader
        icon={<Moon />}
        title={t('dream.title', { defaultValue: 'Dream Interpreter' })}
      />

      <ResultSheet
        headingLevel="h2"
        glyph={<Moon />}
        eyebrow={t('dream.yourDreamLabel', { defaultValue: 'Your dream' })}
        title={dreamTitle(dreamText)}
        summaryHeading={t('dream.coreThemeLabel', { defaultValue: 'Core theme' })}
        summary={reading.coreTheme}
        disclaimer="ai"
      >
        <div className="space-y-7">
          {/* The tone is a phrase, so it reads as one; the archetypes are
              names, so they are the keyword pills (a sentence in a pill
              wrapped to two shouted lines). */}
          {reading.emotionalTone && (
            <div className="text-center space-y-1">
              <EyebrowLabel tone="ink">{t('dream.emotionalToneLabel', { defaultValue: 'Tone' })}</EyebrowLabel>
              <p className="reading-copy italic">{reading.emotionalTone}</p>
            </div>
          )}
          {reading.archetypes.length > 0 && (
            <div className="text-center space-y-2">
              <EyebrowLabel tone="ink">{t('dream.archetypesLabel', { defaultValue: 'Archetypes at work' })}</EyebrowLabel>
              <KeywordRow keywords={reading.archetypes} />
            </div>
          )}

          {reading.symbols.length > 0 && (
            <section className="space-y-6">
              <h3 className="heading-display-md heading-strong text-ink">
                {t('dream.symbolsLabel', { defaultValue: 'Key symbols' })}
              </h3>
              {reading.symbols.map((sym, i) => (
                <div key={i}>
                  <h4 className="font-display font-semibold text-title text-ink mb-1">{sym.text}</h4>
                  <p className="reading-copy">{sym.meaning}</p>
                  <p className="reading-meta mt-3 uppercase tracking-wider">
                    {t('dream.reflectionLabel', { defaultValue: 'Hold this question' })}
                  </p>
                  <blockquote className="reading-quote mt-1">{sym.reflection}</blockquote>
                </div>
              ))}
            </section>
          )}

          <section className="border-t border-paper-hairline pt-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-ink-rose" aria-hidden />
              <h3 className="heading-display-md heading-strong text-ink">
                {t('dream.shadowPromptLabel', { defaultValue: 'Shadow question' })}
              </h3>
            </div>
            <blockquote className="reading-quote">{reading.shadowPrompt}</blockquote>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <Feather className="w-4 h-4 text-ink-gold" aria-hidden />
              <h3 className="heading-display-md heading-strong text-ink">
                {t('dream.integrationLabel', { defaultValue: 'Integration practice' })}
              </h3>
            </div>
            <p className="reading-copy">{reading.integrationSuggestion}</p>
          </section>

          {/* Compensatory move — Jung's principle: dreams compensate for what
              the waking attitude is missing. */}
          {reading.compensatoryMove && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-ink-violet" aria-hidden />
                <h3 className="heading-display-md heading-strong text-ink">
                  {t('dream.compensatoryLabel', { defaultValue: 'What your waking self is missing' })}
                </h3>
              </div>
              <p className="reading-meta italic mb-2">
                {t('dream.compensatoryHint', {
                  defaultValue: 'Jung: dreams compensate for the conscious attitude. This is what the dream offers that you don’t already have.',
                })}
              </p>
              <p className="reading-copy">{reading.compensatoryMove}</p>
            </section>
          )}
        </div>
      </ResultSheet>

      {/* Subsystem matches: colors, numbers, directions detected in the
          dream text. Renders only if any matched. */}
      <DreamSubsystems dreamText={dreamText} t={t} />

      {/* Resources: cultural lore, lucid techniques, nightmare guidance.
          Always available so users have somewhere to go after the
          reading. */}
      <DreamResources t={t} />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" fullWidth onClick={handleShare}>
          <Share2 className="w-4 h-4" aria-hidden />
          {t('dream.share', { defaultValue: 'Share this interpretation' })}
        </Button>
        <Button variant="outline" fullWidth onClick={onReset}>
          {t('dream.another', { defaultValue: 'Interpret another dream' })}
        </Button>
      </div>
    </Page>
  );
}

// ─── Subsystem detection rendering ───────────────────────────────
function DreamSubsystems({ dreamText, t }: { dreamText: string; t: (k: string, o?: Record<string, unknown>) => unknown }) {
  const matches = useMemo(() => detectAll(dreamText), [dreamText]);
  const hasAny = matches.colors.length || matches.numbers.length || matches.directions.length;
  if (!hasAny) return null;

  return (
    <Section
      headingLevel="h3"
      spacing="sm"
      title={t('dream.symbolicLayersLabel', { defaultValue: 'Symbolic layers' }) as string}
      contentClassName="space-y-3"
    >
      {matches.colors.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-cosmic-violet-ink" aria-hidden />
            <h4 className="heading-display-md text-mystic-200">
              {t('dream.colorsLabel', { defaultValue: 'Colours present' }) as string}
            </h4>
          </div>
          <div className="space-y-4">
            {matches.colors.map((c, i) => (
              <div key={i}>
                <p className="text-ui font-medium text-mystic-100 mb-0.5">{c.color.color}</p>
                <div className="reading-copy">
                  <p>{c.color.meaning}</p>
                  <p><span className="text-cosmic-rose font-medium">{t('dream.shadowLabel', { defaultValue: 'Shadow:' }) as string}</span> {c.color.shadow}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {matches.numbers.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-4 h-4 text-gold" aria-hidden />
            <h4 className="heading-display-md text-mystic-200">
              {t('dream.numbersLabel', { defaultValue: 'Numbers present' }) as string}
            </h4>
          </div>
          <div className="space-y-4">
            {matches.numbers.map((n, i) => (
              <div key={i}>
                <p className="text-ui font-medium text-mystic-100 mb-0.5 tabular-nums">{n.number}</p>
                <p className="reading-copy">{n.meaning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {matches.directions.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-cosmic-blue-ink" aria-hidden />
            <h4 className="heading-display-md text-mystic-200">
              {t('dream.directionsLabel', { defaultValue: 'Directions of motion' }) as string}
            </h4>
          </div>
          <div className="space-y-4">
            {matches.directions.map((d, i) => (
              <div key={i}>
                <p className="text-ui font-medium text-mystic-100 mb-0.5">{d.entry.direction}</p>
                <p className="reading-copy">{d.entry.meaning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Section>
  );
}

// ─── Resources: cultural lore + lucid + nightmares ──────────────
function DreamResources({ t }: { t: (k: string, o?: Record<string, unknown>) => unknown }) {
  const [openSection, setOpenSection] = useState<'cultures' | 'lucid' | 'nightmares' | null>(null);
  return (
    <Section
      headingLevel="h3"
      spacing="sm"
      title={t('dream.resourcesLabel', { defaultValue: 'Going deeper' }) as string}
      contentClassName="space-y-3"
    >
      <Disclosure
        icon={<Globe />}
        label={t('dream.culturesLabel', { defaultValue: 'How different traditions read dreams' }) as string}
        open={openSection === 'cultures'}
        onOpenChange={(o) => setOpenSection(o ? 'cultures' : null)}
      >
        <div className="space-y-4">
          {CULTURAL_DREAM_LORE.map((c, i) => (
            <div key={i}>
              <p className="text-ui font-medium text-mystic-100 mb-0.5">{c.culture}</p>
              <p className="reading-copy">{c.flavour}</p>
            </div>
          ))}
        </div>
      </Disclosure>

      <Disclosure
        icon={<BookOpen />}
        label={t('dream.lucidLabel', { defaultValue: 'Lucid dreaming techniques' }) as string}
        open={openSection === 'lucid'}
        onOpenChange={(o) => setOpenSection(o ? 'lucid' : null)}
      >
        <div className="space-y-4">
          {LUCID_TECHNIQUES.map((tech, i) => (
            <div key={i}>
              <p className="text-ui font-medium text-mystic-100 mb-0.5">{tech.name} ({tech.acronym})</p>
              <div className="reading-copy">
                <p>{tech.description}</p>
                <ol className="list-decimal list-inside space-y-1 mt-4">
                  {tech.steps.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      </Disclosure>

      <Disclosure
        icon={<AlertTriangle />}
        label={t('dream.nightmaresLabel', { defaultValue: 'Working with nightmares' }) as string}
        open={openSection === 'nightmares'}
        onOpenChange={(o) => setOpenSection(o ? 'nightmares' : null)}
      >
        <div className="space-y-4">
          {NIGHTMARE_CATEGORIES.map((n, i) => (
            <div key={i}>
              <p className="text-ui font-medium text-mystic-100 mb-0.5">{n.category}</p>
              <div className="reading-copy">
                <p>{n.description}</p>
                <p className="italic">{n.approach}</p>
              </div>
            </div>
          ))}
        </div>
      </Disclosure>
    </Section>
  );
}

// ─── Local fallback view — the dictionary reading, on the same paper ─
function LocalResultView({
  reading,
  onReset,
  dreamText,
  onRetry,
}: {
  reading: DreamReading;
  onReset: () => void;
  dreamText: string;
  /** Set when the paid interpretation may have been charged and lost: Try again is its free replay. */
  onRetry?: () => void;
}) {
  const { t } = useT('app');

  const handleShare = async () => {
    try {
      const titleSymbol =
        reading.matchedSymbols[0]?.keyword ??
        (t('dream.genericTitle', { defaultValue: 'Dream Reading' }) as string);
      const affirmation =
        reading.reflections[0] ??
        t('dream.genericReflection', {
          defaultValue: 'Dreams bring messages — honour the question they leave with you.',
        });
      const blob = await renderShareCard({
        title: `Dream of ${String(titleSymbol)}`,
        subtitle: t('dream.archetypeLabel', { defaultValue: 'A dream symbol reading' }) as string,
        tagline: reading.coreTheme.replace(/\*\*/g, ''),
        affirmation: String(affirmation),
        brand: t('share.brand.dream', { defaultValue: 'Dream interpreter' }) as string,
      });
      const out = await shareOrDownload(blob, 'arcana-dream-reading.png', 'My dream reading on Arcana');
      if (out === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } else if (out === 'failed') {
        toast(t('common:actions.shareFailed'), 'error');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  // The dictionary marks its key phrases with **…**; render them as strong
  // (ink on paper) rather than injecting markup.
  const themeParts = reading.coreTheme.split(/\*\*(.+?)\*\*/g);
  const summary = reading.hasMatch
    ? undefined
    : (t('dream.noMatch', {
        defaultValue:
          'No immediately common archetypes surfaced in this dream text — but that does not mean it is silent. Often the most personal dreams use symbols unique to your life. Sit with the strongest image from the dream. Ask: what is it the opposite of? What in my life does it rhyme with?',
      }) as string);

  return (
    <Page spacing="sm">
      <PageHeader
        icon={<Moon />}
        title={t('dream.title', { defaultValue: 'Dream Interpreter' })}
      />

      {/* The answer was lost on the way back, or the server failed after it
          may have charged: never "No Moonstones were taken" here. Try again
          sends the same request, which the server charges at most once. */}
      {onRetry && (
        <div role="status" className="flex items-start gap-3 rounded-card bg-mystic-850 border border-mystic-700 p-4">
          <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-ui text-mystic-100">
              {t('dream.aiFallbackDictionary', {
                defaultValue: 'The interpretation service didn’t answer, so this reading comes from the symbol dictionary.',
              })}
            </p>
            <p className="text-meta text-mystic-400 mt-1">
              {t('dream.retryFree', {
                defaultValue: 'If you were charged for the full interpretation, Try again returns it at no extra cost.',
              })}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              <RefreshCw className="w-4 h-4" aria-hidden />
              {t('dream.tryAgain', { defaultValue: 'Try again' })}
            </Button>
          </div>
        </div>
      )}

      <ResultSheet
        headingLevel="h2"
        glyph={<Moon />}
        eyebrow={t('dream.yourDreamLabel', { defaultValue: 'Your dream' })}
        title={dreamTitle(dreamText)}
        summaryHeading={t('dream.yourDream', { defaultValue: 'What the symbols say' })}
        summary={summary}
        disclaimer="general"
      >
        <div className="space-y-7">
          {reading.hasMatch && (
            <section className="text-center">
              <h3 className="heading-display-md heading-strong text-ink">
                {t('dream.yourDream', { defaultValue: 'What the symbols say' })}
              </h3>
              <p className="reading-lede mx-auto mt-3">
                {themeParts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
              </p>
            </section>
          )}

          {reading.matchedSymbols.length > 0 && (
            <section className="space-y-6">
              <h3 className="heading-display-md heading-strong text-ink">
                {t('dream.symbolsLabel', { defaultValue: 'The symbols' })}
              </h3>
              {reading.matchedSymbols.map((match, i) => (
                <div key={i}>
                  <h4 className="font-display font-semibold text-title text-ink mb-1 capitalize">{match.keyword}</h4>
                  <p className="reading-copy">{match.symbol.meaning}</p>
                  <p className="reading-meta mt-3 uppercase tracking-wider">
                    {t('dream.reflectionLabel', { defaultValue: 'Hold this question' })}
                  </p>
                  <blockquote className="reading-quote mt-1">{match.symbol.reflection}</blockquote>
                </div>
              ))}
            </section>
          )}

          <section className="border-t border-paper-hairline pt-6">
            <h3 className="heading-display-md heading-strong text-ink mb-2">
              {t('dream.practiceLabel', { defaultValue: 'Dream practice' })}
            </h3>
            <p className="reading-copy">
              {t('dream.practiceBody', {
                defaultValue:
                  'Keep a notebook by your bed. Record dreams the moment you wake, before they fade. Over time, recurring symbols reveal the language your unconscious uses with you.',
              })}
            </p>
          </section>
        </div>
      </ResultSheet>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" fullWidth onClick={handleShare}>
          <Share2 className="w-4 h-4" aria-hidden />
          {t('dream.share', { defaultValue: 'Share this interpretation' })}
        </Button>
        <Button variant="outline" fullWidth onClick={onReset}>
          {t('dream.another', { defaultValue: 'Interpret another dream' })}
        </Button>
      </div>
    </Page>
  );
}

export default DreamInterpreterPage;
