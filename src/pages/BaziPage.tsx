import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Calendar, Clock, Lock, Crown, Compass, Palette } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlag } from '../context/FeatureFlagContext';
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
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'input' | 'result';

const ELEMENT_COLOR: Record<FiveElement, string> = {
  wood: 'text-emerald-400',
  fire: 'text-red-400',
  earth: 'text-amber-600',
  metal: 'text-slate-300',
  water: 'text-cosmic-blue',
};

const ELEMENT_EMOJI: Record<FiveElement, string> = {
  wood: '🌳',
  fire: '🔥',
  earth: '⛰️',
  metal: '⚔️',
  water: '💧',
};

export function BaziPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const navigate = useNavigate();
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
  // Phase-2 deep mode (luck pillars / annual luck / spirit stars / branch
  // relations / climate / life-area summaries / pillar narratives) only
  // computes when gender is provided since luck-pillar direction depends
  // on year polarity x gender.
  const deepResult = useMemo(
    () => (result && gender ? computeBaziDeep(result, birthDate, gender) : null),
    [result, gender, birthDate],
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
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('bazi.title', { defaultValue: 'Bazi — Four Pillars of Destiny' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('bazi.intro', {
              defaultValue:
                'Bazi — "eight characters" — is the traditional Chinese reading of your birth moment as four pillars: year, month, day, and hour. Each pillar carries one of the five elements (wood, fire, earth, metal, water) and a yin or yang polarity. Together they show your Day Master — the axis of your nature — and where the elements of your life run rich or run thin.',
            })}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {t('bazi.birthDate', { defaultValue: 'Birth date' })}
              </label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {t('bazi.birthTime', { defaultValue: 'Birth time (optional)' })}
              </label>
              <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                {t('bazi.gender', { defaultValue: 'Birth gender — required for luck pillars + annual reading' })}
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as BaziGender)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('bazi.selectGender', { defaultValue: 'Select to unlock deep mode' })}</option>
                <option value="male">{t('bazi.male', { defaultValue: 'Male' })}</option>
                <option value="female">{t('bazi.female', { defaultValue: 'Female' })}</option>
              </select>
            </div>
          </div>
        </Card>

        <Button variant="primary" fullWidth onClick={runCalc} className="min-h-[56px]">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('bazi.calculate', { defaultValue: 'Cast the four pillars' })}
        </Button>
      </div>
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
    const strengths = t(`bazi.dayMasters.${key}.strengths`, {
      returnObjects: true,
      defaultValue: dayMasterInfo.strengths,
    }) as string[];
    const challenges = t(`bazi.dayMasters.${key}.challenges`, {
      returnObjects: true,
      defaultValue: dayMasterInfo.challenges,
    }) as string[];
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
          brand: 'Arcana · Bazi',
        });
        const out = await shareOrDownload(
          blob,
          `arcana-bazi-${key}.png`,
          `My Bazi Day Master: ${name} — ${archetype}`,
        );
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
          {t('bazi.back', { defaultValue: 'Recalculate' })}
        </button>

        <Card variant="glow" padding="lg" className="text-center">
          <div className={`text-6xl mb-3 ${ELEMENT_COLOR[result.dayMasterElement]}`}>
            {ELEMENT_EMOJI[result.dayMasterElement]}
          </div>
          <h2 className="font-display text-3xl text-mystic-100">{name}</h2>
          <p className="text-gold/80 text-sm mt-2 italic">"{archetype}"</p>
        </Card>

        <Card padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed">{summary}</p>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-3">
            {t('bazi.pillarsLabel', { defaultValue: 'Your Four Pillars' })}
          </h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            {([
              { label: t('bazi.year', { defaultValue: 'Year' }), p: result.year },
              { label: t('bazi.month', { defaultValue: 'Month' }), p: result.month },
              { label: t('bazi.day', { defaultValue: 'Day' }), p: result.day },
              { label: t('bazi.hour', { defaultValue: 'Hour' }), p: result.hour },
            ] as const).map(({ label, p }, i) => (
              <div key={i} className="p-2 bg-mystic-800/40 rounded-lg">
                <p className="text-xs text-mystic-500">{label}</p>
                <div className={`text-2xl mb-1 ${ELEMENT_COLOR[p.element]}`}>{ELEMENT_EMOJI[p.element]}</div>
                <p className="text-xs text-mystic-400">{p.stem}</p>
                <p className="text-xs text-mystic-500">{p.branch}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-gold mb-3">
            {t('bazi.elementBalanceLabel', { defaultValue: 'Element Balance' })}
          </h3>
          <div className="space-y-2">
            {(['wood', 'fire', 'earth', 'metal', 'water'] as FiveElement[]).map((el) => (
              <div key={el} className="flex items-center gap-3">
                <span className={`text-lg w-8 text-center ${ELEMENT_COLOR[el]}`}>{ELEMENT_EMOJI[el]}</span>
                <span className="text-sm text-mystic-300 capitalize flex-1">
                  {t(`bazi.elements.${el}`, { defaultValue: el })}
                </span>
                <div className="flex-1 bg-mystic-800/40 rounded-full h-2 overflow-hidden max-w-[120px]">
                  <div
                    className={`h-full ${result.dominantElement === el ? 'bg-gold' : 'bg-mystic-600'}`}
                    style={{ width: `${(result.elementBalance[el] / 8) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-mystic-500 w-4 text-right">{result.elementBalance[el]}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="border-cosmic-blue/20">
          <h3 className="font-medium text-cosmic-blue mb-3">
            {t('bazi.guidanceLabel', { defaultValue: 'Element Guidance' })}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed mb-3">
            {t('bazi.dominantNote', {
              defaultValue: 'Your dominant element is {{el}} — it shapes how you are most naturally yourself.',
              el: t(`bazi.elements.${result.dominantElement}`, { defaultValue: result.dominantElement }),
            })}
          </p>
          <p className="text-mystic-300 text-sm leading-relaxed mb-3">
            {t('bazi.weakNote', {
              defaultValue:
                'Your weakest element is {{el}} — this is where more support can nourish you. To build {{el}}, surround yourself with {{support}} (which produces {{el}}).',
              el: t(`bazi.elements.${result.weakElement}`, { defaultValue: result.weakElement }),
              support: t(`bazi.elements.${elementSupportNeeded}`, { defaultValue: elementSupportNeeded }),
            })}
          </p>
          {elementToModerate && (
            <p className="text-mystic-300 text-sm leading-relaxed">
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
        </Card>

        {/* Phase-1 classical deepening — premium-gated when flag on */}
        {showDepth && deepening && (
          <>
            {/* Strength diagnosis badge (free — always shown as a teaser) */}
            <Card padding="lg" className="text-center">
              <p className="text-[11px] uppercase tracking-widest text-mystic-500 mb-1">
                {t('bazi.chartTypeLabel', { defaultValue: 'Chart type' })}
              </p>
              <p className={`font-display text-2xl ${deepening.strength === 'strong' ? 'text-gold' : deepening.strength === 'receptive' ? 'text-cosmic-blue' : 'text-emerald-400'}`}>
                {t(`bazi.strength.${deepening.strength}.name`, {
                  defaultValue: deepening.strength === 'strong' ? 'Dominant' : deepening.strength === 'receptive' ? 'Receptive' : 'Balanced',
                })}
              </p>
              <p className="text-sm text-mystic-400 mt-1 leading-relaxed">
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
                  <h3 className="font-medium text-gold mb-1 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t('bazi.innerForcesLabel', { defaultValue: 'Inner Forces' })}
                  </h3>
                  <p className="text-xs text-mystic-500 mb-3">
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
                            <span className="text-xs text-mystic-500 uppercase tracking-wider">{label}</span>
                            <span className="text-[10px] text-mystic-600">{info.classical}</span>
                          </div>
                          <p className="text-sm font-medium text-mystic-100 mb-0.5">{info.name}</p>
                          <p className="text-xs text-mystic-400 leading-relaxed">{info.headline}</p>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Hidden Influences + Nayin */}
                <Card padding="lg">
                  <h3 className="font-medium text-cosmic-violet mb-1">
                    {t('bazi.hiddenInfluencesLabel', { defaultValue: 'Hidden Influences' })}
                  </h3>
                  <p className="text-xs text-mystic-500 mb-3">
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
                        <p className="text-[10px] text-mystic-500 uppercase tracking-wider">{col.label}</p>
                        <div className="mt-1 space-y-0.5">
                          {col.stems.map((s) => (
                            <p key={s} className="text-[11px] text-mystic-300">{s}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {deepening.nayin && (
                    <div className="mt-4 pt-4 border-t border-mystic-700/30">
                      <p className="text-[10px] uppercase tracking-widest text-gold mb-1">
                        {t('bazi.nayinLabel', { defaultValue: 'Soul Sound of your year' })}
                      </p>
                      <p className="text-lg font-display text-mystic-100">{deepening.nayin.western}</p>
                      <p className="text-xs text-mystic-500 italic">{deepening.nayin.classical}</p>
                    </div>
                  )}
                </Card>

                {/* Supporting Element + lucky chips */}
                <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
                  <h3 className="font-medium text-gold mb-1 flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    {t('bazi.supportingLabel', { defaultValue: 'Your Supporting Element' })}
                  </h3>
                  <p className="text-xs text-mystic-500 mb-3">
                    {t('bazi.supportingSub', {
                      defaultValue: 'The element your chart leans toward for balance — wear its color, face its direction, keep its numbers close.',
                    })}
                  </p>
                  <p className="text-2xl font-display text-mystic-100 capitalize mb-3">
                    {t(`bazi.elements.${deepening.favorable.element}`, { defaultValue: deepening.favorable.element })}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg">
                      <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: deepening.favorable.color }} />
                      <span className="text-xs text-mystic-200 capitalize">{deepening.favorable.colorName}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg">
                      <Compass className="w-4 h-4 text-mystic-400 flex-shrink-0" />
                      <span className="text-xs text-mystic-200 capitalize">{deepening.favorable.direction}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-mystic-800/30 rounded-lg col-span-2">
                      <span className="text-xs text-mystic-500 flex-shrink-0">
                        {t('bazi.luckyNumbersLabel', { defaultValue: 'Lucky numbers' })}
                      </span>
                      <span className="text-xs text-gold ml-auto font-medium">
                        {deepening.favorable.luckyNumbers.join(' · ')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-mystic-400 leading-relaxed">{deepening.favorable.careerHint}</p>
                </Card>

                {/* Today's Lucky Color widget */}
                {luckyColor && (
                  <Card padding="lg" className="bg-gradient-to-br from-cosmic-violet/10 to-mystic-900 border-cosmic-violet/20">
                    <h3 className="font-medium text-cosmic-violet mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      {t('bazi.luckyColorTodayLabel', { defaultValue: "Today's Lucky Color" })}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-12 h-12 rounded-xl flex-shrink-0 shadow-lg" style={{ backgroundColor: luckyColor.color, boxShadow: `0 0 24px ${luckyColor.color}55` }} />
                      <div>
                        <p className="text-sm font-medium text-mystic-100 capitalize">{luckyColor.colorName}</p>
                        <p className="text-xs text-mystic-400 leading-relaxed mt-0.5">{luckyColor.oneLiner}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            ) : (
              /* Non-premium teaser */
              <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mb-3">
                  <Lock className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-display text-lg text-mystic-100 mb-2">
                  {t('bazi.premiumTeaserTitle', { defaultValue: 'Go deeper with Premium' })}
                </h3>
                <p className="text-sm text-mystic-400 leading-relaxed mb-4 max-w-md mx-auto">
                  {t('bazi.premiumTeaserBody', {
                    defaultValue:
                      "Unlock your Inner Forces (classical Ten-Gods), Hidden Influences, Soul Sound, your Supporting Element with lucky color + direction + numbers, and Today's Lucky Color widget.",
                  })}
                </p>
                <Button variant="gold" onClick={() => navigate('/profile')} className="min-h-[44px]">
                  <Crown className="w-4 h-4 mr-2" />
                  {t('bazi.premiumTeaserCta', { defaultValue: 'See Premium' })}
                </Button>
              </Card>
            )}
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-3">
              {t('bazi.strengthsLabel', { defaultValue: 'Strengths' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </Card>
          <Card padding="lg">
            <h3 className="font-medium text-pink-400 mb-3">
              {t('bazi.challengesLabel', { defaultValue: 'Challenges' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {challenges.map((c, i) => <li key={i}>• {c}</li>)}
            </ul>
          </Card>
        </div>

        <Card padding="lg">
          <h3 className="font-medium text-emerald-400 mb-2">
            {t('bazi.thrivingLabel', { defaultValue: 'When you thrive' })}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">{thriving}</p>
          <h3 className="font-medium text-pink-400 mb-2">
            {t('bazi.strugglingLabel', { defaultValue: 'When you struggle' })}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed">{struggling}</p>
        </Card>

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('bazi.affirmationLabel', { defaultValue: 'Your affirmation' })}
          </h3>
          <p className="text-mystic-200 italic leading-relaxed">"{affirmation}"</p>
        </Card>

        {/* ─── DEEP MODE — luck pillars, annual luck, spirit stars, branch
            relations, climate, life areas, pillar narratives. Requires
            gender for luck-pillar direction. */}
        {!deepResult && (
          <Card padding="md" className="border-cosmic-violet/30 bg-cosmic-violet/5">
            <p className="text-xs text-mystic-400 leading-relaxed">
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
            <Card padding="lg">
              <h3 className="font-medium text-gold mb-3">
                {t('bazi.pillarsHeading', { defaultValue: 'What each pillar represents' })}
              </h3>
              <div className="space-y-3 text-xs text-mystic-300 leading-relaxed">
                <div>
                  <p className="text-emerald-400 font-medium mb-0.5">{t('bazi.yearPillarLabel', { defaultValue: 'Year' })} · {result.year.stem} {result.year.branch}</p>
                  <p>{deepResult.pillarNarratives.year}</p>
                </div>
                <div>
                  <p className="text-cosmic-blue font-medium mb-0.5">{t('bazi.monthPillarLabel', { defaultValue: 'Month' })} · {result.month.stem} {result.month.branch}</p>
                  <p>{deepResult.pillarNarratives.month}</p>
                </div>
                <div>
                  <p className="text-gold font-medium mb-0.5">{t('bazi.dayPillarLabel', { defaultValue: 'Day' })} · {result.day.stem} {result.day.branch}</p>
                  <p>{deepResult.pillarNarratives.day}</p>
                </div>
                <div>
                  <p className="text-cosmic-violet font-medium mb-0.5">{t('bazi.hourPillarLabel', { defaultValue: 'Hour' })} · {result.hour.stem} {result.hour.branch}</p>
                  <p>{deepResult.pillarNarratives.hour}</p>
                </div>
              </div>
            </Card>

            {/* This year's annual luck */}
            <Card padding="lg" className="border-gold/30 bg-gradient-to-br from-gold/5 to-mystic-900">
              <h3 className="font-medium text-gold mb-2">
                {t('bazi.annualHeading', {
                  defaultValue: '{{year}} — your year ahead',
                  year: deepResult.annualLuck.year,
                })}
              </h3>
              <p className="text-xs text-mystic-500 mb-3">
                {deepResult.annualLuck.stem} {deepResult.annualLuck.branch} · {TEN_GOD_INFO[deepResult.annualLuck.tenGod].name} ({TEN_GOD_INFO[deepResult.annualLuck.tenGod].classical})
              </p>
              <p className="text-sm text-mystic-200 leading-relaxed">{deepResult.annualLuck.reading}</p>
            </Card>

            {/* Current luck pillar */}
            {deepResult.currentLuckPillar && (
              <Card padding="lg" className="border-cosmic-blue/30">
                <h3 className="font-medium text-cosmic-blue mb-2">
                  {t('bazi.currentLuckHeading', {
                    defaultValue: 'Your current 10-year cycle ({{a}}-{{b}})',
                    a: deepResult.currentLuckPillar.startAge,
                    b: deepResult.currentLuckPillar.endAge,
                  })}
                </h3>
                <p className="text-xs text-mystic-500 mb-3">
                  {deepResult.currentLuckPillar.stem} {deepResult.currentLuckPillar.branch} · {ELEMENT_EMOJI[deepResult.currentLuckPillar.element]} {deepResult.currentLuckPillar.element} · {deepResult.currentLuckPillar.flavour}
                </p>
                <p className="text-sm text-mystic-200 leading-relaxed">{deepResult.currentLuckPillar.theme}</p>
              </Card>
            )}

            {/* All 8 luck pillars timeline */}
            <Card padding="lg">
              <h3 className="font-medium text-mystic-200 mb-3">
                {t('bazi.luckPillarsHeading', { defaultValue: 'Your 80-year luck pillar timeline' })}
              </h3>
              <div className="space-y-2">
                {deepResult.luckPillars.map((p, i) => {
                  const isCurrent = deepResult.currentLuckPillar &&
                    p.startAge === deepResult.currentLuckPillar.startAge;
                  const tint =
                    p.flavour === 'supporting' ? 'border-emerald-400/25 bg-emerald-500/5'
                    : p.flavour === 'challenging' ? 'border-pink-400/25 bg-pink-500/5'
                    : 'border-mystic-700/30 bg-mystic-800/30';
                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border ${tint} ${isCurrent ? 'ring-1 ring-gold/50' : ''}`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-mystic-100 font-medium">
                          {p.stem} {p.branch} {ELEMENT_EMOJI[p.element]}
                        </span>
                        <span className="text-mystic-500">
                          {t('bazi.ageRange', { defaultValue: 'Age {{a}}-{{b}}', a: p.startAge, b: p.endAge })}
                          {' · '}
                          {p.startYear}-{p.endYear}
                        </span>
                      </div>
                      <p className="text-[11px] text-mystic-400 leading-relaxed">{p.theme}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Spirit stars */}
            {deepResult.spiritStars.length > 0 && (
              <Card padding="lg">
                <h3 className="font-medium text-cosmic-violet mb-3">
                  {t('bazi.spiritStarsHeading', { defaultValue: 'Spirit stars in your chart' })}
                </h3>
                <div className="space-y-2">
                  {deepResult.spiritStars.map((s, i) => {
                    const tint =
                      s.kind === 'auspicious' ? 'border-emerald-400/25 bg-emerald-500/5'
                      : s.kind === 'inauspicious' ? 'border-pink-400/25 bg-pink-500/5'
                      : 'border-gold/25 bg-gold/5';
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${tint}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium text-mystic-100">{s.name}</span>
                          <span className="text-[10px] text-mystic-500">{s.classical}</span>
                          <span className="text-[10px] text-mystic-500 ml-auto capitalize">{s.pillar} pillar</span>
                        </div>
                        <p className="text-xs text-mystic-300 leading-relaxed">{s.meaning}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Branch relations */}
            {deepResult.branchRelations.length > 0 && (
              <Card padding="lg">
                <h3 className="font-medium text-cosmic-blue mb-3">
                  {t('bazi.branchRelationsHeading', { defaultValue: 'Branch relations' })}
                </h3>
                <div className="space-y-2">
                  {deepResult.branchRelations.map((r, i) => {
                    const tint =
                      r.type === 'clash' ? 'border-pink-400/25 bg-pink-500/5'
                      : r.type === 'combine' ? 'border-emerald-400/25 bg-emerald-500/5'
                      : 'border-gold/25 bg-gold/5';
                    return (
                      <div key={i} className={`p-3 rounded-xl border ${tint}`}>
                        <p className="text-xs text-mystic-300 leading-relaxed">{r.meaning}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Climate balance */}
            <Card padding="lg" className="border-cosmic-blue/30">
              <h3 className="font-medium text-cosmic-blue mb-2">
                {t('bazi.climateHeading', { defaultValue: 'Your climate balance' })}
              </h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <ClimateCell label="Cold" value={deepResult.climate.cold} active={deepResult.climate.dominant === 'cold'} />
                <ClimateCell label="Hot" value={deepResult.climate.hot} active={deepResult.climate.dominant === 'hot'} />
                <ClimateCell label="Wet" value={deepResult.climate.wet} active={deepResult.climate.dominant === 'wet'} />
                <ClimateCell label="Dry" value={deepResult.climate.dry} active={deepResult.climate.dominant === 'dry'} />
              </div>
              <p className="text-xs text-mystic-300 leading-relaxed">{deepResult.climate.remedy}</p>
            </Card>

            {/* Career affinity */}
            <Card padding="lg">
              <h3 className="font-medium text-emerald-400 mb-3">
                {t('bazi.careerHeading', { defaultValue: 'Career affinity for your day master' })}
              </h3>
              <ul className="space-y-1.5 text-xs text-mystic-300">
                {deepResult.lifeAreas.careerAffinity.map((c, i) => (
                  <li key={i} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-400">
                    {c}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Wealth, Spouse, Health */}
            <Card padding="lg">
              <h3 className="font-medium text-gold mb-3">
                {t('bazi.lifeAreasHeading', { defaultValue: 'Wealth · Partnership · Health' })}
              </h3>
              <div className="space-y-3 text-xs text-mystic-300 leading-relaxed">
                <div>
                  <p className="text-gold font-medium mb-1">{t('bazi.wealthLabel', { defaultValue: 'Wealth' })}</p>
                  <p>{deepResult.lifeAreas.wealthAnalysis}</p>
                </div>
                <div>
                  <p className="text-pink-400 font-medium mb-1">{t('bazi.spouseLabel', { defaultValue: 'Partnership' })}</p>
                  <p>{deepResult.lifeAreas.spouseAnalysis}</p>
                </div>
                <div>
                  <p className="text-cosmic-blue font-medium mb-1">{t('bazi.healthLabel', { defaultValue: 'Health' })}</p>
                  <p>{deepResult.lifeAreas.healthFocus}</p>
                </div>
              </div>
            </Card>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('bazi.recalculate', { defaultValue: 'Recalculate' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function ClimateCell({ label, value, active }: { label: string; value: number; active: boolean }) {
  return (
    <div className={`text-center p-2 rounded-lg border ${active ? 'border-gold/50 bg-gold/10' : 'border-mystic-700/30 bg-mystic-800/30'}`}>
      <p className="text-[10px] uppercase tracking-widest text-mystic-500">{label}</p>
      <p className={`text-lg font-display ${active ? 'text-gold' : 'text-mystic-300'}`}>{value}</p>
    </div>
  );
}

export default BaziPage;
