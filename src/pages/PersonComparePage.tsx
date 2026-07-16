import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Heart, Sparkles } from 'lucide-react';
import { Card, Button, EyebrowLabel } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { people as peopleDal } from '../dal';
import { supabase } from '../lib/supabase';
import { type NatalChart, PLANET_GLYPH, SIGN_GLYPH, computeSynastry, synastryScore } from '../lib/chart';

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
      <button onClick={() => navigate(`/people/${id}`)} className="inline-flex items-center gap-1 text-sm text-mystic-400 hover:text-mystic-200">
        <ArrowLeft className="w-4 h-4" /> {name}
      </button>

      <div className="text-center space-y-2">
        <EyebrowLabel>Synastry</EyebrowLabel>
        <h1 className="heading-display-xl text-mystic-100">You &amp; {name}</h1>
        <div className="flex items-center justify-center gap-3 text-mystic-300">
          <span>{mySun && `${SIGN_GLYPH[mySun]} ${mySun}`}</span>
          <Heart className="w-4 h-4 text-pink-400" />
          <span>{theirSun && `${SIGN_GLYPH[theirSun]} ${theirSun}`}</span>
        </div>
      </div>

      {/* Harmony score ring */}
      <Card className="p-6 text-center space-y-2">
        <div className="text-5xl font-display text-gold-foil">{score}<span className="text-2xl text-mystic-500">/100</span></div>
        <p className="text-sm text-mystic-400">Overall resonance from {aspects.length} cross-chart connections</p>
      </Card>

      {/* Sun-sign compatibility */}
      {compat && (
        <Card className="p-4 space-y-3">
          <h3 className="heading-display-md text-mystic-100">{mySun} &amp; {theirSun}</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-pink-300 font-medium">Love · </span><span className="text-mystic-300">{compat.love}</span></p>
            <p><span className="text-sky-300 font-medium">Friendship · </span><span className="text-mystic-300">{compat.friendship}</span></p>
            <p><span className="text-emerald-300 font-medium">Work · </span><span className="text-mystic-300">{compat.work}</span></p>
          </div>
        </Card>
      )}

      {/* Top cross-aspects */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-gold" /><h3 className="heading-display-md text-mystic-100">Your strongest connections</h3></div>
        <div className="space-y-3">
          {aspects.slice(0, 8).map((a, i) => (
            <div key={i} className="text-sm">
              <div className="text-mystic-200">
                Your <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[a.planet1]}</span> {a.planet1}
                <span className="text-mystic-500"> {a.type} </span>
                {name}'s <span style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[a.planet2]}</span> {a.planet2}
                <span className="text-mystic-600 text-xs"> · orb {a.orb}°</span>
              </div>
              {interp && <p className="text-mystic-400 text-[13px] leading-relaxed mt-0.5">{interp.aspectText(a.planet1, a.planet2, a.type)}</p>}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-center text-xs text-mystic-600">For reflection &amp; entertainment. Synastry describes dynamics, not destiny.</p>
    </div>
  );
}
