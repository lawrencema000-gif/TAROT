import { useState, useEffect, useMemo, memo } from 'react';
import { Calendar, Clock, Lock, Crown, Compass, Palette, Share2, ArrowLeft } from 'lucide-react';
import { Card, Button, Input, toast, Page, PageHeader, Progress, Section, ResultSheet, AffirmationPanel } from '../components/ui';
import { HoroscopeWheelIcon } from '../components/ui/NavIcons';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
import { PaywallSheet } from '../components/premium/PaywallSheet';
import {
  computeBazi,
  deepenBazi,
  todaysLuckyColor,
  DAY_MASTER_INFO,
  TEN_GOD_INFO,
  ELEMENT_PRODUCES,
  ELEMENT_CONTROLS,
  type BaziResult,
  type FiveElement,
} from '../data/bazi';
import { computeBaziDeep, type Gender as BaziGender } from '../data/baziDeep';
import { LuckPillarTimeline } from '../components/charts/LuckPillarTimeline';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';
import { tArray } from '../utils/tArray';
import { BaziAIReadingPanel } from '../components/bazi/BaziAIReading';
import { determineStructure, STRUCTURE_MEANINGS, STRUCTURE_INTRO } from '../data/baziStructure';

type Stage = 'input' | 'result';

/**
 * The five elements on the token palette. One map, exported so every Bazi
 * surface colours an element the same way: wood grows (teal), fire burns
 * (coral), earth is the gold ground, metal is ink, water the cool blue.
 */
export const ELEMENT_COLOR: Record<FiveElement, string> = {
  wood: 'text-teal',
  fire: 'text-coral',
  earth: 'text-gold',
  metal: 'text-mystic-300',
  water: 'text-cosmic-blue',
};

/**
 * The five elements, drawn: a branch with two leaves, a flame, a mountain,
 * an ingot, a wave. Line art in currentColor on the 24-unit grid the planet
 * icons use, so a pillar reads as one set of marks rather than five platform
 * emoji in five colours.
 */
export const ElementGlyph = memo(function ElementGlyph({
  element,
  size = 20,
  className = '',
}: { element: FiveElement; size?: number; className?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: false,
  };
  switch (element) {
    case 'wood':
      return (
        <svg {...common}>
          <path d="M12 21 V8" />
          <path d="M12 13 C 8 13, 6 10, 6 6 C 10 6, 12 8, 12 13 Z" />
          <path d="M12 10 C 16 10, 18 7, 18 3 C 14 3, 12 5, 12 10 Z" />
        </svg>
      );
    case 'fire':
      return (
        <svg {...common}>
          <path d="M12 3 C 13 7, 17 8, 17 13 A 5 5 0 0 1 7 13 C 7 10, 9 9, 9.5 7 C 10.5 8.5, 11.5 9, 12 10 C 12.5 8, 12 5, 12 3 Z" />
        </svg>
      );
    case 'earth':
      return (
        <svg {...common}>
          <path d="M3 19 L 9.5 8 L 13 13.5 L 15.5 10 L 21 19 Z" />
          <path d="M3 19 H 21" />
        </svg>
      );
    case 'metal':
      return (
        <svg {...common}>
          <path d="M7 9 H 17 L 20 17 H 4 Z" />
          <path d="M9.5 9 L 12 5 L 14.5 9" />
        </svg>
      );
    case 'water':
      return (
        <svg {...common}>
          <path d="M3 10 C 5 8, 7 8, 9 10 C 11 12, 13 12, 15 10 C 17 8, 19 8, 21 10" />
          <path d="M3 15 C 5 13, 7 13, 9 15 C 11 17, 13 17, 15 15 C 17 13, 19 13, 21 15" />
        </svg>
      );
    default:
      return null;
  }
});

export function BaziPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [showPaywall, setShowPaywall] = useState(false);
  const depthEnabled = useFeatureFlag('bazi-depth');
  const [stage, setStage] = useState<Stage>('input');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [gender, setGender] = useState<BaziGender | ''>('');
  const [result, setResult] = useState<BaziResult | null>(null);
  const isPremium = profile?.isPremium === true;
  const showDepth = depthEnabled; // content rendered; premium gates the deep layers
  const deepening = useMemo(() => (result ? deepenBazi(result) : null), [result]);
  const luckyColor = useMemo(() => (result ? todaysLuckyColor(result) : null), [result]);
  // 格局 — the chart's organising principle, read from the month command. A
  // traditional reader names this before saying anything else, so it sits high
  // on the page rather than among the deep layers.
  const structure = useMemo(() => (result ? determineStructure(result) : null), [result]);
  // Phase-2 deep mode (luck pillars / annual luck / spirit stars / branch
  // relations / climate / life-area summaries / pillar narratives) only
  // computes when gender is provided since luck-pillar direction depends
  // on year polarity x gender.
  const deepResult = useMemo(
    () => (result && gender ? computeBaziDeep(result, birthDate, gender, birthTime) : null),
    [result, gender, birthDate, birthTime],
  );

  useEffect(() => {
    if (profile?.birthDate) setBirthDate(profile.birthDate);
    if (profile?.birthTime) setBirthTime(profile.birthTime);
  }, [profile]);

  const runCalc = () => {
    if (!birthDate) {
      toast(t('bazi.needBirthDate', { defaultValue: 'Birth date is required' }), 'error');
      return;
    }
    const r = computeBazi(birthDate, birthTime || undefined);
    if (!r) {
      toast(t('bazi.calcFailed', { defaultValue: 'Could not compute Bazi' }), 'error');
      return;
    }
    setResult(r);
    setStage('result');
  };

  const reset = () => {
    setStage('input');
    setResult(null);
  };

  if (stage === 'input') {
    return (
      <Page spacing="md">
        <PageHeader
          icon={<HoroscopeWheelIcon />}
          title={t('bazi.title', { defaultValue: 'Bazi — Four Pillars of Destiny' })}
        />

        <Card variant="glow" padding="lg">
          <p className="reading-copy mb-4">
            {t('bazi.intro', {
              defaultValue:
                'Bazi — "eight characters" — is the traditional Chinese reading of your birth moment as four pillars: year, month, day, and hour. Each pillar carries one of the five elements (wood, fire, earth, metal, water) and a yin or yang polarity. Together they show your Day Master — the axis of your nature — and where the elements of your life run rich or run thin.',
            })}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-ui font-medium text-mystic-300 mb-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {t('bazi.birthDate', { defaultValue: 'Birth date' })}
              </label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="text-ui font-medium text-mystic-300 mb-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {t('bazi.birthTime', { defaultValue: 'Birth time (optional)' })}
              </label>
              <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </div>
            <div>
              <label className="text-ui font-medium text-mystic-300 mb-1 flex items-center gap-2">
                {t('bazi.gender', { defaultValue: 'Birth gender — required for luck pillars + annual reading' })}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as BaziGender)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-control p-3 text-mystic-100 text-ui focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('bazi.selectGender', { defaultValue: 'Select to unlock deep mode' })}</option>
                <option value="male">{t('bazi.male', { defaultValue: 'Male' })}</option>
                <option value="female">{t('bazi.female', { defaultValue: 'Female' })}</option>
              </select>
            </div>
          </div>
        </Card>

        <Button variant="primary" size="lg" fullWidth onClick={runCalc}>
          {t('bazi.calculate', { defaultValue: 'Cast the four pillars' })}
        </Button>
        <PaywallSheet open={showPaywall} onClose={() => setShowPaywall(false)} feature={t('readings.tabs.bazi', { defaultValue: 'Bazi' }) as string} />
      </Page>
    );
  }

  if (stage === 'result' && result) {
    const dayMasterInfo = DAY_MASTER_INFO[result.dayMaster];
    const key = result.dayMaster;

    const localized = (path: string, fallback: string) =>
      t(`bazi.dayMasters.${key}.${path}`, { defaultValue: fallback }) as string;
    const name = localized('name', dayMasterInfo.name);
    const archetype = localized('archetype', dayMasterInfo.archetype);
    const summary = localized('summary', dayMasterInfo.summary);
    const strengths = tArray(t, `bazi.dayMasters.${key}.strengths`, dayMasterInfo.strengths);
    const challenges = tArray(t, `bazi.dayMasters.${key}.challenges`, dayMasterInfo.challenges);
    const thriving = localized('thriving', dayMasterInfo.thriving);
    const struggling = localized('struggling', dayMasterInfo.struggling);
    const affirmation = localized('affirmation', dayMasterInfo.affirmation);

    const elementSupportNeeded = ELEMENT_PRODUCES[result.weakElement];
    const elementToModerate = result.elementBalance[result.dominantElement] > 3 ? result.dominantElement : null;

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: `${name}`,
          subtitle: archetype,
          tagline: `${t('bazi.dayMasterLabel', { defaultValue: 'Day Master' })}: ${name}`,
          affirmation,
          brand: t('share.brand.bazi', { defaultValue: 'Bazi' }) as string,
        });
        const out = await shareOrDownload(
          blob,
          `arcana-bazi-${key}.png`,
          `My Bazi Day Master: ${name} — ${archetype}`,
        );
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
        else if (out === 'failed') toast(t('common:actions.shareFailed'), 'error');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <>
      <Page spacing="sm">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 min-h-[44px] text-ui text-mystic-400 hover:text-mystic-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {t('bazi.back', { defaultValue: 'Recalculate' })}
        </button>

        {/* The Day Master reading, on paper: name → archetype → summary →
            strengths, challenges, when you thrive / struggle, affirmation.
            The chart itself (pillars, balance, the deep layers) follows on
            the canvas. */}
        <ResultSheet
          glyph={<ElementGlyph element={result.dayMasterElement} size={28} />}
          eyebrow={t('bazi.dayMasterEyebrow', { defaultValue: 'Your Day Master' })}
          title={name}
          summaryHeading={archetype}
          summary={summary}
          disclaimer="general"
        >
          <div className="space-y-7">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <section>
                <h3 className="heading-display-md heading-strong text-ink mb-2">
                  {t('bazi.strengthsLabel', { defaultValue: 'Strengths' })}
                </h3>
                <ul className="reading-copy list-disc pl-5 space-y-1.5">
                  {strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </section>
              <section>
                <h3 className="heading-display-md heading-strong text-ink mb-2">
                  {t('bazi.challengesLabel', { defaultValue: 'Challenges' })}
                </h3>
                <ul className="reading-copy list-disc pl-5 space-y-1.5">
                  {challenges.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </section>
            </div>

            <section className="border-t border-paper-hairline pt-6">
              <h3 className="heading-display-md heading-strong text-ink mb-2">
                {t('bazi.thrivingLabel', { defaultValue: 'When you thrive' })}
              </h3>
              <p className="reading-copy mb-5">{thriving}</p>
              <h3 className="heading-display-md heading-strong text-ink mb-2">
                {t('bazi.strugglingLabel', { defaultValue: 'When you struggle' })}
              </h3>
              <p className="reading-copy">{struggling}</p>
            </section>

            <AffirmationPanel text={affirmation} />
          </div>
        </ResultSheet>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth onClick={handleShare}>
            <Share2 className="w-4 h-4" aria-hidden />
            {t('bazi.share', { defaultValue: 'Share my pillars' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset}>
            {t('bazi.recalculate', { defaultValue: 'Cast for another birth date' })}
          </Button>
        </div>

        <Card padding="lg">
          <h3 className="heading-display-md text-mystic-100 mb-3">
            {t('bazi.pillarsLabel', { defaultValue: 'Your Four Pillars' })}
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {([
              { label: t('bazi.year', { defaultValue: 'Year' }), p: result.year },
              { label: t('bazi.month', { defaultValue: 'Month' }), p: result.month },
              { label: t('bazi.day', { defaultValue: 'Day' }), p: result.day },
              { label: t('bazi.hour', { defaultValue: 'Hour' }), p: result.hour },
            ] as const).map(({ label, p }, i) => (
              <div key={i} className="p-2 bg-mystic-800/40 rounded-inset">
                <p className="text-meta text-mystic-400">{label}</p>
                <div className={`flex justify-center my-1.5 ${ELEMENT_COLOR[p.element]}`}>
                  <ElementGlyph element={p.element} size={22} />
                </div>
                <p className="text-meta text-mystic-200" lang="zh-Hant">{p.stem}</p>
                <p className="text-meta text-mystic-200" lang="zh-Hant">{p.branch}</p>
              </div>
            ))}
          </div>
        </Card>

        <Section
          title={t('bazi.elementBalanceLabel', { defaultValue: 'Element Balance' })}
          headingLevel="h3"
        >
          <div className="space-y-2">
            {(['wood', 'fire', 'earth', 'metal', 'water'] as FiveElement[]).map((el) => (
              <div key={el} className="flex items-center gap-3">
                <span className={`w-8 flex justify-center ${ELEMENT_COLOR[el]}`}>
                  <ElementGlyph element={el} size={18} />
                </span>
                <span className="text-ui text-mystic-200 capitalize flex-1">
                  {t(`bazi.elements.${el}`, { defaultValue: el })}
                </span>
                <Progress
                  value={result.elementBalance[el]}
                  max={8}
                  size="md"
                  tone={result.dominantElement === el ? 'gold' : 'neutral'}
                  label={t(`bazi.elements.${el}`, { defaultValue: el }) as string}
                  className="flex-1 max-w-[120px]"
                />
                <span className="text-meta text-mystic-400 w-4 text-right tabular-nums">{result.elementBalance[el]}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title={t('bazi.guidanceLabel', { defaultValue: 'Element Guidance' })}
          headingLevel="h3"
        >
          <div className="reading-copy">
            <p>
              {t('bazi.dominantNote', {
                defaultValue: 'Your dominant element is {{el}} — it shapes how you are most naturally yourself.',
                el: t(`bazi.elements.${result.dominantElement}`, { defaultValue: result.dominantElement }),
              })}
            </p>
            <p>
              {t('bazi.weakNote', {
                defaultValue:
                  'Your weakest element is {{el}} — this is where more support can nourish you. To build {{el}}, surround yourself with {{support}} (which produces {{el}}).',
                el: t(`bazi.elements.${result.weakElement}`, { defaultValue: result.weakElement }),
                support: t(`bazi.elements.${elementSupportNeeded}`, { defaultValue: elementSupportNeeded }),
              })}
            </p>
            {elementToModerate && (
              <p>
                {t('bazi.excessNote', {
                  defaultValue:
                    'You have a strong excess of {{el}}. Watch for its shadow expressions, and balance with {{control}} (which controls {{el}}).',
                  el: t(`bazi.elements.${elementToModerate}`, { defaultValue: elementToModerate }),
                  control: t(`bazi.elements.${ELEMENT_CONTROLS[elementToModerate]}`, {
                    defaultValue: ELEMENT_CONTROLS[elementToModerate],
                  }),
                })}
              </p>
            )}
          </div>
        </Section>

        {/* Phase-1 classical deepening — premium-gated when flag on */}
        {showDepth && deepening && (
          <>
            {/* Strength diagnosis badge (free — always shown as a teaser) */}
            <Card padding="lg" className="text-center">
              <p className="font-display-eyebrow mb-1">
                {t('bazi.chartTypeLabel', { defaultValue: 'Chart type' })}
              </p>
              <p className={`heading-display-md ${deepening.strength === 'strong' ? 'text-gold' : deepening.strength === 'receptive' ? 'text-cosmic-blue-ink' : 'text-teal'}`}>
                {t(`bazi.strength.${deepening.strength}.name`, {
                  defaultValue: deepening.strength === 'strong' ? 'Dominant' : deepening.strength === 'receptive' ? 'Receptive' : 'Balanced',
                })}
              </p>
              <p className="reading-copy text-left mx-auto mt-2">
                {t(`bazi.strength.${deepening.strength}.desc`, {
                  defaultValue:
                    deepening.strength === 'strong'
                      ? 'Your day-master element runs rich. You assert naturally; the growth edge is in flow and release.'
                      : deepening.strength === 'receptive'
                      ? 'Your day-master element runs lean. You receive and absorb easily; the growth edge is in assertion and self-sourcing.'
                      : 'Your chart holds its own — the elements meet each other in reasonable balance.',
                })}
              </p>
            </Card>

            {isPremium ? (
              <>
                {/* Inner Forces (Ten Gods) table */}
                <Card padding="lg">
                  <h3 className="heading-display-md text-mystic-100 mb-1 flex items-center gap-2">
                    <HoroscopeWheelIcon className="w-4 h-4" />
                    {t('bazi.innerForcesLabel', { defaultValue: 'Inner Forces' })}
                  </h3>
                  <p className="text-meta text-mystic-400 mb-3">
                    {t('bazi.innerForcesSub', {
                      defaultValue: 'Each pillar maps to a classical Ten-Gods archetype relative to your Inner Element.',
                    })}
                  </p>
                  <div className="space-y-3">
                    {([
                      { label: t('bazi.year', { defaultValue: 'Year' }),  key: 'year'  as const },
                      { label: t('bazi.month', { defaultValue: 'Month' }), key: 'month' as const },
                      { label: t('bazi.hour', { defaultValue: 'Hour' }),   key: 'hour'  as const },
                    ]).map(({ label, key }) => {
                      const god = deepening.tenGods[key];
                      const info = TEN_GOD_INFO[god];
                      return (
                        <div key={key} className="p-3 bg-mystic-800/30 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-meta text-mystic-400 uppercase tracking-wider">{label}</span>
                            <span className="text-meta text-mystic-400">{info.classical}</span>
                          </div>
                          <p className="text-ui font-medium text-mystic-100 mb-0.5">{info.name}</p>
                          <p className="reading-copy">{info.headline}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Hidden Influences + Nayin */}
                <Card padding="lg">
                  <h3 className="heading-display-md text-mystic-100 mb-1">
                    {t('bazi.hiddenInfluencesLabel', { defaultValue: 'Hidden Influences' })}
                  </h3>
                  <p className="text-meta text-mystic-400 mb-3">
                    {t('bazi.hiddenInfluencesSub', {
                      defaultValue: 'Each earthly branch carries 1–3 additional stems that quietly shape the pillar.',
                    })}
                  </p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {([
                      { label: t('bazi.year', { defaultValue: 'Year' }),   stems: deepening.hiddenStems.year  },
                      { label: t('bazi.month', { defaultValue: 'Month' }), stems: deepening.hiddenStems.month },
                      { label: t('bazi.day', { defaultValue: 'Day' }),     stems: deepening.hiddenStems.day   },
                      { label: t('bazi.hour', { defaultValue: 'Hour' }),   stems: deepening.hiddenStems.hour  },
                    ]).map((col, i) => (
                      <div key={i} className="p-2 bg-mystic-800/30 rounded-lg">
                        <p className="text-meta text-mystic-400 uppercase tracking-wider">{col.label}</p>
                        <div className="mt-1 space-y-0.5">
                          {col.stems.map((s) => (
                            <p key={s} className="text-meta text-mystic-200">{s}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {deepening.nayin && (
                    <div className="mt-4 pt-4 border-t border-mystic-700/30">
                      <p className="font-display-eyebrow mb-1">
                        {t('bazi.nayinLabel', { defaultValue: 'Soul Sound of your year' })}
                      </p>
                      <p className="font-display text-title text-mystic-100">{deepening.nayin.western}</p>
                      <p className="text-meta text-mystic-400 italic">{deepening.nayin.classical}</p>
                    </div>
                  )}
                </Card>

                {/* Supporting Element + lucky chips */}
                <Card padding="lg" className="bg-gold/5 border-gold/20">
                  <h3 className="heading-display-md text-mystic-100 mb-1 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-gold" aria-hidden />
                    {t('bazi.supportingLabel', { defaultValue: 'Your Supporting Element' })}
                  </h3>
                  <p className="text-meta text-mystic-400 mb-3">
                    {t('bazi.supportingSub', {
                      defaultValue: 'The element your chart leans toward for balance — wear its color, face its direction, keep its numbers close.',
                    })}
                  </p>
                  <p className={`heading-display-md capitalize mb-3 flex items-center gap-2 ${ELEMENT_COLOR[deepening.favorable.element]}`}>
                    <ElementGlyph element={deepening.favorable.element} size={22} />
                    <span className="text-mystic-100">{t(`bazi.elements.${deepening.favorable.element}`, { defaultValue: deepening.favorable.element })}</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg">
                      <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: deepening.favorable.color }} />
                      <span className="text-ui text-mystic-200 capitalize">{deepening.favorable.colorName}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg">
                      <Compass className="w-4 h-4 text-mystic-400 flex-shrink-0" />
                      <span className="text-ui text-mystic-200 capitalize">{deepening.favorable.direction}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg col-span-2">
                      <span className="text-meta text-mystic-400 flex-shrink-0">
                        {t('bazi.luckyNumbersLabel', { defaultValue: 'Lucky numbers' })}
                      </span>
                      <span className="text-meta text-gold ml-auto font-medium">
                        {deepening.favorable.luckyNumbers.join(' · ')}
                      </span>
                    </div>
                  </div>
                  <p className="reading-copy">{deepening.favorable.careerHint}</p>
                </Card>

                {/* Today's Lucky Color widget */}
                {luckyColor && (
                  <Card padding="lg" className="bg-cosmic-violet/10 border-cosmic-violet/20">
                    <h3 className="heading-display-md text-mystic-100 mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-cosmic-violet-ink" aria-hidden />
                      {t('bazi.luckyColorTodayLabel', { defaultValue: "Today's Lucky Color" })}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-12 h-12 rounded-control flex-shrink-0" style={{ backgroundColor: luckyColor.color }} />
                      <div>
                        <p className="text-ui font-medium text-mystic-100 capitalize">{luckyColor.colorName}</p>
                        <p className="reading-copy mt-0.5">{luckyColor.oneLiner}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              /* Non-premium teaser */
              <Card padding="lg" className="bg-gold/5 border-gold/20 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mb-3" aria-hidden>
                  <Lock className="w-5 h-5 text-gold" />
                </div>
                <h3 className="heading-display-md text-mystic-100 mb-2">
                  {t('bazi.premiumTeaserTitle', { defaultValue: 'Go deeper with Premium' })}
                </h3>
                <p className="text-ui text-mystic-300 text-left mb-4 max-w-md mx-auto">
                  {t('bazi.premiumTeaserBody', {
                    defaultValue:
                      "Unlock your Inner Forces (classical Ten-Gods), Hidden Influences, Soul Sound, your Supporting Element with lucky color + direction + numbers, and Today's Lucky Color widget.",
                  })}
                </p>
                <Button variant="gold" onClick={() => setShowPaywall(true)}>
                  <Crown className="w-4 h-4" aria-hidden />
                  {t('bazi.premiumTeaserCta', { defaultValue: 'Unlock the full reading' })}
                </Button>
              </Card>
            )}
          </>
        )}

        {/* ─── DEEP MODE — luck pillars, annual luck, spirit stars, branch
            relations, climate, life areas, pillar narratives. Requires
            gender for luck-pillar direction. */}
        {!deepResult && (
          <Card padding="md" className="border-cosmic-violet/30 bg-cosmic-violet/5">
            <p className="text-ui text-mystic-300">
              {t('bazi.unlockDeepHint', {
                defaultValue:
                  'For the deeper layers — 10-year luck pillars, this year\'s reading, spirit stars, branch relations — go back and add your birth gender. Luck-pillar direction is determined by year polarity × gender, so the calculation needs both.',
              })}
            </p>
          </Card>
        )}

        {deepResult && (
          <>
            {/* Pillar narratives — what each of the 4 represents */}
            <Section
              title={t('bazi.pillarsHeading', { defaultValue: 'What each pillar represents' })}
              headingLevel="h3"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.yearPillarLabel', { defaultValue: 'Year' })} · {result.year.stem} {result.year.branch}</p>
                  <p className="reading-copy">{deepResult.pillarNarratives.year}</p>
                </div>
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.monthPillarLabel', { defaultValue: 'Month' })} · {result.month.stem} {result.month.branch}</p>
                  <p className="reading-copy">{deepResult.pillarNarratives.month}</p>
                </div>
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.dayPillarLabel', { defaultValue: 'Day' })} · {result.day.stem} {result.day.branch}</p>
                  <p className="reading-copy">{deepResult.pillarNarratives.day}</p>
                </div>
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.hourPillarLabel', { defaultValue: 'Hour' })} · {result.hour.stem} {result.hour.branch}</p>
                  <p className="reading-copy">{deepResult.pillarNarratives.hour}</p>
                </div>
              </div>
            </Section>

            {/* This year's annual luck */}
            <Card padding="lg" className="border-gold/30 bg-gold/5">
              <h3 className="heading-display-md text-gold mb-2">
                {t('bazi.annualHeading', {
                  defaultValue: '{{year}} — your year ahead',
                  year: deepResult.annualLuck.year,
                })}
              </h3>
              <p className="text-meta text-mystic-400 mb-3">
                {deepResult.annualLuck.stem} {deepResult.annualLuck.branch} · {TEN_GOD_INFO[deepResult.annualLuck.tenGod].name} ({TEN_GOD_INFO[deepResult.annualLuck.tenGod].classical})
              </p>
              <p className="reading-copy">{deepResult.annualLuck.reading}</p>
            </Card>

            {/* Current luck pillar */}
            {deepResult.currentLuckPillar && (
              <Card padding="lg" className="border-cosmic-blue/30">
                <h3 className="heading-display-md text-mystic-100 mb-2">
                  {t('bazi.currentLuckHeading', {
                    defaultValue: 'Your current 10-year cycle ({{a}}-{{b}})',
                    a: deepResult.currentLuckPillar.startAge,
                    b: deepResult.currentLuckPillar.endAge,
                  })}
                </h3>
                <p className="text-meta text-mystic-400 mb-3 flex items-center gap-1.5 flex-wrap">
                  <span lang="zh-Hant">{deepResult.currentLuckPillar.stem} {deepResult.currentLuckPillar.branch}</span>
                  <span>·</span>
                  <span className={`inline-flex ${ELEMENT_COLOR[deepResult.currentLuckPillar.element]}`}><ElementGlyph element={deepResult.currentLuckPillar.element} size={14} /></span>
                  <span className="capitalize">{deepResult.currentLuckPillar.element}</span>
                  <span>·</span>
                  <span>{deepResult.currentLuckPillar.flavour}</span>
                </p>
                <p className="reading-copy">{deepResult.currentLuckPillar.theme}</p>
              </Card>
            )}

            {/* All 8 luck pillars timeline */}
            <Card padding="lg">
              <h3 className="heading-display-md text-mystic-100 mb-3">
                {t('bazi.luckPillarsHeading', { defaultValue: 'Your 80-year luck pillar timeline' })}
              </h3>
              <div className="mb-4">
                <LuckPillarTimeline
                  pillars={deepResult.luckPillars}
                  currentAge={birthDate ? Math.floor((Date.now() - new Date(`${birthDate}T12:00:00Z`).getTime()) / (365.2425 * 86400000)) : null}
                />
              </div>
              <div className="space-y-2">
                {deepResult.luckPillars.map((p, i) => {
                  const isCurrent = deepResult.currentLuckPillar &&
                    p.startAge === deepResult.currentLuckPillar.startAge;
                  const tint =
                    p.flavour === 'supporting' ? 'border-teal/25 bg-teal/10'
                    : p.flavour === 'challenging' ? 'border-coral/25 bg-coral/10'
                    : 'border-mystic-700/30 bg-mystic-800/30';
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-control border ${isCurrent ? 'border-gold/50 bg-gold/10' : tint}`}
                    >
                      <div className="flex items-center justify-between text-meta mb-1">
                        <span className="text-mystic-100 font-medium inline-flex items-center gap-1.5">
                          <span lang="zh-Hant">{p.stem} {p.branch}</span>
                          <span className={`inline-flex ${ELEMENT_COLOR[p.element]}`}><ElementGlyph element={p.element} size={14} /></span>
                        </span>
                        <span className="text-mystic-400 tabular-nums">
                          {t('bazi.ageRange', { defaultValue: 'Age {{a}}-{{b}}', a: p.startAge, b: p.endAge })}
                          {' · '}
                          {p.startYear}-{p.endYear}
                        </span>
                      </div>
                      <p className="reading-copy">{p.theme}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 格局 — formal structure */}
            {structure && STRUCTURE_MEANINGS[structure.key] && (
              <Section
                title={t('bazi.structureHeading', { defaultValue: 'Your chart structure' })}
                headingLevel="h3"
                description={STRUCTURE_INTRO}
              >
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-display text-gold" style={{ fontFamily: 'serif' }} lang="zh-Hant">
                    {STRUCTURE_MEANINGS[structure.key].cn}
                  </span>
                  <span className="text-body text-mystic-100">{STRUCTURE_MEANINGS[structure.key].title}</span>
                </div>
                <div className="reading-copy">
                  <p>{STRUCTURE_MEANINGS[structure.key].text}</p>
                  <p>{STRUCTURE_MEANINGS[structure.key].strengthNote}</p>
                </div>
                <p className="text-meta text-mystic-400 mt-3">
                  {structure.revealed
                    ? t('bazi.structureRevealed', { defaultValue: 'Taken from your month branch, whose hidden stem is revealed in the chart above.' })
                    : t('bazi.structureHidden', { defaultValue: 'Taken from your month branch. Nothing in your stems reveals it, so it is read from the branch’s principal hidden stem.' })}
                </p>
              </Section>
            )}

            {/* Spirit stars */}
            {deepResult.spiritStars.length > 0 && (
              <Card padding="lg">
                <h3 className="heading-display-md text-mystic-100 mb-3">
                  {t('bazi.spiritStarsHeading', { defaultValue: 'Spirit stars in your chart' })}
                </h3>
                <div className="space-y-2">
                  {deepResult.spiritStars.map((s, i) => {
                    const tint =
                      s.kind === 'auspicious' ? 'border-teal/25 bg-teal/10'
                      : s.kind === 'inauspicious' ? 'border-coral/25 bg-coral/10'
                      : 'border-gold/25 bg-gold/5';
                    return (
                      <div key={i} className={`p-3 rounded-control border ${tint}`}>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1.5">
                          <span className="text-ui font-medium text-mystic-100">{s.name}</span>
                          <span className="text-meta text-mystic-400">{s.classical}</span>
                          <span className="text-meta text-mystic-400 ml-auto capitalize">{s.pillar} pillar</span>
                        </div>
                        <p className="reading-copy">{s.meaning}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Branch relations */}
            {deepResult.branchRelations.length > 0 && (
              <Card padding="lg">
                <h3 className="heading-display-md text-mystic-100 mb-3">
                  {t('bazi.branchRelationsHeading', { defaultValue: 'Branch relations' })}
                </h3>
                <div className="space-y-2">
                  {deepResult.branchRelations.map((r, i) => {
                    const tint =
                      r.type === 'clash' ? 'border-coral/25 bg-coral/10'
                      : r.type === 'combine' ? 'border-teal/25 bg-teal/10'
                      : 'border-gold/25 bg-gold/5';
                    return (
                      <div key={i} className={`p-3 rounded-control border ${tint}`}>
                        <p className="reading-copy">{r.meaning}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Climate balance */}
            <Card padding="lg" className="border-cosmic-blue/30">
              <h3 className="heading-display-md text-mystic-100 mb-2">
                {t('bazi.climateHeading', { defaultValue: 'Your climate balance' })}
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <ClimateCell label={t('bazi.climate.cold', { defaultValue: 'Cold' }) as string} value={deepResult.climate.cold} active={deepResult.climate.dominant === 'cold'} />
                <ClimateCell label={t('bazi.climate.hot', { defaultValue: 'Hot' }) as string} value={deepResult.climate.hot} active={deepResult.climate.dominant === 'hot'} />
                <ClimateCell label={t('bazi.climate.wet', { defaultValue: 'Wet' }) as string} value={deepResult.climate.wet} active={deepResult.climate.dominant === 'wet'} />
                <ClimateCell label={t('bazi.climate.dry', { defaultValue: 'Dry' }) as string} value={deepResult.climate.dry} active={deepResult.climate.dominant === 'dry'} />
              </div>
              <p className="reading-copy">{deepResult.climate.remedy}</p>
            </Card>

            {/* Career affinity */}
            <Section
              title={t('bazi.careerHeading', { defaultValue: 'Career affinity for your day master' })}
              headingLevel="h3"
            >
              <ul className="reading-copy space-y-2">
                {deepResult.lifeAreas.careerAffinity.map((c, i) => (
                  <li key={i} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-teal">
                    {c}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Wealth, Spouse, Health */}
            <Section
              title={t('bazi.lifeAreasHeading', { defaultValue: 'Wealth · Partnership · Health' })}
              headingLevel="h3"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.wealthLabel', { defaultValue: 'Wealth' })}</p>
                  <p className="reading-copy">{deepResult.lifeAreas.wealthAnalysis}</p>
                </div>
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.spouseLabel', { defaultValue: 'Partnership' })}</p>
                  <p className="reading-copy">{deepResult.lifeAreas.spouseAnalysis}</p>
                </div>
                <div>
                  <p className="text-meta uppercase tracking-wider text-mystic-400 mb-1">{t('bazi.healthLabel', { defaultValue: 'Health' })}</p>
                  <p className="reading-copy">{deepResult.lifeAreas.healthFocus}</p>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* AI-generated personalised reading. Premium-only; auto-fetches
            on mount for premium users. Cached server-side per user/year. */}
        {result && deepening && gender && (
          <BaziAIReadingPanel
            result={result}
            phase1={deepening}
            deep={deepResult}
            birthDate={birthDate}
            birthTime={birthTime || null}
            gender={gender}
            isPremium={isPremium}
            onUpgradeClick={() => setShowPaywall(true)}
          />
        )}
      </Page>
      <PaywallSheet open={showPaywall} onClose={() => setShowPaywall(false)} feature={t('readings.tabs.bazi', { defaultValue: 'Bazi' }) as string} />
      </>
    );
  }

  return null;
}

function ClimateCell({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={`text-center p-2 rounded-inset border ${active ? 'border-gold/50 bg-gold/10' : 'border-mystic-700/30 bg-mystic-800/30'}`}>
      <p className="text-meta uppercase tracking-widest text-mystic-400">{label}</p>
      <p className={`text-title font-semibold tabular-nums ${active ? 'text-gold' : 'text-mystic-300'}`}>{value}</p>
    </div>
  );
}

export default BaziPage;
