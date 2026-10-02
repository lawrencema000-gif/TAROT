import { useState, useMemo } from 'react';
import { Sparkles, Moon, AlertTriangle, Palette, Hash, Compass, Globe, Eye, BookOpen, Feather, Share2 } from 'lucide-react';
import { Card, Button, toast, Page, PageHeader, Section, Disclosure, ResultSheet, KeywordRow, EyebrowLabel } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { interpretDream, type DreamReading } from '../data/dreamSymbols';
import { detectAll, CULTURAL_DREAM_LORE, LUCID_TECHNIQUES, NIGHTMARE_CATEGORIES } from '../data/dreamSubsystems';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { getZodiacSign } from '../utils/zodiac';
import { useMoonstoneSpend } from '../hooks/useMoonstoneSpend';
import { MoonstoneCostLine } from '../components/moonstones/MoonstoneCostLine';

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
 */

type Stage = 'input' | 'loading' | 'result';

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
  const { tryConsume, refund, EarnSheet, error: gateError } = useMoonstoneSpend('dream-interpret');

  const interpret = async () => {
    if (!dreamText.trim() || dreamText.trim().length < 20) {
      toast(
        t('dream.needLonger', {
          defaultValue: 'Please share a bit more about the dream (at least a few sentences).',
        }),
        'error',
      );
      return;
    }

    const ok = await tryConsume();
    if (!ok) return;

    setStage('loading');

    // Try the AI path first — richer interpretation, personalised.
    try {
      const zodiacSign = profile?.birthDate ? getZodiacSign(profile.birthDate) : undefined;
      const { data, error } = await supabase.functions.invoke('ai-dream-interpret', {
        body: {
          dreamText: dreamText.trim(),
          userContext: {
            zodiacSign,
            mbtiType: profile?.mbtiType ?? undefined,
            locale: navigator.language?.slice(0, 2) || undefined,
          },
        },
      });
      if (error) throw error;
      // Unwrap { data, correlationId } envelope.
      const payload = (data as { data?: Omit<AiReading, 'source'> })?.data ?? (data as Omit<AiReading, 'source'>);
      if (!payload || !payload.coreTheme) throw new Error('malformed');
      setReading({ ...payload, source: 'ai' });
      setStage('result');
      return;
    } catch (e) {
      // AI failed — refund the spend so the user isn't charged for the
      // local-dictionary fallback (a free feature). They still get a
      // reading, just one that doesn't justify the 50-Moonstone cost.
      await refund();
      console.warn('[Dream] AI interpretation failed, falling back to local dictionary:', e);
      toast(
        t('dream.aiFallback', {
          defaultValue: 'The interpretation service didn’t answer, so this reading comes from the symbol dictionary instead. No Moonstones were taken.',
        }),
        'info',
      );
    }

    const local = interpretDream(dreamText);
    setReading({ source: 'local', reading: local });
    setStage('result');
  };

  const reset = () => {
    setStage('input');
    setDreamText('');
    setReading(null);
  };

  if (stage === 'input' || stage === 'loading') {
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
            onChange={(e) => setDreamText(e.target.value)}
            rows={8}
            disabled={stage === 'loading'}
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

        <MoonstoneCostLine />
        {gateError && <p className="text-meta text-coral" role="alert">{gateError}</p>}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={interpret}
          disabled={stage === 'loading'}
          loading={stage === 'loading'}
        >
          {stage !== 'loading' && <Sparkles className="w-5 h-5" aria-hidden />}
          {stage === 'loading'
            ? t('dream.interpreting', { defaultValue: 'Reading the dream…' })
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
      <LocalResultView reading={reading.reading} onReset={reset} dreamText={dreamText} />
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

  const keywords = [reading.emotionalTone, ...reading.archetypes].filter(Boolean);

  return (
    <Page spacing="sm">
      <PageHeader
        icon={<Moon />}
        title={t('dream.title', { defaultValue: 'Dream Interpreter' })}
        onBack={onReset}
        backLabel={t('dream.back', { defaultValue: 'Interpret another dream' })}
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
          {/* Tone and archetypes as keyword pills: the surface decides their ink. */}
          {keywords.length > 0 && (
            <div className="text-center space-y-2">
              <EyebrowLabel tone="ink">
                {t('dream.emotionalToneLabel', { defaultValue: 'Tone' })}
                {reading.archetypes.length > 0 && <> · {t('dream.archetypesLabel', { defaultValue: 'Archetypes at work' })}</>}
              </EyebrowLabel>
              <KeywordRow keywords={keywords} />
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
function LocalResultView({ reading, onReset, dreamText }: { reading: DreamReading; onReset: () => void; dreamText: string }) {
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
        onBack={onReset}
        backLabel={t('dream.back', { defaultValue: 'Interpret another dream' })}
      />

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
