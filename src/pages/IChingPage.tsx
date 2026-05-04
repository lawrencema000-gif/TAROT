import { useState } from 'react';
import { ArrowLeft, Sparkles, Coins, RotateCcw } from 'lucide-react';
import { Card, Button, toast, OrnateDivider } from '../components/ui';
import { useT } from '../i18n/useT';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import { CoinToss, type CoinFace } from '../components/iching/CoinToss';
import {
  castReading,
  HEXAGRAMS,
  type CastResult,
} from '../data/ichingHexagrams';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'intro' | 'casting' | 'result';

export function IChingPage() {
  const { t } = useT('app');
  const [stage, setStage] = useState<Stage>('intro');
  const [question, setQuestion] = useState('');
  const [cast, setCast] = useState<CastResult | null>(null);
  const [animatingLine, setAnimatingLine] = useState(-1);
  const [tossActive, setTossActive] = useState(false);
  const [tossFaces, setTossFaces] = useState<[CoinFace, CoinFace, CoinFace]>(['heads', 'heads', 'heads']);

  const startCast = async () => {
    setStage('casting');
    setCast(null);

    // Six tosses — one per hexagram line. For each, randomize three coin
    // faces purely for the animation (the authoritative cast is computed
    // once at the end).
    for (let i = 0; i < 6; i++) {
      const faces: [CoinFace, CoinFace, CoinFace] = [
        Math.random() > 0.5 ? 'heads' : 'tails',
        Math.random() > 0.5 ? 'heads' : 'tails',
        Math.random() > 0.5 ? 'heads' : 'tails',
      ];
      setTossFaces(faces);
      setTossActive(false);
      // let React commit the reset before restarting the animation
      await new Promise((r) => setTimeout(r, 30));
      setTossActive(true);
      setAnimatingLine(i);
      await new Promise((r) => setTimeout(r, 820));
    }
    setTossActive(false);

    const finalCast = castReading();
    setCast(finalCast);
    setAnimatingLine(-1);
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
          <h1 className="heading-display-lg text-mystic-100">
            {t('iching.title', { defaultValue: 'I-Ching Oracle' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('iching.intro', {
              defaultValue:
                'The I-Ching — the Book of Changes — is the oldest divination system in the world. Hold a question in mind. Throw the coins six times. The hexagram that appears reflects the moving energies around your question.',
            })}
          </p>
          <label className="block text-sm text-mystic-400 mb-2">
            {t('iching.questionLabel', { defaultValue: 'Your question (optional)' })}
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
            placeholder={t('iching.questionPlaceholder', {
              defaultValue: 'What would be most helpful for me to understand right now?',
            }) as string}
          />
        </Card>

        <Button variant="primary" fullWidth onClick={startCast} className="min-h-[56px]">
          <Coins className="w-5 h-5 mr-2" />
          {t('iching.castButton', { defaultValue: 'Cast the coins' })}
        </Button>
      </div>
    );
  }

  if (stage === 'casting') {
    return (
      <div className="space-y-8 pb-6 flex flex-col items-center justify-center min-h-[60vh]">
        <h2 className="heading-display-lg text-gold-foil text-center">
          {t('iching.casting', { defaultValue: 'Casting the coins…' })}
        </h2>
        <div className="text-gold/60">
          <OrnateDivider width={120} />
        </div>

        {/* Actual three-coin toss animation, centered. Each of the six
            tosses retriggers the arc via a keyed remount + reset of the
            `active` prop. */}
        <CoinToss active={tossActive} results={tossFaces} duration={800} />

        <p className="text-mystic-400 text-xs tracking-widest uppercase">
          {t('iching.castingLine', {
            defaultValue: 'Line {{n}} of 6',
            n: Math.max(1, animatingLine + 1),
          })}
        </p>

        {/* Hexagram lines progress — lines fill from bottom up, as
            traditional for I-Ching hexagrams. */}
        <div className="flex flex-col-reverse gap-2 mt-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-28 h-2 rounded-full transition-all duration-500 ${
                animatingLine >= index
                  ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                  : 'bg-mystic-800'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (stage === 'result' && cast) {
    const primary = HEXAGRAMS[cast.primaryHexagram];
    const transformed = cast.transformedHexagram ? HEXAGRAMS[cast.transformedHexagram] : null;
    const hexagramKey = `iching.hexagrams.${primary.number}`;

    const localizedName = t(`${hexagramKey}.name`, { defaultValue: primary.name }) as string;
    const localizedTagline = t(`${hexagramKey}.tagline`, { defaultValue: primary.tagline }) as string;
    const localizedInterpretation = t(`${hexagramKey}.interpretation`, {
      defaultValue: primary.interpretation,
    }) as string;
    const localizedJudgement = t(`${hexagramKey}.judgement`, {
      defaultValue: primary.judgement,
    }) as string;
    const localizedJournal = t(`${hexagramKey}.journalPrompt`, {
      defaultValue: primary.journalPrompt,
    }) as string;
    const strengths = t(`${hexagramKey}.strengths`, {
      returnObjects: true,
      defaultValue: primary.strengths,
    }) as string[];
    const cautions = t(`${hexagramKey}.cautions`, {
      returnObjects: true,
      defaultValue: primary.cautions,
    }) as string[];

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: `${primary.symbol} ${localizedName}`,
          subtitle: `${t('iching.hexagramLabel', { defaultValue: 'Hexagram' })} ${primary.number}`,
          tagline: localizedTagline,
          affirmation: localizedJournal,
          brand: 'Arcana · I-Ching',
        });
        const out = await shareOrDownload(
          blob,
          `arcana-iching-${primary.number}.png`,
          `My I-Ching reading: ${localizedName}. ${localizedTagline}`,
        );
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
          onClick={reset}
          className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('iching.backToStart', { defaultValue: 'Cast again' })}
        </button>

        {question && (
          <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
            <p className="text-xs text-mystic-500 mb-1">
              {t('iching.yourQuestion', { defaultValue: 'Your question' })}
            </p>
            <p className="text-sm text-mystic-300 italic">"{question}"</p>
          </Card>
        )}

        <Card variant="glow" padding="lg" className="text-center">
          <div className="text-8xl mb-4">{primary.symbol}</div>
          <p className="text-sm text-gold/70 tracking-widest uppercase">
            {t('iching.hexagramLabel', { defaultValue: 'Hexagram' })} {primary.number}
          </p>
          <h2 className="heading-display-xl text-mystic-100 mt-2">{localizedName}</h2>
          <p className="text-mystic-500 text-sm mt-1">
            {primary.pinyin} · {primary.chinese}
          </p>
          <p className="text-gold/80 text-sm mt-3 italic">"{localizedTagline}"</p>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-gold mb-3">
            {t('iching.judgement', { defaultValue: 'The Judgement' })}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed italic">"{localizedJudgement}"</p>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-3">
            {t('iching.interpretation', { defaultValue: 'Interpretation' })}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed">{localizedInterpretation}</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-3">
              {t('iching.strengths', { defaultValue: 'Strengths' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>
          <Card padding="lg">
            <h3 className="font-medium text-pink-400 mb-3">
              {t('iching.cautions', { defaultValue: 'Cautions' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {cautions.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </Card>
        </div>

        {transformed && (
          <Card padding="lg" className="border-cosmic-blue/30">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-4 h-4 text-cosmic-blue" />
              <h3 className="font-medium text-cosmic-blue">
                {t('iching.transformsInto', { defaultValue: 'Transforms into' })}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-5xl">{transformed.symbol}</div>
              <div>
                <p className="text-mystic-200 font-display text-lg">
                  {t(`iching.hexagrams.${transformed.number}.name`, { defaultValue: transformed.name })}
                </p>
                <p className="text-mystic-500 text-xs italic mt-1">
                  {t(`iching.hexagrams.${transformed.number}.tagline`, {
                    defaultValue: transformed.tagline,
                  })}
                </p>
              </div>
            </div>
            <p className="text-xs text-mystic-500 mt-3">
              {t('iching.transformNote', {
                defaultValue:
                  'The changing lines show the energy moving toward this second hexagram — read as "where this situation is heading".',
              })}
            </p>
          </Card>
        )}

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('iching.journalPrompt', { defaultValue: 'Journal prompt' })}
          </h3>
          <p className="text-mystic-200 italic leading-relaxed">"{localizedJournal}"</p>
        </Card>

        <AskOracleButton
          variant="card"
          context={`hexagram ${primary.number} — ${primary.name} (${primary.chinese}) — for my situation`}
          label={t('iching.askOracleCta', { defaultValue: 'Read this hexagram for me' }) as string}
        />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('iching.castAgain', { defaultValue: 'Cast again' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default IChingPage;
