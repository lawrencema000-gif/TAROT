import { ZIWEI_TRANSFORM_COLOR, withAlpha } from '../../lib/chart';
import { getLocale } from '../../i18n/config';
import { useT } from '../../i18n/useT';
import { useContentOverlay, ct } from '../../i18n/contentOverlay';
import { localizeHanzi } from '../../i18n/localizeHanzi';

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
 * stars wraps instead of being clipped at 390px. Each cell names its palace
 * the way the reader writes the term: 命宫 in Chinese and 命宮 / 官禄宮 in
 * Japanese (two or three characters, which fit a cell: the ja overlay's
 * names are glosses such as 自分自身 and broke mid-word, P7 F78), the
 * overlay's reading (명궁) in Korean, and the English word in English.
 * Stars and transformation marks follow the same script.
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
  const { overlay } = useContentOverlay('ziwei');
  const locale = getLocale();
  const cjk = locale === 'ja' || locale === 'zh' || locale === 'ko';
  const hz = (s: string) => localizeHanzi(s, locale);
  const byBranch = new Map(palaces.map((p) => [p.branchIdx, p]));
  const cellName = (p: ZiweiPalace): string => {
    if (locale === 'ko') return ct(overlay, `palaces.${p.key}.name`, p.cn);
    if (cjk) return hz(p.cn);
    return p.en || p.cn;
  };

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
          const name = p ? cellName(p) : '';
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
                      {hz(s.cn)}
                      {color && s.transformation && (
                        <span
                          className="ml-0.5 px-0.5 rounded-mark"
                          style={{ color, border: `1px solid ${withAlpha(color, 0.4)}` }}
                        >
                          {hz(TRANSFORM_LABEL[s.transformation])}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* palace + branch footer. Name, Body mark and branch are three
                  items that wrap between one another, never inside a word: a
                  cell is 62px wide at 390 (55 at 360) and "Wealth Body 申"
                  needs 84, so the glued "WealthBody" used to run the branch
                  out of the cell (P7 F51), and "Property 卯" needs 65. The
                  branch keeps the right edge (ml-auto) on whichever line it
                  lands. A name wider than the whole cell (none is today)
                  breaks as a last resort instead of overflowing; break-keep
                  keeps a CJK term (財帛宮) in one piece. */}
              <div className="flex flex-wrap items-end gap-x-1 mt-1 pt-1 border-t border-mystic-800/40 leading-tight">
                <span className={`min-w-0 break-keep break-words ${p?.isLife ? 'text-gold' : 'text-mystic-400'}`}>
                  {name}
                </span>
                {p?.isBody && (
                  <span className="text-cosmic-violet-ink">
                    {cjk ? '身' : t('chartWheel.ziwei.body', { defaultValue: 'Body' })}
                  </span>
                )}
                <span className="ml-auto text-mystic-500 shrink-0">{p?.branchCn}</span>
              </div>
            </div>
          );
        }),
      )}
    </div>
  );
}
