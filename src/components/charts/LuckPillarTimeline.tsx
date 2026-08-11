import type { LuckPillar } from '../../data/baziDeep';

const ELEMENT_COLOR: Record<string, string> = {
  wood: '#8caa6a', fire: '#e0684f', earth: '#d4a853',
  metal: '#c8ccd4', water: '#7a7fd0',
};

const FLAVOUR_RING: Record<string, string> = {
  supporting: 'rgba(92, 201, 167, 0.9)',
  challenging: 'rgba(224, 104, 79, 0.9)',
  neutral: 'rgba(255, 255, 255, 0.25)',
};

/**
 * 大运 luck-pillar timeline — the 80-year band of ten-year cycles, coloured by
 * each pillar's stem element and ringed by whether it supports or challenges
 * the day master, with a "you are here" marker.
 *
 * Ages come from the exact solar-term calculation (3 days = 1 year measured to
 * the adjacent 節), so the band starts where the chart genuinely starts rather
 * than at a fixed guess.
 */
export function LuckPillarTimeline({
  pillars,
  currentAge,
}: {
  pillars: LuckPillar[];
  currentAge?: number | null;
}) {
  if (!pillars.length) return null;

  const first = pillars[0];
  const last = pillars[pillars.length - 1];
  const spanStart = first.startAge;
  const spanEnd = last.endAge + 1;
  const span = Math.max(1, spanEnd - spanStart);

  const pct = (age: number) => ((age - spanStart) / span) * 100;
  const showMarker =
    typeof currentAge === 'number' && currentAge >= spanStart && currentAge <= spanEnd;

  return (
    <div className="space-y-3">
      {/* the band */}
      <div className="relative">
        <div className="flex h-12 rounded-xl overflow-hidden border border-mystic-800/60">
          {pillars.map((p, i) => {
            const isCurrent =
              typeof currentAge === 'number' &&
              currentAge >= p.startAge &&
              currentAge <= p.endAge;
            return (
              <div
                key={i}
                title={`${p.stem} ${p.branch} · age ${p.startAge}–${p.endAge} · ${p.startYear}–${p.endYear} · ${p.flavour}`}
                className="flex-1 flex flex-col items-center justify-center relative transition-all"
                style={{
                  background: `${ELEMENT_COLOR[p.element] ?? '#666'}${isCurrent ? 'cc' : '66'}`,
                  boxShadow: isCurrent ? `inset 0 0 0 2px ${FLAVOUR_RING[p.flavour]}` : undefined,
                }}
              >
                <span className="text-[11px] font-medium text-mystic-950 leading-none">{p.stem}</span>
                <span className="text-[10px] text-mystic-950/80 leading-none mt-0.5">{p.branch}</span>
              </div>
            );
          })}
        </div>

        {showMarker && (
          <div
            className="absolute -top-1 -bottom-1 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] pointer-events-none"
            style={{ left: `${Math.min(100, Math.max(0, pct(currentAge!)))}%` }}
          />
        )}
      </div>

      {/* age axis */}
      <div className="flex justify-between text-[10px] text-mystic-600">
        <span>age {first.startAge}</span>
        <span>{Math.round((first.startAge + last.endAge) / 2)}</span>
        <span>{last.endAge}</span>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(ELEMENT_COLOR).map(([el, color]) => (
          <span key={el} className="inline-flex items-center gap-1 text-[10px] text-mystic-400 capitalize">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
            {el}
          </span>
        ))}
        <span className="inline-flex items-center gap-1 text-[10px] text-mystic-500 ml-auto">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ boxShadow: `inset 0 0 0 2px ${FLAVOUR_RING.supporting}` }} />
          supporting
          <span className="w-2.5 h-2.5 rounded-sm inline-block ml-2" style={{ boxShadow: `inset 0 0 0 2px ${FLAVOUR_RING.challenging}` }} />
          challenging
        </span>
      </div>

      {!first.startAgeExact && (
        <p className="text-[10px] text-mystic-600 italic">
          Start age estimated — add your birth date for the exact solar-term calculation.
        </p>
      )}
    </div>
  );
}
