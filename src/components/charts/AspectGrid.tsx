import { type AspectData, PLANET_GLYPH, ASPECT_COLOR, ASPECT_GLYPH } from '../../lib/chart';

const ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

/** Classic triangular aspect matrix. Each cell shows the aspect glyph (if any)
 *  between the row/column planet, colored by aspect family. */
export function AspectGrid({ aspects }: { aspects: AspectData[] }) {
  const lookup = new Map<string, AspectData>();
  for (const a of aspects) {
    lookup.set([a.planet1, a.planet2].sort().join('|'), a);
  }
  return (
    <div className="overflow-x-auto">
      <table className="border-collapse mx-auto">
        <tbody>
          {ORDER.map((row, ri) => (
            <tr key={row}>
              <td className="px-1.5 py-1 text-center text-base" style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[row]}</td>
              {ORDER.slice(0, ri).map((col) => {
                const a = lookup.get([row, col].sort().join('|'));
                return (
                  <td key={col} className="w-7 h-7 text-center border border-mystic-800/40">
                    {a ? (
                      <span title={`${row} ${a.type} ${col} (orb ${a.orb}°)`} style={{ color: ASPECT_COLOR[a.type], fontSize: 14 }}>
                        {ASPECT_GLYPH[a.type]}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
