import { useState } from 'react';
import { ArrowLeft, Sparkles, RotateCcw } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import { castRunes, type RuneCastResult } from '../data/runes';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'intro' | 'casting' | 'result';

export function RunesPage() {
  const { t } = useT('app');
  const [stage, setStage] = useState<Stage>('intro');
  const [question, setQuestion] = useState('');
  const [cast, setCast] = useState<RuneCastResult | null>(null);

  const startCast = async () => {
    setStage('casting');
    setCast(null);
    await new Promise((r) => setTimeout(r, 1200));
    setCast(castRunes());
    setStage('result');
  };

  const reset = () => {
    setStage('intro');
    setQuestion('');
    setCast(null);
  };

  if (stage === 'intro') {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('runes.title', { defaultValue: 'Runes' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('runes.intro', {
              defaultValue:
                'The Elder Futhark — 24 staves carved with the oldest written wisdom of Northern Europe. Hold a question in mind. Three runes fall: past, present, future. Some may appear reversed (merkstave), softening or turning their meaning.',
            })}
          </p>
          <label className="block text-sm text-mystic-400 mb-2">
            {t('runes.questionLabel', { defaultValue: 'Your question (optional)' })}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
            placeholder={t('runes.questionPlaceholder', {
              defaultValue: 'What do I most need to understand right now?',
            }) as string}
          />
        </Card>

        <Button variant="primary" fullWidth onClick={startCast} className="min-h-[56px]">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('runes.castButton', { defaultValue: 'Cast the runes' })}
        </Button>
      </div>
    );
  }

  if (stage === 'casting') {
    return (
      <div className="space-y-6 pb-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Sparkles className="w-10 h-10 text-gold animate-pulse" />
        <p className="text-mystic-200 text-lg font-display text-center">
          {t('runes.casting', { defaultValue: 'Casting...' })}
        </p>
      </div>
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
          brand: 'Arcana · Runes',
        });
        const out = await shareOrDownload(blob, 'arcana-runes.png', 'My rune cast');
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <div className="space-y-4 pb-6">
        <button onClick={reset} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('runes.back', { defaultValue: 'Cast again' })}
        </button>

        {question && (
          <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
            <p className="text-xs text-mystic-500 mb-1">
              {t('runes.yourQuestion', { defaultValue: 'Your question' })}
            </p>
            <p className="text-sm text-mystic-300 italic">"{question}"</p>
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
                <p className="text-[10px] text-mystic-500 uppercase tracking-widest mt-1">
                  {positionLabels[r.position]}
                </p>
                <p className="text-sm text-mystic-200 font-medium mt-1">{r.rune.name}</p>
                {r.reversed && (
                  <div className="inline-flex items-center gap-1 text-[10px] text-pink-400 mt-1">
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
                <p className="text-xs text-mystic-500 uppercase tracking-widest">{positionLabels[r.position]}</p>
                <h3 className="font-display text-xl text-mystic-100">{r.rune.name}</h3>
                <p className="text-xs text-mystic-500 italic mt-1">{r.rune.element}</p>
              </div>
            </div>
            <p className="text-sm text-gold/80 italic mb-2">
              {r.reversed && r.rune.reversed
                ? r.rune.reversed
                : r.rune.upright}
            </p>
            <p className="text-mystic-300 text-sm leading-relaxed mb-3">{r.rune.interpretation}</p>
            <div className="pt-3 border-t border-mystic-800/50">
              <p className="text-[10px] text-mystic-500 uppercase tracking-wider mb-1">
                {t('runes.promptLabel', { defaultValue: 'Journal prompt' })}
              </p>
              <p className="text-mystic-200 italic text-sm">"{r.rune.prompt}"</p>
            </div>
          </Card>
        ))}

        <AskOracleButton
          variant="card"
          context={`my rune cast — ${cast.runes.map((r) => `${r.rune.name}${r.reversed ? ' (reversed)' : ''} in ${r.position}`).join(', ')}`}
          label={t('runes.askOracleCta', { defaultValue: 'Read the cast as a whole' }) as string}
        />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('runes.castAgain', { defaultValue: 'Cast again' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default RunesPage;
