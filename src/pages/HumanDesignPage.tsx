import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Calendar, Clock } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import {
  deriveHumanDesign,
  HD_TYPES,
  HD_AUTHORITIES,
  HD_PROFILES,
  type HumanDesignResult,
} from '../data/humanDesign';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'input' | 'result';

export function HumanDesignPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('input');
  const [birthDate, setBirthDate] = useState('');
  const [birthTime, setBirthTime] = useState('');
  const [result, setResult] = useState<HumanDesignResult | null>(null);

  // Auto-fill from profile if available
  useEffect(() => {
    if (profile?.birthDate) setBirthDate(profile.birthDate);
    if (profile?.birthTime) setBirthTime(profile.birthTime);
  }, [profile]);

  const runCalc = () => {
    if (!birthDate) {
      toast(t('humanDesign.needBirthDate', { defaultValue: 'Birth date is required' }), 'error');
      return;
    }
    const r = deriveHumanDesign(birthDate, birthTime || undefined);
    if (!r) {
      toast(t('humanDesign.calcFailed', { defaultValue: 'Could not calculate chart' }), 'error');
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
            {t('humanDesign.title', { defaultValue: 'Human Design' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('humanDesign.intro', {
              defaultValue:
                'Human Design maps the unique way you are built to engage with the world. Your type, strategy, authority, and profile show the path of least resistance — the way you are designed to make decisions, do work, and find alignment.',
            })}
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                {t('humanDesign.birthDate', { defaultValue: 'Birth date' })}
              </label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {t('humanDesign.birthTime', { defaultValue: 'Birth time (optional, sharpens result)' })}
              </label>
              <Input type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-mystic-600 mt-4 italic">
            {t('humanDesign.disclaimer', {
              defaultValue:
                'This is a lightweight reading. A full Human Design chart uses planetary positions from your exact birth moment. For the complete 9-centre bodygraph, export your birth data and visit a dedicated Human Design site.',
            })}
          </p>
        </Card>

        <Button variant="primary" fullWidth onClick={runCalc} className="min-h-[56px]">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('humanDesign.calculate', { defaultValue: 'Reveal my design' })}
        </Button>
      </div>
    );
  }

  if (stage === 'result' && result) {
    const typeInfo = HD_TYPES[result.type];
    const authorityInfo = HD_AUTHORITIES[result.authority];
    const profileInfo = HD_PROFILES[result.profile];

    const typeName = t(`humanDesign.types.${result.type}.name`, { defaultValue: typeInfo.name }) as string;
    const summary = t(`humanDesign.types.${result.type}.summary`, { defaultValue: typeInfo.summary }) as string;
    const strategy = t(`humanDesign.types.${result.type}.strategy`, { defaultValue: typeInfo.strategy }) as string;
    const notSelf = t(`humanDesign.types.${result.type}.notSelfTheme`, { defaultValue: typeInfo.notSelfTheme }) as string;
    const signature = t(`humanDesign.types.${result.type}.signature`, { defaultValue: typeInfo.signature }) as string;
    const strengths = t(`humanDesign.types.${result.type}.strengths`, {
      returnObjects: true,
      defaultValue: typeInfo.strengths,
    }) as string[];
    const challenges = t(`humanDesign.types.${result.type}.challenges`, {
      returnObjects: true,
      defaultValue: typeInfo.challenges,
    }) as string[];
    const affirmation = t(`humanDesign.types.${result.type}.affirmation`, { defaultValue: typeInfo.affirmation }) as string;
    const tarotPairing = t(`humanDesign.types.${result.type}.tarotPairing`, { defaultValue: typeInfo.tarotPairing }) as string;
    const authorityName = t(`humanDesign.authorities.${result.authority}.name`, {
      defaultValue: authorityInfo.name,
    }) as string;
    const authorityDesc = t(`humanDesign.authorities.${result.authority}.description`, {
      defaultValue: authorityInfo.description,
    }) as string;
    const authorityGuidance = t(`humanDesign.authorities.${result.authority}.guidance`, {
      defaultValue: authorityInfo.guidance,
    }) as string;
    const profileName = t(`humanDesign.profiles.${result.profile}.name`, {
      defaultValue: profileInfo.name,
    }) as string;
    const profileDesc = t(`humanDesign.profiles.${result.profile}.description`, {
      defaultValue: profileInfo.description,
    }) as string;

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: typeName,
          subtitle: `${t('humanDesign.profileLabel', { defaultValue: 'Profile' })} ${result.profile}`,
          tagline: strategy,
          affirmation,
          brand: 'Arcana · Human Design',
        });
        const out = await shareOrDownload(
          blob,
          `arcana-human-design-${result.type}.png`,
          `My Human Design: ${typeName}. ${strategy}`,
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
          {t('humanDesign.backToInput', { defaultValue: 'Recalculate' })}
        </button>

        <Card variant="glow" padding="lg" className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-mystic-800/50 rounded-full mb-3">
            <span className="text-xs text-mystic-500">{typeInfo.percentOfPopulation}</span>
          </div>
          <h2 className="font-display text-3xl text-mystic-100">{typeName}</h2>
          <p className="text-gold/80 text-sm mt-3 italic">"{strategy}"</p>
        </Card>

        <Card padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed">{summary}</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card padding="md" className="border-emerald-400/20">
            <p className="text-xs text-mystic-500 mb-1">
              {t('humanDesign.signatureLabel', { defaultValue: 'Signature' })}
            </p>
            <p className="text-lg text-emerald-400 font-display">{signature}</p>
          </Card>
          <Card padding="md" className="border-pink-400/20">
            <p className="text-xs text-mystic-500 mb-1">
              {t('humanDesign.notSelfLabel', { defaultValue: 'Not-self theme' })}
            </p>
            <p className="text-lg text-pink-400 font-display">{notSelf}</p>
          </Card>
        </div>

        <Card padding="lg">
          <h3 className="font-medium text-cosmic-blue mb-3">
            {t('humanDesign.authorityLabel', { defaultValue: 'Authority' })}: {authorityName}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed mb-3">{authorityDesc}</p>
          <p className="text-mystic-400 text-xs italic">💡 {authorityGuidance}</p>
        </Card>

        <Card padding="lg">
          <h3 className="font-medium text-gold mb-3">
            {t('humanDesign.profileLabel', { defaultValue: 'Profile' })} {result.profile} — {profileName}
          </h3>
          <p className="text-mystic-300 text-sm leading-relaxed">{profileDesc}</p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-3">
              {t('humanDesign.strengthsLabel', { defaultValue: 'Strengths' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {strengths.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </Card>
          <Card padding="lg">
            <h3 className="font-medium text-pink-400 mb-3">
              {t('humanDesign.challengesLabel', { defaultValue: 'Challenges' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {challenges.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </Card>
        </div>

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('humanDesign.affirmationLabel', { defaultValue: 'Your affirmation' })}
          </h3>
          <p className="text-mystic-200 italic leading-relaxed mb-4">"{affirmation}"</p>
          <p className="text-xs text-mystic-500">
            {t('humanDesign.tarotPairingLabel', { defaultValue: 'Tarot pairing' })}:{' '}
            <span className="text-gold/80">{tarotPairing}</span>
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('humanDesign.recalculate', { defaultValue: 'Recalculate' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default HumanDesignPage;
