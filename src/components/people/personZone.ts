import { people as peopleDal } from '../../dal';
import type { Person } from '../../dal/people';
import { deriveBirthTz } from '../../utils/birthTz';
import { fallbackZone } from '../horoscope/birthZone';

/**
 * The zone a saved person's birth time is read in, filled in where it is
 * missing (p8 F25).
 *
 * A person saved without a birth place before F25 has no zone, and the
 * people trigger read their birth time as UTC: the Moon moved by up to a
 * sign for anyone born east or west of Greenwich. PersonForm now saves the
 * device's zone when there is no place (and says the chart is approximate);
 * this gives the same zone to the people saved before it. A place whose zone
 * could not be derived when it was saved gets it from its coordinates.
 * Setting it recomputes birth_utc and clears the cached chart, so the chart
 * call that follows recasts it. Pets have no chart and are left alone.
 */
export async function ensurePersonZone(person: Person): Promise<Person> {
  if (person.relationship === 'pet' || person.birthTz) return person;
  const located = person.birthLat != null && person.birthLon != null;
  const tz = located ? await deriveBirthTz(person.birthLat!, person.birthLon!) : fallbackZone();
  if (!tz) return person;
  const res = await peopleDal.setBirthTz(person.id, tz);
  return res.ok ? res.data : person;
}
