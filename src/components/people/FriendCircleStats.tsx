import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { Card } from '../ui';
import { getZodiacSign, zodiacData } from '../../utils/zodiac';
import { ELEMENT_COLOR, SIGN_GLYPH, SIGN_ORDER } from '../../lib/chart';
import type { Person } from '../../dal/people';

const MODALITY: Record<string, 'Cardinal' | 'Fixed' | 'Mutable'> = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};
const MODALITY_COLOR: Record<string, string> = { Cardinal: '#d4a853', Fixed: '#c98a9b', Mutable: '#7db0d8' };

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/** Element colour for a capitalised sign name ("Scorpio" → water blue). */
function signColor(sign: string): string {
  const key = sign.toLowerCase() as keyof typeof zodiacData;
  const element = zodiacData[key]?.element;
  return element ? ELEMENT_COLOR[capitalize(element)] : 'rgba(255,255,255,0.06)';
}

/**
 * Friend Circle stats — the distribution graphs over everyone you've saved.
 * Answers "what is my circle made of?" at a glance: element mix, modality
 * mix, and the zodiac spread. Pure client-side from birth dates already
 * stored; no extra fetch, no cost.
 */
export function FriendCircleStats({ people }: { people: Person[] }) {
  const stats = useMemo(() => {
    const elements: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
    const modalities: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
    const signs: Record<string, number> = {};
    for (const p of people) {
      try {
        const sign = capitalize(getZodiacSign(p.birthDate));
        const el = zodiacData[getZodiacSign(p.birthDate)].element;
        elements[capitalize(el)] = (elements[capitalize(el)] ?? 0) + 1;
        modalities[MODALITY[sign]] = (modalities[MODALITY[sign]] ?? 0) + 1;
        signs[sign] = (signs[sign] ?? 0) + 1;
      } catch { /* skip unparseable birth dates */ }
    }
    return { elements, modalities, signs };
  }, [people]);

  if (people.length < 2) return null;
  const total = people.length;
  const maxSign = Math.max(1, ...Object.values(stats.signs));

  const Row = ({ data, colors, label }: { data: Record<string, number>; colors: Record<string, string>; label: string }) => (
    <div className="space-y-1.5">
      <div className="text-[11px] uppercase tracking-wider text-mystic-500">{label}</div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-mystic-800/60">
        {Object.entries(data).map(([k, v]) => v > 0 && (
          <div key={k} title={`${k}: ${v}`} style={{ width: `${(v / total) * 100}%`, background: colors[k] }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {Object.entries(data).filter(([, v]) => v > 0).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1 text-[10px] text-mystic-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors[k] }} />{k} {v}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gold" />
        <h3 className="heading-display-md text-mystic-100">Your circle</h3>
        <span className="text-xs text-mystic-600 ml-auto">{total} people</span>
      </div>

      <Row data={stats.elements} colors={ELEMENT_COLOR} label="Elements" />
      <Row data={stats.modalities} colors={MODALITY_COLOR} label="Modalities" />

      <div className="space-y-1.5">
        <div className="text-[11px] uppercase tracking-wider text-mystic-500">Signs</div>
        <div className="grid grid-cols-6 gap-1.5">
          {SIGN_ORDER.map((sign) => {
            const count = stats.signs[sign] ?? 0;
            return (
              <div key={sign} title={`${sign}: ${count}`} className="flex flex-col items-center gap-0.5">
                <div className="w-full h-10 flex items-end">
                  <div className="w-full rounded-t transition-all"
                    style={{
                      height: `${count > 0 ? Math.max(14, (count / maxSign) * 100) : 4}%`,
                      background: count > 0 ? signColor(sign) : 'rgba(255,255,255,0.06)',
                    }} />
                </div>
                <span className="text-[13px] leading-none" style={{ fontFamily: 'serif', opacity: count > 0 ? 1 : 0.3 }}>{SIGN_GLYPH[sign]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
