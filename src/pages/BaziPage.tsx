import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Calendar, Clock } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import {
  computeBazi,
  DAY_MASTER_INFO,
  ELEMENT_PRODUCES,
  ELEMENT_CONTROLS,
  type BaziResult,
  type FiveElement,
} from '../data/bazi';
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
  const [stage, setStage] = useState<Stage>('input');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [result, setResult] = useState<BaziResult | null>(null);

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

export default BaziPage;
