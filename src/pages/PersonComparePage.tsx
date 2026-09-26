import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Heart } from 'lucide-react';
import { Card, Button, Page, PageHeader, Section, Tabs, HoroscopeWheelIcon, ReadingProse } from '../components/ui';
import { ChartWheel } from '../components/chart/ChartWheel';
import { AspectGrid } from '../components/charts/AspectGrid';
import { PlanetGlyph, ZodiacGlyph } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { people as peopleDal } from '../dal';
import { supabase } from '../lib/supabase';
import { type NatalChart, computeSynastry, synastryScore, toWheelChart, isPlanet, isZodiacSign, isAspectType } from '../lib/chart';
import { useT } from '../i18n/useT';
import { localizePlanetName, localizeSignName, localizeAspectName } from '../i18n/localizeNames';

type CompareTab = 'synastry' | 'composite' | 'davison' | 'progressed-composite';
const TABS: { key: CompareTab; label: string; blurb: string }[] = [
  { key: 'synastry', label: 'Synastry', blurb: 'How your two charts talk to each other' },
  { key: 'composite', label: 'Composite', blurb: 'The midpoint chart of the relationship itself' },
  { key: 'davison', label: 'Davison', blurb: 'A real sky, halfway between your births in time and space' },
  { key: 'progressed-composite', label: 'Progressed', blurb: 'Where the relationship chart has evolved to now' },
];

type Interp = typeof import('../data/interpretations');

const planetName = (p: string) => (isPlanet(p) ? localizePlanetName(p) : p);
const aspectName = (a: string) => (isAspectType(a) ? localizeAspectName(a) : a);

async function chartFor(body: Record<string, unknown>): Promise<NatalChart | null> {
  const { data, error } = await supabase.functions.invoke('astrology-person-chart', { body });
  if (error) return null;
  return (data?.data?.chart ?? data?.chart) as NatalChart;
}

/** Synastry: how the current user's chart aligns with a saved person's. */
export function PersonComparePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useT('app');
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
    if (!profile.birthDate) { setErr(t('people.compare.needOwnBirth', { defaultValue: 'Add your own birth date in your profile to compare charts.' })); setLoading(false); return; }
    const pRes = await peopleDal.getById(id);
    if (!pRes.ok || !pRes.data) { setErr(t('people.notFound', { defaultValue: "We couldn't find this person in your circle." })); setLoading(false); return; }
    setName(pRes.data.name);
    const [own, other] = await Promise.all([
      chartFor({ birthDate: profile.birthDate, birthTime: profile.birthTime ?? null, birthUtc: profile.birthUtc ?? null, lat: profile.birthLat ?? null, lon: profile.birthLon ?? null, timezone: profile.birthTz ?? profile.timezone ?? null }),
      chartFor({ personId: id }),
    ]);
    if (!own || !other) { setErr(t('people.compare.castFailed', { defaultValue: "Couldn't cast both charts — check your connection and try again." })); setLoading(false); return; }
    setMine(own); setTheirs(other);
    setLoading(false);
    import('../data/interpretations').then(setInterp);
  }, [id, profile, t]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>;
  if (err) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-mystic-300">{err}</p>
      <Button variant="ghost" onClick={() => navigate(-1)}>{t('people.compare.goBack', { defaultValue: 'Go back' })}</Button>
    </div>
  );

  const aspects = mine && theirs ? computeSynastry(mine.planets, theirs.planets) : [];
  const score = synastryScore(aspects);
  const mySun = mine?.planets.find((p) => p.planet === 'Sun')?.sign;
  const theirSun = theirs?.planets.find((p) => p.planet === 'Sun')?.sign;
  const compat = interp && mySun && theirSun ? interp.signCompatText(mySun, theirSun) : null;
  const relChart = tab !== 'synastry' ? relCharts[tab] : undefined;

  const sunChip = (sign: string | undefined) =>
    sign ? (
      <span className="inline-flex items-center gap-1.5">
        {isZodiacSign(sign) && <ZodiacGlyph sign={sign} size={18} className="text-gold" />}
        {isZodiacSign(sign) ? localizeSignName(sign) : sign}
      </span>
    ) : null;

  return (
    <Page spacing="md">
      <PageHeader
        align="center"
        onBack={() => navigate(`/people/${id}`)}
        backLabel={name}
        eyebrow={t('people.compare.eyebrow', { defaultValue: 'Synastry' })}
        title={t('people.compare.title', { defaultValue: 'You and {{name}}', name })}
      />

      <div className="flex items-center justify-center gap-3 text-mystic-300 -mt-3">
        {sunChip(mySun)}
        <Heart className="w-4 h-4 text-cosmic-rose" aria-hidden />
        {sunChip(theirSun)}
      </div>

      {/* Chart-type tabs */}
      <Tabs
        items={TABS.map((tDef) => ({ id: tDef.key, label: t(`people.compare.tabs.${tDef.key}.label`, { defaultValue: tDef.label }) }))}
        value={tab}
        onChange={setTab}
        aria-label={t('people.compare.chartTypeAria', { defaultValue: 'Chart type' })}
        size="sm"
        idPrefix="compare"
      />
      <p className="text-center text-ui text-mystic-400 -mt-3">{t(`people.compare.tabs.${tab}.blurb`, { defaultValue: TABS.find((tDef) => tDef.key === tab)?.blurb ?? '' })}</p>

      {tab !== 'synastry' ? (
        relLoading && !relChart ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
        ) : relChart ? (
          <>
            <Card padding="sm">
              <ChartWheel key={tab} chart={toWheelChart(relChart)} />
            </Card>
            {relChart.aspects.length > 0 && (
              <Section title={t('people.compare.aspectsInChart', { defaultValue: 'Aspects in this chart' })} headingLevel="h3" contentClassName="space-y-3">
                <AspectGrid aspects={relChart.aspects} />
                <div className="space-y-3 pt-1">
                  {relChart.aspects.slice(0, 5).map((a, i) => (
                    <div key={i} className="text-ui">
                      <span className="text-mystic-200">{planetName(a.planet1)} {aspectName(a.type)} {planetName(a.planet2)}</span>
                      <span className="text-meta text-mystic-400"> · {t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: a.orb })}</span>
                      {interp && <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} className="mt-1" />}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        ) : (
          <Card className="p-6 text-center"><p className="text-ui text-mystic-300">{t('people.compare.tabFailed', { defaultValue: "Couldn't cast this chart — check your connection and try again." })}</p></Card>
        )
      ) : (
      <>
      {/* Harmony score ring */}
      <Card className="p-6 text-center space-y-2">
        <div className="text-5xl font-display text-gold">{score}<span className="text-2xl text-mystic-500">/100</span></div>
        <p className="text-meta text-mystic-400">
          {t('people.compare.resonance', { defaultValue: 'Overall resonance from {{n}} cross-chart connections', n: aspects.length })}
        </p>
      </Card>

      {/* Sun-sign compatibility */}
      {compat && (
        <Section title={<>{mySun && isZodiacSign(mySun) ? localizeSignName(mySun) : mySun} &amp; {theirSun && isZodiacSign(theirSun) ? localizeSignName(theirSun) : theirSun}</>} headingLevel="h3">
          <div className="reading-copy">
            <p><span className="text-coral font-medium">{t('people.compare.love', { defaultValue: 'Love' })} · </span>{compat.love}</p>
            <p><span className="text-cosmic-blue-ink font-medium">{t('people.compare.friendship', { defaultValue: 'Friendship' })} · </span>{compat.friendship}</p>
            <p><span className="text-teal font-medium">{t('people.compare.work', { defaultValue: 'Work' })} · </span>{compat.work}</p>
          </div>
        </Section>
      )}

      {/* Top cross-aspects */}
      <Section
        headingLevel="h3"
        title={<span className="inline-flex items-center gap-2"><HoroscopeWheelIcon className="w-4 h-4 text-gold" /> {t('people.compare.strongest', { defaultValue: 'Your strongest connections' })}</span>}
      >
        <div className="space-y-4">
          {aspects.slice(0, 8).map((a, i) => (
            <div key={i} className="text-ui">
              <div className="text-mystic-200 flex items-center gap-1.5 flex-wrap">
                {isPlanet(a.planet1) && <PlanetGlyph planet={a.planet1} size={16} className="text-gold" />}
                <span>
                  {t('people.compare.crossRow', {
                    defaultValue: 'Your {{mine}} {{type}} {{name}}’s {{theirs}}',
                    mine: planetName(a.planet1),
                    type: aspectName(a.type),
                    name,
                    theirs: planetName(a.planet2),
                  })}
                </span>
                {isPlanet(a.planet2) && <PlanetGlyph planet={a.planet2} size={16} className="text-gold" />}
                <span className="text-meta text-mystic-400">· {t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: a.orb })}</span>
              </div>
              {interp && <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} className="mt-1" />}
            </div>
          ))}
        </div>
      </Section>
      </>
      )}

      <p className="text-caption text-mystic-500 italic">{t('people.compare.disclaimer', { defaultValue: 'For reflection and entertainment. These charts describe dynamics, not destiny.' })}</p>
    </Page>
  );
}
