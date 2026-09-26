import { useState } from 'react';
import type { LuckPillar } from '../../data/baziDeep';
import { FIVE_ELEMENT_COLOR, FLAVOUR_COLOR, withAlpha } from '../../lib/chart';
import { Tag } from '../ui';
import { useT } from '../../i18n/useT';

/**
 * 大运 luck-pillar timeline — the 80-year band of ten-year cycles, coloured by
 * each pillar's stem element and ringed by whether it supports or challenges
 * the day master, with a "you are here" marker.
 *
 * Ages come from the exact solar-term calculation (3 days = 1 year measured to
 * the adjacent 節), so the band starts where the chart genuinely starts rather
 * than at a fixed guess. Each pillar is a button; tapping it spells out the
 * pillar, its ages and years and its flavour in a tag beneath.
 */
export function LuckPillarTimeline({
  pillars,
  currentAge,
}: {
  pillars: LuckPillar[];
  currentAge?: number | null;
}) {
  const { t } = useT('app');
  const [picked, setPicked] = useState<number | null>(null);
  if (!pillars.length) return null;

  const first = pillars[0];
  const last = pillars[pillars.length - 1];
  const spanStart = first.startAge;
  const spanEnd = last.endAge + 1;
  const span = Math.max(1, spanEnd - spanStart);

  const pct = (age: number) => ((age - spanStart) / span) * 100;
  const showMarker =
    typeof currentAge === 'number' && currentAge >= spanStart && currentAge <= spanEnd;

  const flavourLabel = (f: LuckPillar['flavour']) => t(`chartWheel.flavour.${f}`, { defaultValue: f.charAt(0).toUpperCase() + f.slice(1) });
  const describe = (p: LuckPillar) =>
    t('chartWheel.luckPillar.detail', {
      defaultValue: '{{stem}}{{branch}} · Age {{from}}–{{to}} · {{startYear}}–{{endYear}} · {{flavour}}',
      stem: p.stem, branch: p.branch, from: p.startAge, to: p.endAge, startYear: p.startYear, endYear: p.endYear, flavour: flavourLabel(p.flavour),
    });

  return (
    <div className="space-y-3">
      {/* the band */}
      <div className="relative">
        <div className="flex h-12 rounded-control overflow-hidden border border-mystic-800/60">
          {pillars.map((p, i) => {
            const isCurrent =
              typeof currentAge === 'number' &&
              currentAge >= p.startAge &&
              currentAge <= p.endAge;
            const isPicked = picked === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setPicked(isPicked ? null : i)}
                aria-pressed={isPicked}
                aria-label={describe(p)}
                className="flex-1 flex flex-col items-center justify-center relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-mystic-100"
                style={{
                  background: withAlpha(FIVE_ELEMENT_COLOR[p.element] ?? '#7e7e9e', isCurrent || isPicked ? 0.8 : 0.4),
                  // An inset ring is an outline on the swatch, not elevation.
                  boxShadow: isCurrent ? `inset 0 0 0 2px ${FLAVOUR_COLOR[p.flavour]}` : undefined,
                }}
              >
                <span className="text-meta font-medium text-mystic-950 leading-none" aria-hidden>{p.stem}</span>
                <span className="text-caption text-mystic-950/80 leading-none mt-0.5" aria-hidden>{p.branch}</span>
              </button>
            );
          })}
        </div>

        {showMarker && (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 bg-mystic-100 pointer-events-none"
            style={{ left: `${Math.min(100, Math.max(0, pct(currentAge!)))}%` }}
            aria-hidden
          />
        )}
      </div>

      {/* age axis */}
      <div className="flex justify-between text-caption text-mystic-500" aria-hidden>
        <span>{t('chartWheel.ageLabel', { defaultValue: 'Age {{n}}', n: first.startAge })}</span>
        <span>{Math.round((first.startAge + last.endAge) / 2)}</span>
        <span>{last.endAge}</span>
      </div>

      {/* what was tapped */}
      <div className="min-h-[28px] flex justify-center" aria-live="polite">
        {picked !== null && pillars[picked] ? (
          <Tag tone="gold" size="md">{describe(pillars[picked])}</Tag>
        ) : (
          <span className="text-caption text-mystic-500">
            {t('chartWheel.luckPillar.tapPrompt', { defaultValue: 'Tap a pillar to see its years' })}
          </span>
        )}
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(FIVE_ELEMENT_COLOR).map(([el, color]) => (
          <span key={el} className="inline-flex items-center gap-1 text-caption text-mystic-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} aria-hidden />
            {t(`bazi.elements.${el}`, { defaultValue: el.charAt(0).toUpperCase() + el.slice(1) })}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-caption text-mystic-500 ml-auto">
          <span className="w-2.5 h-2.5 rounded-mark inline-block" style={{ boxShadow: `inset 0 0 0 2px ${FLAVOUR_COLOR.supporting}` }} aria-hidden />
          {flavourLabel('supporting')}
          <span className="w-2.5 h-2.5 rounded-mark inline-block ml-2" style={{ boxShadow: `inset 0 0 0 2px ${FLAVOUR_COLOR.challenging}` }} aria-hidden />
          {flavourLabel('challenging')}
        </span>
      </div>

      {!first.startAgeExact && (
        <p className="text-caption text-mystic-500 italic">
          {t('chartWheel.luckPillar.startAgeEstimated', { defaultValue: 'Start age estimated — add your birth date for the exact solar-term calculation.' })}
        </p>
      )}
    </div>
  );
}
