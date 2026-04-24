import { useState } from 'react';
import { ArrowLeft, Sparkles, Home } from 'lucide-react';
import { Card, Button, toast } from '../components/ui';
import { useT } from '../i18n/useT';
import {
  BAGUA_AREAS,
  BAGUA_AREA_ORDER,
  computeBaguaReading,
  type BaguaArea,
  type BaguaReading,
} from '../data/fengShuiBagua';
import { renderShareCard, shareOrDownload } from '../utils/shareableResultCard';

type Stage = 'rate' | 'result';

export function FengShuiPage() {
  const { t } = useT('app');
  const [stage, setStage] = useState<Stage>('rate');
  const [scores, setScores] = useState<Record<BaguaArea, number>>({
    wealth: 3, fame: 3, relationships: 3, family: 3, health: 3,
    creativity: 3, knowledge: 3, career: 3, helpers: 3,
  });
  const [reading, setReading] = useState<BaguaReading | null>(null);

  const setScore = (area: BaguaArea, v: number) => {
    setScores((prev) => ({ ...prev, [area]: v }));
  };

  const compute = () => {
    setReading(computeBaguaReading(scores));
    setStage('result');
  };

  if (stage === 'rate') {
    return (
      <div className="space-y-6 pb-6">
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 text-gold" />
          <h1 className="font-display text-2xl text-mystic-100">
            {t('fengshui.title', { defaultValue: 'Feng Shui Bagua' })}
          </h1>
        </div>

        <Card variant="glow" padding="lg">
          <p className="text-mystic-300 text-sm leading-relaxed mb-4">
            {t('fengshui.intro', {
              defaultValue:
                'The Bagua map divides life into nine areas. Rate how each area of YOUR life feels right now on a 1-5 scale. We\'ll surface the area most wanting attention and the Feng Shui adjustments that nourish it.',
            })}
          </p>

          <div className="space-y-3">
            {BAGUA_AREA_ORDER.map((area) => {
              const info = BAGUA_AREAS[area];
              return (
                <div key={area} className="p-3 bg-mystic-800/30 rounded-xl">
                  <p className="text-sm text-mystic-200 font-medium">
                    {t(`fengshui.areas.${area}.name`, { defaultValue: info.name })}
                  </p>
                  <p className="text-xs text-mystic-500 mb-2">
                    {t(`fengshui.areas.${area}.meaning`, { defaultValue: info.meaning })}
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setScore(area, v)}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                          scores[area] === v
                            ? 'bg-gold/20 border-gold/50 text-gold'
                            : 'bg-mystic-900/50 border-mystic-700/30 text-mystic-400'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-mystic-500 mt-3 italic">
            {t('fengshui.scale', { defaultValue: '1 = severely depleted · 3 = okay · 5 = thriving' })}
          </p>
        </Card>

        <Button variant="primary" fullWidth onClick={compute} className="min-h-[56px]">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('fengshui.reveal', { defaultValue: 'Reveal my Bagua' })}
        </Button>
      </div>
    );
  }

  if (stage === 'result' && reading) {
    const focusInfo = BAGUA_AREAS[reading.focusArea];
    const strongInfo = BAGUA_AREAS[reading.strongestArea];
    const focusName = t(`fengshui.areas.${reading.focusArea}.name`, { defaultValue: focusInfo.name }) as string;
    const strongName = t(`fengshui.areas.${reading.strongestArea}.name`, { defaultValue: strongInfo.name }) as string;
    const focusMeaning = t(`fengshui.areas.${reading.focusArea}.meaning`, { defaultValue: focusInfo.meaning }) as string;
    const adjustments = t(`fengshui.areas.${reading.focusArea}.adjustments`, {
      returnObjects: true,
      defaultValue: focusInfo.adjustments,
    }) as string[];

    const handleShare = async () => {
      try {
        const blob = await renderShareCard({
          title: focusName,
          subtitle: t('fengshui.shareSubtitle', { defaultValue: 'Needs attention' }) as string,
          tagline: focusMeaning,
          affirmation: adjustments[0] ?? '',
          brand: 'Arcana · Feng Shui Bagua',
        });
        const out = await shareOrDownload(blob, 'arcana-fengshui.png', `Feng Shui reading: ${focusName}`);
        if (out === 'downloaded') toast(t('quizzes.share.downloaded', { defaultValue: 'Saved to your device' }), 'success');
      } catch {
        toast(t('quizzes.share.failed', { defaultValue: 'Could not create share image' }), 'error');
      }
    };

    return (
      <div className="space-y-4 pb-6">
        <button onClick={() => setStage('rate')} className="flex items-center gap-2 text-mystic-400 hover:text-mystic-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t('fengshui.backToRate', { defaultValue: 'Re-rate' })}
        </button>

        {/* 3x3 Bagua grid */}
        <Card padding="lg">
          <h3 className="font-medium text-mystic-200 mb-3">
            {t('fengshui.mapLabel', { defaultValue: 'Your Bagua map' })}
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {BAGUA_AREA_ORDER.map((area) => {
              const info = BAGUA_AREAS[area];
              const score = reading.scores[area];
              const isFocus = area === reading.focusArea;
              const isStrong = area === reading.strongestArea;
              return (
                <div
                  key={area}
                  className={`aspect-square p-2 rounded-lg border flex flex-col items-center justify-center text-center ${
                    isFocus ? 'border-pink-400/40 bg-pink-400/5'
                    : isStrong ? 'border-emerald-400/40 bg-emerald-400/5'
                    : 'border-mystic-700/30 bg-mystic-800/30'
                  }`}
                >
                  <span className="text-[10px] text-mystic-500 leading-tight">
                    {t(`fengshui.areas.${area}.name`, { defaultValue: info.name }).split(' / ')[0]}
                  </span>
                  <span className={`text-xl font-display mt-1 ${
                    isFocus ? 'text-pink-400'
                    : isStrong ? 'text-emerald-400'
                    : score >= 4 ? 'text-gold' : 'text-mystic-400'
                  }`}>
                    {score}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-mystic-500 text-center">
            {t('fengshui.overallScore', { defaultValue: 'Overall: {{n}} / 5', n: reading.overall.toFixed(1) })}
          </p>
        </Card>

        <Card padding="lg" className="border-pink-400/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <h3 className="font-medium text-pink-400">
              {t('fengshui.focusLabel', { defaultValue: 'Area needing attention' })}
            </h3>
          </div>
          <h2 className="font-display text-2xl text-mystic-100 mb-2">{focusName}</h2>
          <p className="text-mystic-300 text-sm leading-relaxed mb-3">{focusMeaning}</p>
          <p className="text-xs text-mystic-500 italic">
            {t('fengshui.elementLabel', { defaultValue: 'Element' })}: {focusInfo.element} · {t('fengshui.colorLabel', { defaultValue: 'Colour' })}: {focusInfo.color}
          </p>
        </Card>

        <Card padding="lg" className="bg-gradient-to-br from-gold/5 to-mystic-900 border-gold/20">
          <h3 className="font-medium text-gold mb-3">
            {t('fengshui.adjustmentsLabel', { defaultValue: 'Try these adjustments' })}
          </h3>
          <ul className="space-y-2">
            {adjustments.map((adj, i) => (
              <li key={i} className="text-mystic-200 text-sm leading-relaxed">• {adj}</li>
            ))}
          </ul>
          <p className="text-xs text-mystic-500 mt-4 italic">
            {t('fengshui.placement', {
              defaultValue: 'Place these adjustments in the {{dir}} of your room (oriented from the entry door).',
              dir: focusInfo.direction,
            })}
          </p>
        </Card>

        <Card padding="md" className="border-emerald-400/20">
          <p className="text-xs text-mystic-500 mb-1">
            {t('fengshui.strongestLabel', { defaultValue: 'Your strongest area' })}
          </p>
          <p className="text-emerald-400 text-sm font-medium">{strongName}</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" fullWidth className="min-h-[48px]" onClick={handleShare}>
            <Sparkles className="w-4 h-4 mr-2" />
            {t('quizzes.share.button', { defaultValue: 'Share' })}
          </Button>
          <Button variant="outline" fullWidth onClick={() => setStage('rate')} className="min-h-[48px]">
            {t('fengshui.reRate', { defaultValue: 'Re-rate' })}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default FengShuiPage;
