import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Card, Sheet, Skeleton } from '../ui';
import { ChartWheel } from './ChartWheel';
import { useNatalChart } from '../../hooks/useAstrology';
import { SIGN_SYMBOLS, PLANET_SYMBOLS, HOUSE_THEMES } from '../../types/astrology';
import type { ZodiacSign, Planet, Element, Modality, PlanetPlacement, Aspect } from '../../types/astrology';
import { getPlanetInSign } from '../../data/planetInSign';
import { getGenericHouseInterp } from '../../data/planetInHouse';
import { getAspectInterp, getGenericAspectInterp } from '../../data/aspects';

const ELEMENT_COLORS: Record<Element, string> = {
  Fire: 'bg-coral/20 text-coral',
  Earth: 'bg-teal/20 text-teal',
  Air: 'bg-cosmic-blue/20 text-cosmic-blue',
  Water: 'bg-mystic-500/20 text-mystic-300',
};

const ASPECT_LABELS: Record<string, { symbol: string; color: string }> = {
  conjunction: { symbol: '\u260C', color: 'text-gold' },
  opposition: { symbol: '\u260D', color: 'text-cosmic-rose' },
  trine: { symbol: '\u25B3', color: 'text-teal' },
  square: { symbol: '\u25A1', color: 'text-coral' },
  sextile: { symbol: '\u2731', color: 'text-cosmic-blue' },
};

export function BirthChart() {
  const { chart, loading, error } = useNatalChart();
  const [expandedBigThree, setExpandedBigThree] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<PlanetPlacement | null>(null);
  const [selectedAspect, setSelectedAspect] = useState<Aspect | null>(null);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-[320px] w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (error || !chart) {
    return (
      <div className="p-6 text-center">
        <p className="text-mystic-400">{error || 'No chart data available'}</p>
      </div>
    );
  }

  const { natalChart } = chart;
  const { bigThree, planets, houses, ascendant, aspects, dominants } = natalChart;

  return (
    <div className="p-4 space-y-5">
      <Card variant="glow" padding="md" interactive onClick={() => setExpandedBigThree(!expandedBigThree)}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-mystic-100">Your Big Three</h3>
          {expandedBigThree ? <ChevronUp className="w-4 h-4 text-mystic-400" /> : <ChevronDown className="w-4 h-4 text-mystic-400" />}
        </div>
        <div className="flex gap-3 mt-3">
          {[
            { label: 'Sun', sign: bigThree.sun.sign },
            { label: 'Moon', sign: bigThree.moon.sign },
            ...(bigThree.rising ? [{ label: 'Rising', sign: bigThree.rising.sign }] : []),
          ].map((item) => (
            <div key={item.label} className="flex-1 text-center py-2 bg-mystic-800/40 rounded-xl">
              <div className="text-xl mb-0.5" style={{ fontFamily: 'serif' }}>
                {SIGN_SYMBOLS[item.sign]}
              </div>
              <div className="text-[10px] text-mystic-500">{item.label}</div>
              <div className="text-xs font-medium text-mystic-200">{item.sign}</div>
            </div>
          ))}
        </div>
        {expandedBigThree && (
          <div className="mt-4 space-y-3 animate-fade-in">
            {[
              { planet: 'Sun' as const, sign: bigThree.sun.sign },
              { planet: 'Moon' as const, sign: bigThree.moon.sign },
              ...(bigThree.rising ? [{ planet: 'Rising' as const, sign: bigThree.rising.sign }] : []),
            ].map(({ planet, sign }) => {
              const interp = getPlanetInSign(planet, sign);
              if (!interp) return null;
              return (
                <div key={planet} className="p-3 bg-mystic-800/30 rounded-xl">
                  <div className="text-xs font-medium text-gold mb-1">{planet} in {sign}</div>
                  <p className="text-xs text-mystic-300 leading-relaxed">{interp.core}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ChartWheel planets={planets} houses={houses} ascendant={ascendant} />

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-mystic-300 px-1">Placements</h3>
        <div className="space-y-1">
          {planets.map((p) => (
            <button
              key={p.planet}
              onClick={() => setSelectedPlacement(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-mystic-800/40 transition-colors cursor-pointer text-left"
            >
              <span className="text-lg w-6 text-center" style={{ fontFamily: 'serif' }}>
                {PLANET_SYMBOLS[p.planet as Planet]}
              </span>
              <span className="text-sm text-mystic-200 flex-1">{p.planet}</span>
              <span className="text-sm" style={{ fontFamily: 'serif' }}>
                {SIGN_SYMBOLS[p.sign]}
              </span>
              <span className="text-sm text-mystic-300">{p.sign} {p.degree.toFixed(0)}&deg;</span>
              {p.house && (
                <span className="text-xs text-mystic-500">H{p.house}</span>
              )}
              <Info className="w-3.5 h-3.5 text-mystic-600" />
            </button>
          ))}
        </div>
      </div>

      {dominants && (
        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-medium text-mystic-300">Element Balance</h3>
          <div className="space-y-2">
            {(Object.entries(dominants.elements) as [Element, number][]).map(([el, count]) => (
              <div key={el} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-12 px-2 py-0.5 rounded-full text-center ${ELEMENT_COLORS[el]}`}>
                  {el}
                </span>
                <div className="flex-1 bg-mystic-800/40 rounded-full h-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      el === 'Fire' ? 'bg-coral' : el === 'Earth' ? 'bg-teal' : el === 'Air' ? 'bg-cosmic-blue' : 'bg-mystic-400'
                    }`}
                    style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-mystic-500 w-4">{count}</span>
              </div>
            ))}
          </div>
          <h3 className="text-sm font-medium text-mystic-300 pt-2">Modality Balance</h3>
          <div className="space-y-2">
            {(Object.entries(dominants.modalities) as [Modality, number][]).map(([mod, count]) => (
              <div key={mod} className="flex items-center gap-3">
                <span className="text-xs font-medium w-16 text-mystic-400">{mod}</span>
                <div className="flex-1 bg-mystic-800/40 rounded-full h-2">
                  <div
                    className="h-full rounded-full bg-gold/60 transition-all"
                    style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-mystic-500 w-4">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {aspects && aspects.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-mystic-300 px-1">Key Aspects</h3>
          <div className="space-y-1">
            {aspects.slice(0, 10).map((a, i) => {
              const info = ASPECT_LABELS[a.type] || { symbol: '?', color: 'text-mystic-400' };
              return (
                <button
                  key={i}
                  onClick={() => setSelectedAspect(a)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-mystic-800/40 transition-colors cursor-pointer text-left"
                >
                  <span className="text-sm text-mystic-200">
                    {PLANET_SYMBOLS[a.planet1 as Planet]}
                  </span>
                  <span className={`text-sm ${info.color}`}>{info.symbol}</span>
                  <span className="text-sm text-mystic-200">
                    {PLANET_SYMBOLS[a.planet2 as Planet]}
                  </span>
                  <span className="flex-1 text-xs text-mystic-400">
                    {a.planet1} {a.type} {a.planet2}
                  </span>
                  <span className="text-xs text-mystic-500">{a.orb.toFixed(1)}&deg;</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Sheet
        open={!!selectedPlacement}
        onClose={() => setSelectedPlacement(null)}
        title={selectedPlacement ? `${selectedPlacement.planet} in ${selectedPlacement.sign}` : ''}
      >
        {selectedPlacement && <PlacementDetail placement={selectedPlacement} />}
      </Sheet>

      <Sheet
        open={!!selectedAspect}
        onClose={() => setSelectedAspect(null)}
        title={selectedAspect ? `${selectedAspect.planet1} ${selectedAspect.type} ${selectedAspect.planet2}` : ''}
      >
        {selectedAspect && <AspectDetail aspect={selectedAspect} />}
      </Sheet>
    </div>
  );
}

function PlacementDetail({ placement }: { placement: PlanetPlacement }) {
  const signInterp = getPlanetInSign(placement.planet as Planet, placement.sign as ZodiacSign);
  const houseInterp = placement.house ? getGenericHouseInterp(placement.planet as Planet, placement.house) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl" style={{ fontFamily: 'serif' }}>
          {PLANET_SYMBOLS[placement.planet as Planet]}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg" style={{ fontFamily: 'serif' }}>
              {SIGN_SYMBOLS[placement.sign]}
            </span>
            <span className="font-medium text-mystic-100">{placement.sign} {placement.degree.toFixed(1)}&deg;</span>
          </div>
          {placement.house && (
            <div className="text-xs text-mystic-400">House {placement.house} - {HOUSE_THEMES[placement.house - 1]}</div>
          )}
        </div>
      </div>

      {signInterp && (
        <div className="space-y-3">
          <p className="text-sm text-mystic-200 leading-relaxed">{signInterp.core}</p>
          <div>
            <h4 className="text-xs font-medium text-teal mb-1.5">Strengths</h4>
            <div className="flex flex-wrap gap-1.5">
              {signInterp.strengths.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-teal/10 text-teal rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-coral mb-1.5">Blind Spots</h4>
            <div className="flex flex-wrap gap-1.5">
              {signInterp.blindSpots.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-coral/10 text-coral rounded-full">{s}</span>
              ))}
            </div>
          </div>
          {signInterp.underStress && signInterp.underStress.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-cosmic-rose mb-1.5">Under Stress</h4>
              <ul className="space-y-1">
                {signInterp.underStress.map((s, i) => (
                  <li key={i} className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-cosmic-rose/20">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {signInterp.growthPath && signInterp.growthPath.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gold mb-1.5">Growth Path</h4>
              <ul className="space-y-1">
                {signInterp.growthPath.map((s, i) => (
                  <li key={i} className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-gold/20">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {houseInterp && (
        <div className="p-3 bg-mystic-800/30 rounded-xl space-y-2">
          <h4 className="text-xs font-medium text-gold">In House {placement.house}</h4>
          <p className="text-xs text-mystic-300 leading-relaxed">{houseInterp.expression}</p>
          <div className="flex flex-wrap gap-1.5">
            {houseInterp.themes.map((t, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-gold/10 text-gold rounded-full">{t}</span>
            ))}
          </div>
          {houseInterp.healthy && (
            <div className="pt-1">
              <h5 className="text-[10px] font-medium text-teal mb-0.5">At Its Best</h5>
              <p className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-teal/20">{houseInterp.healthy}</p>
            </div>
          )}
          {houseInterp.unhealthy && (
            <div className="pt-1">
              <h5 className="text-[10px] font-medium text-coral mb-0.5">Shadow Side</h5>
              <p className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-coral/20">{houseInterp.unhealthy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AspectDetail({ aspect }: { aspect: Aspect }) {
  const interp = getAspectInterp(aspect.planet1 as Planet, aspect.planet2 as Planet, aspect.type) ||
    getGenericAspectInterp(aspect.planet1 as Planet, aspect.planet2 as Planet, aspect.type);

  const info = ASPECT_LABELS[aspect.type] || { symbol: '?', color: 'text-mystic-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <div className="text-2xl" style={{ fontFamily: 'serif' }}>{PLANET_SYMBOLS[aspect.planet1 as Planet]}</div>
          <div className="text-xs text-mystic-400">{aspect.planet1}</div>
        </div>
        <div className={`text-xl ${info.color}`}>{info.symbol}</div>
        <div className="text-center">
          <div className="text-2xl" style={{ fontFamily: 'serif' }}>{PLANET_SYMBOLS[aspect.planet2 as Planet]}</div>
          <div className="text-xs text-mystic-400">{aspect.planet2}</div>
        </div>
      </div>
      <div className="text-center text-xs text-mystic-500">
        {aspect.type} &bull; Orb: {aspect.orb.toFixed(1)}&deg; &bull; {aspect.applying ? 'Applying' : 'Separating'}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-mystic-200 leading-relaxed">{interp.meaning}</p>
        <p className="text-sm text-mystic-300 leading-relaxed italic">{interp.howItFeels}</p>
      </div>
    </div>
  );
}
