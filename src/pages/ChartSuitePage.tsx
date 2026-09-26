import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ChevronRight, Clock } from 'lucide-react';
import { Card, Button, Page, PageHeader, Section, EmptyState, Tag } from '../components/ui';
import { HoroscopeWheelIcon } from '../components/ui/NavIcons';
import { ChartWheel } from '../components/chart/ChartWheel';
import { ElementBalance } from '../components/charts/ElementBalance';
import { AspectGrid } from '../components/charts/AspectGrid';
import { FirdariaTimeline, type FirdariaData } from '../components/charts/FirdariaTimeline';
import { PlanetGlyph, ZodiacGlyph } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { type NatalChart, type AspectData, toWheelChart, isPlanet, isZodiacSign, isAspectType } from '../lib/chart';
import { CHART_TYPES, FIRDARIA_LORD_MEANINGS, type ChartTypeInfo } from '../data/chartSuiteContent';
import { useT } from '../i18n/useT';
import { localizePlanetName, localizeSignName, localizeAspectName } from '../i18n/localizeNames';

type Interp = typeof import('../data/interpretations');

/** Types living on other surfaces — hub cards link out. Routes match App.tsx. */
const LINKED: Record<string, { route: string; noteKey: string; note: string }> = {
  ziwei: { route: '/ziwei', noteKey: 'chartSuite.linked.ziwei', note: 'Chinese emperor-star system' },
  transits: { route: '/reports/natal-chart', noteKey: 'chartSuite.linked.natalReport', note: 'In your natal report' },
  'solar-return': { route: '/reports/year-ahead', noteKey: 'chartSuite.linked.yearAhead', note: 'In your year-ahead report' },
  progressions: { route: '/reports/natal-chart', noteKey: 'chartSuite.linked.natalReport', note: 'In your natal report' },
  synastry: { route: '/people', noteKey: 'chartSuite.linked.people', note: 'Compare in People' },
  composite: { route: '/people', noteKey: 'chartSuite.linked.people', note: 'Compare in People' },
  davison: { route: '/people', noteKey: 'chartSuite.linked.people', note: 'Compare in People' },
  'progressed-composite': { route: '/people', noteKey: 'chartSuite.linked.people', note: 'Compare in People' },
};

interface SuiteResp {
  type: string;
  chart?: NatalChart;
  moment?: string;
  arc?: number;
  crossAspects?: AspectData[];
  firdaria?: FirdariaData;
}

/** A planet name from the chart data, localised when it is one of the ten the app names. */
function planetName(p: string): string {
  return isPlanet(p) ? localizePlanetName(p) : p;
}

/**
 * Chart Library — every chart type Arcana can cast, in one hub.
 * New types (lunar return, tertiary, solar arc, Firdaria, sky-now) render
 * inline off the pure-compute chart-suite endpoint; established types link
 * to their existing homes.
 */
export function ChartSuitePage() {
  const navigate = useNavigate();
  const { t } = useT('app');
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
    if (error) setErr(t('chartSuite.castFailed', { defaultValue: "Couldn't cast this chart — check your connection and try again." }));
    setLoading(false);
    import('../data/interpretations').then(setInterp);
  }, [profile, t]);

  useEffect(() => {
    if (!selected) return;
    if (LINKED[selected.key]) return;
    if (!hasBirth && selected.key !== 'sky-now') return;
    load(selected.key === 'firdaria' ? 'firdaria' : selected.key);
  }, [selected?.key, hasBirth, load, selected]);

  // ── hub grid ──
  if (!selected) {
    return (
      <Page spacing="md">
        <PageHeader
          eyebrow={t('chartSuite.eyebrow', { defaultValue: 'Chart Library' })}
          title={t('chartSuite.title', { defaultValue: 'Every sky, every angle' })}
          subtitle={t('chartSuite.subtitle', { defaultValue: 'Thirteen ways to read a moment — from the chart you were born with to the sky above you right now.' })}
          divider
        />
        <div className="grid gap-3">
          {CHART_TYPES.map((c) => {
            const linked = LINKED[c.key];
            return (
              <button key={c.key}
                onClick={() => (linked ? navigate(linked.route) : setParams({ type: c.key }))}
                className="w-full text-left rounded-card border border-mystic-800/60 bg-mystic-900/40 p-4 hover:border-gold/30 transition-colors active:scale-[0.99]">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-mystic-100">{c.name}</div>
                    <div className="text-meta text-gold/80 mt-0.5">{c.tagline}</div>
                    <div className="text-ui text-mystic-400 mt-1 line-clamp-2">{c.description}</div>
                    {linked && <div className="font-display-eyebrow text-mystic-500 mt-1.5">{t(linked.noteKey, { defaultValue: linked.note })} →</div>}
                  </div>
                  <ChevronRight className="w-5 h-5 text-mystic-600 flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </Page>
    );
  }

  // ── detail view ──
  const chart = resp?.chart ?? null;
  const momentText = resp?.moment
    ? (() => {
        const when = new Date(resp.moment).toLocaleString();
        if (selected.key === 'lunar-return') return t('chartSuite.moment.lunarReturn', { defaultValue: 'Return moment: {{when}}', when });
        if (selected.key === 'sky-now') return t('chartSuite.moment.skyNow', { defaultValue: 'Cast: {{when}}', when });
        return t('chartSuite.moment.progressed', { defaultValue: 'Progressed to: {{when}}', when });
      })()
    : null;

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow={selected.tagline}
        title={selected.name}
        subtitle={selected.description}
        onBack={() => setParams({})}
        backLabel={t('chartSuite.eyebrow', { defaultValue: 'Chart Library' })}
        align="center"
      />

      {!hasBirth && selected.key !== 'sky-now' ? (
        <EmptyState
          title={t('chartSuite.needBirth', { defaultValue: 'Add your birth date in your profile to cast this chart.' })}
          action={<Button variant="primary" onClick={() => navigate('/profile')}>{t('chartSuite.addBirth', { defaultValue: 'Add my birth details' })}</Button>}
        />
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>
      ) : err ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-ui text-mystic-300">{err}</p>
          <Button variant="ghost" onClick={() => load(selected.key)}>{t('chartSuite.retry', { defaultValue: 'Cast the chart again' })}</Button>
        </Card>
      ) : selected.key === 'firdaria' && resp?.firdaria ? (
        <>
          <Card className="p-4 space-y-3">
            {resp.firdaria.current && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-ui text-mystic-200">
                  {resp.firdaria.current.sub
                    ? t('chartSuite.firdaria.currentSub', {
                        defaultValue: 'You are in your {{major}} period · {{sub}} sub-period',
                        major: planetName(resp.firdaria.current.major),
                        sub: planetName(resp.firdaria.current.sub),
                      })
                    : t('chartSuite.firdaria.current', {
                        defaultValue: 'You are in your {{major}} period',
                        major: planetName(resp.firdaria.current.major),
                      })}
                </p>
                <Tag tone="neutral">
                  {resp.firdaria.sect === 'day'
                    ? t('chartSuite.firdaria.dayBirth', { defaultValue: 'Day birth' })
                    : t('chartSuite.firdaria.nightBirth', { defaultValue: 'Night birth' })}
                </Tag>
              </div>
            )}
            {profile?.birthDate && <FirdariaTimeline data={resp.firdaria} birthDate={profile.birthDate} />}
          </Card>
          {resp.firdaria.current && (
            <Section title={t('chartSuite.sections.chapter', { defaultValue: 'This chapter' })} headingLevel="h3" contentClassName="reading-copy">
              <p>{FIRDARIA_LORD_MEANINGS[resp.firdaria.current.major]}</p>
              {resp.firdaria.current.sub && resp.firdaria.current.sub !== resp.firdaria.current.major && (
                <p>
                  {t('chartSuite.firdaria.flavoredBy', { defaultValue: 'Flavored by {{sub}}:', sub: planetName(resp.firdaria.current.sub) })}{' '}
                  {FIRDARIA_LORD_MEANINGS[resp.firdaria.current.sub]}
                </p>
              )}
            </Section>
          )}
        </>
      ) : chart ? (
        <>
          {momentText && (
            <p className="text-center text-meta text-mystic-400 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden />
              {momentText}
            </p>
          )}
          {typeof resp?.arc === 'number' && (
            <p className="text-center text-meta text-mystic-400">
              {t('chartSuite.solarArc', { defaultValue: 'Solar arc: {{deg}}° from birth', deg: resp.arc.toFixed(2) })}
            </p>
          )}
          <Card padding="sm">
            <ChartWheel chart={toWheelChart(chart)} />
          </Card>
          <Section title={t('chartSuite.sections.balance', { defaultValue: 'Balance' })} headingLevel="h3">
            <ElementBalance elements={chart.elements} modalities={chart.modalities} />
          </Section>
          {resp?.crossAspects && resp.crossAspects.length > 0 && (
            <Section
              title={
                <span className="flex items-center gap-2">
                  <HoroscopeWheelIcon className="w-4 h-4 text-gold" />
                  {t('chartSuite.sections.hits', { defaultValue: 'Hits to your natal chart' })}
                </span>
              }
              headingLevel="h3"
              contentClassName="space-y-3"
            >
              {resp.crossAspects.slice(0, 8).map((a, i) => (
                <div key={i} className="text-ui">
                  <span className="text-mystic-200 inline-flex items-center gap-1.5 flex-wrap">
                    {isPlanet(a.planet1) && <PlanetGlyph planet={a.planet1} size={16} className="text-gold" />}
                    {t('chartSuite.hitRow', {
                      defaultValue: '{{transit}} {{type}} natal {{natal}}',
                      transit: planetName(a.planet1),
                      type: isAspectType(a.type) ? localizeAspectName(a.type) : a.type,
                      natal: planetName(a.planet2),
                    })}
                    {isPlanet(a.planet2) && <PlanetGlyph planet={a.planet2} size={16} className="text-gold" />}
                  </span>
                  <span className="text-meta text-mystic-400"> · {t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: a.orb })}</span>
                  {interp && <p className="reading-copy mt-0.5">{interp.aspectText(a.planet1, a.planet2, a.type)}</p>}
                </div>
              ))}
            </Section>
          )}
          {chart.aspects.length > 0 && (
            <Section title={t('chartSuite.sections.aspects', { defaultValue: 'Aspects within this chart' })} headingLevel="h3">
              <AspectGrid aspects={chart.aspects} />
            </Section>
          )}
          {chart.planets.length > 0 && (
            <Section title={t('chartSuite.sections.placements', { defaultValue: 'Placements' })} headingLevel="h3" spacing="sm">
              {chart.planets.map((p) => (
                <div key={p.planet} className="flex items-center gap-2 py-1.5 border-b border-mystic-800/40 last:border-0 text-ui">
                  <span className="w-6 flex justify-center">
                    {isPlanet(p.planet) ? <PlanetGlyph planet={p.planet} size={18} className="text-gold" /> : <span className="text-mystic-300">{p.planet.charAt(0)}</span>}
                  </span>
                  <span className="text-mystic-100">
                    {isZodiacSign(p.sign)
                      ? t('horoscope.birthChartView.planetInSign', { planet: planetName(p.planet), sign: localizeSignName(p.sign) })
                      : `${planetName(p.planet)} · ${p.sign}`}
                  </span>
                  {isZodiacSign(p.sign) && <ZodiacGlyph sign={p.sign} size={16} className="text-mystic-400" />}
                  <span className="text-meta text-mystic-400 ml-auto">
                    {p.degree.toFixed(1)}°{p.retrograde ? <span className="text-coral"> ℞</span> : ''}
                  </span>
                </div>
              ))}
            </Section>
          )}
        </>
      ) : null}

      <p className="text-ui text-mystic-400 max-w-prose">{selected.whenToRead}</p>
    </Page>
  );
}
