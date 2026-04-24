import { useMemo } from 'react';
import { Moon } from 'lucide-react';
import { Card } from '../ui';
import { useT } from '../../i18n/useT';
import { getMoonPhase } from '../../data/moonPhases';

/**
 * Home-screen widget — current lunar phase with ritual prompt.
 * Phase math runs client-side from the synodic period, so there's no
 * network dependency. Cached in a useMemo for the render cycle.
 */
export function MoonPhaseCard() {
  const { t } = useT('app');
  const phase = useMemo(() => getMoonPhase(), []);
  const nextPhaseName = t(`moon.phase.${phase.nextPhase.key}.name`, { defaultValue: phase.nextPhase.key });

  return (
    <Card padding="lg" className="bg-gradient-to-br from-cosmic-blue/5 via-mystic-900 to-mystic-900 border-cosmic-blue/20">
      <div className="flex items-center gap-2 mb-3">
        <Moon className="w-4 h-4 text-cosmic-blue" />
        <h3 className="text-sm font-medium text-cosmic-blue tracking-wide">
          {t('moon.title', { defaultValue: 'Tonight\'s Moon' })}
        </h3>
      </div>

      <div className="flex items-start gap-4 mb-3">
        <div className="text-5xl leading-none flex-shrink-0" aria-hidden="true">{phase.glyph}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-lg text-mystic-100 mb-0.5">
            {t(`moon.phase.${phase.key}.name`, { defaultValue: phase.name })}
          </h4>
          <p className="text-[11px] text-mystic-500 tracking-wide">
            {t('moon.illumination', {
              defaultValue: '{{pct}}% illuminated · day {{day}} of ~29.5',
              pct: Math.round(phase.illumination * 100),
              day: phase.ageDays,
            })}
          </p>
        </div>
      </div>

      <p className="text-sm text-mystic-300 leading-relaxed mb-3">
        {t(`moon.phase.${phase.key}.guidance`, { defaultValue: phase.guidance })}
      </p>

      <div className="pt-3 border-t border-mystic-800/50">
        <p className="text-[10px] uppercase tracking-wider text-mystic-500 mb-1">
          {t('moon.ritual', { defaultValue: 'Tonight\'s ritual' })}
        </p>
        <p className="text-xs text-mystic-400 leading-relaxed italic">
          {t(`moon.phase.${phase.key}.ritual`, { defaultValue: phase.ritual })}
        </p>
      </div>

      {phase.nextPhase.inDays > 0 && (
        <p className="text-[10px] text-mystic-600 mt-3">
          {t('moon.nextPhase', {
            defaultValue: 'Next: {{name}} in {{days}} days',
            name: nextPhaseName,
            days: phase.nextPhase.inDays,
          })}
        </p>
      )}
    </Card>
  );
}
