import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card, Sheet, Skeleton, Progress, Tag, type Tone } from '../ui';
import { ChartWheel } from '../chart/ChartWheel';
import { houseTheme } from '../chart/houseThemes';
import { useNatalChart } from '../../hooks/useAstrology';
import type { ZodiacSign, Planet, Element, Modality, PlanetPlacement, Aspect } from '../../types/astrology';
import { ZodiacGlyph, PlanetGlyph } from '../icons';
import { localizeSignName, localizePlanetName, localizeAspectName } from '../../i18n/localizeNames';
import { ASPECT_GLYPH, ASPECT_TONE, ELEMENT_TONE, MODALITY_TONE, type ChartTone } from '../../lib/chart';

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

// Text class for each chart tone \u2014 the same hue the wheel draws the line in.
const TONE_TEXT: Record<ChartTone, string> = {
  neutral: 'text-mystic-300',
  gold: 'text-gold',
  teal: 'text-teal',
  coral: 'text-coral',
  blue: 'text-cosmic-blue-ink',
  violet: 'text-cosmic-violet-ink',
  rose: 'text-cosmic-rose',
};

function aspectMark(type: string): { symbol: string; color: string } {
  const tone = ASPECT_TONE[type] ?? 'neutral';
  return { symbol: ASPECT_GLYPH[type] ?? '?', color: TONE_TEXT[tone] };
}

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
  const { bigThree, planets, aspects, dominants } = natalChart;

  return (
    <div className="p-4 space-y-5">
      <Card variant="ornate" padding="md" interactive className="nebula-veil" onClick={() => setExpandedBigThree(!expandedBigThree)}>
        <div className="flex items-center justify-between">
          <h3 className="font-display-hero text-xl text-mystic-100">{t('horoscope.birthChartView.yourBigThree')}</h3>
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
              <div className="text-meta text-mystic-400">{item.labelI18n}</div>
              <div className="text-ui font-medium text-mystic-100">{localizeSignName(item.sign)}</div>
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
                  <div className="text-ui font-medium text-mystic-100 mb-1">{t('horoscope.birthChartView.planetInSign', { planet: planetLabel, sign: localizeSignName(sign) })}</div>
                  <p className="reading-copy">{signInterp.core}</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="sm">
        <ChartWheel
          chart={natalChart}
          onOpenPlanet={(p) => setSelectedPlacement(p)}
          onOpenAspect={(a) => setSelectedAspect(a)}
        />
      </Card>

      <div className="space-y-2">
        <h3 className="heading-display-md text-mystic-100 px-1">{t('horoscope.birthChartView.placements')}</h3>
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
                <span className="text-meta text-mystic-400">{t('horoscope.birthChartView.houseShort', { num: p.house })}</span>
              )}
              <Info className="w-3.5 h-3.5 text-mystic-600" />
            </button>
          ))}
        </div>
      </div>

      {dominants && (
        <Card padding="md" className="space-y-3">
          <h3 className="heading-display-md text-mystic-100">{t('horoscope.birthChartView.elementBalance')}</h3>
          <div className="space-y-2">
            {(Object.entries(dominants.elements) as [Element, number][]).map(([el, count]) => {
              const tone = (ELEMENT_TONE[el] ?? 'neutral') as Tone;
              return (
                <div key={el} className="flex items-center gap-3">
                  <Tag tone={tone} className="w-12 justify-center">
                    {t(`horoscope.birthChartView.elements.${el}`)}
                  </Tag>
                  <Progress
                    value={count}
                    max={10}
                    size="md"
                    tone={tone}
                    label={t(`horoscope.birthChartView.elements.${el}`) as string}
                    className="flex-1"
                  />
                  <span className="text-meta text-mystic-400 w-4">{count}</span>
                </div>
              );
            })}
          </div>
          <h3 className="heading-display-md text-mystic-100 pt-2">{t('horoscope.birthChartView.modalityBalance')}</h3>
          <div className="space-y-2">
            {(Object.entries(dominants.modalities) as [Modality, number][]).map(([mod, count]) => {
              const name = t(`chartWheel.modalities.${mod}`, { defaultValue: mod });
              return (
                <div key={mod} className="flex items-center gap-3">
                  <span className="text-meta font-medium w-16 text-mystic-400">{name}</span>
                  <Progress value={count} max={10} size="md" tone={(MODALITY_TONE[mod] ?? 'gold') as Tone} label={name} className="flex-1" />
                  <span className="text-meta text-mystic-400 w-4">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {aspects && aspects.length > 0 && (
        <div className="space-y-2">
          <h3 className="heading-display-md text-mystic-100 px-1">{t('horoscope.birthChartView.keyAspects')}</h3>
          <div className="space-y-1">
            {aspects.slice(0, 10).map((a, i) => {
              const info = aspectMark(a.type);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedAspect(a)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-mystic-800/40 transition-colors cursor-pointer text-left"
                >
                  <PlanetGlyph planet={a.planet1 as Planet} size={20} className="text-gold" />
                  <span className={`text-sm ${info.color}`}>{info.symbol}</span>
                  <PlanetGlyph planet={a.planet2 as Planet} size={20} className="text-gold" />

                  <span className="flex-1 text-meta text-mystic-400">
                    {localizePlanetName(a.planet1 as Planet)} {localizeAspectName(a.type)} {localizePlanetName(a.planet2 as Planet)}
                  </span>
                  <span className="text-meta text-mystic-400">{a.orb.toFixed(1)}&deg;</span>
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
            <div className="text-meta text-mystic-400">{t('horoscope.birthChartView.houseLabel', { num: placement.house })} · {houseTheme(t, placement.house)}</div>
          )}
        </div>
      </div>

      {signInterp && (
        <div className="space-y-3">
          <p className="reading-copy">{signInterp.core}</p>
          <div>
            <h4 className="text-meta font-medium text-teal mb-1.5">{t('horoscope.birthChartView.strengths')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {signInterp.strengths.map((s, i) => (
                <Tag key={i} tone="teal">{s}</Tag>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-meta font-medium text-coral mb-1.5">{t('horoscope.birthChartView.blindSpots')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {signInterp.blindSpots.map((s, i) => (
                <Tag key={i} tone="coral">{s}</Tag>
              ))}
            </div>
          </div>
          {signInterp.underStress && signInterp.underStress.length > 0 && (
            <div>
              <h4 className="text-meta font-medium text-cosmic-rose mb-1.5">{t('horoscope.birthChartView.underStress')}</h4>
              <ul className="space-y-1">
                {signInterp.underStress.map((s, i) => (
                  <li key={i} className="reading-copy pl-3 border-l-2 border-cosmic-rose/20">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {signInterp.growthPath && signInterp.growthPath.length > 0 && (
            <div>
              <h4 className="text-meta font-medium text-gold mb-1.5">{t('horoscope.birthChartView.growthPath')}</h4>
              <ul className="space-y-1">
                {signInterp.growthPath.map((s, i) => (
                  <li key={i} className="reading-copy pl-3 border-l-2 border-gold/20">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {houseInterp && (
        <div className="p-3 bg-mystic-800/30 rounded-xl space-y-2">
          <h4 className="text-ui font-medium text-mystic-100">{t('horoscope.birthChartView.inHouse', { num: placement.house })}</h4>
          <p className="reading-copy">{houseInterp.expression}</p>
          <div className="flex flex-wrap gap-1.5">
            {houseInterp.themes.map((t, i) => (
              <Tag key={i} tone="gold">{t}</Tag>
            ))}
          </div>
          {houseInterp.healthy && (
            <div className="pt-1">
              <h5 className="text-meta font-medium text-teal mb-0.5">{t('horoscope.birthChartView.atItsBest')}</h5>
              <p className="reading-copy pl-3 border-l-2 border-teal/20">{houseInterp.healthy}</p>
            </div>
          )}
          {houseInterp.unhealthy && (
            <div className="pt-1">
              <h5 className="text-meta font-medium text-coral mb-0.5">{t('horoscope.birthChartView.shadowSide')}</h5>
              <p className="reading-copy pl-3 border-l-2 border-coral/20">{houseInterp.unhealthy}</p>
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

  const info = aspectMark(aspect.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <div className="text-center flex flex-col items-center">
          <PlanetGlyph planet={aspect.planet1 as Planet} size={32} className="text-gold" framed />
          <div className="text-meta text-mystic-400 mt-1">{localizePlanetName(aspect.planet1 as Planet)}</div>
        </div>
        <div className={`text-xl ${info.color}`} aria-hidden>{info.symbol}</div>
        <div className="text-center flex flex-col items-center">
          <PlanetGlyph planet={aspect.planet2 as Planet} size={32} className="text-gold" framed />
          <div className="text-meta text-mystic-400 mt-1">{localizePlanetName(aspect.planet2 as Planet)}</div>
        </div>
      </div>
      <div className="text-center text-meta text-mystic-400">
        {t('horoscope.birthChartView.aspectMeta', {
          type: localizeAspectName(aspect.type),
          orb: aspect.orb.toFixed(1),
          motion: aspect.applying ? t('horoscope.birthChartView.applying') : t('horoscope.birthChartView.separating'),
        })}
      </div>
      <div className="reading-copy">
        <p>{interp.meaning}</p>
        <p className="italic">{interp.howItFeels}</p>
      </div>
    </div>
  );
}
