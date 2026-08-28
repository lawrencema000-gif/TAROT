/**
 * Pet astrology — a chart for the animal you live with.
 *
 * This is the lightest thing in the app and it is meant to be. People read a
 * pet's chart for delight and for the small shock of recognition, not for
 * guidance about their own life. So the writing stays observational — it
 * describes how an animal tends to BEHAVE and what tends to help — and it never
 * makes a health, diet or training claim. Anything shading toward "should I be
 * worried about this" points at a vet, because a temperament sketch has no
 * business in that conversation.
 *
 * Two layers:
 *   SUN SIGN, from the birth (or adoption) date — the temperament sketch.
 *   SPECIES, which changes how a sign actually shows up: a Leo dog performs for
 *   you, a Leo cat performs at you. With no species the reading still works and
 *   simply drops that lens.
 *
 * The Chinese year animal comes from the bazi year pillar, so it turns at 立春
 * rather than on 1 January — which is exactly the difference that matters for
 * the late-January and early-February arrivals adoption dates cluster around.
 */

import { getZodiacSign } from '../utils/zodiac';
import { computeBazi, BRANCHES } from './bazi';
import type { ZodiacSign } from '../types';
import type { Species } from '../dal/people';

export interface SpeciesInfo {
  label: string;
  /** One sentence on how this animal tends to express a sign. */
  lens: string;
}

export const SPECIES_INFO: Record<Species, SpeciesInfo> = {
  dog: {
    label: 'Dog',
    lens: 'Dogs wear their chart on the outside — whatever the sign says, they will show you, loudly and immediately.',
  },
  cat: {
    label: 'Cat',
    lens: 'Cats run every sign through a filter of consent: the trait is there, but on their terms and usually at an hour you did not pick.',
  },
  bird: {
    label: 'Bird',
    lens: 'Birds amplify the social side of a sign — whatever they are, they are it out loud and in company.',
  },
  rabbit: {
    label: 'Rabbit',
    lens: 'Rabbits express a sign in miniature and at speed, with a strong opinion about being watched while doing it.',
  },
  horse: {
    label: 'Horse',
    lens: 'Horses read the room before they read you, so a sign shows up first as what they trust, and how quickly.',
  },
  reptile: {
    label: 'Reptile',
    lens: 'Reptiles express a sign slowly and without performance, which makes the pattern easier to see once you stop expecting a reaction.',
  },
  fish: {
    label: 'Fish',
    lens: 'Fish show a sign in movement and routine — where they hold position, and what makes them break it.',
  },
  smallPet: {
    label: 'Small pet',
    lens: 'Small companions concentrate a sign into a very small, very determined package.',
  },
  other: {
    label: 'Companion',
    lens: 'Whatever they are, the sign shows up in the shape of their attention.',
  },
};

export interface PetSignReading {
  headline: string;
  temperament: string;
  /** What this animal tends to want from the person they live with. */
  needs: string;
  /** Framed as a quirk to work with — never a fault, and never a symptom. */
  quirk: string;
}

export const PET_SIGNS: Record<ZodiacSign, PetSignReading> = {
  aries: {
    headline: 'The one who goes first',
    temperament: 'Arrives at everything at full speed and asks questions later. First out of the door, first to greet, first to investigate the noise. Confidence that does not always stop to check whether it was warranted.',
    needs: 'Somewhere to spend the charge. A tired Aries animal is a delightful one; an under-exercised one will invent a project you did not authorise.',
    quirk: 'Boredom looks like mischief here. It usually is not defiance — it is an unspent afternoon.',
  },
  taurus: {
    headline: 'The one with opinions about comfort',
    temperament: 'Devoted to routine, warmth and the good spot. Slow to move and slower to be moved. Affectionate in a settled, leaning-against-you way rather than a bouncing one.',
    needs: 'Predictability, and a place of their own that nobody rearranges. Changes land better announced and gradual.',
    quirk: 'Immovable once they have decided. Less stubbornness than a strong sense of having already chosen.',
  },
  gemini: {
    headline: 'The one who needs something to think about',
    temperament: 'Curious, chatty in whatever register they have, and easily fascinated. Attention moves fast and comes back just as fast. Learns quickly, including things you would rather they had not.',
    needs: 'Novelty — new toys, new routes, new puzzles. The same walk every day is a slow disappointment.',
    quirk: 'Will solve a latch for the pleasure of solving it, then look at you for a reaction.',
  },
  cancer: {
    headline: 'The one who tracks your mood',
    temperament: 'Homebound, attached and quietly attuned. Notices when the household is off before anyone has said so. Loves a den, a blanket, a corner that is theirs.',
    needs: 'Reassurance and a stable base. They read your leaving and returning closely, so a predictable goodbye helps more than a dramatic one.',
    quirk: 'Absorbs the room. A tense week in the house shows up in them too, which is worth knowing before reading anything else into it.',
  },
  leo: {
    headline: 'The one who wants to be watched',
    temperament: 'Warm, theatrical, and entirely aware of being the centre of things. Generous with affection when the audience is right. Carries themselves as something slightly grander than they are.',
    needs: 'Attention that is actually attention — being noticed doing the thing, not merely fed on schedule.',
    quirk: 'Sulks legibly when overlooked, and forgives the instant you look again.',
  },
  virgo: {
    headline: 'The one with a system',
    temperament: 'Particular, observant and quietly precise about how things ought to be. Notices the small change. Tidy in their own way, even when the way is not yours.',
    needs: 'Order and a clean routine. Fussiness here is usually a preference being expressed rather than a problem.',
    quirk: 'Registers a rearranged room as a personal event, and needs a day to file it.',
  },
  libra: {
    headline: 'The one who wants everyone to get along',
    temperament: 'Sociable, charming and averse to conflict. Tends to like everybody, occasionally to your mild irritation. Happiest when the household is calm and the company is good.',
    needs: 'Company. Loneliness costs them more than it costs most, and tension between people reaches them directly.',
    quirk: 'Indecisive at the door — in, out, in again — because both options had something to recommend them.',
  },
  scorpio: {
    headline: 'The one who chooses their person',
    temperament: 'Intense, loyal and selective. Bonds hard and narrowly, often to one person. Watchful with strangers and unhurried about deciding.',
    needs: 'Trust built at their pace and never forced. Once given, it is close to permanent.',
    quirk: 'Remembers. Both the good and the vet trip, in considerable detail.',
  },
  sagittarius: {
    headline: 'The one who wants to go',
    temperament: 'Adventurous, friendly and constitutionally optimistic. Delighted by the car, the door, the new place. Not remotely troubled by dignity.',
    needs: 'Range and variety — new ground to cover, and the freedom to be enthusiastic about it.',
    quirk: 'Recall becomes a philosophical question when there is something interesting downwind.',
  },
  capricorn: {
    headline: 'The one who acts older than they are',
    temperament: 'Serious, composed and self-contained, often from an implausibly young age. Dignified. Takes their role in the household seriously and appears to be working to a plan.',
    needs: 'Clear structure and a job of some kind, even a small invented one. Purpose settles them.',
    quirk: 'Reserved rather than cold. Affection arrives on a schedule they set.',
  },
  aquarius: {
    headline: 'The one who does it differently',
    temperament: 'Odd in the best sense — original habits, unusual preferences, an entirely personal logic. Friendly without being clingy. Attached on their own unconventional terms.',
    needs: 'Room to be strange, and enrichment that respects it. Standard advice often fits them badly.',
    quirk: 'Will ignore the expensive bed in favour of a box, permanently.',
  },
  pisces: {
    headline: 'The one who feels the weather in the room',
    temperament: 'Gentle, dreamy and highly sensitive to atmosphere. Soft with people who are soft with them. Sleeps a great deal and seems to be somewhere else while doing it.',
    needs: 'Calm, quiet and gentleness. Loud households are genuinely harder on them.',
    quirk: 'Startles easily and recovers slowly; patience does more here than reassurance does.',
  },
};

/** The 十二生肖, in branch order from 子. */
export const ZODIAC_ANIMALS: { cn: string; en: string }[] = [
  { cn: '鼠', en: 'Rat' }, { cn: '牛', en: 'Ox' }, { cn: '虎', en: 'Tiger' },
  { cn: '兔', en: 'Rabbit' }, { cn: '龍', en: 'Dragon' }, { cn: '蛇', en: 'Snake' },
  { cn: '馬', en: 'Horse' }, { cn: '羊', en: 'Goat' }, { cn: '猴', en: 'Monkey' },
  { cn: '雞', en: 'Rooster' }, { cn: '狗', en: 'Dog' }, { cn: '豬', en: 'Pig' },
];

/**
 * The Chinese year animal for a birth date.
 *
 * Read from the bazi YEAR PILLAR, so the year turns at 立春 rather than on
 * 1 January.
 */
export function zodiacAnimalFor(birthDate: string): { cn: string; en: string } | null {
  const chart = computeBazi(birthDate, '12:00');
  if (!chart) return null;
  return ZODIAC_ANIMALS[BRANCHES.indexOf(chart.year.branch)] ?? null;
}

export interface PetReading {
  sign: ZodiacSign;
  reading: PetSignReading;
  species: Species | null;
  speciesLens: string | null;
  animal: { cn: string; en: string } | null;
}

/** Returns null only for a malformed date — never a partial reading. */
export function readPet(birthDate: string, species?: Species | null): PetReading | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const sign = getZodiacSign(birthDate);
  const reading = PET_SIGNS[sign];
  if (!reading) return null;
  return {
    sign,
    reading,
    species: species ?? null,
    speciesLens: species ? SPECIES_INFO[species].lens : null,
    animal: zodiacAnimalFor(birthDate),
  };
}

/**
 * Shown on every pet reading. Not boilerplate — the one place this feature
 * could do harm is by sounding like it knows something about an animal's
 * health, so it says plainly that it does not.
 */
export const PET_DISCLAIMER =
  'A bit of fun for you and them. It describes tendencies, not health — anything that actually worries you about your animal is a conversation for your vet, not for a birth chart.';
