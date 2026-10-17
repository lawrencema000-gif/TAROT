import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Trash2, GitCompareArrows } from 'lucide-react';
import { Card, Button, Sheet, toast, Page, PageHeader, Section, Disclosure, Skeleton, ReadingProse, Disclaimer } from '../components/ui';
import { ChartWheel } from '../components/chart/ChartWheel';
import { ElementBalance } from '../components/charts/ElementBalance';
import { AspectGrid } from '../components/charts/AspectGrid';
import { PlanetGlyph, ZodiacGlyph } from '../components/icons';
import { PersonForm } from '../components/people/PersonForm';
import { PersonAIReading } from '../components/people/PersonAIReading';
import { people as peopleDal } from '../dal';
import type { Person } from '../dal/people';
import { supabase } from '../lib/supabase';
import { type NatalChart, toWheelChart, isPlanet, isZodiacSign, isAspectType } from '../lib/chart';
import { readPet, localizePetReading, SPECIES_INFO, PET_DISCLAIMER } from '../data/petAstrology';
import { ensurePersonZone } from '../components/people/personZone';
import { useT } from '../i18n/useT';
import { getLocale } from '../i18n/config';
import { ct, useContentOverlay } from '../i18n/contentOverlay';
import { hanziUnlessShown } from '../i18n/localizeHanzi';
import { localizePlanetName, localizeSignName, localizeAspectName } from '../i18n/localizeNames';
import { useInterpretations } from '../hooks/useAstrology';

const REL_LABEL: Record<string, string> = { self: 'You', partner: 'Partner', family: 'Family', friend: 'Friend', other: 'Other', pet: 'Pet' };

const planetName = (p: string) => (isPlanet(p) ? localizePlanetName(p) : p);
const signName = (s: string) => (isZodiacSign(s) ? localizeSignName(s) : s);

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useT('app');
  const [person, setPerson] = useState<Person | null>(null);
  const [chart, setChart] = useState<NatalChart | null>(null);
  // The planet / aspect readings, in the reader's language (null until loaded).
  const interp = useInterpretations();
  // A pet's temperament reading in ja/ko/zh: the 'pets' content overlay.
  const { overlay: petOverlay, ready: petOverlayReady } = useContentOverlay('pets');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Every placement starts closed: the page is a chart, not an essay
  // (R5 p-4, M-12). One row open at a time.
  const [openPlanet, setOpenPlanet] = useState<string | null>(null);
  const [showAllAspects, setShowAllAspects] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setErr(null);
    const pRes = await peopleDal.getById(id);
    if (!pRes.ok || !pRes.data) { setErr(t('people.notFound', { defaultValue: "We couldn't find this person in your circle." })); setLoading(false); return; }
    // Saved before F25 without a place: no zone, so the chart was read in
    // UTC. Give it the zone the form saves today before casting.
    const found = await ensurePersonZone(pRes.data);
    setPerson(found);
    if (found.relationship === 'pet') {
      // A pet gets a temperament reading, not a natal wheel — no houses, no
      // ascendant, and no reason to spend an edge-function call on either.
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke('astrology-person-chart', { body: { personId: id } });
    if (error) { setErr(t('people.detail.chartFailed', { defaultValue: "Couldn't cast the chart — check your connection and try again." })); setLoading(false); return; }
    setChart((data?.data?.chart ?? data?.chart) as NatalChart);
    setLoading(false);
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!id) return;
    const res = await peopleDal.remove(id);
    if (res.ok) { toast(t('people.detail.deleted', { defaultValue: '{{name}} deleted', name: person?.name ?? '' }), 'success'); navigate('/people'); }
    else toast(t('people.detail.deleteFailed', { defaultValue: "Couldn't delete {{name}} — try again.", name: person?.name ?? '' }), 'error');
  };

  // A pet's reading waits for its overlay (a small lazy chunk) rather than
  // flash the English first.
  if (loading || (person?.relationship === 'pet' && !petOverlayReady)) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>;
  if (err || !person) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-mystic-300">{err}</p>
      <Button variant="ghost" onClick={() => navigate('/people')}>{t('people.detail.backToPeople', { defaultValue: 'Back to People' })}</Button>
    </div>
  );

  const isPet = person.relationship === 'pet';
  // The reading in the reader's language: the 'pets' content overlay, keyed
  // by sign and species, over the English (p8 F24).
  const petBase = isPet ? readPet(person.birthDate, person.species) : null;
  const petReading = petBase ? localizePetReading(petBase, (path, en) => ct(petOverlay, path, en)) : null;
  const petSign = petReading ? petReading.sign.charAt(0).toUpperCase() + petReading.sign.slice(1) : null;
  const locale = getLocale();
  const animalName = petReading?.animal
    ? t(`chineseZodiac.${petReading.animal.en.toLowerCase()}.name`, { defaultValue: petReading.animal.en })
    : '';
  // The year's hanzi in the reader's script, and not twice where the
  // localized name already is it (zh: 龙年, not 龙年 龍).
  const animalHanzi = petReading?.animal ? (hanziUnlessShown(petReading.animal.cn, locale, [animalName]) ?? '') : '';
  const noPlace = !isPet && (person.birthLat == null || person.birthLon == null);
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
      {noPlace ? (
        // No place: there are no houses or rising sign to call approximate,
        // and the time is read in the device's zone (p8 F25).
        <p className="text-center text-meta text-mystic-400 -mt-3">{t('people.detail.noPlace', { defaultValue: 'No birth place saved — the birth time is read in your time zone, so this chart has no rising sign or houses.' })}</p>
      ) : !person.birthTime && !isPet && (
        <p className="text-center text-meta text-mystic-400 -mt-3">{t('people.detail.birthTimeUnknown', { defaultValue: 'Birth time unknown — houses and rising sign are approximate.' })}</p>
      )}

      {isPet && petReading && (
        <>
          <Card className="p-4 space-y-3">
            <div className="flex items-baseline gap-2">
              {petSign && isZodiacSign(petSign) && <ZodiacGlyph sign={petSign} size={28} className="text-gold shrink-0" />}
              <div>
                <div className="heading-display-md text-mystic-100">{petReading.reading.headline}</div>
                <div className="text-meta text-mystic-400">
                  {person.species
                    ? t(`people.species.${person.species}`, { defaultValue: SPECIES_INFO[person.species].label })
                    : t('people.pet.companion', { defaultValue: 'Companion' })}
                  {petReading.animal && (
                    <> · {t('people.pet.yearOf', {
                      defaultValue: 'Year of the {{animal}} {{cn}}',
                      animal: animalName,
                      cn: animalHanzi,
                    }).trim()}</>
                  )}
                </div>
              </div>
            </div>
            <div className="reading-copy">
              <p>{petReading.reading.temperament}</p>
              {petReading.speciesLens && <p>{petReading.speciesLens}</p>}
            </div>
          </Card>

          <Section title={t('people.pet.needsTitle', { defaultValue: 'What they need from you' })} headingLevel="h3" spacing="sm">
            <div className="reading-copy">
              <p>{petReading.reading.needs}</p>
              <p className="border-t border-mystic-800/40 pt-3">
                <span className="text-gold/80">{t('people.pet.quirk', { defaultValue: 'The quirk:' })}</span> {petReading.reading.quirk}
              </p>
            </div>
          </Section>

          <p className="text-caption text-mystic-500 italic">{t('people.pet.disclaimer', { defaultValue: PET_DISCLAIMER })}</p>
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

      {/* Placements — one line per planet; the interpretation opens on tap. */}
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
                lazy
                icon={
                  <span className="w-6 flex justify-center">
                    {isPlanet(p.planet) ? <PlanetGlyph planet={p.planet} size={20} className="text-mystic-200" /> : <span className="text-mystic-200">{p.planet.charAt(0)}</span>}
                  </span>
                }
                label={
                  <span className="block break-words">
                    <span className="text-mystic-100">
                      {isZodiacSign(p.sign)
                        ? t('horoscope.birthChartView.planetInSign', { planet: planetName(p.planet), sign: localizeSignName(p.sign) })
                        : `${planetName(p.planet)} · ${p.sign}`}
                    </span>
                    {p.retrograde && <span className="text-coral text-meta"> ℞</span>}
                  </span>
                }
                meta={p.house ? <span className="tabular-nums">{t('chartWheel.houseLabel', { defaultValue: 'House {{n}}', n: p.house })}</span> : undefined}
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

      {/* Aspects — the grid, then one line per aspect; the reading opens on
          tap and the list starts at three (R5 M-12). */}
      {chart && chart.aspects.length > 0 && (
        <Section title={t('people.detail.aspects', { defaultValue: 'Aspects' })} headingLevel="h3" contentClassName="space-y-3">
          <AspectGrid aspects={chart.aspects} />
          <Card className="px-4 py-1">
            {(showAllAspects ? chart.aspects : chart.aspects.slice(0, 3)).map((a, i) => (
              <Disclosure
                key={`${a.planet1}-${a.planet2}-${a.type}-${i}`}
                variant="row"
                lazy
                label={
                  // Wraps rather than truncates: the label is the only place
                  // the row names both planets and the aspect (review #30).
                  <span className="block break-words text-mystic-100">
                    {t('horoscope.birthChartView.aspectRow', {
                      defaultValue: '{{p1}} {{type}} {{p2}}',
                      p1: planetName(a.planet1),
                      type: isAspectType(a.type) ? localizeAspectName(a.type) : a.type,
                      p2: planetName(a.planet2),
                    })}
                  </span>
                }
                meta={<span className="tabular-nums">{t('chartWheel.orb', { defaultValue: 'Orb {{deg}}°', deg: a.orb })}</span>}
                contentClassName="reading-copy"
              >
                {interp ? <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} /> : <Skeleton height={14} width="80%" />}
              </Disclosure>
            ))}
          </Card>
          {chart.aspects.length > 3 && (
            <Button variant="ghost" size="sm" fullWidth onClick={() => setShowAllAspects((v) => !v)} aria-expanded={showAllAspects}>
              {showAllAspects
                ? t('people.detail.showFewerAspects', { defaultValue: 'Show fewer aspects' })
                : t('people.detail.showAllAspects', { defaultValue: 'Show all {{n}} aspects', n: chart.aspects.length })}
            </Button>
          )}
        </Section>
      )}

      {/* Actions. A pet has no "Compare our charts": the comparison is a
          human synastry (Love, Work, composite charts) cast from a natal
          chart a pet does not get, and it read the cat Miso as a romantic
          and work partner (p9 Q13). */}
      <div className={`grid gap-2 ${isPet ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!isPet && (
          <Button variant="primary" size="md" onClick={() => navigate(`/people/${person.id}/compare`)}>
            <GitCompareArrows className="w-4 h-4 mr-2" /> {t('people.detail.compare', { defaultValue: 'Compare our charts' })}
          </Button>
        )}
        <Button variant="ghost" size="md" onClick={() => setEditing(true)}>
          <Pencil className="w-4 h-4 mr-2" /> {t('people.detail.edit', { defaultValue: 'Edit birth details' })}
        </Button>
      </div>
      <button onClick={() => setConfirmDelete(true)} className="w-full min-h-[44px] text-center text-caption text-coral/70 hover:text-coral py-2 flex items-center justify-center gap-1">
        <Trash2 className="w-3.5 h-3.5" /> {t('people.detail.delete', { defaultValue: 'Delete {{name}}', name: person.name })}
      </button>

      {!isPet && chart && <Disclaimer kind="astrology" />}

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
