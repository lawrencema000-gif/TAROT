import { useState, useEffect, useMemo, useRef } from 'react';
import { Orbit, Home, Triangle, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useT } from '../../i18n/useT';
import { Card, Chip, Skeleton } from '../ui';
import { useTransitCalendar, useNatalChart } from '../../hooks/useAstrology';
import { SIGN_SYMBOLS, PLANET_SYMBOLS, PLANETS, HOUSE_THEMES } from '../../types/astrology';
import type { Planet, AspectType, PlanetPlacement, Aspect } from '../../types/astrology';

// Lazy-loaded data modules
type TransitsModule = typeof import('../../data/transits');
type PlanetInHouseModule = typeof import('../../data/planetInHouse');
type AspectsModule = typeof import('../../data/aspects');

interface LazyExploreData {
  loaded: boolean;
  getTransitInterp: TransitsModule['getTransitInterp'] | null;
  getGenericTransitInterp: TransitsModule['getGenericTransitInterp'] | null;
  getPlanetInHouse: PlanetInHouseModule['getPlanetInHouse'] | null;
  getGenericHouseInterp: PlanetInHouseModule['getGenericHouseInterp'] | null;
  getAspectInterp: AspectsModule['getAspectInterp'] | null;
  getGenericAspectInterp: AspectsModule['getGenericAspectInterp'] | null;
}

function useExploreData(): LazyExploreData {
  const [loaded, setLoaded] = useState(false);
  const modulesRef = useRef<Omit<LazyExploreData, 'loaded'>>({
    getTransitInterp: null, getGenericTransitInterp: null,
    getPlanetInHouse: null, getGenericHouseInterp: null,
    getAspectInterp: null, getGenericAspectInterp: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../../data/transits'),
      import('../../data/planetInHouse'),
      import('../../data/aspects'),
    ]).then(([transitMod, houseMod, aspectMod]) => {
      if (cancelled) return;
      modulesRef.current = {
        getTransitInterp: transitMod.getTransitInterp,
        getGenericTransitInterp: transitMod.getGenericTransitInterp,
        getPlanetInHouse: houseMod.getPlanetInHouse,
        getGenericHouseInterp: houseMod.getGenericHouseInterp,
        getAspectInterp: aspectMod.getAspectInterp,
        getGenericAspectInterp: aspectMod.getGenericAspectInterp,
      };
      setLoaded(true);
    }).catch((err) => {
      console.warn('[Explore] Failed to load interpretation modules:', err);
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, []);

  return { loaded, ...modulesRef.current };
}

type ExploreTab = 'transits' | 'houses' | 'aspects';

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: 'text-gold',
  trine: 'text-teal',
  sextile: 'text-cosmic-blue',
  square: 'text-coral',
  opposition: 'text-cosmic-rose',
};

export function Explore() {
  const [tab, setTab] = useState<ExploreTab>('transits');
  const data = useExploreData();

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-1">
        {([
          { id: 'transits' as const, label: 'Transits', icon: Orbit },
          { id: 'houses' as const, label: 'Houses', icon: Home },
          { id: 'aspects' as const, label: 'Aspects', icon: Triangle },
        ]).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-gold/15 text-gold border border-gold/25'
                  : 'text-mystic-400 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'transits' && <TransitExplorer data={data} />}
      {tab === 'houses' && <HouseExplorer data={data} />}
      {tab === 'aspects' && <AspectExplorer data={data} />}
    </div>
  );
}

function TransitExplorer({ data }: { data: LazyExploreData }) {
  const { t } = useT('app');
  const { events, loading, error, load } = useTransitCalendar();
  const [filter, setFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => { load(filter || undefined); }, [load, filter]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-mystic-400 text-sm text-center py-8">{error}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-mystic-400" />
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <Chip
            label="All"
            selected={!filter}
            onSelect={() => setFilter('')}
            size="sm"
          />
          {PLANETS.slice(0, 7).map((p) => (
            <Chip
              key={p}
              label={p}
              selected={filter === p}
              onSelect={() => setFilter(p)}
              size="sm"
            />
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <p className="text-mystic-400 text-sm text-center py-8">{t('settings.noTransits')}</p>
      ) : (
        events.map((ev, i) => {
          const isOpen = expanded === i;
          const interp = data.getTransitInterp?.(ev.transitPlanet, ev.natalPlanet, ev.aspectType) ||
            data.getGenericTransitInterp?.(ev.transitPlanet, ev.natalPlanet, ev.aspectType);

          return (
            <Card key={i} padding="sm" interactive onClick={() => setExpanded(isOpen ? null : i)}>
              <div className="flex items-center gap-3">
                <div className="text-center flex-shrink-0 w-10">
                  <div className="text-[10px] text-mystic-500">{ev.date}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span style={{ fontFamily: 'serif' }} className="text-sm">
                    {PLANET_SYMBOLS[ev.transitPlanet]}
                  </span>
                  <span className={`text-xs ${ASPECT_COLORS[ev.aspectType]}`}>
                    {ev.aspectType}
                  </span>
                  <span style={{ fontFamily: 'serif' }} className="text-sm">
                    {PLANET_SYMBOLS[ev.natalPlanet]}
                  </span>
                  <span className="text-xs text-mystic-400 truncate">
                    {ev.transitPlanet} to {ev.natalPlanet}
                  </span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-mystic-500" /> : <ChevronDown className="w-4 h-4 text-mystic-500" />}
              </div>
              {isOpen && interp && (
                <div className="mt-3 pt-3 border-t border-mystic-800/30 space-y-2 animate-fade-in">
                  <div className="text-xs font-medium text-gold">{interp.theme}</div>
                  <p className="text-xs text-mystic-300 leading-relaxed">{interp.feeling}</p>
                  <p className="text-xs text-teal">{interp.advice}</p>
                  <div className="text-[10px] text-mystic-500">{interp.duration}</div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function HouseExplorer({ data }: { data: LazyExploreData }) {
  const { t } = useT('app');
  const { chart, loading } = useNatalChart();

  // Memoize planet-by-house grouping and interpretation lookups
  const { planetsByHouse, houseInterps } = useMemo(() => {
    const grouped: Record<number, PlanetPlacement[]> = {};
    const interps: Record<string, { expression: string } | null> = {};

    if (!chart) return { planetsByHouse: grouped, houseInterps: interps };

    chart.natalChart.planets.forEach((p) => {
      if (p.house) {
        if (!grouped[p.house]) grouped[p.house] = [];
        grouped[p.house].push(p);

        // Pre-compute interpretation for each planet-house combo
        if (data.getPlanetInHouse && data.getGenericHouseInterp) {
          const key = `${p.planet}-${p.house}`;
          interps[key] = data.getPlanetInHouse(p.planet as Planet, p.house) ||
            data.getGenericHouseInterp(p.planet as Planet, p.house);
        }
      }
    });

    return { planetsByHouse: grouped, houseInterps: interps };
  }, [chart, data.loaded]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (!chart) {
    return <p className="text-mystic-400 text-sm text-center py-8">{t('settings.chartUnavailable')}</p>;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
        const residents = planetsByHouse[house] || [];
        return (
          <Card key={house} padding="sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-mystic-800/60 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gold">{house}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-mystic-200">{HOUSE_THEMES[house - 1]}</div>
                {residents.length > 0 ? (
                  <div className="mt-1.5 space-y-1">
                    {residents.map((p) => {
                      const interp = houseInterps[`${p.planet}-${house}`];
                      return (
                        <div key={p.planet} className="text-xs">
                          <span style={{ fontFamily: 'serif' }} className="mr-1">
                            {PLANET_SYMBOLS[p.planet as Planet]}
                          </span>
                          <span className="text-mystic-300">
                            {p.planet} in {SIGN_SYMBOLS[p.sign]} {p.sign}
                          </span>
                          {interp && (
                            <p className="text-mystic-400 mt-0.5 pl-4">{interp.expression}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-mystic-600 mt-0.5">No planets here</div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function AspectExplorer({ data }: { data: LazyExploreData }) {
  const { t } = useT('app');
  const { chart, loading } = useNatalChart();
  const [aspectFilter, setAspectFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!chart) {
    return <p className="text-mystic-400 text-sm text-center py-8">{t('settings.chartUnavailable')}</p>;
  }

  const { natalChart } = chart;
  const filtered = natalChart.aspects.filter((a: Aspect) => {
    if (aspectFilter === 'all') return true;
    if (aspectFilter === 'harmonious') return a.type === 'trine' || a.type === 'sextile';
    if (aspectFilter === 'challenging') return a.type === 'square' || a.type === 'opposition';
    if (aspectFilter === 'conjunctions') return a.type === 'conjunction';
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {['all', 'harmonious', 'challenging', 'conjunctions'].map((f) => (
          <Chip
            key={f}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            selected={aspectFilter === f}
            onSelect={() => setAspectFilter(f)}
            size="sm"
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-mystic-400 text-sm text-center py-8">No aspects match this filter</p>
      ) : (
        filtered.map((a: Aspect, i: number) => {
          const isOpen = expanded === i;
          const interp = data.getAspectInterp?.(a.planet1 as Planet, a.planet2 as Planet, a.type) ||
            data.getGenericAspectInterp?.(a.planet1 as Planet, a.planet2 as Planet, a.type);

          return (
            <Card key={i} padding="sm" interactive onClick={() => setExpanded(isOpen ? null : i)}>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'serif' }} className="text-sm">
                  {PLANET_SYMBOLS[a.planet1 as Planet]}
                </span>
                <span className={`text-xs font-medium ${ASPECT_COLORS[a.type]}`}>
                  {a.type}
                </span>
                <span style={{ fontFamily: 'serif' }} className="text-sm">
                  {PLANET_SYMBOLS[a.planet2 as Planet]}
                </span>
                <span className="flex-1 text-xs text-mystic-400">
                  {a.planet1} - {a.planet2}
                </span>
                <span className="text-xs text-mystic-500">{a.orb.toFixed(1)}&deg;</span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-mystic-500" /> : <ChevronDown className="w-3.5 h-3.5 text-mystic-500" />}
              </div>
              {isOpen && interp && (
                <div className="mt-3 pt-3 border-t border-mystic-800/30 space-y-2 animate-fade-in">
                  <p className="text-xs text-mystic-200 leading-relaxed">{interp.meaning}</p>
                  <p className="text-xs text-mystic-400 italic">{interp.howItFeels}</p>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
