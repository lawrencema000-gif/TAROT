import { useState } from 'react';
import { Calendar, Clock, MapPin, Loader2, User } from 'lucide-react';
import { Button, Input, toast } from '../ui';
import { CelestialCitySearch } from '../celestial/CelestialCitySearch';
import { deriveBirthTz } from '../../utils/birthTz';
import { people } from '../../dal';
import type { Person, PersonInput, Relationship } from '../../dal/people';
import { useAuth } from '../../context/AuthContext';
import type { City } from '../../utils/celestialGeo';

const RELATIONSHIPS: { key: Relationship; label: string }[] = [
  { key: 'partner', label: 'Partner' },
  { key: 'family', label: 'Family' },
  { key: 'friend', label: 'Friend' },
  { key: 'other', label: 'Other' },
];

interface Props {
  existing?: Person;
  onSaved: (person: Person) => void;
  onCancel: () => void;
}

/** Add / edit a saved person's birth data. Derives the birth-place IANA tz on
 *  city pick (Sprint-B pipeline) so the DB computes birth_utc correctly. */
export function PersonForm({ existing, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(existing?.name ?? '');
  const [relationship, setRelationship] = useState<Relationship>(existing?.relationship ?? 'friend');
  const [birthDate, setBirthDate] = useState(existing?.birthDate ?? '');
  const [birthTime, setBirthTime] = useState(existing?.birthTime ?? '');
  const [place, setPlace] = useState<{ name: string; lat: number; lon: number } | null>(
    existing?.birthPlace && existing.birthLat != null && existing.birthLon != null
      ? { name: existing.birthPlace, lat: existing.birthLat, lon: existing.birthLon }
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickCity = (c: City) => {
    setPlace({ name: `${c.name}, ${c.country}`, lat: c.lat, lon: c.lon });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) { setError('Give this person a name.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { setError('A valid birth date is required.'); return; }
    setError(null);
    setSaving(true);
    let birthTz: string | null = null;
    if (place) birthTz = await deriveBirthTz(place.lat, place.lon);

    const input: PersonInput = {
      name: name.trim(),
      relationship,
      birthDate,
      birthTime: birthTime || null,
      birthTz,
      birthPlace: place?.name ?? null,
      birthLat: place?.lat ?? null,
      birthLon: place?.lon ?? null,
    };
    const res = existing
      ? await people.update(existing.id, input)
      : await people.create(user.id, input);
    setSaving(false);
    if (!res.ok) {
      setError(res.error.includes('PEOPLE_LIMIT') ? 'You’ve reached the 50-person limit.' : res.error);
      return;
    }
    toast(existing ? 'Updated' : `${input.name} added`, 'success');
    onSaved(res.data);
  };

  return (
    <div className="space-y-4">
      <Input label="Name" icon={<User className="w-4 h-4" />} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mom, Alex, Jamie" maxLength={80} />

      <div>
        <label className="text-xs uppercase tracking-wider text-mystic-500 mb-1.5 block">Relationship</label>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIPS.map((r) => (
            <button key={r.key} type="button" onClick={() => setRelationship(r.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${relationship === r.key ? 'bg-gold/15 border-gold/50 text-gold' : 'border-mystic-700 text-mystic-300 hover:border-mystic-500'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <Input type="date" label="Birth date" icon={<Calendar className="w-4 h-4" />} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
      <Input type="time" label="Birth time (optional — sharpens the chart)" icon={<Clock className="w-4 h-4" />} value={birthTime} onChange={(e) => setBirthTime(e.target.value)} placeholder="--:--" />

      <div>
        <label className="text-xs uppercase tracking-wider text-mystic-500 mb-1.5 block flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Birth place (optional)</label>
        {place && <p className="text-sm text-gold mb-2">{place.name}</p>}
        <CelestialCitySearch onPick={handlePickCity} />
      </div>

      {error && <p className="text-xs text-red-300 bg-red-900/30 border border-red-700/40 rounded-xl p-3">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" size="md" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button variant="primary" size="md" onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : (existing ? 'Save changes' : 'Add person')}
        </Button>
      </div>
    </div>
  );
}
