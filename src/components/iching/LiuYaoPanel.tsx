import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, EyebrowLabel } from '../ui';
import {
  readLiuYao, RELATIVE_INFO, SPIRIT_INFO, PALACE_INFO, type LiuYaoLine,
} from '../../data/liuYao';
import {
  LIUYAO_INTRO, RELATIVE_MEANINGS, SPIRIT_MEANINGS, PALACE_MEANINGS,
  WORLD_RESPONSE_NOTE, MOVING_LINE_NOTE,
} from '../../data/liuYaoContent';
import type { LineValue } from '../../data/ichingHexagrams';

/**
 * 六爻 — the same cast, read as a diagnostic instrument.
 *
 * Classical I Ching reads the hexagram's wisdom text; 納甲筮法 tags each line
 * with a stem-branch, a family role and a spirit and reads the interaction. We
 * show it as a second layer on the cast the user already made rather than a
 * separate ritual, because re-casting for a second method would imply the two
 * answers are independent when they are readings of one moment.
 */
export function LiuYaoPanel({ lineValues }: { lineValues: LineValue[] }) {
  const [openLine, setOpenLine] = useState<number | null>(null);
  const reading = useMemo(() => readLiuYao(lineValues), [lineValues]);
  if (!reading) return null;

  const LineRow = ({ l }: { l: LiuYaoLine }) => {
    const open = openLine === l.position;
    const rel = RELATIVE_MEANINGS[l.relative];
    const spirit = SPIRIT_MEANINGS[l.spirit];
    return (
      <div className="border-b border-mystic-800/40 last:border-0">
        <button onClick={() => setOpenLine(open ? null : l.position)} className="w-full flex items-center gap-2 py-2 text-left">
          {/* the line itself, drawn */}
          <span className="w-9 flex-shrink-0 flex items-center justify-center">
            {l.line === 'yang'
              ? <span className="block w-7 h-1 bg-mystic-200 rounded-sm" />
              : (
                <span className="flex gap-1">
                  <span className="block w-3 h-1 bg-mystic-200 rounded-sm" />
                  <span className="block w-3 h-1 bg-mystic-200 rounded-sm" />
                </span>
              )}
          </span>
          <span className="text-mystic-400 text-xs w-10 flex-shrink-0" style={{ fontFamily: 'serif' }}>
            {l.branchCn}
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-mystic-100 text-sm" style={{ fontFamily: 'serif' }}>
              {RELATIVE_INFO[l.relative].cn}
            </span>
            <span className="text-mystic-500 text-xs"> {RELATIVE_INFO[l.relative].en}</span>
          </span>
          <span className="text-mystic-500 text-xs" style={{ fontFamily: 'serif' }}>
            {SPIRIT_INFO[l.spirit].cn}
          </span>
          {l.moving && <span className="text-gold text-[10px] uppercase tracking-wider">動</span>}
          {l.isWorld && <span className="text-cosmic-violet text-xs" style={{ fontFamily: 'serif' }}>世</span>}
          {l.isResponse && <span className="text-mystic-400 text-xs" style={{ fontFamily: 'serif' }}>應</span>}
          <ChevronDown className={`w-4 h-4 text-mystic-600 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="pb-3 pl-11 space-y-2">
            {rel && (
              <p className="text-[13px] text-mystic-300 leading-relaxed">
                <span className="text-gold">{rel.cn} · {rel.title}</span> — {rel.text}
              </p>
            )}
            {rel && <p className="text-[13px] text-mystic-400 leading-relaxed">{rel.asks}</p>}
            {spirit && (
              <p className="text-[13px] text-mystic-400 leading-relaxed">
                <span className="text-cosmic-violet">{spirit.cn}</span> — {spirit.text}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const palace = PALACE_MEANINGS[reading.palace];

  return (
    <Card className="p-4 space-y-4">
      <div className="space-y-2">
        <EyebrowLabel>六爻 · 納甲筮法</EyebrowLabel>
        <p className="text-xs text-mystic-500 leading-relaxed">{LIUYAO_INTRO}</p>
      </div>

      <div className="text-sm text-mystic-300">
        <span style={{ fontFamily: 'serif' }} className="text-gold">
          {reading.palaceCn}
        </span>
        <span className="text-mystic-500"> · {PALACE_INFO[reading.palace].element}</span>
        <span className="text-mystic-500"> · {reading.rankCn}</span>
        <span className="text-mystic-600 text-xs">
          {' '}— 日辰 {reading.dayPillar.cn}
        </span>
      </div>
      {palace && <p className="text-[13px] text-mystic-400 leading-relaxed">{palace.text}</p>}

      {/* Lines run bottom-to-top, as a hexagram is drawn. */}
      <div>
        {[...reading.lines].reverse().map((l) => <LineRow key={l.position} l={l} />)}
      </div>

      <p className="text-[13px] text-mystic-400 leading-relaxed border-t border-mystic-800/40 pt-3">
        {WORLD_RESPONSE_NOTE}
      </p>
      {reading.movingLines.length > 0 && (
        <p className="text-[13px] text-mystic-400 leading-relaxed">{MOVING_LINE_NOTE}</p>
      )}

      {reading.hidden.length > 0 && (
        <div className="border-t border-mystic-800/40 pt-3 space-y-1">
          <div className="text-xs text-gold/80">伏神 · Hidden</div>
          <p className="text-[13px] text-mystic-400 leading-relaxed">
            {reading.hidden.map((h) => `${RELATIVE_INFO[h.relative].cn} (${RELATIVE_INFO[h.relative].en}) under line ${h.position}`).join(' · ')}
            {' '}— roles absent from the cast, read from the palace’s parent hexagram. A missing
            role often matters as much as a present one.
          </p>
        </div>
      )}
    </Card>
  );
}
