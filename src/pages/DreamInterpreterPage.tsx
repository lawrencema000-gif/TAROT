import { useState } from 'react';
import { ArrowLeft, Sparkles, Moon } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { interpretDream, type DreamReading } from '../data/dreamSymbols';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'input' | 'result';

export function DreamInterpreterPage() {
  const { t } = useT('app');
  const [stage, setStage] = useState<Stage>('input');
  const [dreamText, setDreamText] = useState('');
  const [reading, setReading] = useState<DreamReading | null>(null);

  const interpret = () => {
    if (!dreamText.trim() || dreamText.trim().length < 20) {
      toast(t('dream.needLonger', { defaultValue: 'Please share a bit more about the dream (at least a few sentences).' }), 'error');
      return;
    }
    const r = interpretDream(dreamText);
    setReading(r);
    setStage('result');
  };

  const reset = () => {
    setStage('input');
    setDreamText('');
    setReading(null);
  };

  if (stage === 'input') {
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
                'Describe your dream in as much detail as you remember. Don\'t worry about order or clarity — the mind works in symbols. We\'ll match archetypal patterns and offer reflective questions to sit with. Dreams don\'t have single meanings; they have invitations.',
            })}
          </p>

          <label className="block text-sm text-mystic-400 mb-2">
            {t('dream.label', { defaultValue: 'Tell me about your dream' })}
          </label>
          <textarea
            value={dreamText}
            onChange={(e) => setDreamText(e.target.value)}
            rows={8}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
            placeholder={t('dream.placeholder', {
              defaultValue:
                'I was standing by a dark ocean and couldn\'t find my way home. A bird flew overhead carrying something in its beak...',
            }) as string}
          />
          <p className="text-xs text-mystic-500 mt-2 italic">
            {t('dream.privacy', {
              defaultValue: 'Your dream text is not saved. It is analysed locally on your device.',
            })}
          </p>
        </Card>

        <Button variant="primary" fullWidth onClick={interpret} className="min-h-[56px]">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('dream.interpret', { defaultValue: 'Interpret my dream' })}
        </Button>
      </div>
    );
  }

  if (stage === 'result' && reading) {
    const handleShare = async () => {
      try {
        const titleSymbol = reading.matchedSymbols[0]?.keyword ?? t('dream.genericTitle', { defaultValue: 'Dream Reading' });
        const affirmation = reading.reflections[0] ?? t('dream.genericReflection', { defaultValue: 'Dreams bring messages — honour the question they leave with you.' });
        const blob = await renderShareCard({
          title: `Dream of ${String(titleSymbol)}`,
          subtitle: t('dream.archetypeLabel', { defaultValue: 'A dream symbol reading' }) as string,
          tagline: reading.coreTheme.replace(/\*\*/g, ''),
          affirmation: String(affirmation),
          brand: 'Arcana · Dream Interpreter',
        });
        const out = await shareOrDownload(blob, 'arcana-dream-reading.png', 'My dream reading on Arcana');
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <div className="space-y-4 pb-6">
        <button
          onClick={reset}
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
          <p className="text-mystic-300 text-sm leading-relaxed mb-2">
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
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('dream.another', { defaultValue: 'Another dream' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default DreamInterpreterPage;
