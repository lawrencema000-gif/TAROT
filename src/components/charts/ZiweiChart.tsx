export interface ZiweiStar {
  /** Romanised key, e.g. 'Ziwei' */
  key: string;
  cn: string;
  /** 化祿/化權/化科/化忌 attached to this star, if any */
  transformation?: 'hua_lu' | 'hua_quan' | 'hua_ke' | 'hua_ji' | null;
}

export interface ZiweiPalace {
  /** 0-11, 子=0 … 亥=11 */
  branchIdx: number;
  branchCn: string;
  /** palace key, e.g. 'life' */
  key: string;
  cn: string;
  en: string;
  stars: ZiweiStar[];
  isLife: boolean;
  isBody: boolean;
}

const TRANSFORM_STYLE: Record<string, { label: string; color: string }> = {
  hua_lu:   { label: '祿', color: '#5cc9a7' },
  hua_quan: { label: '權', color: '#d4a853' },
  hua_ke:   { label: '科', color: '#7db0d8' },
  hua_ji:   { label: '忌', color: '#e0684f' },
};

/**
 * Traditional Zi Wei Dou Shu chart (命盤) — a 4×4 grid where the twelve
 * earthly branches run anticlockwise around the border and the centre holds
 * the birth summary, exactly as it is drawn on paper.
 *
 *   巳 午 未 申
 *   辰 ┌─────┐ 酉
 *   卯 └─────┘ 戌
 *   寅 丑 子 亥
 */
const GRID_BRANCHES: (number | null)[][] = [
  [5, 6, 7, 8],
  [4, null, null, 9],
  [3, null, null, 10],
  [2, 1, 0, 11],
];

export function ZiweiChart({
  palaces,
  centre,
}: {
  palaces: ZiweiPalace[];
  centre: React.ReactNode;
}) {
  const byBranch = new Map(palaces.map((p) => [p.branchIdx, p]));

  return (
    <div className="grid grid-cols-4 grid-rows-4 gap-1 aspect-square w-full text-[10px]">
      {GRID_BRANCHES.flatMap((row, r) =>
        row.map((branch, c) => {
          // The 2×2 hole in the middle is one merged cell for the summary.
          if (branch === null) {
            if (r === 1 && c === 1) {
              return (
                <div
                  key="centre"
                  className="col-span-2 row-span-2 rounded-xl border border-gold/25 bg-mystic-900/60 p-2 flex flex-col items-center justify-center text-center overflow-hidden"
                >
                  {centre}
                </div>
              );
            }
            return null;
          }

          const p = byBranch.get(branch);
          return (
            <div
              key={`${r}-${c}`}
              className={`rounded-lg border p-1.5 flex flex-col overflow-hidden ${
                p?.isLife
                  ? 'border-gold/60 bg-gold/10'
                  : p?.isBody
                    ? 'border-cosmic-violet/50 bg-cosmic-violet/10'
                    : 'border-mystic-800/60 bg-mystic-900/40'
              }`}
            >
              {/* stars */}
              <div className="flex-1 flex flex-wrap gap-x-1 gap-y-0.5 content-start">
                {p?.stars.map((s) => {
                  const tr = s.transformation ? TRANSFORM_STYLE[s.transformation] : null;
                  return (
                    <span key={s.key} className="text-mystic-100 leading-tight whitespace-nowrap">
                      {s.cn}
                      {tr && (
                        <span
                          className="ml-0.5 px-0.5 rounded"
                          style={{ color: tr.color, border: `1px solid ${tr.color}66` }}
                        >
                          {tr.label}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* palace + branch footer */}
              <div className="flex items-end justify-between mt-1 pt-1 border-t border-mystic-800/40">
                <span className={`leading-none ${p?.isLife ? 'text-gold' : 'text-mystic-400'}`}>
                  {p?.cn}
                  {p?.isBody && <span className="text-cosmic-violet ml-0.5">身</span>}
                </span>
                <span className="text-mystic-600 leading-none">{p?.branchCn}</span>
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
}
