import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Clock } from 'lucide-react';
import { Card, Button, Page, PageHeader, Section, EmptyState, Tag, ListRow, ListRowGroup, Skeleton } from '../components/ui';
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
import { getLocale } from '../i18n/config';
import { ct, useContentOverlay } from '../i18n/contentOverlay';
import { useInterpretations } from '../hooks/useAstrology';
import { fallbackZone, useBirthTzBackfill } from '../components/horoscope/birthZone';

/** Types living on other surfaces — hub cards link out. Routes match App.tsx. */
const LINKED: Record<string, { route: string; noteKey: string; note: string }> = {
  ziwei: { route: '/ziwei', noteKey: 'chartSuite.opensIn.ziwei', note: 'Opens in Zi Wei →' },
  transits: { route: '/reports/natal-chart', noteKey: 'chartSuite.opensIn.natalReport', note: 'Opens in your natal report →' },
  'solar-return': { route: '/reports/year-ahead', noteKey: 'chartSuite.opensIn.yearAhead', note: 'Opens in your year-ahead report →' },
  progressions: { route: '/reports/natal-chart', noteKey: 'chartSuite.opensIn.natalReport', note: 'Opens in your natal report →' },
  synastry: { route: '/people', noteKey: 'chartSuite.opensIn.people', note: 'Opens in People →' },
  composite: { route: '/people', noteKey: 'chartSuite.opensIn.people', note: 'Opens in People →' },
  davison: { route: '/people', noteKey: 'chartSuite.opensIn.people', note: 'Opens in People →' },
  'progressed-composite': { route: '/people', noteKey: 'chartSuite.opensIn.people', note: 'Opens in People →' },
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

/** The overlay id of a Firdaria time lord: `Sun`, … `NorthNode`, `SouthNode`. */
const lordId = (lord: string) => lord.replace(/\s+/g, '');

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
  // An account set up before p8 F21 gets its birth-place zone derived,
  // its chart recast in it, and the zone stored — once.
  useBirthTzBackfill();
  const [params, setParams] = useSearchParams();
  const selectedKey = params.get('type');
  const selected: ChartTypeInfo | null = CHART_TYPES.find((c) => c.key === selectedKey) ?? null;

  const [resp, setResp] = useState<SuiteResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Aspect essays (null until loaded), and the chart-library prose — each
  // type's description and "when to read", the Firdaria chapters — from the
  // same `interpretations` overlay (chartTypes.<key>.*, firdaria.<lord>).
  const interp = useInterpretations();
  const { overlay, ready: overlayReady } = useContentOverlay('interpretations');
  /** A chart type's name and tagline: short UI strings, so app keys. */
  const typeName = (c: ChartTypeInfo) => t(`chartSuite.types.${c.key}.name`, { defaultValue: c.name });
  const typeTagline = (c: ChartTypeInfo) => t(`chartSuite.types.${c.key}.tagline`, { defaultValue: c.tagline });
  /** A time lord's name: one of the ten planets, or a lunar node. */
  const lordName = (lord: string) =>
    lord === 'North Node'
      ? t('chartWheel.nodes.north', { defaultValue: 'North Node' })
      : lord === 'South Node'
        ? t('chartWheel.nodes.south', { defaultValue: 'South Node' })
        : planetName(lord);
  const lordMeaning = (lord: string) => ct(overlay, `firdaria.${lordId(lord)}`, FIRDARIA_LORD_MEANINGS[lord] ?? '');

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
          // The birth place's zone (p8 F21): the backfill above derives and
          // stores it for an account set up before it existed.
          timezone: profile?.birthTz || fallbackZone(profile),
        },
      }));
      if (!error) { setResp({ type: 'natal', chart: (data?.data?.chart ?? data?.chart) as NatalChart }); }
    } else {
      ({ data, error } = await supabase.functions.invoke('astrology-chart-suite', { body }));
      if (!error) setResp((data?.data ?? data) as SuiteResp);
    }
    if (error) setErr(t('chartSuite.castFailed', { defaultValue: "Couldn't cast this chart — check your connection and try again." }));
    setLoading(false);
  }, [profile, t]);

  // A linked type lives on another surface. The library row navigates there
  // on tap; a deep link (`/charts?type=transits`) used to render the intro
  // paragraph over nothing, since the endpoint rejects these keys.
  const linkedRoute = selectedKey ? LINKED[selectedKey]?.route : undefined;
  useEffect(() => {
    if (linkedRoute) navigate(linkedRoute, { replace: true });
  }, [linkedRoute, navigate]);

  useEffect(() => {
    if (!selected) return;
    if (LINKED[selected.key]) return;
    if (!hasBirth && selected.key !== 'sky-now') return;
    load(selected.key === 'firdaria' ? 'firdaria' : selected.key);
  }, [selected?.key, hasBirth, load, selected]);

  // Nothing to paint while the redirect above lands.
  if (linkedRoute) return null;

  // ── hub grid ──
  if (!selected) {
    return (
      <Page spacing="md">
        <PageHeader
          eyebrow={t('chartSuite.eyebrow', { defaultValue: 'Chart Library' })}
          title={t('chartSuite.title', { defaultValue: 'Every sky, every angle' })}
          // The count is the list's own length, so adding a chart can't
          // leave the lede promising one fewer (P7 F62/F90).
          subtitle={t('chartSuite.subtitle', {
            defaultValue: '{{n}} ways to read a moment — from the chart you were born with to the sky above you right now.',
            n: CHART_TYPES.length,
          })}
          divider
        />
        {/* One line per chart: the name, its one-line tagline, and — for the
            types that live on another surface — where the row goes, as
            quiet meta rather than a gold badge (R5 p-7). The description
            and "when to read" wait on the detail view. */}
        <ListRowGroup>
          {CHART_TYPES.map((c) => {
            const linked = LINKED[c.key];
            return (
              <ListRow
                key={c.key}
                label={typeName(c)}
                meta={
                  linked ? (
                    <>
                      <span className="block truncate">{typeTagline(c)}</span>
                      <span className="block text-mystic-500">{t(linked.noteKey, { defaultValue: linked.note })}</span>
                    </>
                  ) : (
                    <span className="block truncate">{typeTagline(c)}</span>
                  )
                }
                onClick={() => (linked ? navigate(linked.route) : setParams({ type: c.key }))}
              />
            );
          })}
        </ListRowGroup>
      </Page>
    );
  }

  // ── detail view ──
  const chart = resp?.chart ?? null;
  const momentText = resp?.moment
    ? (() => {
        const when = new Date(resp.moment).toLocaleString(getLocale());
        if (selected.key === 'lunar-return') return t('chartSuite.moment.lunarReturn', { defaultValue: 'Return moment: {{when}}', when });
        if (selected.key === 'sky-now') return t('chartSuite.moment.skyNow', { defaultValue: 'Cast: {{when}}', when });
        return t('chartSuite.moment.progressed', { defaultValue: 'Progressed to: {{when}}', when });
      })()
    : null;

  return (
    <Page spacing="md">
      <PageHeader
        eyebrow={typeTagline(selected)}
        title={typeName(selected)}
        subtitle={
          overlayReady
            ? ct(overlay, `chartTypes.${selected.key}.description`, selected.description)
            : <Skeleton height={14} width="80%" className="mx-auto" />
        }
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
                        major: lordName(resp.firdaria.current.major),
                        sub: lordName(resp.firdaria.current.sub),
                      })
                    : t('chartSuite.firdaria.current', {
                        defaultValue: 'You are in your {{major}} period',
                        major: lordName(resp.firdaria.current.major),
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
              <p>{lordMeaning(resp.firdaria.current.major)}</p>
              {resp.firdaria.current.sub && resp.firdaria.current.sub !== resp.firdaria.current.major && (
                <p>
                  {t('chartSuite.firdaria.flavoredBy', { defaultValue: 'Flavored by {{sub}}:', sub: lordName(resp.firdaria.current.sub) })}{' '}
                  {lordMeaning(resp.firdaria.current.sub)}
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
                  <span className="text-meta text-mystic-400 ml-auto tabular-nums">
                    {p.degree.toFixed(1)}°{p.retrograde ? <span className="text-coral"> ℞</span> : ''}
                  </span>
                </div>
              ))}
            </Section>
          )}
        </>
      ) : null}

      {overlayReady && (
        <p className="text-ui text-mystic-400 max-w-prose">
          {ct(overlay, `chartTypes.${selected.key}.whenToRead`, selected.whenToRead)}
        </p>
      )}
    </Page>
  );
}
