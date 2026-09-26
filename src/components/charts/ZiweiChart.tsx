import { ZIWEI_TRANSFORM_COLOR, withAlpha } from '../../lib/chart';
import { getLocale } from '../../i18n/config';
import { useT } from '../../i18n/useT';

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

const TRANSFORM_LABEL: Record<string, string> = {
  hua_lu: '祿', hua_quan: '權', hua_ke: '科', hua_ji: '忌',
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
 *
 * Rows share a height but grow with their content, so a palace with many
 * stars wraps instead of being clipped at 390px. Palace names render in
 * English outside the CJK locales when the data carries one.
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
  const { t } = useT('app');
  const locale = getLocale();
  const cjk = locale === 'ja' || locale === 'zh' || locale === 'ko';
  const byBranch = new Map(palaces.map((p) => [p.branchIdx, p]));

  return (
    <div className="grid grid-cols-4 auto-rows-fr gap-1 w-full text-caption">
      {GRID_BRANCHES.flatMap((row, r) =>
        row.map((branch, c) => {
          // The 2×2 hole in the middle is one merged cell for the summary.
          if (branch === null) {
            if (r === 1 && c === 1) {
              return (
                <div
                  key="centre"
                  className="col-span-2 row-span-2 rounded-control border border-gold/25 bg-mystic-900/60 p-2 flex flex-col items-center justify-center text-center"
                >
                  {centre}
                </div>
              );
            }
            return null;
          }

          const p = byBranch.get(branch);
          const name = p ? (cjk || !p.en ? p.cn : p.en) : '';
          return (
            <div
              key={`${r}-${c}`}
              className={`rounded-inset border p-1.5 min-h-[72px] flex flex-col ${
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
                  const color = s.transformation ? ZIWEI_TRANSFORM_COLOR[s.transformation] : null;
                  return (
                    <span key={s.key} className="text-mystic-100 leading-tight whitespace-nowrap">
                      {s.cn}
                      {color && s.transformation && (
                        <span
                          className="ml-0.5 px-0.5 rounded-mark"
                          style={{ color, border: `1px solid ${withAlpha(color, 0.4)}` }}
                        >
                          {TRANSFORM_LABEL[s.transformation]}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* palace + branch footer */}
              <div className="flex items-end justify-between gap-1 mt-1 pt-1 border-t border-mystic-800/40">
                <span className={`leading-tight ${p?.isLife ? 'text-gold' : 'text-mystic-400'}`}>
                  {name}
                  {p?.isBody && (
                    <span className="text-cosmic-violet-ink ml-0.5">
                      {cjk ? '身' : t('chartWheel.ziwei.body', { defaultValue: 'Body' })}
                    </span>
                  )}
                </span>
                <span className="text-mystic-500 leading-none shrink-0">{p?.branchCn}</span>
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
}
