import { PLANET_GLYPH } from '../../lib/chart';

export interface FirdariaPeriod {
  lord: string;
  start: string;
  end: string;
  years: number;
  subs?: { lord: string; start: string; end: string }[];
}
export interface FirdariaData {
  sect: 'day' | 'night';
  periods: FirdariaPeriod[];
  current: { major: string; sub: string | null } | null;
}

const LORD_COLOR: Record<string, string> = {
  Sun: '#d4a853', Moon: '#b8c4e0', Mercury: '#7db0d8', Venus: '#c98a9b',
  Mars: '#e0684f', Jupiter: '#8caa6a', Saturn: '#8f88a8',
  'North Node': '#5cc9a7', 'South Node': '#a98ac9',
};

/** Horizontal life-timeline of Firdaria time-lord periods (0–90y) with a
 *  "you are here" marker and the current major's sub-period strip. */
export function FirdariaTimeline({ data, birthDate }: { data: FirdariaData; birthDate: string }) {
  const birth = Date.parse(`${birthDate}T00:00:00Z`);
  const SPAN_YEARS = 90;
  const spanMs = SPAN_YEARS * 365.2425 * 86400000;
  const nowPct = Math.min(100, Math.max(0, ((Date.now() - birth) / spanMs) * 100));

  const seg = (startIso: string, endIso: string) => {
    const s = Math.max(0, (Date.parse(startIso) - birth) / spanMs) * 100;
    const e = Math.min(1, (Date.parse(endIso) - birth) / spanMs) * 100;
    return { left: s, width: Math.max(0, e - s) };
  };

  const currentMajor = data.periods.find(
    (p) => data.current && p.lord === data.current.major &&
      Date.now() >= Date.parse(p.start) && Date.now() < Date.parse(p.end),
  );

  return (
    <div className="space-y-4">
      {/* major-period band */}
      <div>
        <div className="relative h-9 rounded-lg overflow-hidden border border-mystic-800/60">
          {data.periods.map((p, i) => {
            const { left, width } = seg(p.start, p.end);
            if (width <= 0) return null;
            return (
              <div key={i} title={`${p.lord} · age ${((Date.parse(p.start) - birth) / (365.2425 * 86400000)).toFixed(0)}–${((Date.parse(p.end) - birth) / (365.2425 * 86400000)).toFixed(0)}`}
                className="absolute top-0 bottom-0 flex items-center justify-center text-[10px] text-mystic-950 font-semibold"
                style={{ left: `${left}%`, width: `${width}%`, background: LORD_COLOR[p.lord] ?? '#666', opacity: 0.85 }}>
                {width > 4 ? (PLANET_GLYPH[p.lord] ?? (p.lord.includes('North') ? '☊' : '☋')) : ''}
              </div>
            );
          })}
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" style={{ left: `${nowPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-mystic-600 mt-1">
          <span>birth</span><span>30</span><span>60</span><span>90 yrs</span>
        </div>
      </div>

      {/* current major's sub-period strip */}
      {currentMajor?.subs && (
        <div>
          <div className="text-xs text-mystic-400 mb-1.5">
            Inside your <span className="text-gold">{currentMajor.lord}</span> period ({currentMajor.start.slice(0, 4)}–{currentMajor.end.slice(0, 4)}):
          </div>
          <div className="relative h-7 rounded-lg overflow-hidden border border-mystic-800/60 flex">
            {currentMajor.subs.map((s, i) => {
              const isNow = Date.now() >= Date.parse(s.start) && Date.now() < Date.parse(s.end);
              return (
                <div key={i} title={`${s.lord}: ${s.start} → ${s.end}`}
                  className={`flex-1 flex items-center justify-center text-[10px] font-semibold ${isNow ? 'ring-2 ring-white/80 z-10' : ''}`}
                  style={{ background: LORD_COLOR[s.lord] ?? '#666', opacity: isNow ? 1 : 0.55, color: '#12101c' }}>
                  {PLANET_GLYPH[s.lord]}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {Object.entries(LORD_COLOR).map(([lord, color]) => (
          <span key={lord} className="inline-flex items-center gap-1 text-[10px] text-mystic-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />{lord}
          </span>
        ))}
      </div>
    </div>
  );
}
