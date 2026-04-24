import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card, Sheet, Skeleton } from '../ui';
import { ChartWheel } from './ChartWheel';
import { useNatalChart } from '../../hooks/useAstrology';
import { HOUSE_THEMES } from '../../types/astrology';
import type { ZodiacSign, Planet, Element, Modality, PlanetPlacement, Aspect } from '../../types/astrology';
import { ZodiacGlyph, PlanetGlyph } from '../icons';
import { localizeSignName, localizePlanetName, localizeAspectName } from '../../i18n/localizeNames';

// Lazy-loaded interpretation data modules
type PlanetInSignModule = typeof import('../../data/planetInSign');
type PlanetInHouseModule = typeof import('../../data/planetInHouse');
type AspectsModule = typeof import('../../data/aspects');

function useInterpData() {
  const [loaded, setLoaded] = useState(false);
  const modulesRef = useRef<{
    getPlanetInSign: PlanetInSignModule['getPlanetInSign'] | null;
    getGenericHouseInterp: PlanetInHouseModule['getGenericHouseInterp'] | null;
    getAspectInterp: AspectsModule['getAspectInterp'] | null;
    getGenericAspectInterp: AspectsModule['getGenericAspectInterp'] | null;
  }>({ getPlanetInSign: null, getGenericHouseInterp: null, getAspectInterp: null, getGenericAspectInterp: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../../data/planetInSign'),
      import('../../data/planetInHouse'),
      import('../../data/aspects'),
    ]).then(([signMod, houseMod, aspectMod]) => {
      if (cancelled) return;
      modulesRef.current = {
        getPlanetInSign: signMod.getPlanetInSign,
        getGenericHouseInterp: houseMod.getGenericHouseInterp,
        getAspectInterp: aspectMod.getAspectInterp,
        getGenericAspectInterp: aspectMod.getGenericAspectInterp,
      };
      setLoaded(true);
    }).catch((err) => {
      console.warn('[BirthChart] Failed to load interpretation modules:', err);
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  return { loaded, ...modulesRef.current };
}

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
  const { t } = useT('app');
  const { chart, loading, error } = useNatalChart();
  const interp = useInterpData();
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
        <p className="text-mystic-400">{error || t('horoscope.birthChartView.noChartData')}</p>
      </div>
    );
  }

  const { natalChart } = chart;
  const { bigThree, planets, houses, ascendant, aspects, dominants } = natalChart;

  return (
    <div className="p-4 space-y-5">
      <Card variant="ornate" padding="md" interactive className="nebula-veil" onClick={() => setExpandedBigThree(!expandedBigThree)}>
        <div className="flex items-center justify-between">
          <h3 className="font-display-hero text-xl text-gold-foil">{t('horoscope.birthChartView.yourBigThree')}</h3>
          {expandedBigThree ? <ChevronUp className="w-4 h-4 text-mystic-400" /> : <ChevronDown className="w-4 h-4 text-mystic-400" />}
        </div>
        <div className="flex gap-3 mt-3">
          {[
            { label: 'Sun', labelI18n: t('horoscope.birthChartView.sun'), sign: bigThree.sun.sign },
            { label: 'Moon', labelI18n: t('horoscope.birthChartView.moon'), sign: bigThree.moon.sign },
            ...(bigThree.rising ? [{ label: 'Rising', labelI18n: t('horoscope.birthChartView.rising'), sign: bigThree.rising.sign }] : []),
          ].map((item) => (
            <div key={item.label} className="flex-1 text-center py-2 bg-mystic-800/40 rounded-xl flex flex-col items-center">
              <ZodiacGlyph sign={item.sign} size={26} className="text-gold mb-1" />
              <div className="text-[10px] text-mystic-500">{item.labelI18n}</div>
              <div className="text-xs font-medium text-mystic-200">{localizeSignName(item.sign)}</div>
            </div>
          ))}
        </div>
        {expandedBigThree && (
          <div className="mt-4 space-y-3 animate-fade-in">
            {[
              { planet: 'Sun' as const, planetLabel: t('horoscope.birthChartView.sun'), sign: bigThree.sun.sign },
              { planet: 'Moon' as const, planetLabel: t('horoscope.birthChartView.moon'), sign: bigThree.moon.sign },
              ...(bigThree.rising ? [{ planet: 'Rising' as const, planetLabel: t('horoscope.birthChartView.rising'), sign: bigThree.rising.sign }] : []),
            ].map(({ planet, planetLabel, sign }) => {
              const signInterp = interp.getPlanetInSign?.(planet, sign);
              if (!signInterp) return null;
              return (
                <div key={planet} className="p-3 bg-mystic-800/30 rounded-xl">
                  <div className="text-xs font-medium text-gold mb-1">{t('horoscope.birthChartView.planetInSign', { planet: planetLabel, sign: localizeSignName(sign) })}</div>
                  <p className="text-xs text-mystic-300 leading-relaxed">{signInterp.core}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <ChartWheel planets={planets} houses={houses} ascendant={ascendant} />

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-mystic-300 px-1">{t('horoscope.birthChartView.placements')}</h3>
        <div className="space-y-1">
          {planets.map((p) => (
            <button
              key={p.planet}
              onClick={() => setSelectedPlacement(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-mystic-800/40 transition-colors cursor-pointer text-left"
            >
              <PlanetGlyph planet={p.planet as Planet} size={22} className="text-gold flex-shrink-0" />
              <span className="text-sm text-mystic-200 flex-1">{localizePlanetName(p.planet as Planet)}</span>
              <ZodiacGlyph sign={p.sign} size={18} className="text-mystic-300" />
              <span className="text-sm text-mystic-300">{localizeSignName(p.sign)} {p.degree.toFixed(0)}&deg;</span>
              {p.house && (
                <span className="text-xs text-mystic-500">{t('horoscope.birthChartView.houseShort', { num: p.house })}</span>
              )}
              <Info className="w-3.5 h-3.5 text-mystic-600" />
            </button>
          ))}
        </div>
      </div>

      {dominants && (
        <Card padding="md" className="space-y-3">
          <h3 className="text-sm font-medium text-mystic-300">{t('horoscope.birthChartView.elementBalance')}</h3>
          <div className="space-y-2">
            {(Object.entries(dominants.elements) as [Element, number][]).map(([el, count]) => (
              <div key={el} className="flex items-center gap-3">
                <span className={`text-xs font-medium w-12 px-2 py-0.5 rounded-full text-center ${ELEMENT_COLORS[el]}`}>
                  {t(`horoscope.birthChartView.elements.${el}`)}
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
          <h3 className="text-sm font-medium text-mystic-300 pt-2">{t('horoscope.birthChartView.modalityBalance')}</h3>
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
          <h3 className="text-sm font-medium text-mystic-300 px-1">{t('horoscope.birthChartView.keyAspects')}</h3>
          <div className="space-y-1">
            {aspects.slice(0, 10).map((a, i) => {
              const info = ASPECT_LABELS[a.type] || { symbol: '?', color: 'text-mystic-400' };
              return (
                <button
                  key={i}
                  onClick={() => setSelectedAspect(a)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-mystic-800/40 transition-colors cursor-pointer text-left"
                >
                  <PlanetGlyph planet={a.planet1 as Planet} size={20} className="text-gold" />
                  <span className={`text-sm ${info.color}`}>{info.symbol}</span>
                  <PlanetGlyph planet={a.planet2 as Planet} size={20} className="text-gold" />

                  <span className="flex-1 text-xs text-mystic-400">
                    {localizePlanetName(a.planet1 as Planet)} {localizeAspectName(a.type)} {localizePlanetName(a.planet2 as Planet)}
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
        title={selectedPlacement ? t('horoscope.exploreView.planetInSign', { planet: localizePlanetName(selectedPlacement.planet as Planet), sign: localizeSignName(selectedPlacement.sign) }) : ''}
      >
        {selectedPlacement && interp.loaded && <PlacementDetail placement={selectedPlacement} getPlanetInSign={interp.getPlanetInSign!} getGenericHouseInterp={interp.getGenericHouseInterp!} />}
      </Sheet>

      <Sheet
        open={!!selectedAspect}
        onClose={() => setSelectedAspect(null)}
        title={selectedAspect ? `${localizePlanetName(selectedAspect.planet1 as Planet)} ${localizeAspectName(selectedAspect.type)} ${localizePlanetName(selectedAspect.planet2 as Planet)}` : ''}
      >
        {selectedAspect && interp.loaded && <AspectDetail aspect={selectedAspect} getAspectInterp={interp.getAspectInterp!} getGenericAspectInterp={interp.getGenericAspectInterp!} />}
      </Sheet>
    </div>
  );
}

function PlacementDetail({ placement, getPlanetInSign, getGenericHouseInterp }: {
  placement: PlanetPlacement;
  getPlanetInSign: PlanetInSignModule['getPlanetInSign'];
  getGenericHouseInterp: PlanetInHouseModule['getGenericHouseInterp'];
}) {
  const { t } = useT('app');
  const signInterp = getPlanetInSign(placement.planet as Planet, placement.sign as ZodiacSign);
  const houseInterp = placement.house ? getGenericHouseInterp(placement.planet as Planet, placement.house) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <PlanetGlyph planet={placement.planet as Planet} size={36} className="text-gold" framed />
        <div>
          <div className="flex items-center gap-2">
            <ZodiacGlyph sign={placement.sign} size={20} className="text-gold" />
            <span className="font-medium text-mystic-100">{localizeSignName(placement.sign)} {placement.degree.toFixed(1)}&deg;</span>
          </div>
          {placement.house && (
            <div className="text-xs text-mystic-400">{t('horoscope.birthChartView.houseLabel', { num: placement.house })} - {HOUSE_THEMES[placement.house - 1]}</div>
          )}
        </div>
      </div>

      {signInterp && (
        <div className="space-y-3">
          <p className="text-sm text-mystic-200 leading-relaxed">{signInterp.core}</p>
          <div>
            <h4 className="text-xs font-medium text-teal mb-1.5">{t('horoscope.birthChartView.strengths')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {signInterp.strengths.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-teal/10 text-teal rounded-full">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-coral mb-1.5">{t('horoscope.birthChartView.blindSpots')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {signInterp.blindSpots.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 bg-coral/10 text-coral rounded-full">{s}</span>
              ))}
            </div>
          </div>
          {signInterp.underStress && signInterp.underStress.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-cosmic-rose mb-1.5">{t('horoscope.birthChartView.underStress')}</h4>
              <ul className="space-y-1">
                {signInterp.underStress.map((s, i) => (
                  <li key={i} className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-cosmic-rose/20">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {signInterp.growthPath && signInterp.growthPath.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gold mb-1.5">{t('horoscope.birthChartView.growthPath')}</h4>
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
          <h4 className="text-xs font-medium text-gold">{t('horoscope.birthChartView.inHouse', { num: placement.house })}</h4>
          <p className="text-xs text-mystic-300 leading-relaxed">{houseInterp.expression}</p>
          <div className="flex flex-wrap gap-1.5">
            {houseInterp.themes.map((t, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 bg-gold/10 text-gold rounded-full">{t}</span>
            ))}
          </div>
          {houseInterp.healthy && (
            <div className="pt-1">
              <h5 className="text-[10px] font-medium text-teal mb-0.5">{t('horoscope.birthChartView.atItsBest')}</h5>
              <p className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-teal/20">{houseInterp.healthy}</p>
            </div>
          )}
          {houseInterp.unhealthy && (
            <div className="pt-1">
              <h5 className="text-[10px] font-medium text-coral mb-0.5">{t('horoscope.birthChartView.shadowSide')}</h5>
              <p className="text-xs text-mystic-300 leading-relaxed pl-3 border-l-2 border-coral/20">{houseInterp.unhealthy}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AspectDetail({ aspect, getAspectInterp, getGenericAspectInterp }: {
  aspect: Aspect;
  getAspectInterp: AspectsModule['getAspectInterp'];
  getGenericAspectInterp: AspectsModule['getGenericAspectInterp'];
}) {
  const { t } = useT('app');
  const interp = getAspectInterp(aspect.planet1 as Planet, aspect.planet2 as Planet, aspect.type) ||
    getGenericAspectInterp(aspect.planet1 as Planet, aspect.planet2 as Planet, aspect.type);

  const info = ASPECT_LABELS[aspect.type] || { symbol: '?', color: 'text-mystic-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <div className="text-center flex flex-col items-center">
          <PlanetGlyph planet={aspect.planet1 as Planet} size={32} className="text-gold" framed />
          <div className="text-xs text-mystic-400 mt-1">{aspect.planet1}</div>
        </div>
        <div className={`text-xl ${info.color}`}>{info.symbol}</div>
        <div className="text-center flex flex-col items-center">
          <PlanetGlyph planet={aspect.planet2 as Planet} size={32} className="text-gold" framed />
          <div className="text-xs text-mystic-400 mt-1">{aspect.planet2}</div>
        </div>
      </div>
      <div className="text-center text-xs text-mystic-500">
        {t('horoscope.birthChartView.aspectMeta', {
          type: aspect.type,
          orb: aspect.orb.toFixed(1),
          motion: aspect.applying ? t('horoscope.birthChartView.applying') : t('horoscope.birthChartView.separating'),
        })}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-mystic-200 leading-relaxed">{interp.meaning}</p>
        <p className="text-sm text-mystic-300 leading-relaxed italic">{interp.howItFeels}</p>
      </div>
    </div>
  );
}
