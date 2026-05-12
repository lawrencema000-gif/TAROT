/**
 * Static interpretation dictionary for the 40 astrocartography planetary
 * lines (10 planets × 4 angles).
 *
 * These short paragraphs are what we surface in CityInsightPanel when a
 * user taps a city. The text is the FREE, deterministic content — every
 * user, premium or not, sees the same blurb for the same line. The
 * Premium / 250-Moonstone "AI Travel Reading" generates a personalised
 * paragraph synthesising multiple lines + the user's life-area filter.
 *
 * Sources blended from Jim Lewis's original astrocartography canon and
 * the practitioner consensus on AstroSeek + Astrodienst. The voice is
 * deliberately confident but soft-edged — astrocartography is a signal
 * map, not a prediction. We are careful not to make claims that could
 * land as binding or harmful ("you will get sick here", etc.).
 */

import type { PlanetName, Angle } from '../utils/astrocartography';

export interface Interpretation {
  /** One-line headline shown on the line "chip". */
  headline: string;
  /** 2-3 sentence reading, shown when the line is expanded. */
  body: string;
  /** Optional theme tag the UI can color by — matches life-area filter ids. */
  theme: 'love' | 'career' | 'travel' | 'healing' | 'home' | 'growth';
}

const I = (
  headline: string,
  body: string,
  theme: Interpretation['theme'],
): Interpretation => ({ headline, body, theme });

/**
 * Lookup table: `INTERPRETATIONS[planet][angle]`.
 *
 * Headlines are short enough to fit a chip; bodies aim for 2-3 sentences
 * and ~280 chars so they read naturally in a bottom-sheet card without
 * scrolling. Tone: poetic-but-grounded, never absolute.
 */
export const INTERPRETATIONS: Record<PlanetName, Record<Angle, Interpretation>> = {
  Sun: {
    AC: I('Where you shine brightest', 'The Sun rising here amplifies your identity — people see you clearly and you feel most visible. Excellent for self-launch, leadership, and reinvention. The downside: less hiding, more spotlight.', 'career'),
    DC: I('Where partners reflect you', 'A Sun-setting line foregrounds your one-to-ones. Spouses, business partners, and close peers shape your sense of self here more than they would elsewhere. Good for committed unions.', 'love'),
    MC: I('Your reputation peaks here', 'The Sun on the meridian is the classic "career line" — public recognition, professional status, and authority all run higher. A place to be known for what you do.', 'career'),
    IC: I('Where your roots hold you', 'The Sun underfoot grounds your private life — home, family, and ancestral patterns. Less external visibility, more emotional anchor. Good for retreat, healing, raising children.', 'home'),
  },
  Moon: {
    AC: I('Where feelings show on your face', 'The Moon rising softens your expression — strangers read you as approachable, intuitive, nurturing. Great for caregiving work, emotional vulnerability, and reconnecting with feeling.', 'healing'),
    DC: I('Where you bond intimately', 'The Moon setting brings emotionally close relationships. People here pull family-like attachment from you, for better or worse. Good for partnerships that feel like home.', 'love'),
    MC: I('Where the public feels you', 'A Moon-meridian line invites public-facing emotional work — teaching, healing, hospitality, food. Reputation here is built on care, not achievement.', 'healing'),
    IC: I('Where you can finally rest', 'The Moon at the IC marks places that feel like the home you didn\'t know you had. Sleep deepens, family bonds renew, the nervous system unclenches.', 'home'),
  },
  Mercury: {
    AC: I('Sharper words, faster wit', 'Mercury rising amplifies how you communicate — speech, writing, teaching, and trade all flow more easily. Ideal for study, sales, and any work where being articulate pays.', 'career'),
    DC: I('Conversations that change you', 'A Mercury-setting line brings teachers, students, and intellectual partners. Relationships here run on shared ideas more than shared feeling.', 'growth'),
    MC: I('Known for what you say', 'Mercury on the meridian builds a name as a thinker, writer, or speaker. Media, education, and tech careers gain a tailwind here.', 'career'),
    IC: I('Studious quiet at home', 'Mercury under the chart favours learning in private — books, courses, deep focus. Conversations with family open up more than they do elsewhere.', 'growth'),
  },
  Venus: {
    AC: I('You are more beautiful here', 'Venus rising softens and sweetens — people are drawn to you, art and pleasure come easier, your style finds its expression. Excellent for romance, the arts, and aesthetic work.', 'love'),
    DC: I('Where love finds you', 'The Venus-setting line is the classic love-magnet locale. Partners arrive, attractions deepen, harmony improves. Long-term unions formed here tend to feel graceful.', 'love'),
    MC: I('Beautiful by reputation', 'Venus on the meridian builds a public image of grace, taste, and likability. Strong for careers in fashion, design, hospitality, and diplomacy.', 'career'),
    IC: I('A home that holds beauty', 'Venus at the IC nurtures a private life rich with aesthetics, comfort, and affection. Family relationships soften; home becomes a sanctuary.', 'home'),
  },
  Mars: {
    AC: I('You move with more force', 'Mars rising sharpens drive, courage, and physicality. Excellent for athletes, founders, and anyone whose work demands stamina. Caution: tempers can run hot too.', 'career'),
    DC: I('Heated, honest partnerships', 'A Mars-setting line brings passionate, sometimes combative one-to-ones. Attraction is electric; conflict more frequent. Great for relationships built on directness.', 'love'),
    MC: I('Ambition runs high', 'Mars on the meridian fuels career drive — promotions, fights worth fighting, hard-won victories. Burnout risk is real; pace yourself.', 'career'),
    IC: I('A restless home', 'Mars at the IC can stir up family dynamics — confrontations surface, repairs become possible. Useful for sorting unfinished business; less so for peaceful retreat.', 'healing'),
  },
  Jupiter: {
    AC: I('Doors swing open here', 'Jupiter rising is the most expansive line on the map — opportunity, optimism, and generosity flow toward you. Classic "lucky place" for relocation. Watch for overcommitment.', 'growth'),
    DC: I('Wise partners appear', 'A Jupiter-setting line attracts mentors, generous lovers, and partners who broaden your horizons. International marriages often live on this line.', 'love'),
    MC: I('Career grows fast here', 'Jupiter on the meridian inflates professional opportunity — promotions, publishing deals, foreign clients, public success. Often cited as the strongest career line.', 'career'),
    IC: I('Abundant at home', 'Jupiter under the chart enriches private life — bigger family, more space, generous traditions. Great for putting down lucky roots.', 'home'),
  },
  Saturn: {
    AC: I('You are taken seriously', 'Saturn rising adds gravitas — others see you as competent, mature, reliable. Excellent for proving yourself and building a long-term reputation. Loneliness can show up too.', 'career'),
    DC: I('Commitments crystallise', 'A Saturn-setting line tests and structures partnerships. Bonds formed here are durable but require work; flaky relationships don\'t survive.', 'love'),
    MC: I('Where you build a legacy', 'Saturn on the meridian is the classic "career-building" line — slow, structural, ambitious. Reputation is earned through persistence, not flash.', 'career'),
    IC: I('Roots dug deep', 'Saturn at the IC consolidates home life — property ownership, ancestral healing, long-term planning. Can feel heavy; rewards arrive on Saturn\'s timetable.', 'home'),
  },
  Uranus: {
    AC: I('You become unpredictable', 'Uranus rising sparks reinvention — you shed old identities, surprise yourself, attract unconventional company. Brilliant for breakthroughs; unstable for routine.', 'growth'),
    DC: I('Wild-card partnerships', 'A Uranus-setting line draws unconventional, exciting, sometimes disruptive partners. Long-distance, open, or non-traditional unions often align with this line.', 'love'),
    MC: I('Future-facing work', 'Uranus on the meridian favours tech, activism, science, and any work that breaks the mould. Reputation is earned by doing the new thing first.', 'career'),
    IC: I('A home that won\'t stay still', 'Uranus at the IC keeps home life lively and changeable — moves, renovations, sudden shifts in family structure. Good for the restless; harder for those who need stability.', 'growth'),
  },
  Neptune: {
    AC: I('Softer edges, deeper dreams', 'Neptune rising blurs your edges — intuition rises, art flows, compassion runs high. Excellent for creatives and healers; watch for substances and self-deception.', 'healing'),
    DC: I('Soulmate or illusion', 'A Neptune-setting line attracts mystical, artistic, or deeply spiritual partners. The high is dreamlike; clarity is the work. Good for muses and bad for due-diligence.', 'love'),
    MC: I('Art, image, and idealism', 'Neptune on the meridian builds reputations in art, film, music, healing, and spirituality. Public image runs on mystique; reality and persona blur.', 'career'),
    IC: I('A dreamy, watery home', 'Neptune at the IC softens private life — sanctuaries, retreat, spiritual practice, ancestral memory. Boundaries get porous; rest can become escape.', 'healing'),
  },
  Pluto: {
    AC: I('You become a force', 'Pluto rising magnetises and intensifies — you confront your own power, others feel it, transformation accelerates. Excellent for deep work; not gentle.', 'growth'),
    DC: I('Intense, fated partnerships', 'A Pluto-setting line brings unforgettable, transformative relationships. Bonds here are deep and sometimes painful; few are casual.', 'love'),
    MC: I('Reputation through power', 'Pluto on the meridian builds careers in finance, psychology, surgery, research, or politics. Authority is real but earned the hard way.', 'career'),
    IC: I('Where the past surfaces', 'Pluto at the IC stirs up ancestral, inherited, and buried family material. Powerful for healing; uncomfortable while it runs.', 'healing'),
  },
};

/**
 * Convenience getter — same as INTERPRETATIONS[planet][angle] but returns
 * a typed object the UI can render without a null check. Consumers who
 * pass an unknown planet/angle (shouldn't happen with our types but
 * defensive) get a generic fallback.
 */
export function getInterpretation(planet: PlanetName, angle: Angle): Interpretation {
  return INTERPRETATIONS[planet]?.[angle] ?? {
    headline: `${planet} ${angle}`,
    body: 'An influence on this place from your birth chart.',
    theme: 'growth',
  };
}
