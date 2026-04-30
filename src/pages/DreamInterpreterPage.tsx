import { useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, Moon, AlertTriangle, Palette, Hash, Compass, Globe, Eye, BookOpen } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
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

export function DreamInterpreterPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('input');
  const [dreamText, setDreamText] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const { tryConsume, refund, EarnSheet } = useMoonstoneSpend('dream-interpret');

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
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Moon className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('dream.title', { defaultValue: 'Dream Interpreter' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('dream.intro', {
              defaultValue:
                "Describe your dream in as much detail as you remember. Don't worry about order or clarity — the mind works in symbols. We'll read it through a Jungian lens and offer you the core theme, the key symbols, and questions to sit with. Dreams don't have single meanings; they have invitations.",
            })}
          </p>

          <label className="block text-sm text-mystic-400 mb-2">
            {t('dream.label', { defaultValue: 'Tell me about your dream' })}
          </label>
          <textarea
            value={dreamText}
            onChange={(e) => setDreamText(e.target.value)}
            rows={8}
            disabled={stage === 'loading'}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40 disabled:opacity-50"
            placeholder={t('dream.placeholder', {
              defaultValue:
                "I was standing by a dark ocean and couldn't find my way home. A bird flew overhead carrying something in its beak...",
            }) as string}
          />
          <p className="text-xs text-mystic-500 mt-2 italic">
            {t('dream.privacy', {
              defaultValue:
                'Your dream text is sent to the interpretation service and is not stored server-side. If offline, we fall back to a local symbol dictionary.',
            })}
          </p>
        </Card>

        <MoonstoneCostLine />
        <Button
          variant="primary"
          fullWidth
          onClick={interpret}
          disabled={stage === 'loading'}
          loading={stage === 'loading'}
          className="min-h-[56px]"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {stage === 'loading'
            ? t('dream.interpreting', { defaultValue: 'Reading the dream…' })
            : t('dream.interpret', { defaultValue: 'Interpret my dream' })}
        </Button>
        {EarnSheet}
      </div>
    );
  }

  if (stage === 'result' && reading) {
    return reading.source === 'ai' ? (
      <AiResultView reading={reading} onReset={reset} dreamText={dreamText} />
    ) : (
      <LocalResultView reading={reading.reading} onReset={reset} />
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
        brand: 'Arcana · Dream Interpreter',
      });
      const out = await shareOrDownload(blob, 'arcana-dream-reading.png', 'My dream reading on Arcana');
      if (out === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  const dreamPreview = dreamText.length > 120 ? `${dreamText.slice(0, 120)}…` : dreamText;

  return (
    <div className="space-y-4 pb-6">
      <button
        onClick={onReset}
        className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('dream.back', { defaultValue: 'Interpret another dream' })}
      </button>

      {/* Dream quote — shows users the text we read */}
      <Card padding="md" className="bg-mystic-800/40">
        <p className="text-[10px] uppercase tracking-widest text-mystic-500 mb-1">
          {t('dream.yourDreamLabel', { defaultValue: 'Your dream' })}
        </p>
        <p className="text-xs text-mystic-400 italic leading-relaxed">"{dreamPreview}"</p>
      </Card>

      {/* Core theme */}
      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-5 h-5 text-gold" />
          <h2 className="font-display text-xl text-mystic-100">
            {t('dream.coreThemeLabel', { defaultValue: 'Core theme' })}
          </h2>
        </div>
        <p className="text-mystic-300 text-sm leading-relaxed mb-3">{reading.coreTheme}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cosmic-violet/10 border border-cosmic-violet/30">
          <span className="text-[10px] uppercase tracking-widest text-cosmic-violet">
            {t('dream.emotionalToneLabel', { defaultValue: 'Tone' })}
          </span>
          <span className="text-xs text-mystic-200">{reading.emotionalTone}</span>
        </div>
      </Card>

      {/* Archetypes */}
      {reading.archetypes.length > 0 && (
        <Card padding="lg">
          <h3 className="font-medium text-cosmic-blue mb-3">
            {t('dream.archetypesLabel', { defaultValue: 'Archetypes at work' })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {reading.archetypes.map((arc) => (
              <span
                key={arc}
                className="px-3 py-1.5 rounded-full bg-cosmic-blue/10 border border-cosmic-blue/30 text-xs text-cosmic-blue font-medium"
              >
                {arc}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Symbols */}
      {reading.symbols.length > 0 && (
        <>
          <h3 className="font-display text-lg text-mystic-200 mt-6">
            {t('dream.symbolsLabel', { defaultValue: 'Key symbols' })}
          </h3>
          {reading.symbols.map((sym, i) => (
            <Card key={i} padding="lg">
              <h4 className="font-medium text-gold mb-2">{sym.text}</h4>
              <p className="text-mystic-300 text-sm leading-relaxed mb-3">{sym.meaning}</p>
              <div className="pt-3 border-t border-mystic-800/50">
                <p className="text-xs text-mystic-500 mb-1 uppercase tracking-wider">
                  {t('dream.reflectionLabel', { defaultValue: 'Hold this question' })}
                </p>
                <p className="text-mystic-200 italic text-sm">"{sym.reflection}"</p>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* Shadow prompt */}
      <Card padding="lg" className="bg-gradient-to-br from-pink-500/5 to-mystic-900 border-pink-500/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-pink-400" />
          <h3 className="font-medium text-pink-400">
            {t('dream.shadowPromptLabel', { defaultValue: 'Shadow question' })}
          </h3>
        </div>
        <p className="text-mystic-200 italic leading-relaxed">"{reading.shadowPrompt}"</p>
      </Card>

      {/* Integration suggestion */}
      <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
        <h3 className="font-medium text-gold mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {t('dream.integrationLabel', { defaultValue: 'Integration practice' })}
        </h3>
        <p className="text-mystic-200 text-sm leading-relaxed">{reading.integrationSuggestion}</p>
      </Card>

      {/* Compensatory move — Jung's principle: dreams compensate for what
          the waking attitude is missing. */}
      {reading.compensatoryMove && (
        <Card padding="lg" className="bg-gradient-to-br from-cosmic-violet/5 to-mystic-900 border-cosmic-violet/20">
          <h3 className="font-medium text-cosmic-violet mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {t('dream.compensatoryLabel', { defaultValue: 'What your waking self is missing' })}
          </h3>
          <p className="text-xs text-mystic-500 mb-2 italic">
            {t('dream.compensatoryHint', {
              defaultValue: 'Jung: dreams compensate for the conscious attitude. This is what the dream offers that you don\'t already have.',
            })}
          </p>
          <p className="text-mystic-200 text-sm leading-relaxed">{reading.compensatoryMove}</p>
        </Card>
      )}

      {/* Subsystem matches: colors, numbers, directions detected in the
          dream text. Renders only if any matched. */}
      <DreamSubsystems dreamText={dreamText} t={t} />

      {/* Resources: cultural lore, lucid techniques, nightmare guidance.
          Always available so users have somewhere to go after the
          reading. */}
      <DreamResources t={t} />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
          <Sparkles className="w-4 h-4 mr-2" />
          {t('quizzes.share.button', { defaultValue: 'Share' })}
        </Button>
        <Button variant="outline" fullWidth onClick={onReset} className="min-h-[48px]">
          {t('dream.another', { defaultValue: 'Another dream' })}
        </Button>
      </div>
    </div>
  );
}

// ─── Subsystem detection rendering ───────────────────────────────
function DreamSubsystems({ dreamText, t }: { dreamText: string; t: (k: string, o?: Record<string, unknown>) => unknown }) {
  const matches = useMemo(() => detectAll(dreamText), [dreamText]);
  const hasAny = matches.colors.length || matches.numbers.length || matches.directions.length;
  if (!hasAny) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-mystic-200 mt-2">
        {t('dream.symbolicLayersLabel', { defaultValue: 'Symbolic layers' }) as string}
      </h3>

      {matches.colors.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-3.5 h-3.5 text-cosmic-violet" />
            <h4 className="text-xs uppercase tracking-widest text-cosmic-violet">
              {t('dream.colorsLabel', { defaultValue: 'Colours present' }) as string}
            </h4>
          </div>
          <div className="space-y-2">
            {matches.colors.map((c, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-mystic-100 mb-0.5">{c.color.color}</p>
                <p className="text-mystic-300 leading-relaxed">{c.color.meaning}</p>
                <p className="text-pink-400 italic mt-1">Shadow: {c.color.shadow}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {matches.numbers.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="w-3.5 h-3.5 text-gold" />
            <h4 className="text-xs uppercase tracking-widest text-gold">
              {t('dream.numbersLabel', { defaultValue: 'Numbers present' }) as string}
            </h4>
          </div>
          <div className="space-y-2">
            {matches.numbers.map((n, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-mystic-100 mb-0.5">{n.number}</p>
                <p className="text-mystic-300 leading-relaxed">{n.meaning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {matches.directions.length > 0 && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-3.5 h-3.5 text-cosmic-blue" />
            <h4 className="text-xs uppercase tracking-widest text-cosmic-blue">
              {t('dream.directionsLabel', { defaultValue: 'Directions of motion' }) as string}
            </h4>
          </div>
          <div className="space-y-2">
            {matches.directions.map((d, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-mystic-100 mb-0.5">{d.entry.direction}</p>
                <p className="text-mystic-300 leading-relaxed">{d.entry.meaning}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Resources: cultural lore + lucid + nightmares ──────────────
function DreamResources({ t }: { t: (k: string, o?: Record<string, unknown>) => unknown }) {
  const [openSection, setOpenSection] = useState<'cultures' | 'lucid' | 'nightmares' | null>(null);
  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-mystic-200 mt-2">
        {t('dream.resourcesLabel', { defaultValue: 'Going deeper' }) as string}
      </h3>

      <Card padding="md">
        <button
          onClick={() => setOpenSection(openSection === 'cultures' ? null : 'cultures')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-mystic-300" />
            <span className="text-sm font-medium text-mystic-100">
              {t('dream.culturesLabel', { defaultValue: 'How different traditions read dreams' }) as string}
            </span>
          </div>
          <span className="text-gold">{openSection === 'cultures' ? '−' : '+'}</span>
        </button>
        {openSection === 'cultures' && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {CULTURAL_DREAM_LORE.map((c, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-gold mb-0.5">{c.culture}</p>
                <p className="text-mystic-300 leading-relaxed">{c.flavour}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <button
          onClick={() => setOpenSection(openSection === 'lucid' ? null : 'lucid')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-mystic-300" />
            <span className="text-sm font-medium text-mystic-100">
              {t('dream.lucidLabel', { defaultValue: 'Lucid dreaming techniques' }) as string}
            </span>
          </div>
          <span className="text-gold">{openSection === 'lucid' ? '−' : '+'}</span>
        </button>
        {openSection === 'lucid' && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {LUCID_TECHNIQUES.map((tech, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-cosmic-blue mb-0.5">{tech.name} ({tech.acronym})</p>
                <p className="text-mystic-300 leading-relaxed mb-1.5">{tech.description}</p>
                <ol className="list-decimal list-inside text-mystic-400 leading-relaxed space-y-0.5">
                  {tech.steps.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card padding="md">
        <button
          onClick={() => setOpenSection(openSection === 'nightmares' ? null : 'nightmares')}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-sm font-medium text-mystic-100">
              {t('dream.nightmaresLabel', { defaultValue: 'Working with nightmares' }) as string}
            </span>
          </div>
          <span className="text-gold">{openSection === 'nightmares' ? '−' : '+'}</span>
        </button>
        {openSection === 'nightmares' && (
          <div className="mt-3 space-y-3 animate-fade-in">
            {NIGHTMARE_CATEGORIES.map((n, i) => (
              <div key={i} className="text-xs">
                <p className="font-medium text-pink-400 mb-0.5">{n.category}</p>
                <p className="text-mystic-300 leading-relaxed mb-1.5">{n.description}</p>
                <p className="text-mystic-200 italic leading-relaxed">{n.approach}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Local fallback view (unchanged visual from original) ────────
function LocalResultView({ reading, onReset }: { reading: DreamReading; onReset: () => void }) {
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
        brand: 'Arcana · Dream Interpreter',
      });
      const out = await shareOrDownload(blob, 'arcana-dream-reading.png', 'My dream reading on Arcana');
      if (out === 'downloaded') {
        toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      }
    } catch {
      toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <button
        onClick={onReset}
        className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('dream.back', { defaultValue: 'Interpret another dream' })}
      </button>

      <Card variant="glow" padding="lg">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-5 h-5 text-gold" />
          <h2 className="font-display text-xl text-mystic-100">
            {t('dream.yourDream', { defaultValue: 'What the symbols say' })}
          </h2>
        </div>
        {reading.hasMatch ? (
          <p
            className="text-mystic-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: reading.coreTheme.replace(/\*\*(.+?)\*\*/g, '<span class="text-gold font-medium">$1</span>'),
            }}
          />
        ) : (
          <p className="text-mystic-300 text-sm leading-relaxed italic">
            {t('dream.noMatch', {
              defaultValue:
                'No immediately common archetypes surfaced in this dream text — but that does not mean it is silent. Often the most personal dreams use symbols unique to your life. Sit with the strongest image from the dream. Ask: what is it the opposite of? What in my life does it rhyme with?',
            })}
          </p>
        )}
      </Card>

      {reading.matchedSymbols.length > 0 && (
        <>
          <h3 className="font-display text-lg text-mystic-200 mt-6">
            {t('dream.symbolsLabel', { defaultValue: 'The symbols' })}
          </h3>
          {reading.matchedSymbols.map((match, i) => (
            <Card key={i} padding="lg">
              <h4 className="font-medium text-gold mb-2 capitalize">{match.keyword}</h4>
              <p className="text-mystic-300 text-sm leading-relaxed mb-3">{match.symbol.meaning}</p>
              <div className="pt-3 border-t border-mystic-800/50">
                <p className="text-xs text-mystic-500 mb-1 uppercase tracking-wider">
                  {t('dream.reflectionLabel', { defaultValue: 'Hold this question' })}
                </p>
                <p className="text-mystic-200 italic text-sm">"{match.symbol.reflection}"</p>
              </div>
            </Card>
          ))}
        </>
      )}

      <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
        <h3 className="font-medium text-gold mb-3">
          {t('dream.practiceLabel', { defaultValue: 'Dream practice' })}
        </h3>
        <p className="text-mystic-300 text-sm leading-relaxed">
          {t('dream.practiceBody', {
            defaultValue:
              'Keep a notebook by your bed. Record dreams the moment you wake, before they fade. Over time, recurring symbols reveal the language your unconscious uses with you.',
          })}
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
          <Sparkles className="w-4 h-4 mr-2" />
          {t('quizzes.share.button', { defaultValue: 'Share' })}
        </Button>
        <Button variant="outline" fullWidth onClick={onReset} className="min-h-[48px]">
          {t('dream.another', { defaultValue: 'Another dream' })}
        </Button>
      </div>
    </div>
  );
}

export default DreamInterpreterPage;
