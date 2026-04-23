import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Heart, Users } from 'lucide-react';
import { Card, Button, Input, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import { useAuth } from '../context/AuthContext';
import {
  MBTI_TYPES,
  computeCompatibility,
  type MbtiType,
  type CompatResult,
} from '../data/partnerCompat';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'input' | 'result';

export function PartnerCompatPage() {
  const { t } = useT('app');
  const { profile } = useAuth();
  const [stage, setStage] = useState<Stage>('input');
  const [myMbti, setMyMbti] = useState<MbtiType | ''>('');
  const [partnerMbti, setPartnerMbti] = useState<MbtiType | ''>('');
  const [myBirth, setMyBirth] = useState('');
  const [partnerBirth, setPartnerBirth] = useState('');
  const [result, setResult] = useState<CompatResult | null>(null);

  useEffect(() => {
    if (profile?.mbtiType && !myMbti) setMyMbti(profile.mbtiType as MbtiType);
    if (profile?.birthDate && !myBirth) setMyBirth(profile.birthDate);
  }, [profile, myMbti, myBirth]);

  const run = () => {
    const hasMine = !!myMbti || !!myBirth;
    const hasPartner = !!partnerMbti || !!partnerBirth;
    if (!hasMine || !hasPartner) {
      toast(t('compat.needBothSides', { defaultValue: 'Need at least one data point from each side (MBTI or birth date).' }), 'error');
      return;
    }
    const r = computeCompatibility({
      myMbti: myMbti || undefined,
      partnerMbti: partnerMbti || undefined,
      myBirthDate: myBirth || undefined,
      partnerBirthDate: partnerBirth || undefined,
    });
    if (!r) {
      toast(t('compat.failed', { defaultValue: 'Could not compute compatibility' }), 'error');
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
          <Users className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('compat.title', { defaultValue: 'Partner Compatibility' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('compat.intro', {
              defaultValue:
                'Combines MBTI cognitive-function fit with astrology elemental compatibility to show you where you click, where you rub, and where the growth edges live. Enter what you know about each side — at least one from each.',
            })}
          </p>

          <h3 className="text-xs uppercase tracking-wider text-gold/70 mb-3">
            {t('compat.yourSide', { defaultValue: 'You' })}
          </h3>
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.yourMbti', { defaultValue: 'Your MBTI type' })}
              </label>
              <select
                value={myMbti}
                onChange={(e) => setMyMbti(e.target.value as MbtiType)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('compat.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                {MBTI_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.yourBirth', { defaultValue: 'Your birth date' })}
              </label>
              <Input type="date" value={myBirth} onChange={(e) => setMyBirth(e.target.value)} />
            </div>
          </div>

          <h3 className="text-xs uppercase tracking-wider text-pink-400/70 mb-3">
            {t('compat.partnerSide', { defaultValue: 'Partner' })}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.partnerMbti', { defaultValue: "Partner's MBTI" })}
              </label>
              <select
                value={partnerMbti}
                onChange={(e) => setPartnerMbti(e.target.value as MbtiType)}
                className="w-full bg-mystic-800/50 border border-mystic-700/50 rounded-xl p-3 text-mystic-100 text-sm focus:outline-none focus:border-gold/40"
              >
                <option value="">{t('compat.selectOrSkip', { defaultValue: 'Select or skip' })}</option>
                {MBTI_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-mystic-500 mb-1 block">
                {t('compat.partnerBirth', { defaultValue: "Partner's birth date" })}
              </label>
              <Input type="date" value={partnerBirth} onChange={(e) => setPartnerBirth(e.target.value)} />
            </div>
          </div>
        </Card>

        <Button variant="primary" fullWidth onClick={run} className="min-h-[56px]">
          <Heart className="w-5 h-5 mr-2" />
          {t('compat.runButton', { defaultValue: 'Reveal our compatibility' })}
        </Button>
      </div>
    );
  }

  if (stage === 'result' && result) {
    const scoreColor = result.overallScore >= 80 ? 'text-emerald-400'
      : result.overallScore >= 60 ? 'text-gold'
      : 'text-pink-400';

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: `${result.overallScore}%`,
          subtitle: t('compat.compatibilityLabel', { defaultValue: 'Compatibility' }) as string,
          tagline: `${myMbti || ''}${myMbti && partnerMbti ? ' × ' : ''}${partnerMbti || ''}`,
          affirmation: result.advice,
          brand: 'Arcana · Partner Compatibility',
        });
        const out = await shareOrDownload(blob, 'arcana-compatibility.png', `Our compatibility: ${result.overallScore}%`);
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <div className="space-y-4 pb-6">
        <button onClick={reset} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('compat.back', { defaultValue: 'Check another pair' })}
        </button>

        <Card variant="glow" padding="lg" className="text-center">
          <p className="text-xs tracking-widest uppercase text-mystic-500 mb-2">
            {t('compat.compatibilityLabel', { defaultValue: 'Compatibility' })}
          </p>
          <div className={`font-display text-7xl ${scoreColor} mb-3`}>{result.overallScore}%</div>
          <div className="flex justify-center items-center gap-3 text-sm text-mystic-400">
            {myMbti && <span>{myMbti}</span>}
            <Heart className="w-4 h-4 text-pink-400" />
            {partnerMbti && <span>{partnerMbti}</span>}
          </div>
        </Card>

        {result.mbtiScore > 0 && (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-cosmic-blue">
                {t('compat.mbtiLabel', { defaultValue: 'MBTI Fit' })}
              </h3>
              <span className="text-lg font-display text-gold">{result.mbtiScore}%</span>
            </div>
            <p className="text-mystic-300 text-sm leading-relaxed">{result.mbtiNote}</p>
          </Card>
        )}

        {result.astroScore > 0 && (
          <Card padding="lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-cosmic-violet">
                {t('compat.astroLabel', { defaultValue: 'Astrology Fit' })}
              </h3>
              <span className="text-lg font-display text-gold">{result.astroScore}%</span>
            </div>
            <p className="text-mystic-300 text-sm leading-relaxed">{result.astroNote}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card padding="lg">
            <h3 className="font-medium text-emerald-400 mb-3">
              {t('compat.strengthsLabel', { defaultValue: 'Strengths' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {result.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </Card>
          <Card padding="lg">
            <h3 className="font-medium text-pink-400 mb-3">
              {t('compat.growthLabel', { defaultValue: 'Growth edges' })}
            </h3>
            <ul className="space-y-2 text-mystic-300 text-sm">
              {result.growthEdges.map((g, i) => <li key={i}>• {g}</li>)}
            </ul>
          </Card>
        </div>

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <h3 className="font-medium text-gold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {t('compat.adviceLabel', { defaultValue: 'Advice' })}
          </h3>
          <p className="text-mystic-200 italic leading-relaxed">{result.advice}</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={reset} className="min-h-[48px]">
            {t('compat.another', { defaultValue: 'Check another' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default PartnerCompatPage;
