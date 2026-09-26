import type { AspectType } from '../../types/astrology';
import { Chip } from '../ui';
import { useT } from '../../i18n/useT';
import { localizeAspectName } from '../../i18n/localizeNames';
import { ASPECT_STYLE, CHART_TOKENS, ELEMENT_COLOR } from '../../lib/chart';

export type AspectFilter = 'all' | 'tight';

interface Props {
  /** Aspect types actually drawn under the current filter — the legend never lists an absent line. */
  presentTypes: AspectType[];
  filter: AspectFilter;
  onFilterChange: (filter: AspectFilter) => void;
  counts: { all: number; tight: number };
  hasRetrograde: boolean;
  overlayLabel?: string | null;
}

const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'] as const;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Three rows: which aspects are drawn (with the orb filter that decides it),
 * which colour is which element, and the two markers a chart may carry —
 * retrograde and an outer overlay ring. Swatches use the same stroke
 * treatment as the wheel, from the one map in lib/chart.
 */
export function WheelLegend({ presentTypes, filter, onFilterChange, counts, hasRetrograde, overlayLabel }: Props) {
  const { t } = useT('app');

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-caption uppercase tracking-wider text-mystic-500">
          {t('chartWheel.legendAspects', { defaultValue: 'Aspects' })}
        </span>
        <div role="group" aria-label={t('chartWheel.orbFilterAria', { defaultValue: 'Which aspects to draw' })} className="flex gap-1.5">
          <Chip
            size="sm"
            selected={filter === 'all'}
            onSelect={() => onFilterChange('all')}
            label={t('chartWheel.aspectsAll', { defaultValue: 'All ({{n}})', n: counts.all })}
          />
          <Chip
            size="sm"
            selected={filter === 'tight'}
            onSelect={() => onFilterChange('tight')}
            label={t('chartWheel.aspectsTight', { defaultValue: 'Tight orbs ({{n}})', n: counts.tight })}
          />
        </div>
      </div>

      {presentTypes.length > 0 ? (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-mystic-400">
          {presentTypes.map((type) => {
            const s = ASPECT_STYLE[type];
            return (
              <li key={type} className="inline-flex items-center gap-1.5">
                <svg width="22" height="6" viewBox="0 0 22 6" aria-hidden>
                  <line
                    x1="1" y1="3" x2="21" y2="3"
                    stroke={s.color}
                    strokeWidth={s.width + 0.6}
                    strokeDasharray={s.dash ? s.dash.join(' ') : undefined}
                    strokeLinecap="round"
                  />
                </svg>
                {capitalize(localizeAspectName(type))}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-caption text-mystic-500">
          {t('chartWheel.noTightAspects', { defaultValue: 'No aspects within tight orbs. Switch to all to see every connection.' })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-mystic-400">
        <span className="uppercase tracking-wider text-mystic-500">
          {t('chartWheel.legendElements', { defaultValue: 'Elements' })}
        </span>
        {ELEMENTS.map((el) => (
          <span key={el} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: ELEMENT_COLOR[el] }} aria-hidden />
            {t(`horoscope.birthChartView.elements.${el}`)}
          </span>
        ))}
        {hasRetrograde && (
          <span className="inline-flex items-center gap-1">
            <span className="text-coral" aria-hidden>℞</span>
            {t('chartWheel.retrograde', { defaultValue: 'Retrograde' })}
          </span>
        )}
        {overlayLabel !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block border"
              style={{ borderColor: CHART_TOKENS.blueInk }}
              aria-hidden
            />
            {overlayLabel ?? t('chartWheel.transitLabel', { defaultValue: 'Transit' })}
          </span>
        )}
      </div>
    </div>
  );
}
