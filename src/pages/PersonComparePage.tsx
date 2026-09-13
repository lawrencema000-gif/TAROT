import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Heart } from 'lucide-react';
import { Card, Button, PageHeader, Section, HoroscopeWheelIcon, ReadingProse } from '../components/ui';
import { NatalWheel } from '../components/charts/NatalWheel';
import { AspectGrid } from '../components/charts/AspectGrid';
import { useAuth } from '../context/AuthContext';
import { people as peopleDal } from '../dal';
import { supabase } from '../lib/supabase';
import { type NatalChart, PLANET_GLYPH, SIGN_GLYPH, computeSynastry, synastryScore } from '../lib/chart';

type CompareTab = 'synastry' | 'composite' | 'davison' | 'progressed-composite';
const TABS: { key: CompareTab; label: string; blurb: string }[] = [
  { key: 'synastry', label: 'Synastry', blurb: 'How your two charts talk to each other' },
  { key: 'composite', label: 'Composite', blurb: 'The midpoint chart of the relationship itself' },
  { key: 'davison', label: 'Davison', blurb: 'A real sky, halfway between your births in time and space' },
  { key: 'progressed-composite', label: 'Progressed', blurb: 'Where the relationship chart has evolved to now' },
];

type Interp = typeof import('../data/interpretations');

async function chartFor(body: Record<string, unknown>): Promise<NatalChart | null> {
  const { data, error } = await supabase.functions.invoke('astrology-person-chart', { body });
  if (error) return null;
  return (data?.data?.chart ?? data?.chart) as NatalChart;
}

/** Synastry: how the current user's chart aligns with a saved person's. */
export function PersonComparePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [mine, setMine] = useState<NatalChart | null>(null);
  const [theirs, setTheirs] = useState<NatalChart | null>(null);
  const [interp, setInterp] = useState<Interp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<CompareTab>('synastry');
  const [relCharts, setRelCharts] = useState<Partial<Record<CompareTab, NatalChart>>>({});
  const [relLoading, setRelLoading] = useState(false);

  // Relationship-chart tabs (composite / davison / progressed) — fetched
  // lazily from the pure-compute chart-suite endpoint, cached per tab.
  useEffect(() => {
    if (tab === 'synastry' || !id || relCharts[tab]) return;
    let cancelled = false;
    setRelLoading(true);
    supabase.functions.invoke('astrology-chart-suite', { body: { type: tab, personId: id } })
      .then(({ data, error }) => {
        if (cancelled) return;
        const chart = (data?.data?.chart ?? data?.chart) as NatalChart | undefined;
        if (!error && chart) setRelCharts((prev) => ({ ...prev, [tab]: chart }));
        setRelLoading(false);
      });
    return () => { cancelled = true; };
  }, [tab, id, relCharts]);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true); setErr(null);
    if (!profile.birthDate) { setErr('Add your own birth date in your profile to compare charts.'); setLoading(false); return; }
    const pRes = await peopleDal.getById(id);
    if (!pRes.ok || !pRes.data) { setErr('Person not found.'); setLoading(false); return; }
    setName(pRes.data.name);
    const [own, other] = await Promise.all([
      chartFor({ birthDate: profile.birthDate, birthTime: profile.birthTime ?? null, birthUtc: profile.birthUtc ?? null, lat: profile.birthLat ?? null, lon: profile.birthLon ?? null, timezone: profile.birthTz ?? profile.timezone ?? null }),
      chartFor({ personId: id }),
    ]);
    if (!own || !other) { setErr('Could not compute both charts.'); setLoading(false); return; }
    setMine(own); setTheirs(other);
    setLoading(false);
    import('../data/interpretations').then(setInterp);
  }, [id, profile]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>;
  if (err) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-mystic-300">{err}</p>
      <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
    </div>
  );

  const aspects = mine && theirs ? computeSynastry(mine.planets, theirs.planets) : [];
  const score = synastryScore(aspects);
  const mySun = mine?.planets.find((p) => p.planet === 'Sun')?.sign;
  const theirSun = theirs?.planets.find((p) => p.planet === 'Sun')?.sign;
  const compat = interp && mySun && theirSun ? interp.signCompatText(mySun, theirSun) : null;

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        align="center"
        onBack={() => navigate(`/people/${id}`)}
        backLabel={name}
        eyebrow="Synastry"
        title={<>You &amp; {name}</>}
      />

      <div className="flex items-center justify-center gap-3 text-mystic-300 -mt-3">
        <span>{mySun && `${SIGN_GLYPH[mySun]} ${mySun}`}</span>
        <Heart className="w-4 h-4 text-pink-400" />
        <span>{theirSun && `${SIGN_GLYPH[theirSun]} ${theirSun}`}</span>
      </div>

      {/* Chart-type tabs */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {TABS.map((tDef) => (
          <button key={tDef.key} onClick={() => setTab(tDef.key)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${tab === tDef.key ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-400 hover:border-mystic-500'}`}>
            {tDef.label}
          </button>
        ))}
      </div>
      <p className="text-center text-ui text-mystic-400 -mt-3">{TABS.find((tDef) => tDef.key === tab)?.blurb}</p>

      {tab !== 'synastry' ? (
        relLoading && !relCharts[tab] ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
        ) : relCharts[tab] ? (
          <>
            <Card className="p-4 flex justify-center">
              <div className="w-full max-w-[360px]"><NatalWheel chart={relCharts[tab]!} /></div>
            </Card>
            {relCharts[tab]!.aspects.length > 0 && (
              <Section title="Aspects in this chart" headingLevel="h3" contentClassName="space-y-3">
                <AspectGrid aspects={relCharts[tab]!.aspects} />
                <div className="space-y-3 pt-1">
                  {relCharts[tab]!.aspects.slice(0, 5).map((a, i) => (
                    <div key={i} className="text-ui">
                      <span className="text-mystic-200">{a.planet1} {a.type} {a.planet2}</span>
                      <span className="text-meta text-mystic-400"> · orb {a.orb}°</span>
                      {interp && <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} className="mt-1" />}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        ) : (
          <Card className="p-6 text-center"><p className="text-ui text-mystic-300">Couldn't cast this chart. Try again.</p></Card>
        )
      ) : (
      <>
      {/* Harmony score ring */}
      <Card className="p-6 text-center space-y-2">
        <div className="text-5xl font-display text-gold">{score}<span className="text-2xl text-mystic-500">/100</span></div>
        <p className="text-meta text-mystic-400">Overall resonance from {aspects.length} cross-chart connections</p>
      </Card>

      {/* Sun-sign compatibility */}
      {compat && (
        <Section title={<>{mySun} &amp; {theirSun}</>} headingLevel="h3">
          <div className="reading-copy">
            <p><span className="text-pink-300 font-medium">Love · </span>{compat.love}</p>
            <p><span className="text-sky-300 font-medium">Friendship · </span>{compat.friendship}</p>
            <p><span className="text-emerald-300 font-medium">Work · </span>{compat.work}</p>
          </div>
        </Section>
      )}

      {/* Top cross-aspects */}
      <Section
        headingLevel="h3"
        title={<span className="inline-flex items-center gap-2"><HoroscopeWheelIcon className="w-4 h-4 text-gold" /> Your strongest connections</span>}
      >
        <div className="space-y-4">
          {aspects.slice(0, 8).map((a, i) => (
            <div key={i} className="text-ui">
              <div className="text-mystic-200">
                Your <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[a.planet1]}</span> {a.planet1}
                <span className="text-mystic-400"> {a.type} </span>
                {name}'s <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[a.planet2]}</span> {a.planet2}
                <span className="text-meta text-mystic-400"> · orb {a.orb}°</span>
              </div>
              {interp && <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} className="mt-1" />}
            </div>
          ))}
        </div>
      </Section>
      </>
      )}

      <p className="text-caption text-mystic-500 italic">For reflection &amp; entertainment. These charts describe dynamics, not destiny.</p>
    </div>
  );
}
