import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Pencil, Trash2, GitCompareArrows } from 'lucide-react';
import { Card, Button, Sheet, toast, Page, PageHeader, Section, Disclosure, Skeleton, ReadingProse } from '../components/ui';
import { NatalWheel } from '../components/charts/NatalWheel';
import { ElementBalance } from '../components/charts/ElementBalance';
import { AspectGrid } from '../components/charts/AspectGrid';
import { PersonForm } from '../components/people/PersonForm';
import { PersonAIReading } from '../components/people/PersonAIReading';
import { people as peopleDal } from '../dal';
import type { Person } from '../dal/people';
import { supabase } from '../lib/supabase';
import { type NatalChart, PLANET_GLYPH, SIGN_GLYPH } from '../lib/chart';
import { readPet, SPECIES_INFO, PET_DISCLAIMER } from '../data/petAstrology';

type Interp = typeof import('../data/interpretations');

const REL_LABEL: Record<string, string> = { self: 'You', partner: 'Partner', family: 'Family', friend: 'Friend', other: 'Other', pet: 'Pet' };

export function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
    if (!pRes.ok || !pRes.data) { setErr('Person not found.'); setLoading(false); return; }
    setPerson(pRes.data);
    if (pRes.data.relationship === 'pet') {
      // A pet gets a temperament reading, not a natal wheel — no houses, no
      // ascendant, and no reason to spend an edge-function call on either.
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke('astrology-person-chart', { body: { personId: id } });
    if (error) { setErr('Could not compute the chart.'); setLoading(false); return; }
    setChart((data?.data?.chart ?? data?.chart) as NatalChart);
    setLoading(false);
    import('../data/interpretations').then(setInterp);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!id) return;
    const res = await peopleDal.remove(id);
    if (res.ok) { toast('Removed', 'success'); navigate('/people'); }
    else toast('Could not delete', 'error');
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 text-gold animate-spin" /></div>;
  if (err || !person) return (
    <div className="p-6 text-center space-y-4">
      <p className="text-mystic-300">{err}</p>
      <Button variant="ghost" onClick={() => navigate('/people')}>Back to People</Button>
    </div>
  );

  const isPet = person.relationship === 'pet';
  const petReading = isPet ? readPet(person.birthDate, person.species) : null;
  const sun = chart?.planets.find((p) => p.planet === 'Sun');
  const moon = chart?.planets.find((p) => p.planet === 'Moon');

  return (
    <Page spacing="md">
      <PageHeader
        align="center"
        onBack={() => navigate('/people')}
        backLabel="People"
        eyebrow={REL_LABEL[person.relationship]}
        title={person.name}
        subtitle={!isPet && chart ? (
          <>
            {sun && <>Sun in {sun.sign} {SIGN_GLYPH[sun.sign]}</>}
            {moon && <> · Moon in {moon.sign} {SIGN_GLYPH[moon.sign]}</>}
            {chart.ascendantSign && <> · {chart.ascendantSign} Rising</>}
          </>
        ) : undefined}
      />
      {!person.birthTime && !isPet && (
        <p className="text-center text-meta text-mystic-400 -mt-3">Birth time unknown — houses &amp; rising sign are approximate.</p>
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
        <Card className="p-4 flex justify-center">
          <div className="w-full max-w-[360px]"><NatalWheel chart={chart} /></div>
        </Card>
      )}

      {/* Big Three */}
      {!isPet && chart && (
        <div className="grid grid-cols-3 gap-2">
          {[
            sun && { g: PLANET_GLYPH.Sun, t: 'Sun', s: sun.sign },
            moon && { g: PLANET_GLYPH.Moon, t: 'Moon', s: moon.sign },
            chart.ascendantSign ? { g: 'AC', t: 'Rising', s: chart.ascendantSign } : null,
          ].filter(Boolean).map((b) => (
            <div key={b!.t} className="rounded-2xl border border-mystic-800/60 bg-mystic-900/40 p-3 text-center">
              <div className="text-xl" style={{ fontFamily: 'serif' }}>{b!.g}</div>
              <div className="text-meta uppercase tracking-wider text-mystic-400 mt-1">{b!.t}</div>
              <div className="text-ui text-gold">{b!.s}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI reading */}
      {chart && <PersonAIReading personId={person.id} personName={person.name} />}

      {/* Placements with interpretations */}
      {!isPet && chart && (
        <Card className="p-4 space-y-1">
          <h3 className="heading-display-md text-mystic-100 mb-2">Placements</h3>
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
                icon={<span className="text-lg w-6 text-center block text-mystic-200" style={{ fontFamily: 'serif' }}>{PLANET_GLYPH[p.planet]}</span>}
                label={
                  <>
                    <span className="text-mystic-100">{p.planet}</span>
                    <span className="text-mystic-400"> in {p.sign} {SIGN_GLYPH[p.sign]}</span>
                    {p.house && <span className="text-meta text-mystic-400"> · House {p.house}</span>}
                    {p.retrograde && <span className="text-red-400 text-xs"> ℞</span>}
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
        <Section title="Balance" headingLevel="h3">
          <ElementBalance elements={chart.elements} modalities={chart.modalities} />
        </Section>
      )}

      {/* Aspects */}
      {chart && chart.aspects.length > 0 && (
        <Section title="Aspects" headingLevel="h3" contentClassName="space-y-3">
          <AspectGrid aspects={chart.aspects} />
          <div className="space-y-3 pt-1">
            {chart.aspects.slice(0, 6).map((a, i) => (
              <div key={i} className="text-ui">
                <span className="text-mystic-200">{a.planet1} {a.type} {a.planet2}</span>
                <span className="text-meta text-mystic-400"> · orb {a.orb}°</span>
                {interp && <ReadingProse text={interp.aspectText(a.planet1, a.planet2, a.type)} lede={false} className="mt-1" />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" size="md" onClick={() => navigate(`/people/${person.id}/compare`)}>
          <GitCompareArrows className="w-4 h-4 mr-2" /> Compare
        </Button>
        <Button variant="ghost" size="md" onClick={() => setEditing(true)}>
          <Pencil className="w-4 h-4 mr-2" /> Edit
        </Button>
      </div>
      <button onClick={() => setConfirmDelete(true)} className="w-full text-center text-xs text-red-400/70 hover:text-red-400 py-2 flex items-center justify-center gap-1">
        <Trash2 className="w-3.5 h-3.5" /> Remove {person.name}
      </button>

      <Sheet open={editing} onClose={() => setEditing(false)} title={`Edit ${person.name}`}>
        <PersonForm existing={person} onSaved={() => { setEditing(false); load(); }} onCancel={() => setEditing(false)} />
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remove person?">
        <div className="space-y-4">
          <p className="text-ui text-mystic-300">This deletes {person.name}'s saved birth data and chart. This can't be undone.</p>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>Keep</Button>
            <Button variant="primary" className="flex-1 !bg-red-600 hover:!bg-red-500" onClick={handleDelete}>Remove</Button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}
