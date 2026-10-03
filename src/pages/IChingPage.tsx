import { useState, lazy, Suspense } from 'react';
import { BookOpen, Coins, RotateCcw, Share2 } from 'lucide-react';
import { Card, Button, toast, SectionDivider, Page, PageHeader, Section, ResultSheet, EyebrowLabel, ReadingProse } from '../components/ui';
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
import { tArray } from '../utils/tArray';

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
        <PageHeader title={t('iching.title', { defaultValue: 'I-Ching Oracle' })} icon={<BookOpen />} />
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
            <label htmlFor="iching-question" className="block text-ui font-medium text-mystic-300 mb-2">
              {t('iching.questionLabel', { defaultValue: 'Your question (optional)' })}
            </label>
            <textarea
              id="iching-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-ui placeholder-mystic-600 resize-none focus:outline-none focus:border-gold/40"
              placeholder={t('iching.questionPlaceholder', {
                defaultValue: 'What would be most helpful for me to understand right now?',
              }) as string}
              />
          </Card>
        </Section>

        <Button variant="primary" size="lg" fullWidth onClick={startCast}>
          <Coins className="w-5 h-5" aria-hidden />
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

        <p className="text-meta text-mystic-400 tracking-widest uppercase tabular-nums" role="status">
          {t('iching.castingLine', {
            defaultValue: 'Line {{n}} of 6',
            n: Math.max(1, animatingLine + 1),
          })}
        </p>

        {/* Hexagram lines progress — lines fill from bottom up, as
            traditional for I-Ching hexagrams. Fill, not gradient. */}
        <div className="flex flex-col-reverse gap-2 mt-2" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={`w-28 h-2 rounded-full transition-colors duration-deliberate ${
                animatingLine >= index ? 'bg-gold' : 'bg-mystic-800'
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
    const hexagramLabel = t('iching.hexagramLabel', { defaultValue: 'Hexagram' }) as string;

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
    const strengths = tArray(t, `${hexagramKey}.strengths`, primary.strengths);
    const cautions = tArray(t, `${hexagramKey}.cautions`, primary.cautions);

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: localizedName,
          subtitle: `${hexagramLabel} ${primary.number}`,
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
        {/* No back link of its own: the Readings tab above already offers
            "All systems", and "Cast again" closes the reading below. Two
            stacked back links read as a broken header. */}
        {/* The reading, on paper: glyph → "Hexagram 23" → the name → ✦✦✦ →
            pinyin · 漢字 over the tagline → judgement, interpretation,
            strengths, cautions, the changing hexagram, the journal prompt. */}
        <ResultSheet
          glyph={<HexagramGlyph number={primary.number} size={28} label={`${hexagramLabel} ${primary.number}`} />}
          eyebrow={question ? t('iching.yourQuestion', { defaultValue: 'Your question' }) as string : `${hexagramLabel} ${primary.number}`}
          title={question ? question : localizedName}
          summaryHeading={question ? `${localizedName} · ${primary.pinyin} · ${primary.chinese}` : `${primary.pinyin} · ${primary.chinese}`}
          summary={localizedTagline}
          disclaimer="general"
        >
          <div className="space-y-7">
            {question && (
              <p className="reading-meta text-center">{`${hexagramLabel} ${primary.number}`}</p>
            )}

            <section>
              <EyebrowLabel tone="ink" align="left" className="block">{t('iching.judgement', { defaultValue: 'The Judgement' })}</EyebrowLabel>
              <blockquote className="reading-quote mt-2">{localizedJudgement}</blockquote>
            </section>

            <section>
              <h3 className="heading-display-md heading-strong text-ink mb-2">
                {t('iching.interpretation', { defaultValue: 'Interpretation' })}
              </h3>
              <ReadingProse text={localizedInterpretation} lede={false} />
            </section>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <section>
                <h3 className="heading-display-md heading-strong text-ink mb-2">
                  {t('iching.strengths', { defaultValue: 'Strengths' })}
                </h3>
                <ul className="reading-copy list-disc pl-5 space-y-1.5">
                  {strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="heading-display-md heading-strong text-ink mb-2">
                  {t('iching.cautions', { defaultValue: 'Cautions' })}
                </h3>
                <ul className="reading-copy list-disc pl-5 space-y-1.5">
                  {cautions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </section>
            </div>

            {transformed && (
              <section className="border-t border-paper-hairline pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <RotateCcw className="w-4 h-4 text-ink-blue" aria-hidden />
                  <h3 className="heading-display-md heading-strong text-ink">
                    {t('iching.transformsInto', { defaultValue: 'Transforms into' })}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <HexagramGlyph number={transformed.number} size={44} className="text-ink-blue shrink-0" label={`${hexagramLabel} ${transformed.number}`} />
                  <div>
                    <p className="text-ink font-display font-semibold text-title">
                      {t(`iching.hexagrams.${transformed.number}.name`, { defaultValue: transformed.name })}
                    </p>
                    <p className="reading-meta italic mt-1">
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
              </section>
            )}

            <section className="border-t border-paper-hairline pt-6">
              <EyebrowLabel tone="ink" align="left" className="block">{t('iching.journalPrompt', { defaultValue: 'Journal prompt' })}</EyebrowLabel>
              <blockquote className="reading-quote mt-2">{localizedJournal}</blockquote>
            </section>
          </div>
        </ResultSheet>

        <div className="space-y-3 pt-2">
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
              <Share2 className="w-4 h-4" aria-hidden />
              {t('iching.share', { defaultValue: 'Share this hexagram' })}
            </Button>
            <Button variant="outline" fullWidth onClick={reset}>
              {t('iching.castAgain', { defaultValue: 'Cast again' })}
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  return null;
}

export default IChingPage;
