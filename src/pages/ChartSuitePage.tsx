import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, ChevronRight, Clock } from 'lucide-react';
import { Card, Button, EyebrowLabel, SectionDivider } from '../components/ui';
import { NatalWheel } from '../components/charts/NatalWheel';
import { ElementBalance } from '../components/charts/ElementBalance';
import { AspectGrid } from '../components/charts/AspectGrid';
import { FirdariaTimeline, type FirdariaData } from '../components/charts/FirdariaTimeline';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { type NatalChart, type AspectData, PLANET_GLYPH, SIGN_GLYPH } from '../lib/chart';
import { CHART_TYPES, FIRDARIA_LORD_MEANINGS, type ChartTypeInfo } from '../data/chartSuiteContent';

type Interp = typeof import('../data/interpretations');

/** Types living on other surfaces — hub cards link out. */
const LINKED: Record<string, { route: string; note: string }> = {
  transits: { route: '/reports/natal', note: 'In your Natal Report' },
  'solar-return': { route: '/reports/year-ahead', note: 'In your Year-Ahead Report' },
  progressions: { route: '/reports/natal', note: 'In your Natal Report' },
  synastry: { route: '/people', note: 'Compare in People' },
  composite: { route: '/people', note: 'Compare in People' },
  davison: { route: '/people', note: 'Compare in People' },
  'progressed-composite': { route: '/people', note: 'Compare in People' },
};

interface SuiteResp {
  type: string;
  chart?: NatalChart;
  moment?: string;
  arc?: number;
  crossAspects?: AspectData[];
  firdaria?: FirdariaData;
}

/**
 * Chart Library — every chart type Arcana can cast, in one hub.
 * New types (lunar return, tertiary, solar arc, Firdaria, sky-now) render
 * inline off the pure-compute chart-suite endpoint; established types link
 * to their existing homes.
 */
export function ChartSuitePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedKey = params.get('type');
  const selected: ChartTypeInfo | null = CHART_TYPES.find((c) => c.key === selectedKey) ?? null;

  const [resp, setResp] = useState<SuiteResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [interp, setInterp] = useState<Interp | null>(null);

  const hasBirth = !!profile?.birthDate;

  const load = useCallback(async (key: string) => {
    setLoading(true); setErr(null); setResp(null);
    const body: Record<string, unknown> = { type: key === 'natal' ? 'natal' : key };
    let data, error;
    if (key === 'natal') {
      ({ data, error } = await supabase.functions.invoke('astrology-person-chart', {
        body: {
          birthDate: profile?.birthDate,
          birthTime: profile?.birthTime ?? null,
          birthUtc: profile?.birthUtc ?? null,
          lat: profile?.birthLat ?? null,
          lon: profile?.birthLon ?? null,
          timezone: profile?.birthTz ?? profile?.timezone ?? null,
        },
      }));
      if (!error) { setResp({ type: 'natal', chart: (data?.data?.chart ?? data?.chart) as NatalChart }); }
    } else {
      ({ data, error } = await supabase.functions.invoke('astrology-chart-suite', { body }));
      if (!error) setResp((data?.data ?? data) as SuiteResp);
    }
    if (error) setErr('Could not cast this chart. Try again.');
    setLoading(false);
    import('../data/interpretations').then(setInterp);
  }, [profile]);

  useEffect(() => {
    if (!selected) return;
    if (LINKED[selected.key]) return;
    if (!hasBirth && selected.key !== 'sky-now') return;
    load(selected.key === 'firdaria' ? 'firdaria' : selected.key);
  }, [selected?.key, hasBirth, load, selected]);

  // ── hub grid ──
  if (!selected) {
    return (
      <div className="space-y-6 pb-28">
        <div className="space-y-2">
          <EyebrowLabel>Chart Library</EyebrowLabel>
          <h1 className="heading-display-xl text-mystic-100">Every sky, every angle</h1>
          <p className="text-sm text-mystic-400">Thirteen ways to read a moment — from the chart you were born with to the sky above you right now.</p>
          <SectionDivider tone="gold" />
        </div>
        <div className="grid gap-3">
          {CHART_TYPES.map((c) => {
            const linked = LINKED[c.key];
            return (
              <button key={c.key}
                onClick={() => (linked ? navigate(linked.route) : setParams({ type: c.key }))}
                className="w-full text-left rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-4 hover:border-gold/30 transition-colors active:scale-[0.99]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-mystic-100">{c.name}</div>
                    <div className="text-xs text-gold/80 mt-0.5">{c.tagline}</div>
                    <div className="text-xs text-mystic-500 mt-1 line-clamp-2">{c.description}</div>
                    {linked && <div className="text-[10px] uppercase tracking-wider text-mystic-600 mt-1.5">{linked.note} →</div>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-mystic-600 flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── detail view ──
  const chart = resp?.chart ?? null;
  return (
    <div className="space-y-6 pb-28">
      <button onClick={() => setParams({})} className="inline-flex items-center gap-1 text-sm text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" /> Chart Library
      </button>

      <div className="text-center space-y-1">
        <EyebrowLabel>{selected.tagline}</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100">{selected.name}</h1>
        <p className="text-sm text-mystic-400 max-w-md mx-auto">{selected.description}</p>
      </div>

      {!hasBirth && selected.key !== 'sky-now' ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-mystic-300">Add your birth date in your profile to cast this chart.</p>
          <Button variant="primary" onClick={() => navigate('/profile')}>Go to profile</Button>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>
      ) : err ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-mystic-300">{err}</p>
          <Button variant="ghost" onClick={() => load(selected.key)}>Retry</Button>
        </Card>
      ) : selected.key === 'firdaria' && resp?.firdaria ? (
        <>
          <Card className="p-4 space-y-3">
            {resp.firdaria.current && (
              <p className="text-sm text-mystic-200 text-center">
                You are in your <span className="text-gold font-medium">{resp.firdaria.current.major}</span> period
                {resp.firdaria.current.sub && <> · <span className="text-gold/80">{resp.firdaria.current.sub}</span> sub-period</>}
                <span className="text-mystic-500"> ({resp.firdaria.sect} birth)</span>
              </p>
            )}
            {profile?.birthDate && <FirdariaTimeline data={resp.firdaria} birthDate={profile.birthDate} />}
          </Card>
          {resp.firdaria.current && (
            <Card className="p-4 space-y-3">
              <h3 className="heading-display-md text-mystic-100">This chapter</h3>
              <p className="text-sm text-mystic-300 leading-relaxed">{FIRDARIA_LORD_MEANINGS[resp.firdaria.current.major]}</p>
              {resp.firdaria.current.sub && resp.firdaria.current.sub !== resp.firdaria.current.major && (
                <p className="text-sm text-mystic-400 leading-relaxed">Flavored by {resp.firdaria.current.sub}: {FIRDARIA_LORD_MEANINGS[resp.firdaria.current.sub]}</p>
              )}
            </Card>
          )}
        </>
      ) : chart ? (
        <>
          {resp?.moment && (
            <p className="text-center text-xs text-mystic-500 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {selected.key === 'lunar-return' ? 'Return moment: ' : selected.key === 'sky-now' ? 'Cast: ' : 'Progressed to: '}
              {new Date(resp.moment).toLocaleString()}
            </p>
          )}
          {typeof resp?.arc === 'number' && (
            <p className="text-center text-xs text-mystic-500">Solar arc: {resp.arc.toFixed(2)}° from birth</p>
          )}
          <Card className="p-4 flex justify-center">
            <div className="w-full max-w-[360px]"><NatalWheel chart={chart} /></div>
          </Card>
          <Card className="p-4 space-y-3">
            <h3 className="heading-display-md text-mystic-100">Balance</h3>
            <ElementBalance elements={chart.elements} modalities={chart.modalities} />
          </Card>
          {resp?.crossAspects && resp.crossAspects.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-gold" /><h3 className="heading-display-md text-mystic-100">Hits to your natal chart</h3></div>
              {resp.crossAspects.slice(0, 8).map((a, i) => (
                <div key={i} className="text-sm">
                  <span className="text-mystic-200">
                    <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[a.planet1]}</span> {a.planet1}
                    <span className="text-mystic-500"> {a.type} </span>
                    natal <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[a.planet2]}</span> {a.planet2}
                  </span>
                  <span className="text-mystic-600 text-xs"> · orb {a.orb}°</span>
                  {interp && <p className="text-mystic-400 text-[13px] leading-relaxed mt-0.5">{interp.aspectText(a.planet1, a.planet2, a.type)}</p>}
                </div>
              ))}
            </Card>
          )}
          {chart.aspects.length > 0 && (
            <Card className="p-4 space-y-3">
              <h3 className="heading-display-md text-mystic-100">Aspects within this chart</h3>
              <AspectGrid aspects={chart.aspects} />
            </Card>
          )}
          {chart.planets.length > 0 && (
            <Card className="p-4">
              <h3 className="heading-display-md text-mystic-100 mb-2">Placements</h3>
              {chart.planets.map((p) => (
                <div key={p.planet} className="flex items-center gap-2 py-1.5 border-b border-mystic-800/40 last:border-0 text-sm">
                  <span className="w-6 text-center" style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[p.planet]}</span>
                  <span className="text-mystic-100">{p.planet}</span>
                  <span className="text-mystic-400">in {p.sign} {SIGN_GLYPH[p.sign]}</span>
                  <span className="text-mystic-600 text-xs ml-auto">{p.degree.toFixed(1)}°{p.retrograde ? ' ℞' : ''}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : null}

      <p className="text-center text-xs text-mystic-600 max-w-sm mx-auto">{selected.whenToRead}</p>
    </div>
  );
}
