import { useMemo } from 'react';
import { Card, EyebrowLabel } from '../ui';
import { MoonPhaseGlyph } from '../icons/MoonPhaseGlyph';
import { useT } from '../../i18n/useT';
import { getMoonPhase } from '../../data/moonPhases';

/**
 * Tonight's Moon, with its ritual.
 *
 * Phase math runs client-side from astronomy-engine, so there is no
 * network dependency. The glyph is drawn from the same numbers the card
 * prints, so the two can never disagree.
 */
export function MoonPhaseCard() {
  const { t } = useT('app');
  const phase = useMemo(() => getMoonPhase(), []);
  if (!phase) return null;
  const nextPhaseName = t(`moon.phase.${phase.nextPhase.key}.name`, { defaultValue: phase.nextPhase.key });
  const name = t(`moon.phase.${phase.key}.name`, { defaultValue: phase.name });

  return (
    <Card padding="md">
      <EyebrowLabel>{t('moon.title', { defaultValue: 'Tonight’s Moon' })}</EyebrowLabel>

      <div className="flex items-center gap-4 mt-3">
        <MoonPhaseGlyph
          illumination={phase.illumination}
          waxing={phase.waxing}
          size={56}
          className="text-gold shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="heading-display-md text-mystic-100">{name}</h3>
          <p className="text-meta text-mystic-400 mt-0.5">
            {t('moon.illumination', {
              defaultValue: '{{pct}}% illuminated · day {{day}} of ~29.5',
              pct: Math.round(phase.illumination * 100),
              day: phase.ageDays,
            })}
          </p>
        </div>
      </div>

      <p className="text-ui text-mystic-300 leading-relaxed mt-4">
        {t(`moon.phase.${phase.key}.guidance`, { defaultValue: phase.guidance })}
      </p>

      <div className="mt-4 pt-4 border-t border-mystic-700">
        <EyebrowLabel>{t('moon.ritual', { defaultValue: 'Tonight’s ritual' })}</EyebrowLabel>
        <p className="text-meta text-mystic-300 leading-relaxed mt-1">
          {t(`moon.phase.${phase.key}.ritual`, { defaultValue: phase.ritual })}
        </p>
      </div>

      {phase.nextPhase.inDays > 0 && (
        <p className="text-caption text-mystic-500 mt-3">
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
