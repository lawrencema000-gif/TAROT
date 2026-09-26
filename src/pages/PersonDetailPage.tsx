import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Trash2, GitCompareArrows } from 'lucide-react';
import { Card, Button, Sheet, toast, Page, PageHeader, Section, Disclosure, Skeleton, ReadingProse } from '../components/ui';
import { ChartWheel } from '../components/chart/ChartWheel';
import { ElementBalance } from '../components/charts/ElementBalance';
import { AspectGrid } from '../components/charts/AspectGrid';
import { PlanetGlyph, ZodiacGlyph } from '../components/icons';
import { PersonForm } from '../components/people/PersonForm';
import { PersonAIReading } from '../components/people/PersonAIReading';
import { people as peopleDal } from '../dal';
import type { Person } from '../dal/people';
import { supabase } from '../lib/supabase';
import { type NatalChart, SIGN_GLYPH, toWheelChart, isPlanet, isZodiacSign, isAspectType } from '../lib/chart';
import { readPet, SPECIES_INFO, PET_DISCLAIMER } from '../data/petAstrology';
import { useT } from '../i18n/useT';
import { localizePlanetName, localizeSignName, localizeAspectName } from '../i18n/localizeNames';

type Interp = typeof import('../data/interpretations');

const REL_LABEL: Record<string, string> = { self: 'You', partner: 'Partner', family: 'Family', friend: 'Friend', other: 'Other', pet: 'Pet' };

const planetName = (p: string) => (isPlanet(p) ? localizePlanetName(p) : p);
const signName = (s: string) => (isZodiacSign(s) ? localizeSignName(s) : s);

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useT('app');
  const [person, setPerson] = useState<Person | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  const [interp, setInterp] = useState<Interp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openPlanet, setOpenPlanet] = useState<string | null>('Sun');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setErr(null);
    const pRes = await peopleDal.getById(id);
    if (!pRes.ok || !pRes.data) { setErr(t('people.notFound', { defaultValue: "We couldn't find this person in your circle." })); setLoading(false); return; }
    setPerson(pRes.data);
    if (pRes.data.relationship === 'pet') {
      // A pet gets a temperament reading, not a natal wheel — no houses, no
      // ascendant, and no reason to spend an edge-function call on either.
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke('astrology-person-chart', { body: { personId: id } });
    if (error) { setErr(t('people.detail.chartFailed', { defaultValue: "Couldn't cast the chart — check your connection and try again." })); setLoading(false); return; }
    setChart((data?.data?.chart ?? data?.chart) as NatalChart);
    setLoading(false);
    import('../data/interpretations').then(setInterp);
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!id) return;
    const res = await peopleDal.remove(id);
    if (res.ok) { toast(t('people.detail.deleted', { defaultValue: '{{name}} deleted', name: person?.name ?? '' }), 'success'); navigate('/people'); }
    else toast(t('people.detail.deleteFailed', { defaultValue: "Couldn't delete {{name}} — try again.", name: person?.name ?? '' }), 'error');
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>;
  if (err || !person) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-mystic-300">{err}</p>
      <Button variant="ghost" onClick={() => navigate('/people')}>{t('people.detail.backToPeople', { defaultValue: 'Back to People' })}</Button>
    </div>
  );

  const isPet = person.relationship === 'pet';
  const petReading = isPet ? readPet(person.birthDate, person.species) : null;
  const sun = chart?.planets.find((p) => p.planet === 'Sun');
  const moon = chart?.planets.find((p) => p.planet === 'Moon');

  const bigThree: { key: string; label: string; sign: string; glyph: React.ReactNode }[] = !isPet && chart
    ? [
        sun && { key: 'sun', label: t('horoscope.birthChartView.sun'), sign: sun.sign, glyph: <PlanetGlyph planet="Sun" size={22} className="text-gold mx-auto" /> },
        moon && { key: 'moon', label: t('horoscope.birthChartView.moon'), sign: moon.sign, glyph: <PlanetGlyph planet="Moon" size={22} className="text-gold mx-auto" /> },
        chart.ascendantSign && isZodiacSign(chart.ascendantSign)
          ? { key: 'rising', label: t('horoscope.birthChartView.rising'), sign: chart.ascendantSign, glyph: <ZodiacGlyph sign={chart.ascendantSign} size={22} className="text-gold mx-auto" /> }
          : null,
      ].filter((b): b is NonNullable<typeof b> => Boolean(b))
    : [];

  return (
    <Page spacing="md">
      <PageHeader
        align="center"
        onBack={() => navigate('/people')}
        backLabel={t('people.title', { defaultValue: 'People' })}
        eyebrow={t(`people.relationship.${person.relationship}`, { defaultValue: REL_LABEL[person.relationship] })}
        title={person.name}
        subtitle={!isPet && chart ? (
          <>
            {sun && t('horoscope.birthChartView.planetInSign', { planet: planetName('Sun'), sign: signName(sun.sign) })}
            {moon && <> · {t('horoscope.birthChartView.planetInSign', { planet: planetName('Moon'), sign: signName(moon.sign) })}</>}
            {chart.ascendantSign && <> · {t('people.detail.rising', { defaultValue: '{{sign}} rising', sign: signName(chart.ascendantSign) })}</>}
          </>
        ) : undefined}
      />
      {!person.birthTime && !isPet && (
        <p className="text-center text-meta text-mystic-400 -mt-3">{t('people.detail.birthTimeUnknown', { defaultValue: 'Birth time unknown — houses and rising sign are approximate.' })}</p>
      )}

      {isPet && petReading && (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl">{SIGN_GLYPH[petReading.sign.charAt(0).toUpperCase() + petReading.sign.slice(1)] ?? ''}</span>
              <div>
                <div className="heading-display-md text-mystic-100">{petReading.reading.headline}</div>
                <div className="text-meta text-mystic-400">
                  {person.species ? SPECIES_INFO[person.species].label : 'Companion'}
                  {petReading.animal && <> · Year of the {petReading.animal.en} {petReading.animal.cn}</>}
                </div>
              </div>
            </div>
            <div className="reading-copy">
              <p>{petReading.reading.temperament}</p>
              {petReading.speciesLens && <p>{petReading.speciesLens}</p>}
            </div>
          </Card>

          <Section title="What they need from you" headingLevel="h3" spacing="sm">
            <div className="reading-copy">
              <p>{petReading.reading.needs}</p>
              <p className="border-t border-mystic-800/40 pt-3">
                <span className="text-gold/80">The quirk:</span> {petReading.reading.quirk}
              </p>
            </div>
          </Section>

          <p className="text-caption text-mystic-500 italic">{PET_DISCLAIMER}</p>
        </>
      )}

      {!isPet && chart && (
        <Card padding="sm">
          <ChartWheel chart={toWheelChart(chart)} />
        </Card>
      )}

      {/* Big Three */}
      {bigThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {bigThree.map((b) => (
            <div key={b.key} className="rounded-card border border-mystic-800/60 bg-mystic-900/40 p-3 text-center">
              {b.glyph}
              <div className="text-meta uppercase tracking-wider text-mystic-400 mt-1">{b.label}</div>
              <div className="text-ui text-gold">{signName(b.sign)}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI reading */}
      {chart && <PersonAIReading personId={person.id} personName={person.name} />}

      {/* Placements with interpretations */}
      {!isPet && chart && (
        <Card className="p-4 space-y-1">
          <h3 className="heading-display-md text-mystic-100 mb-2">{t('chartSuite.sections.placements', { defaultValue: 'Placements' })}</h3>
          {chart.planets.map((p) => {
            const open = openPlanet === p.planet;
            const sText = interp?.planetInSignText(p.planet, p.sign);
            const hText = interp?.planetInHouseText(p.planet, p.house);
            return (
              <Disclosure
                key={p.planet}
                variant="row"
                open={open}
                onOpenChange={(next) => setOpenPlanet(next ? p.planet : null)}
                icon={
                  <span className="w-6 flex justify-center">
                    {isPlanet(p.planet) ? <PlanetGlyph planet={p.planet} size={20} className="text-mystic-200" /> : <span className="text-mystic-200">{p.planet.charAt(0)}</span>}
                  </span>
                }
                label={
                  <>
                    <span className="text-mystic-100">
                      {isZodiacSign(p.sign)
                        ? t('horoscope.birthChartView.planetInSign', { planet: planetName(p.planet), sign: localizeSignName(p.sign) })
                        : `${planetName(p.planet)} · ${p.sign}`}
                    </span>
                    {p.house && <span className="text-meta text-mystic-400"> · {t('chartWheel.houseLabel', { defaultValue: 'House {{n}}', n: p.house })}</span>}
                    {p.retrograde && <span className="text-coral text-meta"> ℞</span>}
                  </>
                }
                contentClassName="pl-9 reading-copy"
              >
                {sText ? <p>{sText}</p> : <Skeleton height={14} width="80%" />}
                {hText && <p>{hText}</p>}
              </Disclosure>
            );
          })}
        </Card>
      )}

      {/* Element / modality balance */}
      {!isPet && chart && (
        <Section title={t('chartSuite.sections.balance', { defaultValue: 'Balance' })} headingLevel="h3">
          <ElementBalance elements={chart.elements} modalities={chart.modalities} />
        </Section>
      )}

      {/* Aspects */}
      {chart && chart.aspects.length > 0 && (
        <Section title={t('people.detail.aspects', { defaultValue: 'Aspects' })} headingLevel="h3" contentClassName="space-y-3">
          <AspectGrid aspects={chart.aspects} />
          <div className="space-y-3 pt-1">
            {chart.aspects.slice(0, 6).map((a, i) => (
              <div key={i} className="text-ui">
                <span className="text-mystic-200">
                  {planetName(a.planet1)} {isAspectType(a.type) ? localizeAspectName(a.type) : a.type} {planetName(a.planet2)}
                </span>
                <span className="text-meta text-mystic-400"> · {t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: a.orb })}</span>
                {interp && <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} className="mt-1" />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" size="md" onClick={() => navigate(`/people/${person.id}/compare`)}>
          <GitCompareArrows className="w-4 h-4 mr-2" /> {t('people.detail.compare', { defaultValue: 'Compare our charts' })}
        </Button>
        <Button variant="ghost" size="md" onClick={() => setEditing(true)}>
          <Pencil className="w-4 h-4 mr-2" /> {t('people.detail.edit', { defaultValue: 'Edit birth details' })}
        </Button>
      </div>
      <button onClick={() => setConfirmDelete(true)} className="w-full text-center text-xs text-red-400/70 hover:text-red-400 py-2 flex items-center justify-center gap-1">
        <Trash2 className="w-3.5 h-3.5" /> {t('people.detail.delete', { defaultValue: 'Delete {{name}}', name: person.name })}
      </button>

      <Sheet open={editing} onClose={() => setEditing(false)} title={t('people.detail.editTitle', { defaultValue: 'Edit {{name}}', name: person.name })}>
        <PersonForm existing={person} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('people.detail.deleteTitle', { defaultValue: 'Delete {{name}}?', name: person.name })}>
        <div className="space-y-4">
          <p className="text-ui text-mystic-300">{t('people.detail.deleteBody', { defaultValue: "This deletes {{name}}'s saved birth data and chart. It can't be undone.", name: person.name })}</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>{t('people.detail.keep', { defaultValue: 'Keep {{name}}', name: person.name })}</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>{t('people.detail.deleteConfirm', { defaultValue: 'Delete permanently' })}</Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
