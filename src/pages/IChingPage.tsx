import { useState, lazy, Suspense } from 'react';
import { ArrowLeft, BookOpen, Coins, RotateCcw, Feather, Share2 } from 'lucide-react';
import { Card, Button, toast, SectionDivider, Page, PageHeader, ResultLayout, Section } from '../components/ui';
import { useT } from '../i18n/useT';
import { AskOracleButton } from '../components/oracle/AskOracleButton';
import { CoinToss, type CoinFace } from '../components/iching/CoinToss';
import {
  castReading,
  HEXAGRAMS,
  LINES_TO_HEXAGRAM,
  type CastResult,
} from '../data/ichingHexagrams';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'intro' | 'casting' | 'result';

const LiuYaoPanel = lazy(() => import('../components/iching/LiuYaoPanel').then(m => ({ default: m.LiuYaoPanel })));

// Hexagram number -> six-line pattern (bottom to top, '1' yang / '0' yin),
// inverted from the cast lookup so the glyph is drawn rather than typed:
// U+4DC0-4DFF is missing from most Android fonts and shows as a tofu box.
const HEXAGRAM_LINES: Record<number, string> = {};
for (const [pattern, n] of Object.entries(LINES_TO_HEXAGRAM)) HEXAGRAM_LINES[n] = pattern;

function HexagramGlyph({
  number,
  label,
  size = 56,
  className = '',
}: { number: number; label: string; size?: number; className?: string }) {
  const rows = (HEXAGRAM_LINES[number] ?? '').split('').reverse(); // top line first
  const stroke = Math.max(2, Math.round(size / 14));
  const gap = (size - 6 * stroke) / 5;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={label}>
      {rows.map((line, i) => {
        const y = i * (stroke + gap);
        return line === '1' ? (
          <rect key={i} x={0} y={y} width={size} height={stroke} rx={stroke / 2} fill="currentColor" />
        ) : (
          <g key={i}>
            <rect x={0} y={y} width={size * 0.42} height={stroke} rx={stroke / 2} fill="currentColor" />
            <rect x={size * 0.58} y={y} width={size * 0.42} height={stroke} rx={stroke / 2} fill="currentColor" />
          </g>
        );
      })}
    </svg>
  );
}


export function IChingPage() {
  const { t } = useT('app');
  const [stage, setStage] = useState<Stage>('intro');
  const [question, setQuestion] = useState('');
  const [cast, setCast] = useState<CastResult | null>(null);
  const [animatingLine, setAnimatingLine] = useState(-1);
  const [tossActive, setTossActive] = useState(false);
  const [showLiuYao, setShowLiuYao] = useState(false);
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
    setShowLiuYao(false);
  };

  if (stage === 'intro') {
    return (
      <Page spacing="md">
        <PageHeader title={t('iching.title', { defaultValue: 'I-Ching Oracle' })} icon={<BookOpen className="w-6 h-6 text-gold" />} />
        <Section
          spacing="lg"
        >
          <Card variant="glow" padding="lg">
            <p className="reading-copy mb-4">
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
              className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-sm placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
              placeholder={t('iching.questionPlaceholder', {
                defaultValue: 'What would be most helpful for me to understand right now?',
              }) as string}
              />
          </Card>
        </Section>

        <Button variant="primary" size="lg" fullWidth onClick={startCast}>
          <Coins className="w-5 h-5 mr-2" />
          {t('iching.castButton', { defaultValue: 'Cast the coins' })}
        </Button>
      </Page>
    );
  }

  if (stage === 'casting') {
    return (
      <Page spacing="lg" className="flex flex-col items-center justify-center min-h-[60vh]">
        <PageHeader
          as="h1"
          align="center"
          title={t('iching.casting', { defaultValue: 'Casting the coins…' })}
        />
        <SectionDivider tone="gold" width="w-32" />

        {/* Actual three-coin toss animation, centered. Each of the six
            tosses retriggers the arc via a keyed remount + reset of the
            `active` prop. */}
        <CoinToss active={tossActive} results={tossFaces} duration={800} />

        <p className="text-meta text-mystic-400 tracking-widest uppercase">
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
              className={`w-28 h-2 rounded-full transition-colors duration-deliberate ${
                animatingLine >= index
                  ? 'bg-gradient-to-r from-gold-dark via-gold to-gold-light'
                  : 'bg-mystic-800'
              }`}
            />
          ))}
        </div>
      </Page>
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
          title: localizedName,
          subtitle: `${t('iching.hexagramLabel', { defaultValue: 'Hexagram' })} ${primary.number}`,
          tagline: localizedTagline,
          affirmation: localizedJournal,
          brand: t('share.brand.iching', { defaultValue: 'I-Ching' }) as string,
        });
        const out = await shareOrDownload(
          blob,
          `arcana-iching-${primary.number}.png`,
          `My I-Ching reading: ${localizedName}. ${localizedTagline}`,
        );
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
        <button
          onClick={reset}
          className="flex items-center gap-2 min-h-[44px] text-mystic-400 hover:text-mystic-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('iching.backToStart', { defaultValue: 'Cast again' })}
        </button>

        {question && (
          <Card padding="md" className="bg-mystic-800/30 border-mystic-700/30">
            <p className="text-meta text-mystic-400 mb-1">
              {t('iching.yourQuestion', { defaultValue: 'Your question' })}
            </p>
            <p className="reading-copy italic">"{question}"</p>
          </Card>
        )}

        <ResultLayout
          glyph={<HexagramGlyph number={primary.number} size={56} label={`${t('iching.hexagramLabel', { defaultValue: 'Hexagram' })} ${primary.number}`} />}
          eyebrow={`${t('iching.hexagramLabel', { defaultValue: 'Hexagram' })} ${primary.number}`}
          verdict={localizedName}
          subtitle={`${primary.pinyin} · ${primary.chinese}`}
          summary={`"${localizedTagline}"`}
          detailLabel={t('iching.readFullReading', { defaultValue: 'Read the full reading' }) as string}
          // Open by default: the judgement, interpretation and cautions WERE
          // the page before this refactor. ResultLayout leads with the verdict,
          // which is the improvement; it should not also bury the reading.
          defaultDetailOpen
          footer={
            <>
              <AskOracleButton
                variant="card"
                context={`hexagram ${primary.number} — ${primary.name} (${primary.chinese}) — for my situation`}
                label={t('iching.askOracleCta', { defaultValue: 'Read this hexagram for me' }) as string}
              />

              {/* 六爻 — the same cast read as a diagnostic instrument. Opt-in and
                  lazily loaded: most readers want the wisdom text, and the 納甲 tables
                  are a large chunk nobody should pay for unless they ask. */}
              {showLiuYao ? (
                <Suspense fallback={null}>
                  <LiuYaoPanel lineValues={cast.lines} />
                </Suspense>
              ) : (
                <Button variant="outline" fullWidth onClick={() => setShowLiuYao(true)}>
                  {t('iching.readAsLiuYao', { defaultValue: 'Read this cast as 六爻' })}
                </Button>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" fullWidth onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  {t('iching.share', { defaultValue: 'Share this hexagram' })}
                </Button>
                <Button variant="outline" fullWidth onClick={reset}>
                  {t('iching.castAgain', { defaultValue: 'Cast again' })}
                </Button>
              </div>
            </>
          }
        >
          <Section headingLevel="h3" spacing="sm" title={t('iching.judgement', { defaultValue: 'The Judgement' })}>
            <p className="reading-copy italic">"{localizedJudgement}"</p>
          </Section>

          <Section headingLevel="h3" spacing="sm" title={t('iching.interpretation', { defaultValue: 'Interpretation' })}>
            <p className="reading-copy">{localizedInterpretation}</p>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card padding="lg">
              <h3 className="heading-display-md text-mystic-100 mb-3">
                {t('iching.strengths', { defaultValue: 'Strengths' })}
              </h3>
              <ul className="reading-copy space-y-2">
                {strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </Card>
            <Card padding="lg">
              <h3 className="heading-display-md text-mystic-100 mb-3">
                {t('iching.cautions', { defaultValue: 'Cautions' })}
              </h3>
              <ul className="reading-copy space-y-2">
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
                <h3 className="heading-display-md text-mystic-100">
                  {t('iching.transformsInto', { defaultValue: 'Transforms into' })}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <HexagramGlyph number={transformed.number} size={44} className="text-cosmic-blue shrink-0" label={`${t('iching.hexagramLabel', { defaultValue: 'Hexagram' })} ${transformed.number}`} />
                <div>
                  <p className="text-mystic-200 font-display text-lg">
                    {t(`iching.hexagrams.${transformed.number}.name`, { defaultValue: transformed.name })}
                  </p>
                  <p className="text-meta text-mystic-400 italic mt-1">
                    {t(`iching.hexagrams.${transformed.number}.tagline`, {
                      defaultValue: transformed.tagline,
                    })}
                  </p>
                </div>
              </div>
              <p className="reading-copy mt-3">
                {t('iching.transformNote', {
                  defaultValue:
                    'The changing lines show the energy moving toward this second hexagram — read as "where this situation is heading".',
                })}
              </p>
            </Card>
          )}

          <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
            <h3 className="heading-display-md text-mystic-100 mb-3 flex items-center gap-2">
              <Feather className="w-4 h-4 text-gold" />
              {t('iching.journalPrompt', { defaultValue: 'Journal prompt' })}
            </h3>
            <p className="reading-copy italic">"{localizedJournal}"</p>
          </Card>
        </ResultLayout>
      </Page>
    );
  }

  return null;
}

export default IChingPage;
