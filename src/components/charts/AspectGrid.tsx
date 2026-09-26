import { useState } from 'react';
import { PLANETS, type Planet } from '../../types/astrology';
import { type AspectData, ASPECT_COLOR, ASPECT_GLYPH, ASPECT_TONE, isAspectType, isPlanet } from '../../lib/chart';
import { PlanetGlyph } from '../icons';
import { Tag } from '../ui';
import { useT } from '../../i18n/useT';
import { localizeAspectName, localizePlanetName } from '../../i18n/localizeNames';

const pairKey = (a: string, b: string) => [a, b].sort().join('|');

/**
 * Classic triangular aspect matrix. The planet glyphs run down the diagonal,
 * so each one heads the column above it and the row to its left — the
 * columns used to be unlabelled. A cell is a button: tapping it names the
 * pair and the orb in a tag under the grid (the old `title` tooltip never
 * fired on touch). Colours come from the one map in lib/chart.
 */
export function AspectGrid({ aspects }: { aspects: AspectData[] }) {
  const { t } = useT('app');
  const [selected, setSelected] = useState<AspectData | null>(null);

  const lookup = new Map<string, AspectData>();
  for (const a of aspects) lookup.set(pairKey(a.planet1, a.planet2), a);

  const describe = (a: AspectData, row: Planet, col: Planet) =>
    `${localizePlanetName(row)} ${isAspectType(a.type) ? localizeAspectName(a.type) : a.type} ${localizePlanetName(col)} · ${t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: a.orb })}`;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="border-collapse mx-auto" aria-label={t('chartWheel.aspectGridAria', { defaultValue: 'Aspect grid' })}>
          <tbody>
            {PLANETS.map((row, ri) => (
              <tr key={row}>
                {PLANETS.slice(0, ri).map((col) => {
                  const a = lookup.get(pairKey(row, col));
                  const isSel = !!a && selected === a;
                  return (
                    <td key={col} className="w-[30px] h-[30px] p-0 text-center border border-mystic-800/40">
                      {a && (
                        <button
                          type="button"
                          onClick={() => setSelected(isSel ? null : a)}
                          aria-pressed={isSel}
                          aria-label={describe(a, row, col)}
                          className={`w-full h-full inline-flex items-center justify-center text-ui leading-none rounded-mark
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50
                            ${isSel ? 'bg-mystic-800' : ''}`}
                          style={{ color: ASPECT_COLOR[a.type] }}
                        >
                          <span aria-hidden>{ASPECT_GLYPH[a.type] ?? '·'}</span>
                        </button>
                      )}
                    </td>
                  );
                })}
                <th scope="row" className="w-[30px] h-[30px] p-0 text-center border border-mystic-800/40 bg-mystic-800/60">
                  <PlanetGlyph planet={row} size={15} className="text-mystic-200 mx-auto" aria-label={localizePlanetName(row)} />
                </th>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="min-h-[28px] flex justify-center" aria-live="polite">
        {selected && isPlanet(selected.planet1) && isPlanet(selected.planet2) ? (
          <Tag tone={ASPECT_TONE[selected.type] ?? 'neutral'} size="md">
            {describe(selected, selected.planet1, selected.planet2)}
          </Tag>
        ) : (
          <span className="text-caption text-mystic-500">
            {t('chartWheel.gridTapPrompt', { defaultValue: 'Tap a cell to read the aspect' })}
          </span>
        )}
      </div>
    </div>
  );
}
